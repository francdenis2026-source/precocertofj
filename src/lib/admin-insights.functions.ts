import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";
import { CATEGORY_DEFS, productInCategory, storeInCategory, productKey } from "@/lib/category-hub";

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

export type TrendPoint = {
  /** ISO yyyy-mm-dd */
  day: string;
  /** Média dos menores preços por produto naquele dia. */
  minPriceAvg: number;
  /** Menor preço absoluto registrado no dia. */
  minPrice: number;
  /** Quantidade de registros de preço no dia. */
  samples: number;
};

export type CategoryCoverage = {
  slug: string;
  label: string;
  products: number;
  stores: number;
  prices: number;
  /** % de produtos do catálogo cobertos pela categoria. */
  share: number;
};

export type RecentUpdatePoint = {
  day: string;
  prices: number;
  verified: number;
};

export type AdminInsightsFilters = {
  /** ISO yyyy-mm-dd (inclusivo). */
  from: string;
  /** ISO yyyy-mm-dd (inclusivo). */
  to: string;
  /** Slugs de categoria; vazio = todas. */
  categories: string[];
  /** Ignora o cache do servidor e recalcula. */
  refresh?: boolean;
};


export type AdminInsights = {
  trend: TrendPoint[];
  coverage: CategoryCoverage[];
  recent: RecentUpdatePoint[];
  totals: {
    products: number;
    prices: number;
    stores: number;
    verified: number;
    last24h: number;
  };
  range: { from: string; to: string; days: number };
  categories: string[];
  generatedAt: string;
};


type ScanRow = {
  id: string;
  product_name: string | null;
  price_captured: number | string | null;
  created_at: string;
  establishment_id: string | null;
  unit: string | null;
  verified: boolean | null;
};

const dayKey = (iso: string) => iso.slice(0, 10);

/* ------------------------------------------------------------------ */
/* KPIs / gráficos                                                     */
/* ------------------------------------------------------------------ */

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const clampDay = (v: unknown, fallback: string) => {
  const s = String(v ?? "");
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : fallback;
};

export const getAdminInsights = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: Partial<AdminInsightsFilters> | undefined): AdminInsightsFilters => {
    const to = clampDay(input?.to, isoDay(new Date()));
    const from = clampDay(
      input?.from,
      isoDay(new Date(Date.now() - 44 * 24 * 60 * 60 * 1000)),
    );
    return {
      from: from <= to ? from : to,
      to,
      categories: Array.isArray(input?.categories)
        ? input!.categories.filter((c) => typeof c === "string").slice(0, 30)
        : [],
      refresh: input?.refresh === true,
    };
  })
  .handler(async ({ data }): Promise<AdminInsights> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getAdminCache, setAdminCache, bumpAdminInsightsVersion } = await import(
      "./admin-insights-cache.server"
    );
    if (data.refresh) bumpAdminInsightsVersion();
    const cacheKey = `insights:${data.from}:${data.to}:${[...data.categories].sort().join("|")}`;
    const cached = getAdminCache<AdminInsights>(cacheKey);
    if (cached) return cached;


    const since = `${data.from}T00:00:00.000Z`;
    const until = `${data.to}T23:59:59.999Z`;
    const rangeDays =
      Math.round(
        (Date.parse(`${data.to}T00:00:00Z`) - Date.parse(`${data.from}T00:00:00Z`)) / 86_400_000,
      ) + 1;

    const [{ data: scanRows, error: scanErr }, { data: storeRows, error: storeErr }] =
      await Promise.all([
        supabaseAdmin
          .from("scans")
          .select("id, product_name, price_captured, created_at, establishment_id, unit, verified")
          .eq("status", "salvo")
          .not("price_captured", "is", null)
          .gte("created_at", since)
          .lte("created_at", until)
          .order("created_at", { ascending: false })
          .limit(20000),
        supabaseAdmin.from("establishments").select("id, name, kind, active"),
      ]);
    if (scanErr) throw new Error(scanErr.message);
    if (storeErr) throw new Error(storeErr.message);


    const scans = (scanRows ?? []) as unknown as ScanRow[];
    const stores = (storeRows ?? []) as unknown as Array<{
      id: string;
      name: string;
      kind: string | null;
      active: boolean | null;
    }>;
    const storeById = new Map(stores.map((s) => [s.id, s]));

    /* ---- Cobertura por categoria (todo o período, sem filtro) ---- */
    const distinctAll = new Map<
      string,
      { name: string; unit: string | null; stores: Set<string>; prices: number }
    >();
    for (const s of scans) {
      const key = productKey(s.product_name ?? "");
      if (!key) continue;
      const entry = distinctAll.get(key) ?? {
        name: s.product_name ?? "",
        unit: s.unit ?? null,
        stores: new Set<string>(),
        prices: 0,
      };
      entry.prices += 1;
      if (s.establishment_id) entry.stores.add(s.establishment_id);
      distinctAll.set(key, entry);
    }
    const catalogSize = distinctAll.size;

    const keysByCategory = new Map<string, Set<string>>();
    const coverage: CategoryCoverage[] = CATEGORY_DEFS.map((def) => {
      const nicheStoreIds = new Set(
        stores
          .filter((st) => storeInCategory(def, { name: st.name, kind: st.kind }))
          .map((st) => st.id),
      );
      const keys = new Set<string>();
      let prices = 0;
      const usedStores = new Set<string>();
      for (const [key, entry] of distinctAll.entries()) {
        const fromNiche = [...entry.stores].some((id) => nicheStoreIds.has(id));
        if (!productInCategory(def, { name: entry.name, unit: entry.unit }, fromNiche)) continue;
        keys.add(key);
        prices += entry.prices;
        for (const id of entry.stores) usedStores.add(id);
      }
      keysByCategory.set(def.slug, keys);
      return {
        slug: def.slug,
        label: def.short || def.label,
        products: keys.size,
        stores: usedStores.size,
        prices,
        share: catalogSize ? Number(((keys.size / catalogSize) * 100).toFixed(1)) : 0,
      };
    })
      .filter((c) => c.products > 0)
      .sort((a, b) => b.products - a.products);

    /* ---- Filtro por categorias selecionadas ---- */
    const selected = data.categories.filter((slug) => keysByCategory.has(slug));
    const allowedKeys =
      selected.length > 0
        ? new Set(selected.flatMap((slug) => [...(keysByCategory.get(slug) ?? [])]))
        : null;
    const filtered = allowedKeys
      ? scans.filter((s) => {
          const key = productKey(s.product_name ?? "");
          return key ? allowedKeys.has(key) : false;
        })
      : scans;

    /* ---- Tendência de menor preço ---- */
    const byDay = new Map<string, Map<string, number>>();
    const dayCount = new Map<string, number>();
    const dayVerified = new Map<string, number>();
    const distinct = new Set<string>();

    for (const s of filtered) {
      const price = Number(s.price_captured);
      if (!Number.isFinite(price) || price <= 0) continue;
      const d = dayKey(s.created_at);
      const key = productKey(s.product_name ?? "");
      if (key) {
        distinct.add(key);
        const bucket = byDay.get(d) ?? new Map<string, number>();
        const prev = bucket.get(key);
        if (prev === undefined || price < prev) bucket.set(key, price);
        byDay.set(d, bucket);
      }
      dayCount.set(d, (dayCount.get(d) ?? 0) + 1);
      if (s.verified) dayVerified.set(d, (dayVerified.get(d) ?? 0) + 1);
    }

    const trend: TrendPoint[] = [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, bucket]) => {
        const values = [...bucket.values()];
        const sum = values.reduce((acc, v) => acc + v, 0);
        return {
          day,
          minPriceAvg: Number((sum / values.length).toFixed(2)),
          minPrice: Number(Math.min(...values).toFixed(2)),
          samples: dayCount.get(day) ?? values.length,
        };
      })
      .slice(-60);

    /* ---- Atualizações recentes (últimos dias do período) ---- */
    const recent: RecentUpdatePoint[] = [];
    const window = Math.max(1, Math.min(14, rangeDays));
    const endMs = Date.parse(`${data.to}T00:00:00Z`);
    for (let i = window - 1; i >= 0; i--) {
      const d = new Date(endMs - i * 86_400_000).toISOString().slice(0, 10);
      recent.push({ day: d, prices: dayCount.get(d) ?? 0, verified: dayVerified.get(d) ?? 0 });
    }

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    return {
      trend,
      coverage,
      recent,
      totals: {
        products: distinct.size,
        prices: filtered.length,
        stores: stores.filter((s) => s.active !== false).length,
        verified: filtered.filter((s) => s.verified).length,
        last24h: filtered.filter((s) => s.created_at >= dayAgo).length,
      },
      range: { from: data.from, to: data.to, days: rangeDays },
      categories: selected,
      generatedAt: new Date().toISOString(),
    };

  });

/* ------------------------------------------------------------------ */
/* Busca global                                                        */
/* ------------------------------------------------------------------ */

export type GlobalSearchFilters = {
  q: string;
  scope: "all" | "products" | "stores" | "prices";
  establishmentId: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  days: number | null;
  verifiedOnly: boolean;
};

export type GlobalProductHit = {
  key: string;
  name: string;
  minPrice: number;
  maxPrice: number;
  stores: number;
  prices: number;
  lastSeen: string;
};

export type GlobalStoreHit = {
  id: string;
  name: string;
  kind: string | null;
  neighborhood: string | null;
  active: boolean;
  prices: number;
};

export type GlobalPriceHit = {
  id: string;
  productName: string;
  price: number;
  storeName: string;
  verified: boolean;
  createdAt: string;
};

export type GlobalSearchResult = {
  products: GlobalProductHit[];
  stores: GlobalStoreHit[];
  prices: GlobalPriceHit[];
  counts: { products: number; stores: number; prices: number };
};

const normalize = (s: string) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const adminGlobalSearch = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: Partial<GlobalSearchFilters>): GlobalSearchFilters => ({
    q: String(input?.q ?? "").slice(0, 120),
    scope:
      input?.scope === "products" || input?.scope === "stores" || input?.scope === "prices"
        ? input.scope
        : "all",
    establishmentId: input?.establishmentId ? String(input.establishmentId) : null,
    minPrice: Number.isFinite(Number(input?.minPrice)) && input?.minPrice != null ? Number(input.minPrice) : null,
    maxPrice: Number.isFinite(Number(input?.maxPrice)) && input?.maxPrice != null ? Number(input.maxPrice) : null,
    days: input?.days != null && Number.isFinite(Number(input.days)) ? Number(input.days) : null,
    verifiedOnly: Boolean(input?.verifiedOnly),
  }))
  .handler(async ({ data }): Promise<GlobalSearchResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const q = normalize(data.q);

    let scanQuery = supabaseAdmin
      .from("scans")
      .select("id, product_name, price_captured, created_at, establishment_id, verified")
      .eq("status", "salvo")
      .not("price_captured", "is", null)
      .order("created_at", { ascending: false })
      .limit(4000);

    if (data.establishmentId) scanQuery = scanQuery.eq("establishment_id", data.establishmentId);
    if (data.verifiedOnly) scanQuery = scanQuery.eq("verified", true);
    if (data.minPrice != null) scanQuery = scanQuery.gte("price_captured", data.minPrice);
    if (data.maxPrice != null) scanQuery = scanQuery.lte("price_captured", data.maxPrice);
    if (data.days != null) {
      scanQuery = scanQuery.gte(
        "created_at",
        new Date(Date.now() - data.days * 24 * 60 * 60 * 1000).toISOString(),
      );
    }

    const [{ data: scanRows, error: scanErr }, { data: storeRows, error: storeErr }] =
      await Promise.all([
        scanQuery,
        supabaseAdmin.from("establishments").select("id, name, kind, neighborhood, active"),
      ]);
    if (scanErr) throw new Error(scanErr.message);
    if (storeErr) throw new Error(storeErr.message);

    const stores = (storeRows ?? []) as unknown as Array<{
      id: string;
      name: string;
      kind: string | null;
      neighborhood: string | null;
      active: boolean | null;
    }>;
    const storeById = new Map(stores.map((s) => [s.id, s]));

    const scans = ((scanRows ?? []) as unknown as Array<{
      id: string;
      product_name: string | null;
      price_captured: number | string | null;
      created_at: string;
      establishment_id: string | null;
      verified: boolean | null;
    }>).filter((s) => !q || normalize(s.product_name ?? "").includes(q));

    /* Produtos agrupados */
    const grouped = new Map<string, GlobalProductHit & { storeSet: Set<string> }>();
    for (const s of scans) {
      const key = productKey(s.product_name ?? "");
      if (!key) continue;
      const price = Number(s.price_captured);
      if (!Number.isFinite(price)) continue;
      const cur =
        grouped.get(key) ??
        ({
          key,
          name: s.product_name ?? "",
          minPrice: price,
          maxPrice: price,
          stores: 0,
          prices: 0,
          lastSeen: s.created_at,
          storeSet: new Set<string>(),
        } as GlobalProductHit & { storeSet: Set<string> });
      cur.minPrice = Math.min(cur.minPrice, price);
      cur.maxPrice = Math.max(cur.maxPrice, price);
      cur.prices += 1;
      if (s.establishment_id) cur.storeSet.add(s.establishment_id);
      if (s.created_at > cur.lastSeen) cur.lastSeen = s.created_at;
      grouped.set(key, cur);
    }
    const products: GlobalProductHit[] = [...grouped.values()]
      .map(({ storeSet, ...rest }) => ({ ...rest, stores: storeSet.size }))
      .sort((a, b) => b.prices - a.prices);

    /* Estabelecimentos */
    const pricesByStore = new Map<string, number>();
    for (const s of scans) {
      if (!s.establishment_id) continue;
      pricesByStore.set(s.establishment_id, (pricesByStore.get(s.establishment_id) ?? 0) + 1);
    }
    const storeHits: GlobalStoreHit[] = stores
      .filter(
        (s) =>
          !q ||
          normalize(s.name).includes(q) ||
          normalize(s.neighborhood ?? "").includes(q) ||
          normalize(s.kind ?? "").includes(q),
      )
      .filter((s) => !data.establishmentId || s.id === data.establishmentId)
      .map((s) => ({
        id: s.id,
        name: s.name,
        kind: s.kind,
        neighborhood: s.neighborhood,
        active: s.active !== false,
        prices: pricesByStore.get(s.id) ?? 0,
      }))
      .sort((a, b) => b.prices - a.prices);

    /* Registros de preço */
    const priceHits: GlobalPriceHit[] = scans.slice(0, 300).map((s) => ({
      id: s.id,
      productName: s.product_name ?? "—",
      price: Number(s.price_captured),
      storeName: (s.establishment_id && storeById.get(s.establishment_id)?.name) || "—",
      verified: Boolean(s.verified),
      createdAt: s.created_at,
    }));

    const limit = data.scope === "all" ? 25 : 200;
    return {
      products: data.scope === "stores" ? [] : products.slice(0, limit),
      stores: data.scope === "products" || data.scope === "prices" ? [] : storeHits.slice(0, limit),
      prices: data.scope === "products" || data.scope === "stores" ? [] : priceHits.slice(0, limit),
      counts: { products: products.length, stores: storeHits.length, prices: scans.length },
    };
  });
