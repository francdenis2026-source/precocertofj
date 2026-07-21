import { createFileRoute } from "@tanstack/react-router";

/**
 * Drena a fila de jobs de imagem do catálogo, processando até N por chamada.
 * Usa busca na web (mais barato); se falhar, cai para geração via IA.
 * Segurança: apikey === SUPABASE_ANON_KEY.
 */
export const Route = createFileRoute("/api/public/hooks/drain-catalog-images")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey");
        const expected =
          process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
        if (!apiKey || !expected || apiKey !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        let body: { max?: number; mode?: "web" | "ai" | "web_then_ai" } = {};
        try {
          body = (await request.json()) as typeof body;
        } catch {
          /* body opcional */
        }
        const max = Math.min(Math.max(body.max ?? 20, 1), 50);
        const mode = body.mode ?? "web_then_ai";

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { searchAndStoreWebImage, generateAndStoreImage, getImageFailureProvider } = await import(
          "@/lib/catalog-image.server"
        );

        const results: Array<{
          jobId: string;
          catalogId: string;
          status: "done" | "failed";
          via?: "web" | "ai";
          error?: string;
        }> = [];

        for (let i = 0; i < max; i++) {
          const { data: picked } = await supabaseAdmin
            .from("catalog_image_jobs" as never)
            .select("id, catalog_id, attempts")
            .eq("status", "pending")
            .order("priority", { ascending: false })
            .order("created_at", { ascending: true })
            .limit(1);
          const job = (picked ?? [])[0] as
            | { id: string; catalog_id: string; attempts: number }
            | undefined;
          if (!job) break;

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
            let via: "web" | "ai" | null = null;
            let imageUrl: string | null = null;
            let provider: string | null = null;
            let lastWebError: string | null = null;

            if (mode === "web" || mode === "web_then_ai") {
              try {
                const r = await searchAndStoreWebImage(job.catalog_id, null);
                if (r.found && r.imageUrl) {
                  via = "web";
                  imageUrl = r.imageUrl;
                  provider = r.provider;
                }
              } catch (err) {
                lastWebError = err instanceof Error ? err.message : String(err);
                if (mode === "web") throw err;
              }
            }
            if (!imageUrl && (mode === "ai" || mode === "web_then_ai")) {
              const r = await generateAndStoreImage(job.catalog_id, null);
              if (r.imageUrl) {
                imageUrl = r.imageUrl;
                provider = r.provider;
                via = "ai";
              }
            }

            if (!imageUrl) throw new Error(lastWebError ?? "nenhuma imagem encontrada");

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
            results.push({
              jobId: job.id,
              catalogId: job.catalog_id,
              status: "done",
              via: via ?? undefined,
            });
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
            results.push({
              jobId: job.id,
              catalogId: job.catalog_id,
              status: "failed",
              error: msg,
            });
          }
        }

        const done = results.filter((r) => r.status === "done").length;
        const failed = results.filter((r) => r.status === "failed").length;
        return Response.json({
          ok: true,
          processed: results.length,
          done,
          failed,
          results,
        });
      },
    },
  },
});
