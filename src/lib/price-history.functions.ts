import { createServerFn } from "@tanstack/react-start";
import { signStorageImageUrl } from "@/lib/product-image-utils";

export type PricedProduct = {
  productName: string;
  displayName: string;
  imageUrl: string | null;
  brand: string | null;
  establishmentId: string | null;
  marketName: string | null;
  unit: string | null;
  lastPrice: number;
  lastDate: string;
  readings: number;
  variationPct: number | null; // vs leitura imediatamente anterior
};

export type PricePoint = {
  date: string;
  price: number;
  totalPrice: number | null;
  quantity: number | null;
  unit: string | null;
  marketName: string | null;
  establishmentId: string | null;
  receiptId: string | null;
};

const normalize = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

type ScanRow = {
  product_name: string | null;
  barcode: string | null;
  price_captured: number | string | null;
  total_price: number | string | null;
  quantity: number | string | null;
  unit: string | null;
  market_name: string | null;
  establishment_id: string | null;
  receipt_id: string | null;
  created_at: string;
};

const toNum = (v: unknown): number | null => {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

async function fetchScans(): Promise<ScanRow[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const table = supabaseAdmin.from("scans" as never) as unknown as {
    select: (s: string) => {
      not: (col: string, op: string, val: unknown) => {
        order: (col: string, o: { ascending: boolean }) => Promise<{
          data: ScanRow[] | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
  const { data, error } = await table
    .select(
      "product_name, barcode, price_captured, total_price, quantity, unit, market_name, establishment_id, receipt_id, created_at",
    )
    .not("price_captured", "is", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).filter((r) => r.product_name && toNum(r.price_captured));
}


type CatalogRow = {
  normalized_name: string;
  display_name: string;
  brand: string | null;
  barcode: string | null;
  image_url: string | null;
};

type Catalog = {
  byName: Map<string, CatalogRow>;
  byBarcode: Map<string, CatalogRow>;
};

async function fetchCatalog(): Promise<Catalog> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const table = supabaseAdmin.from("product_catalog" as never) as unknown as {
    select: (s: string) => Promise<{ data: CatalogRow[] | null; error: { message: string } | null }>;
  };
  const { data, error } = await table.select("normalized_name, display_name, brand, barcode, image_url");
  if (error) throw new Error(error.message);
  const byName = new Map<string, CatalogRow>();
  const byBarcode = new Map<string, CatalogRow>();
  const signedRows = await Promise.all(
    (data ?? []).map(async (r) => ({
      ...r,
      image_url: await signStorageImageUrl(r.image_url, supabaseAdmin),
    })),
  );
  for (const r of signedRows) {
    byName.set(r.normalized_name, r);
    if (r.barcode) byBarcode.set(r.barcode, r);
  }
  return { byName, byBarcode };
}

// Chave de consolidação: prefere barcode (quando informado), senão normalized_name
const groupKey = (r: ScanRow): string =>
  r.barcode?.trim() ? `bc:${r.barcode.trim()}` : `nm:${normalize(r.product_name ?? "")}`;

const lookupCatalog = (r: ScanRow, cat: Catalog): CatalogRow | undefined => {
  if (r.barcode) {
    const hit = cat.byBarcode.get(r.barcode.trim());
    if (hit) return hit;
  }
  return cat.byName.get(normalize(r.product_name ?? ""));
};

export const listPricedProducts = createServerFn({ method: "GET" }).handler(
  async (): Promise<PricedProduct[]> => {
    const [rows, catalog] = await Promise.all([fetchScans(), fetchCatalog()]);
    const map = new Map<string, ScanRow[]>();
    for (const r of rows) {
      const key = groupKey(r);
      if (key === "nm:") continue;
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    const out: PricedProduct[] = [];
    for (const [, arr] of map) {
      const last = arr[0];
      const lastPrice = toNum(last.price_captured);
      if (lastPrice == null) continue;
      const prev = arr[1] ? toNum(arr[1].price_captured) : null;
      const variation = prev && prev > 0 ? ((lastPrice - prev) / prev) * 100 : null;
      const cat = lookupCatalog(last, catalog);
      out.push({
        productName: last.product_name ?? "",
        displayName: cat?.display_name ?? last.product_name ?? "",
        imageUrl: cat?.image_url ?? null,
        brand: cat?.brand ?? null,
        establishmentId: last.establishment_id,
        marketName: last.market_name,
        unit: last.unit,
        lastPrice,
        lastDate: last.created_at,
        readings: arr.length,
        variationPct: variation,
      });
    }
    out.sort((a, b) => (a.lastDate < b.lastDate ? 1 : -1));
    return out;
  },
);

export const getProductPriceSeries = createServerFn({ method: "GET" })
  .validator((input: { productName: string }) => {
    if (!input.productName?.trim()) throw new Error("productName obrigatório");
    return input;
  })
  .handler(async ({ data }): Promise<PricePoint[]> => {
    const rows = await fetchScans();
    const nameKey = normalize(data.productName);
    // Descobre o barcode do grupo a partir de qualquer scan que bata pelo nome
    const barcodes = new Set(
      rows.filter((r) => normalize(r.product_name ?? "") === nameKey && r.barcode).map((r) => r.barcode!.trim()),
    );
    const filtered = rows.filter((r) => {
      if (r.barcode && barcodes.has(r.barcode.trim())) return true;
      return normalize(r.product_name ?? "") === nameKey;
    });
    filtered.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
    return filtered
      .map((r): PricePoint | null => {
        const p = toNum(r.price_captured);
        if (p == null) return null;
        return {
          date: r.created_at,
          price: p,
          totalPrice: toNum(r.total_price),
          quantity: toNum(r.quantity),
          unit: r.unit,
          marketName: r.market_name,
          establishmentId: r.establishment_id,
          receiptId: r.receipt_id,
        };
      })
      .filter((x): x is PricePoint => x !== null);
  });
