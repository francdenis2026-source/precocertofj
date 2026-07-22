import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * User personal savings: based on the user's own scans over the last 30 days,
 * compare each scanned product to the current regional minimum price and
 * report how much they could have saved (or already saved by choosing the cheapest).
 */
export type EconomyItem = {
  productKey: string;
  displayName: string;
  storeName: string | null;
  userPaid: number;
  minPrice: number;
  savingsPerUnit: number;
  scannedAt: string;
};

export type PersonalEconomy = {
  totalSavings: number;
  totalPotential: number;
  itemsAnalyzed: number;
  items: EconomyItem[];
};

export type RegionalBasketItem = {
  productKey: string;
  displayName: string;
  category: string | null;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  cheapestStore: string | null;
  savings: number;
  savingsPct: number;
};

export type RegionalEconomy = {
  totalAvg: number;
  totalMin: number;
  totalSavings: number;
  items: RegionalBasketItem[];
};

export const getPersonalEconomy = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PersonalEconomy> => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const client = supabase as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (c: string, v: unknown) => {
            gte: (c: string, v: string) => {
              order: (c: string, o: { ascending: boolean }) => {
                limit: (n: number) => Promise<{
                  data: Array<{
                    product_name: string;
                    price_captured: number;
                    market_name: string | null;
                    created_at: string;
                  }> | null;
                  error: { message: string } | null;
                }>;
              };
            };
          };
        };
      };
    };

    const { data: scans, error: scErr } = await client
      .from("scans")
      .select("product_name, price_captured, market_name, created_at")
      .eq("user_id", userId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200);
    if (scErr) throw new Error(scErr.message);

    if (!scans || scans.length === 0) {
      return { totalSavings: 0, totalPotential: 0, itemsAnalyzed: 0, items: [] };
    }

    // Fetch price stats for these keys in one shot
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rpc = supabaseAdmin as unknown as {
      rpc: (name: string, args: Record<string, unknown>) => Promise<{
        data: Array<{ nkey: string; min_price: number; display_name: string }> | null;
        error: { message: string } | null;
      }>;
      from: (t: string) => {
        select: (s: string) => {
          in: (c: string, v: string[]) => Promise<{
            data: Array<{ product_key: string; min_price: number; display_name: string | null }> | null;
            error: { message: string } | null;
          }>;
        };
      };
    };

    // Try reading product_price_stats directly (no RLS block for admin client; used only for aggregation).
    // Compute the product_key for each scan client-side via a normalization proxy: use lowercase + strip.
    // But scans store product_name only. We fetch stats by normalized keys we can compute here:
    const normalize = (s: string) =>
      s
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const keys = Array.from(new Set(scans.map((s) => normalize(s.product_name))));
    const { data: stats, error: stErr } = await rpc
      .from("product_price_stats")
      .select("product_key, min_price, display_name")
      .in("product_key", keys);
    if (stErr) throw new Error(stErr.message);

    const byKey = new Map<string, { min: number; display: string | null }>();
    for (const s of stats ?? []) byKey.set(s.product_key, { min: Number(s.min_price), display: s.display_name });

    const items: EconomyItem[] = [];
    let totalSavings = 0;
    let totalPotential = 0;
    for (const s of scans) {
      const k = normalize(s.product_name);
      const stat = byKey.get(k);
      if (!stat) continue;
      const paid = Number(s.price_captured);
      const diff = paid - stat.min;
      if (diff > 0.01) totalPotential += diff;
      if (diff <= -0.01) totalSavings += Math.abs(diff);
      items.push({
        productKey: k,
        displayName: stat.display ?? s.product_name,
        storeName: s.market_name,
        userPaid: paid,
        minPrice: stat.min,
        savingsPerUnit: -diff,
        scannedAt: s.created_at,
      });
    }

    // Sort by highest potential savings first
    items.sort((a, b) => (b.userPaid - b.minPrice) - (a.userPaid - a.minPrice));

    return {
      totalSavings: Math.round(totalSavings * 100) / 100,
      totalPotential: Math.round(totalPotential * 100) / 100,
      itemsAnalyzed: items.length,
      items: items.slice(0, 50),
    };
  });

export const getRegionalEconomy = createServerFn({ method: "GET" }).handler(
  async (): Promise<RegionalEconomy> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const client = supabaseAdmin as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          gte: (c: string, v: number) => {
            order: (c: string, o: { ascending: boolean }) => {
              limit: (n: number) => Promise<{
                data: Array<{
                  product_key: string;
                  display_name: string;
                  category: string | null;
                  avg_price: number;
                  min_price: number;
                  max_price: number;
                  cheapest_store: string | null;
                  store_count: number;
                }> | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      };
    };

    const { data, error } = await client
      .from("product_comparison_cache")
      .select("product_key, display_name, category, avg_price, min_price, max_price, cheapest_store, store_count")
      .gte("store_count", 2)
      .order("store_count", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);

    const items: RegionalBasketItem[] = (data ?? []).map((r) => {
      const savings = Number(r.avg_price) - Number(r.min_price);
      return {
        productKey: r.product_key,
        displayName: r.display_name,
        category: r.category,
        avgPrice: Number(r.avg_price),
        minPrice: Number(r.min_price),
        maxPrice: Number(r.max_price),
        cheapestStore: r.cheapest_store,
        savings: Math.round(savings * 100) / 100,
        savingsPct: r.avg_price > 0 ? Math.round((savings / Number(r.avg_price)) * 1000) / 10 : 0,
      };
    });

    const totalAvg = items.reduce((s, i) => s + i.avgPrice, 0);
    const totalMin = items.reduce((s, i) => s + i.minPrice, 0);

    return {
      totalAvg: Math.round(totalAvg * 100) / 100,
      totalMin: Math.round(totalMin * 100) / 100,
      totalSavings: Math.round((totalAvg - totalMin) * 100) / 100,
      items,
    };
  },
);
