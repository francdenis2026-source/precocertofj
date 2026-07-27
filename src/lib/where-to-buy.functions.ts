import { createServerFn } from "@tanstack/react-start";

/**
 * Comparação pública "onde comprar mais barato" por produto e bairro/cidade.
 * Lê o cache de comparação (product_comparison_cache) e cruza com os
 * estabelecimentos para filtrar por bairro/cidade.
 */

import type { ButcherProtein } from "@/lib/butcher-cuts";

export type WhereToBuyOffer = {
  establishmentId: string | null;
  storeName: string;
  neighborhood: string | null;
  city: string | null;
  price: number;
  lastSeenAt: string | null;
  isCheapest: boolean;
  diffPct: number;
  /** Preenchido quando a oferta vem de estabelecimento tipo `acougue`. */
  butcherProtein?: ButcherProtein | null;
};

export type WhereToBuyProduct = {
  productKey: string;
  productName: string;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  savingsPct: number;
  storeCount: number;
  offers: WhereToBuyOffer[];
};

export type WhereToBuyRegions = {
  cities: string[];
  neighborhoods: { name: string; city: string | null }[];
};

const deaccent = (v: string) =>
  v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

export const getWhereToBuyRegions = createServerFn({ method: "GET" }).handler(
  async (): Promise<WhereToBuyRegions> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("establishments")
      .select("neighborhood, city, active")
      .eq("active", true);

    const cities = new Set<string>();
    const hoods = new Map<string, { name: string; city: string | null }>();
    for (const row of (data ?? []) as Array<{ neighborhood: string | null; city: string | null }>) {
      if (row.city) cities.add(row.city);
      if (row.neighborhood) {
        hoods.set(deaccent(row.neighborhood), { name: row.neighborhood, city: row.city ?? null });
      }
    }
    return {
      cities: [...cities].sort((a, b) => a.localeCompare(b, "pt-BR")),
      neighborhoods: [...hoods.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    };
  },
);

export const searchWhereToBuy = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { q?: string; city?: string | null; neighborhood?: string | null; limit?: number } | undefined) => ({
      q: (input?.q ?? "").trim().slice(0, 80),
      city: input?.city?.trim() || null,
      neighborhood: input?.neighborhood?.trim() || null,
      limit: Math.min(60, Math.max(5, Math.round(Number(input?.limit ?? 24)) || 24)),
    }),
  )
  .handler(async ({ data }): Promise<WhereToBuyProduct[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("product_comparison_cache")
      .select(
        "product_key, display_name, min_price, avg_price, max_price, savings_pct, store_count, stores, last_seen_at",
      )
      .not("min_price", "is", null);

    if (data.q) query = query.ilike("display_name", `%${data.q}%`);

    const [cacheRes, storesRes] = await Promise.all([
      query.order("savings_pct", { ascending: false }).limit(400),
      supabaseAdmin.from("establishments").select("id, name, neighborhood, city, active, kind"),
    ]);
    if (cacheRes.error) throw new Error(cacheRes.error.message);

    const storeById = new Map(
      ((storesRes.data ?? []) as Array<{
        id: string;
        name: string;
        neighborhood: string | null;
        city: string | null;
        active: boolean | null;
        kind: string | null;
      }>).map((s) => [s.id, s]),
    );

    const wantCity = data.city ? deaccent(data.city) : null;
    const wantHood = data.neighborhood ? deaccent(data.neighborhood) : null;

    const { classifyButcherCut } = await import("@/lib/butcher-cuts");

    const products: WhereToBuyProduct[] = [];

    for (const row of (cacheRes.data ?? []) as Array<Record<string, unknown>>) {
      const rawStores = Array.isArray(row.stores) ? (row.stores as Array<Record<string, unknown>>) : [];
      const offers: WhereToBuyOffer[] = [];

      // Classifica o produto uma vez para decidir o filtro de açougue.
      const productName = String(row.display_name ?? row.product_key ?? "");
      const cut = classifyButcherCut(productName, null);

      for (const s of rawStores) {
        const id = s.establishment_id ? String(s.establishment_id) : null;
        const store = id ? storeById.get(id) : undefined;
        const neighborhood = store?.neighborhood ?? null;
        const city = store?.city ?? null;
        const isButcher = store?.kind === "acougue";
        // Regra de açougue: só entra em listagem quando o produto é corte.
        if (isButcher && !cut) continue;
        if (wantCity && deaccent(city ?? "") !== wantCity) continue;
        if (wantHood && deaccent(neighborhood ?? "") !== wantHood) continue;
        const price = Number(s.price);
        if (!Number.isFinite(price) || price <= 0) continue;
        offers.push({
          establishmentId: id,
          storeName: String(s.store_name ?? store?.name ?? "—"),
          neighborhood,
          city,
          price,
          lastSeenAt: (s.last_seen_at as string | null) ?? null,
          isCheapest: false,
          diffPct: 0,
          butcherProtein: isButcher ? cut : null,
        });
      }

      if (!offers.length) continue;
      offers.sort((a, b) => a.price - b.price);
      const min = offers[0].price;
      const max = offers[offers.length - 1].price;
      const avg = offers.reduce((acc, o) => acc + o.price, 0) / offers.length;
      for (const o of offers) {
        o.isCheapest = o.price === min;
        o.diffPct = min > 0 ? Number((((o.price - min) / min) * 100).toFixed(1)) : 0;
      }

      products.push({
        productKey: String(row.product_key ?? ""),
        productName: String(row.display_name ?? row.product_key ?? "—"),
        minPrice: min,
        maxPrice: max,
        avgPrice: Number(avg.toFixed(2)),
        savingsPct: min > 0 ? Number((((max - min) / max) * 100).toFixed(1)) : 0,
        storeCount: offers.length,
        offers,
      });
    }

    return products
      .sort((a, b) => b.savingsPct - a.savingsPct || b.storeCount - a.storeCount)
      .slice(0, data.limit);
  });

/* ------------------------------------------------------------------ *
 * Detalhe por produto: ranking por estabelecimento + histórico
 * ------------------------------------------------------------------ */

export type ProductRankRow = {
  position: number;
  establishmentId: string | null;
  storeName: string;
  neighborhood: string | null;
  city: string | null;
  price: number;
  diffPct: number;
  lastSeenAt: string | null;
};

export type ProductHistoryPoint = {
  day: string;
  minPrice: number;
  avgPrice: number;
  samples: number;
};

export type ProductComparisonDetail = {
  productKey: string;
  productName: string;
  category: string | null;
  imageUrl: string | null;
  minPrice: number;
  avgPrice: number;
  maxPrice: number;
  savingsPct: number;
  ranking: ProductRankRow[];
  byNeighborhood: Array<{ neighborhood: string; city: string | null; minPrice: number; storeName: string; stores: number }>;
  history: ProductHistoryPoint[];
  variationPct: number | null;
  lastSeenAt: string | null;
};

export const getProductComparison = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { productKey: string; city?: string | null; neighborhood?: string | null; days?: number }) => {
      const productKey = String(input?.productKey ?? "").trim();
      if (!productKey) throw new Error("Produto não informado.");
      return {
        productKey: productKey.slice(0, 160),
        city: input?.city?.trim() || null,
        neighborhood: input?.neighborhood?.trim() || null,
        days: Math.min(180, Math.max(7, Math.round(Number(input?.days ?? 60)) || 60)),
      };
    },
  )
  .handler(async ({ data }): Promise<ProductComparisonDetail | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - data.days * 86_400_000).toISOString();

    const [cacheRes, storesRes, histRes] = await Promise.all([
      supabaseAdmin
        .from("product_comparison_cache")
        .select(
          "product_key, display_name, category, image_url, min_price, avg_price, max_price, savings_pct, stores, last_seen_at",
        )
        .eq("product_key", data.productKey)
        .order("store_count", { ascending: false })
        .limit(20),
      supabaseAdmin.from("establishments").select("id, name, neighborhood, city"),
      supabaseAdmin
        .from("product_price_history")
        .select("price, captured_at")
        .eq("product_key", data.productKey)
        .gte("captured_at", since)
        .order("captured_at", { ascending: true })
        .limit(1500),
    ]);
    if (cacheRes.error) throw new Error(cacheRes.error.message);

    const rows = (cacheRes.data ?? []) as Array<Record<string, unknown>>;
    if (!rows.length) return null;

    const storeById = new Map(
      ((storesRes.data ?? []) as Array<{
        id: string;
        name: string;
        neighborhood: string | null;
        city: string | null;
      }>).map((s) => [s.id, s]),
    );

    const wantCity = data.city ? deaccent(data.city) : null;
    const wantHood = data.neighborhood ? deaccent(data.neighborhood) : null;

    // melhor oferta por estabelecimento entre todas as variações de tamanho
    const best = new Map<string, ProductRankRow>();
    for (const row of rows) {
      const rawStores = Array.isArray(row.stores) ? (row.stores as Array<Record<string, unknown>>) : [];
      for (const s of rawStores) {
        const id = s.establishment_id ? String(s.establishment_id) : null;
        const store = id ? storeById.get(id) : undefined;
        const neighborhood = store?.neighborhood ?? null;
        const city = store?.city ?? null;
        if (wantCity && deaccent(city ?? "") !== wantCity) continue;
        if (wantHood && deaccent(neighborhood ?? "") !== wantHood) continue;
        const price = Number(s.price);
        if (!Number.isFinite(price) || price <= 0) continue;
        const key = id ?? String(s.store_name ?? "");
        if (!key) continue;
        const cur = best.get(key);
        if (!cur || price < cur.price) {
          best.set(key, {
            position: 0,
            establishmentId: id,
            storeName: String(s.store_name ?? store?.name ?? "—"),
            neighborhood,
            city,
            price,
            diffPct: 0,
            lastSeenAt: (s.last_seen_at as string | null) ?? null,
          });
        }
      }
    }

    const ranking = [...best.values()].sort((a, b) => a.price - b.price);
    if (!ranking.length) return null;
    const min = ranking[0].price;
    const max = ranking[ranking.length - 1].price;
    const avg = ranking.reduce((acc, r) => acc + r.price, 0) / ranking.length;
    ranking.forEach((r, i) => {
      r.position = i + 1;
      r.diffPct = min > 0 ? Number((((r.price - min) / min) * 100).toFixed(1)) : 0;
    });

    // melhor preço por bairro
    const hoodMap = new Map<string, { neighborhood: string; city: string | null; minPrice: number; storeName: string; stores: number }>();
    for (const r of ranking) {
      const hood = r.neighborhood ?? "Sem bairro informado";
      const cur = hoodMap.get(hood);
      if (!cur) {
        hoodMap.set(hood, { neighborhood: hood, city: r.city, minPrice: r.price, storeName: r.storeName, stores: 1 });
      } else {
        cur.stores += 1;
        if (r.price < cur.minPrice) {
          cur.minPrice = r.price;
          cur.storeName = r.storeName;
        }
      }
    }

    // histórico diário
    const byDay = new Map<string, { min: number; sum: number; n: number }>();
    for (const h of (histRes.data ?? []) as Array<{ price: number; captured_at: string }>) {
      const price = Number(h.price);
      if (!Number.isFinite(price) || price <= 0) continue;
      const day = String(h.captured_at).slice(0, 10);
      const cur = byDay.get(day);
      if (!cur) byDay.set(day, { min: price, sum: price, n: 1 });
      else {
        cur.min = Math.min(cur.min, price);
        cur.sum += price;
        cur.n += 1;
      }
    }
    const history: ProductHistoryPoint[] = [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, v]) => ({
        day,
        minPrice: Number(v.min.toFixed(2)),
        avgPrice: Number((v.sum / v.n).toFixed(2)),
        samples: v.n,
      }));

    const variationPct =
      history.length >= 2 && history[0].minPrice > 0
        ? Number(
            (((history[history.length - 1].minPrice - history[0].minPrice) / history[0].minPrice) * 100).toFixed(1),
          )
        : null;

    const head = rows[0];
    return {
      productKey: data.productKey,
      productName: String(head.display_name ?? data.productKey),
      category: (head.category as string | null) ?? null,
      imageUrl: (head.image_url as string | null) ?? null,
      minPrice: min,
      avgPrice: Number(avg.toFixed(2)),
      maxPrice: max,
      savingsPct: max > 0 ? Number((((max - min) / max) * 100).toFixed(1)) : 0,
      ranking,
      byNeighborhood: [...hoodMap.values()].sort((a, b) => a.minPrice - b.minPrice),
      history,
      variationPct,
      lastSeenAt: (head.last_seen_at as string | null) ?? null,
    };
  });
