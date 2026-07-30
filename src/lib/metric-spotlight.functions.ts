import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { slugifyEstablishment } from "@/lib/establishment-slug.functions";
import { CATEGORY_LABELS } from "@/lib/product-category";

export type MetricStoreItem = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  neighborhood: string | null;
  logoUrl: string | null;
  brandColor: string | null;
  productCount: number;
  lastUpdate: string | null;
};

export type MetricRecentUpdate = {
  productName: string;
  marketName: string | null;
  marketSlug: string | null;
  price: number;
  when: string;
};

export type MetricCategoryBreakdown = {
  key: string;
  label: string;
  count: number;
};

export type MetricSavingsHighlight = {
  displayName: string;
  category: string | null;
  minPrice: number;
  maxPrice: number;
  savingsPct: number;
  storeCount: number;
  cheapestStore: string | null;
  cheapestStoreSlug: string | null;
  catalogSlug: string | null;
};

export type MetricSpotlight = {
  totals: {
    establishments: number;
    products: number;
    scans7d: number;
    avgSavingsPct: number;
    bestSavingsPct: number;
    productsCompared: number;
    lastUpdate: string | null;
  };
  stores: MetricStoreItem[];
  recentUpdates: MetricRecentUpdate[];
  topCategories: MetricCategoryBreakdown[];
  topSavings: MetricSavingsHighlight[];
};



export const getMetricSpotlight = createServerFn({ method: "GET" }).handler(
  async (): Promise<MetricSpotlight> => {
    try {
      setResponseHeader(
        "cache-control",
        "public, max-age=120, s-maxage=300, stale-while-revalidate=900",
      );
    } catch {
      /* ignore */
    }

    const empty: MetricSpotlight = {
      totals: {
        establishments: 0,
        products: 0,
        scans7d: 0,
        avgSavingsPct: 0,
        bestSavingsPct: 0,
        productsCompared: 0,
        lastUpdate: null,
      },
      stores: [],
      recentUpdates: [],
      topCategories: [],
      topSavings: [],
    };

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const sb = supabaseAdmin as unknown as {
        from: (t: string) => any;
      };

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [estabsRes, recentRes, compRes, scans7dRes, latestRes, storeCountsRes] =
        await Promise.all([
          sb
            .from("establishments")
            .select("id, name, city, neighborhood, logo_url, brand_color")
            .eq("active", true)
            .order("name"),
          sb
            .from("scans")
            .select("product_name, market_name, price_captured, created_at")
            .eq("status", "salvo")
            .not("price_captured", "is", null)
            .order("created_at", { ascending: false })
            .limit(120),
          sb
            .from("product_comparison_cache")
            .select(
              "display_name, category, min_price, max_price, savings_pct, store_count, cheapest_store, catalog_slug",
            )
            .gte("store_count", 2)
            .order("savings_pct", { ascending: false })
            .limit(80),
          sb
            .from("scans")
            .select("id", { count: "exact", head: true })
            .eq("status", "salvo")
            .not("price_captured", "is", null)
            .gte("created_at", sevenDaysAgo),
          sb
            .from("scans")
            .select("created_at")
            .eq("status", "salvo")
            .not("price_captured", "is", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          Promise.resolve({ data: [] as unknown[] }),
        ]);

      // Todos os preços salvos — paginado (PostgREST corta em 1000 linhas).
      const allScans: Array<{
        establishment_id: string | null;
        created_at: string;
        product_name: string | null;
      }> = [];
      {
        const PAGE_SCANS = 1000;
        for (let from = 0; from < 40000; from += PAGE_SCANS) {
          const res = await sb
            .from("scans")
            .select("establishment_id, created_at, product_name")
            .eq("status", "salvo")
            .is("user_id", null)
            .not("price_captured", "is", null)
            .order("created_at", { ascending: false })
            .range(from, from + PAGE_SCANS - 1);
          const rows = (res.data ?? []) as typeof allScans;
          allScans.push(...rows);
          if (rows.length < PAGE_SCANS) break;
        }
      }


      const estabs = (estabsRes.data ?? []) as Array<{
        id: string;
        name: string;
        city: string | null;
        neighborhood: string | null;
        logo_url: string | null;
        brand_color: string | null;
      }>;

      const scansPerStore = new Map<
        string,
        { count: number; last: string | null; names: Set<string> }
      >();
      const uniqueProductNames = new Set<string>();
      for (const s of allScans) {
        if (s.product_name)
          uniqueProductNames.add(
            s.product_name
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, " ")
              .trim(),
          );

        if (!s.establishment_id) continue;
        const cur = scansPerStore.get(s.establishment_id) ?? {
          count: 0,
          last: null,
          names: new Set<string>(),
        };
        cur.count += 1;
        if (s.product_name) cur.names.add(s.product_name.toLowerCase());
        if (!cur.last || s.created_at > cur.last) cur.last = s.created_at;
        scansPerStore.set(s.establishment_id, cur);
      }

      const stores: MetricStoreItem[] = estabs
        .map((e) => {
          const info = scansPerStore.get(e.id);
          return {
            id: e.id,
            name: e.name,
            slug: slugifyEstablishment(e.name),
            city: e.city,
            neighborhood: e.neighborhood,
            logoUrl: e.logo_url,
            brandColor: e.brand_color,
            productCount: info?.names.size ?? 0,
            lastUpdate: info?.last ?? null,
          };
        })
        .sort((a, b) => b.productCount - a.productCount);

      // Produtos cadastrados = itens distintos com preço registrado em algum mercado.
      const totalProducts = uniqueProductNames.size;


      // Total de itens em comparação (pares com >=2 mercados).
      const comparedCountRes = await sb
        .from("product_comparison_cache")
        .select("catalog_slug", { count: "exact", head: true })
        .gte("store_count", 2);
      const totalCompared = comparedCountRes.count ?? 0;

      // Distribuição por categoria — paginado manualmente para escapar do limite 1000 do PostgREST.
      const catCounts = new Map<string, number>();
      const PAGE = 1000;
      for (let from = 0; from < 20000; from += PAGE) {
        const pageRes = await sb
          .from("product_comparison_cache")
          .select("category")
          .not("category", "is", null)
          .range(from, from + PAGE - 1);
        const rows = (pageRes.data ?? []) as Array<{ category: string | null }>;
        for (const c of rows) {
          if (!c.category) continue;
          catCounts.set(c.category, (catCounts.get(c.category) ?? 0) + 1);
        }
        if (rows.length < PAGE) break;
      }
      const topCategories: MetricCategoryBreakdown[] = Array.from(catCounts.entries())
        .map(([key, count]) => ({ key, label: CATEGORY_LABELS[key] ?? key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()), count }))
        .sort((a, b) => b.count - a.count);


      const savings = (compRes.data ?? [])
        .map((r: any) => Number(r.savings_pct))
        .filter((n: number) => Number.isFinite(n) && n > 0);
      const avgSavingsPct = savings.length
        ? Math.round(savings.reduce((a: number, b: number) => a + b, 0) / savings.length)
        : 0;
      const bestSavingsPct = savings.length ? Math.round(Math.max(...savings)) : 0;

      const storeSlugByName = new Map<string, string>();
      for (const st of stores) storeSlugByName.set(st.name.trim().toLowerCase(), st.slug);
      const resolveStoreSlug = (name: string | null | undefined): string | null => {
        if (!name) return null;
        const key = name.trim().toLowerCase();
        const direct = storeSlugByName.get(key);
        if (direct) return direct;
        for (const [n, slug] of storeSlugByName) {
          if (n.includes(key) || key.includes(n)) return slug;
        }
        return null;
      };

      const topSavings: MetricSavingsHighlight[] = (compRes.data ?? []).map((r: any) => ({
        displayName: r.display_name ?? "Produto",
        category: r.category ?? null,
        minPrice: Number(r.min_price ?? 0),
        maxPrice: Number(r.max_price ?? 0),
        savingsPct: Number(r.savings_pct ?? 0),
        storeCount: Number(r.store_count ?? 0),
        cheapestStore: r.cheapest_store ?? null,
        cheapestStoreSlug: resolveStoreSlug(r.cheapest_store),
        catalogSlug: r.catalog_slug ?? null,
      }));

      const recentUpdates: MetricRecentUpdate[] = (recentRes.data ?? []).map((r: any) => ({
        productName: r.product_name ?? "Item",
        marketName: r.market_name ?? null,
        marketSlug: resolveStoreSlug(r.market_name),
        price: Number(r.price_captured ?? 0),
        when: r.created_at,
      }));

      return {
        totals: {
          establishments: stores.length,
          products: totalProducts,
          scans7d: scans7dRes.count ?? 0,
          avgSavingsPct,
          bestSavingsPct,
          productsCompared: totalCompared,
          lastUpdate: (latestRes.data?.created_at as string | undefined) ?? null,
        },
        stores,
        recentUpdates,
        topCategories,
        topSavings,
      };
    } catch {
      return empty;
    }
  },
);
