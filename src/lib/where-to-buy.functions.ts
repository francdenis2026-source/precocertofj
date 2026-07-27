import { createServerFn } from "@tanstack/react-start";

/**
 * Comparação pública "onde comprar mais barato" por produto e bairro/cidade.
 * Lê o cache de comparação (product_comparison_cache) e cruza com os
 * estabelecimentos para filtrar por bairro/cidade.
 */

export type WhereToBuyOffer = {
  establishmentId: string | null;
  storeName: string;
  neighborhood: string | null;
  city: string | null;
  price: number;
  lastSeenAt: string | null;
  isCheapest: boolean;
  diffPct: number;
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
      supabaseAdmin.from("establishments").select("id, name, neighborhood, city, active"),
    ]);
    if (cacheRes.error) throw new Error(cacheRes.error.message);

    const storeById = new Map(
      ((storesRes.data ?? []) as Array<{
        id: string;
        name: string;
        neighborhood: string | null;
        city: string | null;
        active: boolean | null;
      }>).map((s) => [s.id, s]),
    );

    const wantCity = data.city ? deaccent(data.city) : null;
    const wantHood = data.neighborhood ? deaccent(data.neighborhood) : null;

    const products: WhereToBuyProduct[] = [];

    for (const row of (cacheRes.data ?? []) as Array<Record<string, unknown>>) {
      const rawStores = Array.isArray(row.stores) ? (row.stores as Array<Record<string, unknown>>) : [];
      const offers: WhereToBuyOffer[] = [];

      for (const s of rawStores) {
        const id = s.establishment_id ? String(s.establishment_id) : null;
        const store = id ? storeById.get(id) : undefined;
        const neighborhood = store?.neighborhood ?? null;
        const city = store?.city ?? null;
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
