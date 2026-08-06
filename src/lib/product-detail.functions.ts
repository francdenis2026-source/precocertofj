import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ProductDetail = {
  id: string;
  name: string;
  ean: string;
  unit: string;
  category: string;
  currentPrice: number;
  createdAt: string;
  history: {
    avg: number | null;
    min: number | null;
    max: number | null;
    samples: number;
  };
  markets: Array<{
    marketName: string;
    priceAvg: number;
    samples: number;
    lastSeen: string;
  }>;
  cheapest: { marketName: string; price: number; when: string } | null;
};

export const getProductDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string }) => {
    if (!input.id) throw new Error("id obrigatório");
    return input;
  })
  .handler(async ({ data, context }): Promise<ProductDetail | null> => {
    const { supabase, userId } = context;
    const { data: p, error } = await supabase
      .from("products")
      .select("id, name, ean, unit, category, current_price, created_at, owner_id")
      .eq("id", data.id)
      .eq("owner_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!p) return null;

    const { data: scans } = await supabase
      .from("scans")
      .select("price_captured, market_name, created_at, barcode, product_name")
      .or(`barcode.eq.${p.ean},product_name.ilike.${p.name}`)
      .not("price_captured", "is", null)
      .limit(500);

    type Row = { price_captured: number | null; market_name: string | null; created_at: string };
    const rows = ((scans ?? []) as Row[]).filter(
      (r) => r.price_captured !== null && Number(r.price_captured) > 0,
    );
    const prices = rows.map((r) => Number(r.price_captured));
    const avg = prices.length
      ? Number((prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2))
      : null;
    const min = prices.length ? Math.min(...prices) : null;
    const max = prices.length ? Math.max(...prices) : null;

    const marketMap = new Map<
      string,
      { total: number; samples: number; lastSeen: string }
    >();
    for (const r of rows) {
      const key = (r.market_name ?? "").trim();
      if (!key) continue;
      const cur = marketMap.get(key) ?? { total: 0, samples: 0, lastSeen: r.created_at };
      cur.total += Number(r.price_captured);
      cur.samples += 1;
      if (new Date(r.created_at) > new Date(cur.lastSeen)) cur.lastSeen = r.created_at;
      marketMap.set(key, cur);
    }
    const markets = Array.from(marketMap.entries())
      .map(([marketName, v]) => ({
        marketName,
        priceAvg: Number((v.total / v.samples).toFixed(2)),
        samples: v.samples,
        lastSeen: v.lastSeen,
      }))
      .sort((a, b) => a.priceAvg - b.priceAvg);

    const cheapest = rows.reduce<{ marketName: string; price: number; when: string } | null>(
      (best, r) => {
        const price = Number(r.price_captured);
        const market = (r.market_name ?? "").trim();
        if (!market) return best;
        if (!best || price < best.price)
          return { marketName: market, price, when: r.created_at };
        return best;
      },
      null,
    );

    return {
      id: p.id,
      name: p.name,
      ean: p.ean,
      unit: p.unit,
      category: p.category,
      currentPrice: Number(p.current_price),
      createdAt: p.created_at,
      history: { avg, min, max, samples: rows.length },
      markets,
      cheapest,
    };
  });

export type MyProduct = {
  id: string;
  name: string;
  ean: string;
  category: string;
  unit: string;
  currentPrice: number;
  createdAt: string;
};

export const listMyProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyProduct[]> => {
    const { data, error } = await context.supabase
      .from("products")
      .select("id, name, ean, category, unit, current_price, created_at")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      ean: r.ean,
      category: r.category,
      unit: r.unit,
      currentPrice: Number(r.current_price),
      createdAt: r.created_at,
    }));
  });

export type MyProductsPage = {
  items: MyProduct[];
  nextOffset: number | null;
  total: number | null;
};

export const listMyProductsPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { offset?: number; limit?: number }) => ({
    offset: Math.max(0, Math.floor(input.offset ?? 0)),
    limit: Math.min(100, Math.max(1, Math.floor(input.limit ?? 30))),
  }))
  .handler(async ({ data, context }): Promise<MyProductsPage> => {
    const from = data.offset;
    const to = data.offset + data.limit - 1;
    const { data: rows, error, count } = await context.supabase
      .from("products")
      .select("id, name, ean, category, unit, current_price, created_at", { count: "exact" })
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw new Error(error.message);
    const items = (rows ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      ean: r.ean,
      category: r.category,
      unit: r.unit,
      currentPrice: Number(r.current_price),
      createdAt: r.created_at,
    }));
    return {
      items,
      nextOffset: items.length === data.limit ? data.offset + data.limit : null,
      total: typeof count === "number" ? count : null,
    };
  });
