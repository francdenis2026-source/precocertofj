import { createServerFn } from "@tanstack/react-start";

export type ProductPriceStats = {
  productKey: string;
  displayName: string | null;
  minPrice: number;
  avgPrice: number;
  maxPrice: number;
  p25Price: number | null;
  p75Price: number | null;
  samples: number;
  storesCount: number;
  lastSeenAt: string | null;
  updatedAt: string;
};

type Row = {
  product_key: string;
  display_name: string | null;
  min_price: number | string;
  avg_price: number | string;
  max_price: number | string;
  p25_price: number | string | null;
  p75_price: number | string | null;
  samples: number;
  stores_count: number;
  last_seen_at: string | null;
  updated_at: string;
};

function mapRow(r: Row): ProductPriceStats {
  return {
    productKey: r.product_key,
    displayName: r.display_name,
    minPrice: Number(r.min_price),
    avgPrice: Number(r.avg_price),
    maxPrice: Number(r.max_price),
    p25Price: r.p25_price != null ? Number(r.p25_price) : null,
    p75Price: r.p75_price != null ? Number(r.p75_price) : null,
    samples: Number(r.samples),
    storesCount: Number(r.stores_count),
    lastSeenAt: r.last_seen_at,
    updatedAt: r.updated_at,
  };
}

/**
 * Fetch cached price statistics (min/avg/max/percentiles) for a list of
 * normalized product keys. Reads from `product_price_stats` which is
 * maintained by trigger. Public — no auth required.
 */
export const getProductPriceStats = createServerFn({ method: "POST" })
  .inputValidator((input: { keys: string[] }) => {
    const keys = Array.isArray(input?.keys)
      ? Array.from(new Set(input.keys.map((k) => String(k ?? "").trim()).filter(Boolean))).slice(0, 200)
      : [];
    return { keys };
  })
  .handler(async ({ data }): Promise<ProductPriceStats[]> => {
    if (data.keys.length === 0) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const client = supabaseAdmin as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          in: (c: string, v: string[]) => Promise<{ data: Row[] | null; error: { message: string } | null }>;
        };
      };
    };
    const { data: rows, error } = await client
      .from("product_price_stats")
      .select("product_key, display_name, min_price, avg_price, max_price, p25_price, p75_price, samples, stores_count, last_seen_at, updated_at")
      .in("product_key", data.keys);
    if (error) throw new Error(error.message);
    return (rows ?? []).map(mapRow);
  });

/**
 * Full-text-ish lookup by display name tokens. Returns the best matching
 * cached stats row (highest samples). Used by the price search to expose
 * global historical min/avg/max in the fair-price badge.
 */
export const findProductPriceStatsByQuery = createServerFn({ method: "POST" })
  .inputValidator((input: { query: string }) => {
    const q = String(input?.query ?? "").trim().slice(0, 80);
    return { query: q };
  })
  .handler(async ({ data }): Promise<ProductPriceStats | null> => {
    if (data.query.length < 2) return null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const client = supabaseAdmin as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{
        data: Array<{ product_key: string }> | null;
        error: { message: string } | null;
      }>;
      from: (t: string) => {
        select: (s: string) => {
          in: (c: string, v: string[]) => {
            order: (c: string, o: { ascending: boolean }) => {
              limit: (n: number) => Promise<{ data: Row[] | null; error: { message: string } | null }>;
            };
          };
        };
      };
    };
    // Use existing catalog suggestion function to find candidate display names,
    // then map to normalized keys server-side by scanning the small suggestion set.
    // Simpler: use ilike on display_name for each token.
    const tokens = data.query
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length >= 2)
      .slice(0, 5);
    if (tokens.length === 0) return null;

    const raw = supabaseAdmin as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          ilike: (c: string, v: string) => {
            order: (c: string, o: { ascending: boolean }) => {
              limit: (n: number) => Promise<{ data: Row[] | null; error: { message: string } | null }>;
            };
          };
        };
      };
    };
    // First-token prefilter (cheap), then filter remaining tokens in JS.
    const { data: rows, error } = await raw
      .from("product_price_stats")
      .select("product_key, display_name, min_price, avg_price, max_price, p25_price, p75_price, samples, stores_count, last_seen_at, updated_at")
      .ilike("display_name", `%${tokens[0]}%`)
      .order("samples", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    const list = (rows ?? []).filter((r) => {
      const n = (r.display_name ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      return tokens.every((t) => n.includes(t));
    });
    if (list.length === 0) return null;
    // Highest samples first (order preserved by DB order).
    return mapRow(list[0]);
    // client param unused (kept for potential future rpc use)
    void client;
  });
