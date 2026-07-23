import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  establishmentIds: z.array(z.string().uuid()).min(2).max(6),
  productKeys: z.array(z.string().min(1)).min(1).max(40).optional(),
  productQuery: z.string().min(1).max(80).optional(),
  days: z.number().int().min(1).max(365).default(30),
});

export type CompareRow = {
  productKey: string;
  productName: string;
  cells: Array<{
    establishmentId: string;
    price: number | null;
    capturedAt: string | null;
    changePct: number | null;
    series: Array<{ t: string; p: number }>;
    isCheapest: boolean;
  }>;
  avgPrice: number | null;
};

export type CompareResult = {
  establishments: Array<{ id: string; name: string; logoUrl: string | null; brandColor: string | null }>;
  rows: CompareRow[];
  basketTotals: Array<{ establishmentId: string; total: number; coverage: number }>;
  cheapestBasket: string | null;
};

type EstRow = {
  id: string;
  name: string;
  logo_url: string | null;
  brand_color: string | null;
};
type HistoryRow = {
  establishment_id: string;
  product_key: string;
  product_name: string | null;
  price: number;
  captured_at: string;
  change_pct: number | null;
};

export const compareEstablishments = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<CompareResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const since = new Date(Date.now() - data.days * 24 * 60 * 60 * 1000).toISOString();

    const { data: estRows, error: estErr } = await supabaseAdmin
      .from("establishments")
      .select("id, name, logo_url, brand_color")
      .in("id", data.establishmentIds);
    if (estErr) throw new Error(estErr.message);
    const establishments = (estRows ?? []) as EstRow[];

    // Discover candidate product_keys if not provided
    let productKeys = data.productKeys ?? [];
    if (productKeys.length === 0) {
      const q = supabaseAdmin
        .from("product_price_history")
        .select("product_key, product_name")
        .in("establishment_id", data.establishmentIds)
        .gte("captured_at", since)
        .limit(2000);
      const search = data.productQuery?.trim();
      const { data: candidateRows, error: candErr } = search
        ? await q.ilike("product_name", `%${search}%`)
        : await q;
      if (candErr) throw new Error(candErr.message);
      const set = new Set<string>();
      for (const r of (candidateRows ?? []) as Array<{ product_key: string }>) {
        if (r.product_key) set.add(r.product_key);
        if (set.size >= 25) break;
      }
      productKeys = Array.from(set);
    }
    if (productKeys.length === 0) {
      return { establishments: establishments.map(dtoEst), rows: [], basketTotals: [], cheapestBasket: null };
    }

    const { data: histRows, error: histErr } = await supabaseAdmin
      .from("product_price_history")
      .select("establishment_id, product_key, product_name, price, captured_at, change_pct")
      .in("establishment_id", data.establishmentIds)
      .in("product_key", productKeys)
      .gte("captured_at", since)
      .order("captured_at", { ascending: true })
      .limit(10_000);
    if (histErr) throw new Error(histErr.message);
    const hist = (histRows ?? []) as HistoryRow[];

    // Group by product_key → establishment
    type Bucket = { productName: string; byEst: Map<string, HistoryRow[]> };
    const groups = new Map<string, Bucket>();
    for (const r of hist) {
      let g = groups.get(r.product_key);
      if (!g) {
        g = { productName: r.product_name ?? r.product_key, byEst: new Map() };
        groups.set(r.product_key, g);
      }
      if (r.product_name) g.productName = r.product_name;
      const list = g.byEst.get(r.establishment_id) ?? [];
      list.push(r);
      g.byEst.set(r.establishment_id, list);
    }

    const rows: CompareRow[] = [];
    const totals = new Map<string, { total: number; coverage: number }>();
    for (const est of establishments) totals.set(est.id, { total: 0, coverage: 0 });

    for (const [productKey, group] of groups) {
      const cells: CompareRow["cells"] = [];
      const activePrices: Array<{ est: string; price: number }> = [];
      for (const est of establishments) {
        const series = group.byEst.get(est.id) ?? [];
        const last = series[series.length - 1] ?? null;
        const price = last ? Number(last.price) : null;
        const capturedAt = last?.captured_at ?? null;
        const changePct = last?.change_pct != null ? Number(last.change_pct) : null;
        if (price != null) activePrices.push({ est: est.id, price });
        cells.push({
          establishmentId: est.id,
          price,
          capturedAt,
          changePct,
          series: series.map((s) => ({ t: s.captured_at, p: Number(s.price) })),
          isCheapest: false,
        });
      }
      const min = activePrices.length > 0 ? Math.min(...activePrices.map((a) => a.price)) : null;
      if (min != null) {
        for (const c of cells) if (c.price === min) c.isCheapest = true;
      }
      const avg =
        activePrices.length > 0
          ? activePrices.reduce((s, a) => s + a.price, 0) / activePrices.length
          : null;
      rows.push({ productKey, productName: group.productName, cells, avgPrice: avg });

      for (const c of cells) {
        if (c.price != null) {
          const bucket = totals.get(c.establishmentId)!;
          bucket.total += c.price;
          bucket.coverage += 1;
        }
      }
    }

    const basketTotals = Array.from(totals.entries()).map(([establishmentId, v]) => ({
      establishmentId,
      total: v.total,
      coverage: v.coverage,
    }));
    // Cheapest basket only counts stores that cover all products
    const full = basketTotals.filter((b) => b.coverage === rows.length && rows.length > 0);
    const cheapest = full.length > 0 ? full.reduce((a, b) => (b.total < a.total ? b : a)) : null;

    return {
      establishments: establishments.map(dtoEst),
      rows: rows.sort((a, b) => a.productName.localeCompare(b.productName, "pt-BR")),
      basketTotals,
      cheapestBasket: cheapest?.establishmentId ?? null,
    };
  });

function dtoEst(e: EstRow) {
  return { id: e.id, name: e.name, logoUrl: e.logo_url, brandColor: e.brand_color };
}

export type PublicEstablishmentLite = {
  id: string;
  name: string;
  city: string | null;
  neighborhood: string | null;
  logoUrl: string | null;
  brandColor: string | null;
};

export const listComparableEstablishments = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicEstablishmentLite[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("establishments")
      .select("id, name, city, neighborhood, logo_url, brand_color, active")
      .eq("active", true)
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Array<{
      id: string;
      name: string;
      city: string | null;
      neighborhood: string | null;
      logo_url: string | null;
      brand_color: string | null;
    }>).map((r) => ({
      id: r.id,
      name: r.name,
      city: r.city,
      neighborhood: r.neighborhood,
      logoUrl: r.logo_url,
      brandColor: r.brand_color,
    }));
  },
);
