/**
 * Server-only: importa imagens em lote a partir de um arquivo ZIP (base64).
 * Faz match com produtos do catálogo por:
 *   1. Código de barras (nome do arquivo == barcode)
 *   2. UUID do produto (nome do arquivo == id)
 *   3. Slug normalizado do display_name
 */
import JSZip from "jszip";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logAudit } from "./catalog-audit.server";

export type ImportResult = {
  totalFiles: number;
  imported: number;
  skipped: number;
  errors: Array<{ file: string; reason: string }>;
};

type CatalogRow = {
  id: string;
  display_name: string;
  barcode: string | null;
  image_url: string | null;
};

function normalizeSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extFromName(fileName: string): { base: string; ext: string } {
  const clean = fileName.split("/").pop() ?? fileName;
  const dot = clean.lastIndexOf(".");
  if (dot < 0) return { base: clean, ext: "jpg" };
  return { base: clean.slice(0, dot), ext: clean.slice(dot + 1).toLowerCase() };
}

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function importImagesFromZip(
  zipBase64: string,
  actorUserId: string | null,
): Promise<ImportResult> {
  const buf = Uint8Array.from(atob(zipBase64), (c) => c.charCodeAt(0));
  const zip = await JSZip.loadAsync(buf);

  // Carrega catálogo em memória p/ match (limitado a 20k produtos)
  const table = supabaseAdmin.from("product_catalog" as never) as unknown as {
    select: (s: string) => {
      limit: (
        n: number,
      ) => Promise<{ data: CatalogRow[] | null; error: { message: string } | null }>;
    };
    update: (p: Record<string, unknown>) => {
      eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
    };
  };
  const { data: catalog, error: catErr } = await table
    .select("id, display_name, barcode, image_url")
    .limit(20000);
  if (catErr) throw new Error(catErr.message);

  const byBarcode = new Map<string, CatalogRow>();
  const byId = new Map<string, CatalogRow>();
  const bySlug = new Map<string, CatalogRow>();
  for (const c of catalog ?? []) {
    if (c.barcode) byBarcode.set(c.barcode.trim(), c);
    byId.set(c.id, c);
    bySlug.set(normalizeSlug(c.display_name), c);
  }

  const result: ImportResult = { totalFiles: 0, imported: 0, skipped: 0, errors: [] };

  const files = Object.values(zip.files).filter((f) => !f.dir);
  for (const file of files) {
    const { base, ext } = extFromName(file.name);
    if (!IMAGE_EXTS.has(ext)) {
      // ignora silenciosamente arquivos não-imagem (ex: __MACOSX)
      continue;
    }
    result.totalFiles++;

    const candidate = base.trim();
    let match: CatalogRow | undefined =
      byBarcode.get(candidate) ??
      byId.get(candidate) ??
      bySlug.get(normalizeSlug(candidate));

    if (!match) {
      result.skipped++;
      result.errors.push({ file: file.name, reason: "sem correspondência no catálogo" });
      continue;
    }

    try {
      const bytes = await file.async("uint8array");
      if (bytes.byteLength < 512) {
        result.skipped++;
        result.errors.push({ file: file.name, reason: "arquivo muito pequeno" });
        continue;
      }
      const path = `products/${match.id}-zip-${Date.now()}.${ext === "jpeg" ? "jpg" : ext}`;
      const { error: upErr } = await supabaseAdmin.storage
        .from("logos")
        .upload(path, bytes, {
          contentType: MIME_BY_EXT[ext] ?? "image/jpeg",
          upsert: true,
        });
      if (upErr) throw new Error(upErr.message);

      const { data: pub } = supabaseAdmin.storage.from("logos").getPublicUrl(path);
      const newUrl = pub.publicUrl;

      const { error: updErr } = await table
        .update({
          image_url: newUrl,
          image_source: "upload",
          image_search_attempted_at: new Date().toISOString(),
          image_search_found: true,
        })
        .eq("id", match.id);
      if (updErr) throw new Error(updErr.message);

      await logAudit({
        catalogId: match.id,
        actorUserId,
        action: "image_upload",
        field: "image_url",
        oldValue: match.image_url,
        newValue: newUrl,
        metadata: { source: "zip", filename: file.name },
      });

      result.imported++;
    } catch (err) {
      result.skipped++;
      result.errors.push({
        file: file.name,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}
