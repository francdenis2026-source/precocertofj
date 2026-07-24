import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { slugifyEstablishment } from "@/lib/establishment-slug.functions";

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

const CATEGORY_LABELS: Record<string, string> = {
  mercearia: "Mercearia",
  bebidas: "Bebidas",
  laticinios: "Laticínios",
  limpeza: "Limpeza",
  higiene: "Higiene",
  carnes: "Carnes & Frios",
  padaria: "Padaria",
  doces: "Doces",
  congelados: "Congelados",
  biscoitos: "Biscoitos",
  outros: "Outros",
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
          sb
            .from("scans")
            .select("establishment_id, created_at, product_name")
            .eq("status", "salvo")
            .not("price_captured", "is", null)
            .not("establishment_id", "is", null),
        ]);

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
      for (const s of (storeCountsRes.data ?? []) as Array<{
        establishment_id: string | null;
        created_at: string;
        product_name: string | null;
      }>) {
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

      // categorias por produto único
      const productCategoryMap = new Map<string, string>();
      for (const c of (compRes.data ?? []) as Array<{
        display_name: string | null;
        category: string | null;
      }>) {
        if (c.display_name && c.category)
          productCategoryMap.set(c.display_name.toLowerCase(), c.category);
      }
      // conta categorias a partir do cache completo (limite pequeno já pego acima); melhor query dedicada:
      const catRes = await sb
        .from("product_comparison_cache")
        .select("category")
        .not("category", "is", null);
      const catCounts = new Map<string, number>();
      for (const c of (catRes.data ?? []) as Array<{ category: string | null }>) {
        if (!c.category) continue;
        catCounts.set(c.category, (catCounts.get(c.category) ?? 0) + 1);
      }
      const topCategories: MetricCategoryBreakdown[] = Array.from(catCounts.entries())
        .map(([key, count]) => ({ key, label: CATEGORY_LABELS[key] ?? key, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      const totalProducts = Array.from(catCounts.values()).reduce((a, b) => a + b, 0);

      const savings = (compRes.data ?? [])
        .map((r: any) => Number(r.savings_pct))
        .filter((n: number) => Number.isFinite(n) && n > 0);
      const avgSavingsPct = savings.length
        ? Math.round(savings.reduce((a: number, b: number) => a + b, 0) / savings.length)
        : 0;
      const bestSavingsPct = savings.length ? Math.round(Math.max(...savings)) : 0;


      const topSavings: MetricSavingsHighlight[] = (compRes.data ?? []).map((r: any) => ({
        displayName: r.display_name ?? "Produto",
        category: r.category ?? null,
        minPrice: Number(r.min_price ?? 0),
        maxPrice: Number(r.max_price ?? 0),
        savingsPct: Number(r.savings_pct ?? 0),
        storeCount: Number(r.store_count ?? 0),
        cheapestStore: r.cheapest_store ?? null,
        catalogSlug: r.catalog_slug ?? null,
      }));

      const recentUpdates: MetricRecentUpdate[] = (recentRes.data ?? []).map((r: any) => ({
        productName: r.product_name ?? "Item",
        marketName: r.market_name ?? null,
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
          productsCompared: (compRes.data ?? []).length
            ? // approximate: use full cache count for productsCompared
              Array.from(catCounts.values()).reduce((a, b) => a + b, 0)
            : 0,
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
