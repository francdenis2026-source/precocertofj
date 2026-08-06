import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";

/**
 * Recebe uma imagem em data URL (base64) e faz upload no bucket informado.
 * Retorna a URL pública (bucket `logos` tem policy pública de leitura).
 */
export const uploadImageDataUrl = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: { bucket: string; path: string; dataUrl: string }) => {
    if (!input.bucket) throw new Error("bucket obrigatório");
    if (!input.path) throw new Error("path obrigatório");
    if (!input.dataUrl?.startsWith("data:")) throw new Error("dataUrl inválido");
    return input;
  })
  .handler(async ({ data }): Promise<{ path: string; publicUrl: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const match = data.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error("Formato de imagem inválido");
    const mime = match[1];
    const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));

    const { error } = await supabaseAdmin.storage
      .from(data.bucket)
      .upload(data.path, bytes, { contentType: mime, upsert: true });
    if (error) throw new Error(error.message);

    const { data: pub } = supabaseAdmin.storage.from(data.bucket).getPublicUrl(data.path);
    return { path: data.path, publicUrl: pub.publicUrl };
  });
