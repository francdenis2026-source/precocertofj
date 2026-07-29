import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

export type SuggestionMarket = {
  establishmentId: string | null;
  name: string;
  price: number;
  unit: string | null;
  quantity: number | null;
  capturedAt: string;
};

export type ProductSuggestion = {
  slug: string;
  name: string;
  minPrice: number | null;
  maxPrice: number | null;
  marketCount: number;
  markets: SuggestionMarket[];
};

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Public — sugere produtos que casam com o termo digitado, agregando
 * todos os estabelecimentos com preço/unidade/data para comparação
 * direto no dropdown da homepage.
 */
export const getProductSuggestions = createServerFn({ method: "GET" })
  .inputValidator((input?: { q?: string; limit?: number }) => {
    const q = (input?.q ?? "").trim().slice(0, 60);
    const limit = Math.min(Math.max(input?.limit ?? 5, 1), 8);
    return { q, limit };
  })
  .handler(async ({ data }): Promise<ProductSuggestion[]> => {
    const term = data.q;
    if (term.length < 2) return [];

    try {
      setResponseHeader(
        "cache-control",
        "public, max-age=30, s-maxage=120, stale-while-revalidate=600",
      );
    } catch {
      /* ignore */
    }

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: rows, error } = await supabaseAdmin
        .from("scans")
        .select(
          "product_name, price_captured, market_name, establishment_id, unit, quantity, created_at",
        )
        .eq("status", "salvo")
        .not("product_name", "is", null)
        .not("price_captured", "is", null)
        .order("created_at", { ascending: false })
        .limit(800);

      if (error || !rows) return [];

      const key = normalize(term);
      // productNorm -> product aggregate
      const products = new Map<
        string,
        {
          slug: string;
          name: string;
          // marketKey -> most recent market entry
          markets: Map<string, SuggestionMarket>;
        }
      >();

      for (const r of rows) {
        const name = (r.product_name ?? "").trim();
        if (!name) continue;
        const norm = normalize(name);
        if (!norm.includes(key)) continue;

        let bucket = products.get(norm);
        if (!bucket) {
          bucket = {
            slug: norm.replace(/\s+/g, "-"),
            name,
            markets: new Map(),
          };
          products.set(norm, bucket);
        }

        const price = Number(r.price_captured);
        if (!Number.isFinite(price) || price <= 0) continue;

        const marketName = (r.market_name ?? "").trim();
        const marketKey =
          (r.establishment_id as string | null) ||
          (marketName ? `name:${normalize(marketName)}` : null);
        if (!marketKey) continue;

        // Só mantém a leitura mais recente por mercado (rows já vem DESC por created_at).
        if (bucket.markets.has(marketKey)) continue;

        bucket.markets.set(marketKey, {
          establishmentId: (r.establishment_id as string | null) ?? null,
          name: marketName || "Mercado",
          price,
          unit: (r.unit as string | null) ?? null,
          quantity:
            r.quantity != null && Number.isFinite(Number(r.quantity))
              ? Number(r.quantity)
              : null,
          capturedAt: r.created_at as string,
        });
      }

      const out: ProductSuggestion[] = [];
      for (const bucket of products.values()) {
        const markets = Array.from(bucket.markets.values()).sort(
          (a, b) => a.price - b.price,
        );
        if (markets.length === 0) continue;
        const prices = markets.map((m) => m.price);
        out.push({
          slug: bucket.slug,
          name: bucket.name,
          minPrice: Math.min(...prices),
          maxPrice: Math.max(...prices),
          marketCount: markets.length,
          markets,
        });
      }

      // Ordena por (mais mercados desc, menor preço asc) para priorizar comparações ricas.
      out.sort((a, b) => {
        if (b.marketCount !== a.marketCount) return b.marketCount - a.marketCount;
        return (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity);
      });

      return out.slice(0, data.limit);
    } catch {
      return [];
    }
  });
