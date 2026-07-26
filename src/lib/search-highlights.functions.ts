import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

export type HighlightItem = {
  key: string;
  name: string;
  category: string | null;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  savings: number;
  savingsPct: number;
  cheapestStore: string | null;
  storeCount: number;
};

export type SearchHighlights = {
  /** Maiores diferenças de preço entre mercados — onde mais se economiza. */
  opportunities: HighlightItem[];
  /** Produtos com maior cobertura (presentes em mais mercados). */
  covered: HighlightItem[];
};

type ComparisonRow = {
  product_key?: string | null;
  display_name?: string | null;
  category?: string | null;
  min_price?: number | null;
  max_price?: number | null;
  avg_price?: number | null;
  savings_pct?: number | null;
  cheapest_store?: string | null;
  store_count?: number | null;
};

/**
 * Público — destaques exibidos na descoberta da busca (`/buscar` sem termo).
 * Usa o cache de comparações já existente (`get_price_comparisons`).
 */
export const getSearchHighlights = createServerFn({ method: "GET" }).handler(
  async (): Promise<SearchHighlights> => {
    try {
      setResponseHeader(
        "cache-control",
        "public, max-age=60, s-maxage=300, stale-while-revalidate=900",
      );
    } catch {
      /* ignore */
    }

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data, error } = await (
        supabaseAdmin as unknown as {
          rpc: (fn: string) => Promise<{ data: ComparisonRow[] | null; error: unknown }>;
        }
      ).rpc("get_price_comparisons");

      if (error || !data) return { opportunities: [], covered: [] };

      const items: HighlightItem[] = [];
      for (const r of data) {
        const name = (r.display_name ?? "").trim();
        const min = Number(r.min_price ?? 0);
        const max = Number(r.max_price ?? 0);
        const stores = Number(r.store_count ?? 0);
        if (!name || !Number.isFinite(min) || min <= 0 || stores < 2) continue;
        items.push({
          key: (r.product_key ?? name).toString(),
          name,
          category: (r.category ?? "").trim() || null,
          minPrice: min,
          maxPrice: Number.isFinite(max) ? max : min,
          avgPrice: Number(r.avg_price ?? min),
          savings: Math.max(0, (Number.isFinite(max) ? max : min) - min),
          savingsPct: Number(r.savings_pct ?? 0),
          cheapestStore: (r.cheapest_store ?? "").trim() || null,
          storeCount: stores,
        });
      }

      const opportunities = [...items]
        .sort((a, b) => b.savings - a.savings || b.savingsPct - a.savingsPct)
        .slice(0, 6);

      const oppKeys = new Set(opportunities.map((i) => i.key));
      const covered = [...items]
        .filter((i) => !oppKeys.has(i.key))
        .sort((a, b) => b.storeCount - a.storeCount || a.minPrice - b.minPrice)
        .slice(0, 8);

      return { opportunities, covered };
    } catch {
      return { opportunities: [], covered: [] };
    }
  },
);
