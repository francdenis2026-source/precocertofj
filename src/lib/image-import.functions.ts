import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";
import type { ImportResult } from "./image-import.server";

/**
 * Enfileira reprocessamento de imagens do catálogo.
 * - force=true: inclui produtos que já têm imagem (força re-busca)
 * - olderThanDays>0: só produtos cuja imagem foi atualizada há mais que N dias
 */
export const enqueueImageRefresh = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { force?: boolean; olderThanDays?: number } | undefined) => ({
    force: !!input?.force,
    olderThanDays: Math.max(0, Math.min(365, Math.floor(input?.olderThanDays ?? 0))),
  }))
  .handler(async ({ data, context }): Promise<{ enqueued: number }> => {
    // Usa o cliente autenticado para que auth.uid() dentro da RPC (SECURITY DEFINER)
    // resolva para o admin chamador — supabaseAdmin não tem sessão, cai em NULL
    // e a função retorna 'forbidden'.
    const { data: rows, error } = await context.supabase.rpc(
      "enqueue_catalog_image_refresh" as never,
      { _force: data.force, _older_than_days: data.olderThanDays } as never,
    );
    if (error) throw new Error(error.message);
    const row = Array.isArray(rows) ? (rows[0] as { enqueued: number } | undefined) : null;
    return { enqueued: row?.enqueued ?? 0 };
  });

/**
 * Força re-busca de imagem para um produto específico (mesmo que já tenha foto).
 * Faz busca web primeiro; se não achar, gera via IA.
 */
export const forceRefreshCatalogImage = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { id: string }) => {
    if (!input.id) throw new Error("id obrigatório");
    return input;
  })
  .handler(
    async ({
      data,
      context,
    }): Promise<{ imageUrl: string | null; source: "web" | "ai" | "none" }> => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { searchAndStoreWebImage, generateAndStoreImage } = await import(
        "./catalog-image.server"
      );

      // Reseta tentativa anterior para permitir nova busca
      const table = supabaseAdmin.from("product_catalog" as never) as unknown as {
        update: (p: Record<string, unknown>) => {
          eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
        };
      };
      await table
        .update({ image_search_attempted_at: null, image_search_found: null })
        .eq("id", data.id);

      // 1) Web
      try {
        const r = await searchAndStoreWebImage(data.id, context.userId);
        if (r.found && r.imageUrl) return { imageUrl: r.imageUrl, source: "web" };
      } catch (err) {
        console.error("[force-refresh] web falhou:", err);
      }
      // 2) IA como fallback
      try {
        const r = await generateAndStoreImage(data.id, context.userId);
        if (r.imageUrl) return { imageUrl: r.imageUrl, source: "ai" };
      } catch (err) {
        console.error("[force-refresh] IA falhou:", err);
        throw err;
      }
      return { imageUrl: null, source: "none" };
    },
  );

/**
 * Importa imagens em lote a partir de um ZIP enviado como base64.
 * Match por: código de barras → UUID → slug do nome.
 */
export const importImagesZip = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { zipBase64: string }) => {
    if (!input.zipBase64 || typeof input.zipBase64 !== "string") {
      throw new Error("zipBase64 obrigatório");
    }
    return input;
  })
  .handler(async ({ data, context }): Promise<ImportResult> => {
    const { importImagesFromZip } = await import("./image-import.server");
    return importImagesFromZip(data.zipBase64, context.userId);
  });
