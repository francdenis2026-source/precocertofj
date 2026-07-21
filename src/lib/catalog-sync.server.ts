/**
 * Server-only helper: garante entradas em product_catalog para todos os itens
 * de um cupom. Faz consolidação por barcode (quando informado) e fallback
 * por normalized_name. Não sobrescreve entradas já existentes.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const normalize = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

const toTitleCase = (s: string): string =>
  s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w.length <= 2 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ")
    .trim();

type Item = { productName: string; barcode: string | null; unit: string | null };

type CatalogRow = { id: string; normalized_name: string; barcode: string | null };

export async function ensureCatalogEntries(items: Item[]): Promise<void> {
  const cleaned = items
    .map((it) => ({
      productName: it.productName?.trim() ?? "",
      barcode: it.barcode?.trim() || null,
      unit: it.unit?.trim() || null,
      normalized: normalize(it.productName ?? ""),
    }))
    .filter((it) => it.normalized.length > 0);
  if (cleaned.length === 0) return;

  const uniqueNames = Array.from(new Set(cleaned.map((c) => c.normalized)));
  const uniqueBarcodes = Array.from(new Set(cleaned.map((c) => c.barcode).filter((b): b is string => !!b)));

  const table = supabaseAdmin.from("product_catalog" as never) as unknown as {
    select: (s: string) => {
      or: (
        expr: string,
      ) => Promise<{ data: CatalogRow[] | null; error: { message: string } | null }>;
    };
    insert: (v: Record<string, unknown>[]) => Promise<{ error: { message: string } | null }>;
  };

  const orExpr = [
    uniqueNames.length ? `normalized_name.in.(${uniqueNames.map((n) => `"${n.replace(/"/g, '\\"')}"`).join(",")})` : null,
    uniqueBarcodes.length ? `barcode.in.(${uniqueBarcodes.join(",")})` : null,
  ]
    .filter(Boolean)
    .join(",");

  const { data: existing, error: exErr } = await table
    .select("id, normalized_name, barcode")
    .or(orExpr || "id.is.null");
  if (exErr) throw new Error(exErr.message);

  const byName = new Map<string, CatalogRow>();
  const byBarcode = new Map<string, CatalogRow>();
  for (const row of existing ?? []) {
    byName.set(row.normalized_name, row);
    if (row.barcode) byBarcode.set(row.barcode, row);
  }

  const toInsert: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  for (const it of cleaned) {
    const foundByBarcode = it.barcode ? byBarcode.get(it.barcode) : null;
    const foundByName = byName.get(it.normalized);
    if (foundByBarcode || foundByName) continue;
    const key = `${it.normalized}::${it.barcode ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    toInsert.push({
      normalized_name: it.normalized,
      display_name: toTitleCase(it.productName),
      barcode: it.barcode,
      default_unit: it.unit,
      image_url: null,
    });
  }

  if (toInsert.length > 0) {
    const insertTable = supabaseAdmin.from("product_catalog" as never) as unknown as {
      insert: (v: Record<string, unknown>[]) => {
        select: (
          s: string,
        ) => Promise<{ data: Array<{ id: string }> | null; error: { message: string } | null }>;
      };
    };
    const { error: insErr } = await insertTable.insert(toInsert).select("id");
    if (insErr && !/duplicate|unique/i.test(insErr.message)) {
      throw new Error(insErr.message);
    }
    // Nota: NÃO dispara geração automática de IA aqui. Os novos itens ficam
    // sem `image_url` e sem `image_search_attempted_at`, aguardando que o admin
    // decida em /admin/catalogo se procura foto real (web/upload) ou marca
    // como "não encontrada" para habilitar a rotina automática de IA.
  }
}
