import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";
import { z } from "zod";

export type PriceHistoryRow = {
  id: string;
  establishmentId: string;
  establishmentName: string | null;
  productKey: string;
  productName: string;
  brand: string | null;
  sizeValue: number | null;
  sizeUnit: string | null;
  price: number;
  previousPrice: number | null;
  changePct: number | null;
  source: string;
  capturedAt: string;
};

type RawRow = {
  id: string;
  establishment_id: string;
  product_key: string;
  product_name: string;
  brand: string | null;
  size_value: number | string | null;
  size_unit: string | null;
  price: number | string;
  previous_price: number | string | null;
  change_pct: number | string | null;
  source: string;
  captured_at: string;
  establishments?: { name: string | null } | null;
};

const toNum = (v: unknown): number | null => {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

const mapRow = (r: RawRow): PriceHistoryRow => ({
  id: r.id,
  establishmentId: r.establishment_id,
  establishmentName: r.establishments?.name ?? null,
  productKey: r.product_key,
  productName: r.product_name,
  brand: r.brand,
  sizeValue: toNum(r.size_value),
  sizeUnit: r.size_unit,
  price: toNum(r.price) ?? 0,
  previousPrice: toNum(r.previous_price),
  changePct: toNum(r.change_pct),
  source: r.source,
  capturedAt: r.captured_at,
});

const ListInputSchema = z.object({
  establishmentId: z.string().uuid().nullable().optional(),
  productSearch: z.string().trim().max(120).nullable().optional(),
  onlyChanges: z.boolean().nullable().optional(),
  limit: z.number().int().min(1).max(500).nullable().optional(),
});

export const listPriceHistory = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: unknown) => ListInputSchema.parse(input ?? {}))
  .handler(async ({ data, context }): Promise<PriceHistoryRow[]> => {
    let query = context.supabase
      .from("product_price_history")
      .select(
        "id, establishment_id, product_key, product_name, brand, size_value, size_unit, price, previous_price, change_pct, source, captured_at, establishments(name)",
      )
      .order("captured_at", { ascending: false })
      .limit(data.limit ?? 200);

    if (data.establishmentId) {
      query = query.eq("establishment_id", data.establishmentId);
    }
    if (data.productSearch) {
      query = query.ilike("product_name", `%${data.productSearch}%`);
    }
    if (data.onlyChanges) {
      query = query.not("previous_price", "is", null);
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return (rows as unknown as RawRow[] | null ?? []).map(mapRow);
  });

const SeriesInputSchema = z.object({
  establishmentId: z.string().uuid(),
  productKey: z.string().min(1).max(200),
});

export const getProductHistory = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: unknown) => SeriesInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<PriceHistoryRow[]> => {
    const { data: rows, error } = await context.supabase
      .from("product_price_history")
      .select(
        "id, establishment_id, product_key, product_name, brand, size_value, size_unit, price, previous_price, change_pct, source, captured_at, establishments(name)",
      )
      .eq("establishment_id", data.establishmentId)
      .eq("product_key", data.productKey)
      .order("captured_at", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);
    return (rows as unknown as RawRow[] | null ?? []).map(mapRow);
  });
