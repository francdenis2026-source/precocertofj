import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";

export type ImageJobStatus = "pending" | "processing" | "done" | "failed" | "cancelled";

export type ImageJob = {
  id: string;
  catalogId: string;
  displayName: string;
  brand: string | null;
  status: ImageJobStatus;
  priority: number;
  attempts: number;
  lastError: string | null;
  imageUrl: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  provider: string | null;
  durationMs: number | null;
};

export type ProviderStats = {
  provider: string;
  done: number;
  failed: number;
  total: number;
  avgDurationMs: number | null;
  totalAttempts: number;
};

export type ImageJobStats = {
  pending: number;
  processing: number;
  done: number;
  failed: number;
  cancelled: number;
  total: number;
  estimatedCredits: number;
  geminiDirectEnabled: boolean;
};

// Créditos por imagem gerada. Modelo atual: google/gemini-3.1-flash-image
// (Nano Banana 2). Observação real na AI Gateway: ~2 créditos por imagem.
const CREDITS_PER_IMAGE = 2;

export const enqueueImageJobs = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<{ enqueued: number }> => {
    // context.supabase mantém auth.uid() dentro do SECURITY DEFINER RPC
    const { data, error } = await context.supabase.rpc("enqueue_catalog_image_jobs" as never);
    if (error) throw new Error(error.message);
    const row = Array.isArray(data) ? (data[0] as { enqueued: number } | undefined) : null;
    return { enqueued: row?.enqueued ?? 0 };
  });

export const getImageJobStats = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<ImageJobStats> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("catalog_image_job_stats" as never);
    if (error) throw new Error(error.message);
    const row = (Array.isArray(data) ? data[0] : null) as {
      pending: number;
      processing: number;
      done: number;
      failed: number;
      cancelled: number;
      total: number;
    } | null;
    const s = row ?? { pending: 0, processing: 0, done: 0, failed: 0, cancelled: 0, total: 0 };
    const geminiDirectEnabled = !!process.env.GEMINI_API_KEY;
    return {
      ...s,
      estimatedCredits: geminiDirectEnabled ? 0 : s.pending * CREDITS_PER_IMAGE,
      geminiDirectEnabled,
    };
  });

export const listImageJobs = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator(
    (input: { status?: ImageJobStatus | "all"; limit?: number } | undefined) => input ?? {},
  )
  .handler(async ({ data }): Promise<ImageJob[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const limit = Math.min(Math.max(data.limit ?? 50, 1), 200);
    let query = supabaseAdmin
      .from("catalog_image_jobs" as never)
      .select(
        "id, catalog_id, status, priority, attempts, last_error, image_url, started_at, finished_at, created_at, provider, duration_ms, product_catalog!inner(display_name, brand)",
      );
    if (data.status && data.status !== "all") {
      query = (query as unknown as { eq: (c: string, v: string) => typeof query }).eq(
        "status",
        data.status,
      );
    }
    const { data: rows, error } = await (
      query as unknown as {
        order: (c: string, o: { ascending: boolean }) => {
          order: (c: string, o: { ascending: boolean }) => {
            limit: (n: number) => Promise<{ data: unknown; error: { message: string } | null }>;
          };
        };
      }
    )
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error) throw new Error(error.message);
    type Row = {
      id: string;
      catalog_id: string;
      status: ImageJobStatus;
      priority: number;
      attempts: number;
      last_error: string | null;
      image_url: string | null;
      started_at: string | null;
      finished_at: string | null;
      created_at: string;
      provider: string | null;
      duration_ms: number | null;
      product_catalog: { display_name: string; brand: string | null } | null;
    };
    return ((rows ?? []) as Row[]).map((r) => ({
      id: r.id,
      catalogId: r.catalog_id,
      displayName: r.product_catalog?.display_name ?? "(sem nome)",
      brand: r.product_catalog?.brand ?? null,
      status: r.status,
      priority: r.priority,
      attempts: r.attempts,
      lastError: r.last_error,
      imageUrl: r.image_url,
      startedAt: r.started_at,
      finishedAt: r.finished_at,
      createdAt: r.created_at,
      provider: r.provider,
      durationMs: r.duration_ms,
    }));
  });

export const processNextImageJob = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(
    (input: { mode?: "web" | "ai" | "web_then_ai" } | undefined) => ({
      mode: input?.mode ?? "web_then_ai",
    }),
  )
  .handler(
    async ({
      data,
      context,
    }): Promise<{ processed: boolean; jobId: string | null; error: string | null }> => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { generateAndStoreImage, searchAndStoreWebImage, getImageFailureProvider } =
        await import("./catalog-image.server");

      // Pick next pending job (highest priority, oldest first) and mark it processing
      const { data: picked, error: pickErr } = await supabaseAdmin
        .from("catalog_image_jobs" as never)
        .select("id, catalog_id, attempts")
        .eq("status", "pending")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(1);
      if (pickErr) throw new Error(pickErr.message);
      const job = (picked ?? [])[0] as
        | { id: string; catalog_id: string; attempts: number }
        | undefined;
      if (!job) return { processed: false, jobId: null, error: null };

      await supabaseAdmin
        .from("catalog_image_jobs" as never)
        .update({
          status: "processing",
          started_at: new Date().toISOString(),
          attempts: job.attempts + 1,
        } as never)
        .eq("id", job.id);

      const startTs = Date.now();
      try {
        let imageUrl: string | null = null;
        let provider: string | null = null;
        let lastWebError: string | null = null;

        if (data.mode === "web" || data.mode === "web_then_ai") {
          try {
            const r = await searchAndStoreWebImage(job.catalog_id, context.userId);
            if (r.found && r.imageUrl) {
              imageUrl = r.imageUrl;
              provider = r.provider;
            }
          } catch (err) {
            lastWebError = err instanceof Error ? err.message : String(err);
            if (data.mode === "web") throw err;
          }
        }
        if (!imageUrl && (data.mode === "ai" || data.mode === "web_then_ai")) {
          const r = await generateAndStoreImage(job.catalog_id, context.userId);
          imageUrl = r.imageUrl;
          provider = r.provider;
        }

        if (!imageUrl) {
          throw new Error(lastWebError ?? "nenhuma imagem encontrada na web");
        }

        await supabaseAdmin
          .from("catalog_image_jobs" as never)
          .update({
            status: "done",
            image_url: imageUrl,
            finished_at: new Date().toISOString(),
            last_error: null,
            provider,
            duration_ms: Date.now() - startTs,
          } as never)
          .eq("id", job.id);
        return { processed: true, jobId: job.id, error: null };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const provider = getImageFailureProvider(
          err,
          process.env.GEMINI_API_KEY ? "gemini_direct" : "lovable_gateway",
        );
        await supabaseAdmin
          .from("catalog_image_jobs" as never)
          .update({
            status: "failed",
            last_error: msg.slice(0, 500),
            finished_at: new Date().toISOString(),
            provider,
            duration_ms: Date.now() - startTs,
          } as never)
          .eq("id", job.id);
        return { processed: true, jobId: job.id, error: msg };
      }
    },
  );


export const getImageJobProviderStats = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<ProviderStats[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc(
      "catalog_image_job_provider_stats" as never,
    );
    if (error) throw new Error(error.message);
    type Row = {
      provider: string;
      done: number;
      failed: number;
      total: number;
      avg_duration_ms: number | string | null;
      total_attempts: number;
    };
    return ((data ?? []) as Row[]).map((r) => ({
      provider: r.provider,
      done: r.done,
      failed: r.failed,
      total: r.total,
      avgDurationMs:
        r.avg_duration_ms == null
          ? null
          : typeof r.avg_duration_ms === "string"
            ? Number(r.avg_duration_ms)
            : r.avg_duration_ms,
      totalAttempts: r.total_attempts,
    }));
  });

export const retryImageJob = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: { id: string }) => {
    if (!input.id) throw new Error("id obrigatório");
    return input;
  })
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("catalog_image_jobs" as never)
      .update({
        status: "pending",
        last_error: null,
        started_at: null,
        finished_at: null,
      } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const retryAllFailedImageJobs = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async (): Promise<{ retried: number }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("catalog_image_jobs" as never)
      .update({ status: "pending", last_error: null, started_at: null, finished_at: null } as never)
      .eq("status", "failed")
      .select("id");
    if (error) throw new Error(error.message);
    return { retried: (data ?? []).length };
  });

export const cancelPendingImageJobs = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async (): Promise<{ cancelled: number }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("catalog_image_jobs" as never)
      .update({ status: "cancelled", finished_at: new Date().toISOString() } as never)
      .eq("status", "pending")
      .select("id");
    if (error) throw new Error(error.message);
    return { cancelled: (data ?? []).length };
  });
