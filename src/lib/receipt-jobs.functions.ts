import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";
import type { ExtractedItem, ReceiptExtractStored } from "@/lib/receipt-jobs.server";

export type { ExtractedItem, ReceiptExtractStored };

export type ReceiptJob = {
  id: string;
  status:
    | "queued"
    | "extracting"
    | "ready_for_review"
    | "importing"
    | "done"
    | "failed"
    | "cancelled";
  progress: number;
  step_label: string | null;
  image_url: string | null;
  extract: ReceiptExtractStored | null;
  suggested_establishment_id: string | null;
  receipt_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

/** Cria o job e devolve o id rapidinho. O cliente dispara `processReceiptJob` sem aguardar. */
export const createReceiptJob = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: { imageDataUrl: string }) => {
    if (!input?.imageDataUrl?.startsWith("data:")) throw new Error("imageDataUrl inválido");
    return input;
  })
  .handler(async ({ data, context }): Promise<{ jobId: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Upload em paralelo com o insert
    const path = `cupons/${crypto.randomUUID()}.jpg`;
    const match = data.imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error("Formato de imagem inválido");
    const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));

    const [{ error: upErr }, insertRes] = await Promise.all([
      supabaseAdmin.storage.from("logos").upload(path, bytes, {
        contentType: match[1],
        upsert: true,
      }),
      (
        supabaseAdmin.from("receipt_jobs" as never) as unknown as {
          insert: (v: Record<string, unknown>) => {
            select: (s: string) => {
              single: () => Promise<{
                data: { id: string } | null;
                error: { message: string } | null;
              }>;
            };
          };
        }
      )
        .insert({
          user_id: context.userId,
          status: "queued",
          progress: 5,
          step_label: "Enviando imagem…",
          image_data: data.imageDataUrl,
        })
        .select("id")
        .single(),
    ]);

    if (upErr) console.error("[receipt-jobs] upload falhou:", upErr.message);

    if (insertRes.error || !insertRes.data) {
      throw new Error(insertRes.error?.message ?? "Falha ao criar job");
    }

    // salvar image_url separado (não bloqueia)
    if (!upErr) {
      const { data: pub } = supabaseAdmin.storage.from("logos").getPublicUrl(path);
      await (
        supabaseAdmin.from("receipt_jobs" as never) as unknown as {
          update: (v: Record<string, unknown>) => {
            eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
          };
        }
      )
        .update({ image_url: pub.publicUrl, progress: 15, step_label: "Na fila para IA…" })
        .eq("id", insertRes.data.id);
    }

    return { jobId: insertRes.data.id };
  });

export const processReceiptJob = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: { jobId: string }) => {
    if (!input?.jobId) throw new Error("jobId obrigatório");
    return input;
  })
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { processJob } = await import("@/lib/receipt-jobs.server");
    await processJob(data.jobId);
    return { ok: true };
  });

export const getReceiptJob = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: { jobId: string }) => {
    if (!input?.jobId) throw new Error("jobId obrigatório");
    return input;
  })
  .handler(async ({ data, context }): Promise<ReceiptJob> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const table = supabaseAdmin.from("receipt_jobs" as never) as unknown as {
      select: (s: string) => {
        eq: (
          c: string,
          v: string,
        ) => {
          maybeSingle: () => Promise<{
            data: (ReceiptJob & { user_id: string }) | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
    const { data: row, error } = await table
      .select(
        "id, status, progress, step_label, image_url, extract, suggested_establishment_id, receipt_id, error_message, created_at, updated_at, user_id",
      )
      .eq("id", data.jobId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Job não encontrado");
    if (row.user_id !== context.userId) throw new Error("Job não pertence ao usuário");
    const { user_id: _u, ...rest } = row;
    return rest as ReceiptJob;
  });

export const confirmReceiptImport = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(
    (input: {
      jobId: string;
      establishmentId: string | null;
      createEstablishment: {
        name: string;
        cnpj: string | null;
        address: string | null;
        city: string;
        state: string;
        phone: string | null;
      } | null;
      selectedKeys: string[];
      overrides: Record<
        string,
        {
          productName: string;
          price: number;
          quantity: number | null;
          unit: string | null;
          barcode: string | null;
          totalPrice: number | null;
        }
      >;
      issuedAt: string | null;
      total: number | null;
      amountPaid: number | null;
      couponNumber: string | null;
      accessKey: string | null;
    }) => {
      if (!input?.jobId) throw new Error("jobId obrigatório");
      if (!input.establishmentId && !input.createEstablishment)
        throw new Error("Selecione ou crie um estabelecimento");
      if (!Array.isArray(input.selectedKeys)) throw new Error("selectedKeys inválido");
      return input;
    },
  )
  .handler(async ({ data, context }): Promise<{ receiptId: string; itemsSaved: number }> => {
    const { confirmImport } = await import("@/lib/receipt-jobs.server");
    return confirmImport({ ...data, userId: context.userId });
  });

export const cancelReceiptJob = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: { jobId: string }) => {
    if (!input?.jobId) throw new Error("jobId obrigatório");
    return input;
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const table = supabaseAdmin.from("receipt_jobs" as never) as unknown as {
      update: (v: Record<string, unknown>) => {
        eq: (
          c: string,
          v: string,
        ) => {
          eq: (
            c: string,
            v: string,
          ) => Promise<{ error: { message: string } | null }>;
        };
      };
    };
    const { error } = await table
      .update({ status: "cancelled", step_label: "Cancelado pelo admin" })
      .eq("id", data.jobId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
