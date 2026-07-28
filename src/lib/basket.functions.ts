import { createServerFn } from "@tanstack/react-start";

/**
 * "Cesta básica" comparator + budget builder.
 *
 * Reads from public `scans` (last 90 days, status = 'salvo') and matches each
 * scan against a set of essential-item keyword patterns. For each essential
 * we pick the cheapest recent price per establishment.
 */

export type EssentialKey =
  | "arroz"
  | "feijao"
  | "oleo"
  | "acucar"
  | "cafe"
  | "leite"
  | "macarrao"
  | "farinha"
  | "sal"
  | "molho"
  | "sabao"
  | "papel"
  | "manteiga"
  | "ovos";

export type EssentialCategory =
  | "graos"
  | "mercearia"
  | "laticinios"
  | "higiene"
  | "limpeza";

export const CATEGORY_LABELS: Record<EssentialCategory, string> = {
  graos: "Grãos e básicos",
  mercearia: "Mercearia",
  laticinios: "Laticínios e frios",
  higiene: "Higiene",
  limpeza: "Limpeza",
};

type EssentialDef = {
  key: EssentialKey;
  label: string;
  category: EssentialCategory;
  patterns: string[];
  exclude?: string[];
};

export const ESSENTIALS: EssentialDef[] = [
  { key: "arroz", label: "Arroz", category: "graos", patterns: ["arroz"], exclude: ["doce"] },
  { key: "feijao", label: "Feijão", category: "graos", patterns: ["feijao"] },
  { key: "oleo", label: "Óleo de soja", category: "mercearia", patterns: ["oleo de soja", "oleo soja"] },
  { key: "acucar", label: "Açúcar", category: "graos", patterns: ["acucar"] },
  { key: "cafe", label: "Café", category: "mercearia", patterns: ["cafe"], exclude: ["achocolatado"] },
  { key: "leite", label: "Leite", category: "laticinios", patterns: ["leite"], exclude: ["condensado", "po", "pó", "coco"] },
  { key: "macarrao", label: "Macarrão", category: "graos", patterns: ["macarrao", "espaguete", "espaghetti"] },
  { key: "farinha", label: "Farinha de trigo", category: "graos", patterns: ["farinha de trigo", "farinha trigo"] },
  { key: "sal", label: "Sal", category: "mercearia", patterns: ["sal refinado", "sal grosso", "sal iodado", "sal 1kg", "sal comum"] },
  { key: "molho", label: "Molho de tomate", category: "mercearia", patterns: ["molho de tomate", "extrato de tomate"] },
  { key: "sabao", label: "Sabão em pó", category: "limpeza", patterns: ["sabao em po", "sabao po"] },
  { key: "papel", label: "Papel higiênico", category: "higiene", patterns: ["papel higienico"] },
  { key: "manteiga", label: "Manteiga/Margarina", category: "laticinios", patterns: ["manteiga", "margarina"] },
  { key: "ovos", label: "Ovos", category: "laticinios", patterns: ["ovo", "ovos"] },
];

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function matchEssential(name: string): EssentialKey | null {
  const n = norm(name);
  for (const ess of ESSENTIALS) {
    if (ess.exclude?.some((x) => n.includes(x))) continue;
    if (ess.patterns.some((p) => n.includes(p))) return ess.key;
  }
  return null;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const h =
    s1 * s1 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      s2 *
      s2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type BasketItem = {
  key: EssentialKey;
  label: string;
  productName: string;
  price: number;
  establishmentId: string;
  establishmentName: string;
  when: string;
};

export type BasketStore = {
  establishmentId: string;
  establishmentName: string;
  logoUrl: string | null;
  brandColor: string | null;
  city: string | null;
  neighborhood: string | null;
  distanceKm: number | null;
  itemsFound: number;
  totalItems: number;
  total: number;
  coverage: number;
  items: Array<{ key: EssentialKey; label: string; productName: string; price: number; when: string; quantity: number } | null>;
};

export type BasketMissing = {
  key: EssentialKey;
  label: string;
  missingStores: string[];
  availableStores: number;
};

export type BasketComparisonResult = {
  essentials: Array<{ key: EssentialKey; label: string }>;
  stores: BasketStore[];
  cheapest: {
    key: EssentialKey;
    label: string;
    price: number;
    productName: string;
    establishmentName: string;
    establishmentId: string;
  }[];
  cheapestBasketTotal: number;
  totalEssentials: number;
  windowDays: number;
  missingByItem: BasketMissing[];
  /** Média (best-price-per-store) por essencial, usada para estimar itens sem preço. */
  averagePrices: Partial<Record<EssentialKey, number>>;
  /** Soma dos preços médios de todos os essenciais (piso da estimativa máxima). */
  averageBasketTotal: number;
  filters: {
    originLat: number | null;
    originLng: number | null;
    radiusKm: number | null;
    city: string | null;
  };
};

type EstabRow = {
  id: string;
  name: string;
  logo_url: string | null;
  brand_color: string | null;
  city: string | null;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  active: boolean;
};

async function loadRecentScans() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const since = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
  const client = supabaseAdmin as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (c: string, v: string) => {
          gte: (c: string, v: string) => {
            not: (c: string, op: string, v: string) => {
              order: (c: string, o: { ascending: boolean }) => {
                limit: (n: number) => Promise<{
                  data:
                    | Array<{
                        product_name: string;
                        price_captured: string | number;
                        establishment_id: string | null;
                        market_name: string | null;
                        created_at: string;
                      }>
                    | null;
                  error: { message: string } | null;
                }>;
              };
            };
          };
        };
      };
    };
  };
  const { data, error } = await client
    .from("scans")
    .select("product_name, price_captured, establishment_id, market_name, created_at")
    .eq("status", "salvo")
    .gte("created_at", since)
    .not("establishment_id", "is", "null")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function loadEstablishments(ids: string[]) {
  if (ids.length === 0) return new Map<string, EstabRow>();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const client = supabaseAdmin as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        in: (c: string, v: string[]) => Promise<{
          data: EstabRow[] | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
  const { data, error } = await client
    .from("establishments")
    .select("id, name, logo_url, brand_color, city, neighborhood, latitude, longitude, active")
    .in("id", ids);
  if (error) throw new Error(error.message);
  const map = new Map<string, EstabRow>();
  for (const e of data ?? []) map.set(e.id, e);
  return map;
}

type BestPick = { price: number; productName: string; when: string };

async function computeMatrix() {
  const rows = await loadRecentScans();
  const matrix = new Map<string, Map<EssentialKey, BestPick>>();
  for (const r of rows) {
    const estId = r.establishment_id;
    if (!estId) continue;
    const key = matchEssential(r.product_name ?? "");
    if (!key) continue;
    const price = Number(r.price_captured);
    if (!Number.isFinite(price) || price <= 0 || price > 500) continue;
    let inner = matrix.get(estId);
    if (!inner) {
      inner = new Map();
      matrix.set(estId, inner);
    }
    const prev = inner.get(key);
    if (!prev || price < prev.price) {
      inner.set(key, { price, productName: r.product_name, when: r.created_at });
    }
  }
  return matrix;
}

/**
 * Carrega overrides (enabled + quantity) da versão ativa em basket_items.
 * Falha silenciosa retorna map vazio — comportamento cai no padrão hardcoded.
 * Retornado: Map<key, { enabled, quantity, sortOrder }> apenas para keys
 * conhecidas em ESSENTIALS (novas keys precisam de código).
 */
async function loadActiveOverrides(): Promise<
  Map<EssentialKey, { enabled: boolean; quantity: number; sortOrder: number }>
> {
  const overrides = new Map<
    EssentialKey,
    { enabled: boolean; quantity: number; sortOrder: number }
  >();
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const client = supabaseAdmin as unknown as {
      from: (t: string) => any;
    };
    const setRes = await client
      .from("basket_item_sets")
      .select("id")
      .eq("active", true)
      .maybeSingle();
    const setId = setRes?.data?.id as string | undefined;
    if (!setId) return overrides;
    const itemsRes = await client
      .from("basket_items")
      .select("key, enabled, quantity, sort_order")
      .eq("set_id", setId);
    const knownKeys = new Set(ESSENTIALS.map((e) => e.key));
    for (const row of (itemsRes?.data ?? []) as Array<{
      key: string;
      enabled: boolean;
      quantity: number | string;
      sort_order: number;
    }>) {
      if (!knownKeys.has(row.key as EssentialKey)) continue;
      overrides.set(row.key as EssentialKey, {
        enabled: !!row.enabled,
        quantity: Math.max(0.01, Number(row.quantity) || 1),
        sortOrder: Number(row.sort_order) || 0,
      });
    }
  } catch {
    // silêncio — fallback ao array hardcoded
  }
  return overrides;
}



type ComparisonFilters = {
  originLat?: number | null;
  originLng?: number | null;
  radiusKm?: number | null;
  city?: string | null;
};

export const getBasketComparison = createServerFn({ method: "POST" })
  .inputValidator((data?: ComparisonFilters) => {
    const d = data ?? {};
    return {
      originLat: typeof d.originLat === "number" && Number.isFinite(d.originLat) ? d.originLat : null,
      originLng: typeof d.originLng === "number" && Number.isFinite(d.originLng) ? d.originLng : null,
      radiusKm: typeof d.radiusKm === "number" && d.radiusKm > 0 ? Math.min(d.radiusKm, 500) : null,
      city: typeof d.city === "string" && d.city.trim() ? d.city.trim() : null,
    };
  })
  .handler(async ({ data }): Promise<BasketComparisonResult> => {
    const matrix = await computeMatrix();
    const estabs = await loadEstablishments(Array.from(matrix.keys()));

    // Apply geographic filters
    const originValid =
      data.originLat != null && data.originLng != null && data.radiusKm != null;
    const filteredEstabIds = new Set<string>();
    for (const [id, e] of estabs.entries()) {
      if (data.city && e.city && norm(e.city) !== norm(data.city)) continue;
      if (originValid && e.latitude != null && e.longitude != null) {
        const km = haversineKm(
          { lat: data.originLat!, lng: data.originLng! },
          { lat: Number(e.latitude), lng: Number(e.longitude) },
        );
        if (km > data.radiusKm!) continue;
      } else if (originValid) {
        // Establishment without coords is excluded when radius filter is active
        continue;
      }
      filteredEstabIds.add(id);
    }

    const totalEssentials = ESSENTIALS.length;

    const cheapestPerItem = new Map<
      EssentialKey,
      { price: number; productName: string; establishmentId: string; establishmentName: string }
    >();
    for (const [estId, inner] of matrix.entries()) {
      if (!filteredEstabIds.has(estId)) continue;
      const meta = estabs.get(estId);
      if (!meta) continue;
      for (const [k, v] of inner.entries()) {
        const cur = cheapestPerItem.get(k);
        if (!cur || v.price < cur.price) {
          cheapestPerItem.set(k, {
            price: v.price,
            productName: v.productName,
            establishmentId: estId,
            establishmentName: meta.name,
          });
        }
      }
    }

    const stores: BasketStore[] = [];
    for (const [estId, inner] of matrix.entries()) {
      if (!filteredEstabIds.has(estId)) continue;
      const meta = estabs.get(estId);
      if (!meta) continue;
      const items: BasketStore["items"] = [];
      let total = 0;
      let found = 0;
      for (const ess of ESSENTIALS) {
        const pick = inner.get(ess.key);
        if (pick) {
          items.push({ key: ess.key, label: ess.label, productName: pick.productName, price: pick.price, when: pick.when });
          total += pick.price;
          found += 1;
        } else {
          items.push(null);
        }
      }
      let distanceKm: number | null = null;
      if (originValid && meta.latitude != null && meta.longitude != null) {
        distanceKm = haversineKm(
          { lat: data.originLat!, lng: data.originLng! },
          { lat: Number(meta.latitude), lng: Number(meta.longitude) },
        );
      }
      stores.push({
        establishmentId: estId,
        establishmentName: meta.name,
        logoUrl: meta.logo_url,
        brandColor: meta.brand_color,
        city: meta.city,
        neighborhood: meta.neighborhood,
        distanceKm,
        itemsFound: found,
        totalItems: totalEssentials,
        total: Number(total.toFixed(2)),
        coverage: found / totalEssentials,
        items,
      });
    }

    stores.sort((a, b) => {
      if (b.coverage !== a.coverage) return b.coverage - a.coverage;
      return a.total - b.total;
    });

    // Missing item report
    const missingByItem: BasketMissing[] = ESSENTIALS.map((ess, i) => {
      const missing: string[] = [];
      let available = 0;
      for (const s of stores) {
        if (s.items[i]) available += 1;
        else missing.push(s.establishmentName);
      }
      return {
        key: ess.key,
        label: ess.label,
        availableStores: available,
        missingStores: missing,
      };
    });

    const cheapest = ESSENTIALS.map((e) => {
      const c = cheapestPerItem.get(e.key);
      if (!c) return null;
      return { key: e.key, label: e.label, ...c };
    }).filter((x): x is NonNullable<typeof x> => x != null);

    const cheapestBasketTotal = Number(cheapest.reduce((s, r) => s + r.price, 0).toFixed(2));

    // Preço médio por essencial (média dos melhores preços por mercado)
    const averagePrices: Partial<Record<EssentialKey, number>> = {};
    for (const ess of ESSENTIALS) {
      let sum = 0;
      let n = 0;
      for (const s of stores) {
        const idx = ESSENTIALS.findIndex((e) => e.key === ess.key);
        const it = s.items[idx];
        if (it) {
          sum += it.price;
          n += 1;
        }
      }
      if (n > 0) averagePrices[ess.key] = Number((sum / n).toFixed(2));
    }
    const averageBasketTotal = Number(
      ESSENTIALS.reduce((acc, e) => acc + (averagePrices[e.key] ?? 0), 0).toFixed(2),
    );

    return {
      essentials: ESSENTIALS.map((e) => ({ key: e.key, label: e.label })),
      stores,
      cheapest,
      cheapestBasketTotal,
      totalEssentials,
      windowDays: 90,
      missingByItem,
      averagePrices,
      averageBasketTotal,
      filters: {
        originLat: data.originLat,
        originLng: data.originLng,
        radiusKm: data.radiusKm,
        city: data.city,
      },
    };
  });

export type BudgetBasketResult = {
  budget: number;
  items: BasketItem[];
  total: number;
  remaining: number;
  missing: Array<{ key: EssentialKey; label: string }>;
  /** Mercado usada quando o cálculo foi restrito a um único estabelecimento. */
  restrictedTo?: { establishmentId: string; establishmentName: string } | null;
  /** Chaves consideradas na montagem (após personalização). */
  includedKeys: EssentialKey[];
};

export const buildBudgetBasket = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      budget: number;
      establishmentId?: string | null;
      includeKeys?: string[] | null;
    }) => {
      const b = Number(data?.budget);
      if (!Number.isFinite(b) || b <= 0 || b > 100_000) {
        throw new Error("Orçamento inválido");
      }
      const validKeys = new Set(ESSENTIALS.map((e) => e.key));
      const includeKeys = Array.isArray(data?.includeKeys)
        ? (data.includeKeys.filter((k) => validKeys.has(k as EssentialKey)) as EssentialKey[])
        : null;
      const establishmentId =
        typeof data?.establishmentId === "string" && data.establishmentId.length > 0
          ? data.establishmentId
          : null;
      return {
        budget: Math.round(b * 100) / 100,
        establishmentId,
        includeKeys,
      };
    },
  )
  .handler(async ({ data }): Promise<BudgetBasketResult> => {
    const matrix = await computeMatrix();
    const estabs = await loadEstablishments(Array.from(matrix.keys()));

    const activeKeys: EssentialKey[] =
      data.includeKeys && data.includeKeys.length > 0
        ? data.includeKeys
        : ESSENTIALS.map((e) => e.key);
    const activeEssentials = ESSENTIALS.filter((e) => activeKeys.includes(e.key));

    type Row = { key: EssentialKey; label: string; estId: string; price: number; productName: string; when: string };
    const perItem = new Map<EssentialKey, Row[]>();
    for (const ess of activeEssentials) perItem.set(ess.key, []);
    for (const [estId, inner] of matrix.entries()) {
      if (!estabs.has(estId)) continue;
      if (data.establishmentId && estId !== data.establishmentId) continue;
      for (const ess of activeEssentials) {
        const p = inner.get(ess.key);
        if (p) {
          perItem.get(ess.key)!.push({
            key: ess.key,
            label: ess.label,
            estId,
            price: p.price,
            productName: p.productName,
            when: p.when,
          });
        }
      }
    }
    for (const arr of perItem.values()) arr.sort((a, b) => a.price - b.price);

    const picks: Row[] = [];
    const missing: Array<{ key: EssentialKey; label: string }> = [];
    for (const ess of activeEssentials) {
      const opts = perItem.get(ess.key)!;
      if (opts.length === 0) {
        missing.push({ key: ess.key, label: ess.label });
      } else {
        picks.push(opts[0]);
      }
    }
    picks.sort((a, b) => a.price - b.price);
    let total = picks.reduce((s, r) => s + r.price, 0);
    const dropped: Row[] = [];
    while (total > data.budget && picks.length > 0) {
      const removed = picks.pop()!;
      total -= removed.price;
      dropped.push(removed);
    }
    for (const d of dropped) missing.push({ key: d.key, label: d.label });

    const restrictedMeta = data.establishmentId ? estabs.get(data.establishmentId) : null;

    return {
      budget: data.budget,
      total: Number(total.toFixed(2)),
      remaining: Number((data.budget - total).toFixed(2)),
      items: picks.map((r) => ({
        key: r.key,
        label: r.label,
        productName: r.productName,
        price: r.price,
        establishmentId: r.estId,
        establishmentName: estabs.get(r.estId)?.name ?? "—",
        when: r.when,
      })),
      missing,
      restrictedTo: restrictedMeta
        ? { establishmentId: restrictedMeta.id, establishmentName: restrictedMeta.name }
        : null,
      includedKeys: activeKeys,
    };
  });

export type BasketStoreOption = {
  establishmentId: string;
  establishmentName: string;
  city: string | null;
  itemsCovered: number;
  totalEssentials: number;
  /** Preço mínimo desta mercado por essencial (para prévia). */
  minPricesByKey: Partial<Record<EssentialKey, number>>;
};

export type EssentialOption = {
  key: EssentialKey;
  label: string;
  category: EssentialCategory;
  /** Média entre os menores preços de cada mercado para esse essencial (global). */
  avgPrice: number | null;
  /** Menor preço encontrado em qualquer mercado (global). */
  minPrice: number | null;
  /** Nº de mercados com esse essencial (global). */
  storesCount: number;
};

export type BasketBuilderOptions = {
  essentials: EssentialOption[];
  categories: Array<{ key: EssentialCategory; label: string; count: number }>;
  stores: BasketStoreOption[];
};

/** Lista mercados disponíveis para montagem por orçamento + catálogo de essenciais. */
export const listBasketBuilderOptions = createServerFn({ method: "GET" }).handler(
  async (): Promise<BasketBuilderOptions> => {
    const matrix = await computeMatrix();
    const estabs = await loadEstablishments(Array.from(matrix.keys()));
    const stores: BasketStoreOption[] = [];
    // Agrega preços por essencial (para prévia global).
    const perEssPrices = new Map<EssentialKey, number[]>();

    for (const [estId, inner] of matrix.entries()) {
      const meta = estabs.get(estId);
      if (!meta) continue;
      let covered = 0;
      const minPricesByKey: Partial<Record<EssentialKey, number>> = {};
      for (const ess of ESSENTIALS) {
        const pick = inner.get(ess.key);
        if (pick) {
          covered += 1;
          minPricesByKey[ess.key] = pick.price;
          const arr = perEssPrices.get(ess.key) ?? [];
          arr.push(pick.price);
          perEssPrices.set(ess.key, arr);
        }
      }
      if (covered === 0) continue;
      stores.push({
        establishmentId: estId,
        establishmentName: meta.name,
        city: meta.city,
        itemsCovered: covered,
        totalEssentials: ESSENTIALS.length,
        minPricesByKey,
      });
    }
    stores.sort(
      (a, b) =>
        b.itemsCovered - a.itemsCovered ||
        a.establishmentName.localeCompare(b.establishmentName),
    );

    const essentials: EssentialOption[] = ESSENTIALS.map((e) => {
      const arr = perEssPrices.get(e.key) ?? [];
      const avg =
        arr.length > 0
          ? Number((arr.reduce((s, p) => s + p, 0) / arr.length).toFixed(2))
          : null;
      const min = arr.length > 0 ? Math.min(...arr) : null;
      return {
        key: e.key,
        label: e.label,
        category: e.category,
        avgPrice: avg,
        minPrice: min,
        storesCount: arr.length,
      };
    });

    const catCounts = new Map<EssentialCategory, number>();
    for (const e of ESSENTIALS) {
      catCounts.set(e.category, (catCounts.get(e.category) ?? 0) + 1);
    }
    const categories = (Object.keys(CATEGORY_LABELS) as EssentialCategory[])
      .filter((c) => (catCounts.get(c) ?? 0) > 0)
      .map((c) => ({ key: c, label: CATEGORY_LABELS[c], count: catCounts.get(c) ?? 0 }));

    return { essentials, categories, stores };
  },
);

export type EssentialPriceRow = {
  establishmentId: string;
  establishmentName: string;
  city: string | null;
  price: number;
  productName: string;
  when: string;
};

export type EssentialPricesResult = {
  key: EssentialKey;
  label: string;
  rows: EssentialPriceRow[];
  min: number | null;
  max: number | null;
  avg: number | null;
};

/** Lista todas as mercados que vendem um essencial, ordenadas pelo menor preço. */
export const listEssentialPrices = createServerFn({ method: "POST" })
  .inputValidator((data: { key: string }) => {
    const k = String(data?.key ?? "");
    const found = ESSENTIALS.find((e) => e.key === k);
    if (!found) throw new Error("Essencial inválido");
    return { key: found.key, label: found.label };
  })
  .handler(async ({ data }): Promise<EssentialPricesResult> => {
    const matrix = await computeMatrix();
    const estabs = await loadEstablishments(Array.from(matrix.keys()));
    const rows: EssentialPriceRow[] = [];
    for (const [estId, inner] of matrix.entries()) {
      const pick = inner.get(data.key);
      const meta = estabs.get(estId);
      if (!pick || !meta) continue;
      rows.push({
        establishmentId: estId,
        establishmentName: meta.name,
        city: meta.city,
        price: pick.price,
        productName: pick.productName,
        when: pick.when,
      });
    }
    rows.sort((a, b) => a.price - b.price);
    const prices = rows.map((r) => r.price);
    const min = prices.length ? prices[0] : null;
    const max = prices.length ? prices[prices.length - 1] : null;
    const avg =
      prices.length > 0
        ? Number((prices.reduce((s, p) => s + p, 0) / prices.length).toFixed(2))
        : null;
    return { key: data.key, label: data.label, rows, min, max, avg };
  });

