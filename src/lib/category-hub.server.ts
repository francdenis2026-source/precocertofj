/**
 * Consulta server-only que monta o hub de uma categoria (nicho):
 * lojas do nicho + produtos do nicho com menor preço por loja.
 */
import {
  categoryBySlug,
  productInCategory,
  productKey,
  storeInCategory,
  type CategoryDef,
} from "@/lib/category-hub";
import { slugifyEstablishment as nEstablishment } from "@/lib/establishment-slug.functions";

export type HubStore = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  brandColor: string | null;
  neighborhood: string | null;
  address: string | null;
  kind: string | null;
  productCount: number;
  /** loja é do próprio nicho (ex.: açougue) ou só tem itens do nicho */
  isNicheStore: boolean;
  /**
   * Economia média (%) ao comprar nesta loja: média de
   * (maiorPreço − preçoDaLoja) / maiorPreço entre os produtos da categoria
   * que existem em 2+ estabelecimentos. `null` quando não há comparáveis.
   */
  avgSavingPct: number | null;
  /** quantos produtos comparáveis entraram nessa média */
  comparedProducts: number;
};




export type HubProduct = {
  key: string;
  name: string;
  unit: string | null;
  minPrice: number;
  maxPrice: number;
  storeCount: number;
  cheapestStore: string;
  cheapestSlug: string;
  cheapestLogo: string | null;
  /** todas as lojas que têm esse produto (para filtro por loja) */
  storeNames: string[];
  /**
   * Menor preço por loja deste produto. Permite recalcular a economia média
   * no cliente quando o usuário filtra (ex.: subgrupos de hortifrúti).
   */
  storePrices: { id: string; name: string; price: number }[];
  updatedAt: string;
};

export type CategoryHub = {
  slug: string;
  label: string;
  desc: string;
  stores: HubStore[];
  products: HubProduct[];
  /** quantos produtos vieram na lista (pode ser menor que totals.products) */
  returned: number;
  totals: { products: number; prices: number; stores: number };
  /** economia média (%) da categoria: média de (maior−menor)/maior por produto */
  avgSavingPct: number | null;
  /** produtos comparáveis (presentes em 2+ estabelecimentos) */
  comparableProducts: number;
};

type ScanRow = {
  product_name: string | null;
  price_captured: number | string | null;
  unit: string | null;
  establishment_id: string | null;
  created_at: string;
};

type EstabRow = {
  id: string;
  name: string;
  kind: string | null;
  logo_url: string | null;
  brand_color: string | null;
  neighborhood: string | null;
  address: string | null;
  active: boolean | null;
};

/** teto de itens enviados ao cliente na lista da categoria */
const MAX_LIST = 1500;

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export async function buildCategoryHub(slug: string): Promise<CategoryHub> {
  const def: CategoryDef | null = categoryBySlug(slug);
  if (!def) throw new Error("Categoria desconhecida");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: estabsRaw } = await (supabaseAdmin.from("establishments" as never) as never as {
    select: (s: string) => {
      eq: (c: string, v: boolean) => Promise<{ data: EstabRow[] | null }>;
    };
  })
    .select("id, name, kind, logo_url, brand_color, neighborhood, address, active")
    .eq("active", true);

  const estabs = estabsRaw ?? [];
  const byId = new Map(estabs.map((e) => [e.id, e]));
  const nicheStoreIds = new Set(
    estabs.filter((e) => storeInCategory(def, { name: e.name, kind: e.kind })).map((e) => e.id),
  );

  // PostgREST limita 1000 linhas por requisição → pagina até esgotar.
  const scans: ScanRow[] = [];
  const PAGE = 1000;
  for (let page = 0; page < 12; page++) {
    const { data: chunk } = await (supabaseAdmin.from("scans" as never) as never as {
      select: (s: string) => {
        not: (
          c: string,
          op: string,
          v: unknown,
        ) => {
          order: (c: string, o: { ascending: boolean }) => {
            range: (a: number, b: number) => Promise<{ data: ScanRow[] | null }>;
          };
        };
      };
    })
      .select("product_name, price_captured, unit, establishment_id, created_at")
      .not("price_captured", "is", null)
      .order("created_at", { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    const rows = chunk ?? [];
    scans.push(...rows);
    if (rows.length < PAGE) break;
  }


  // Último preço por (loja, produto)
  const latest = new Map<string, { row: ScanRow; store: EstabRow }>();
  let priceCount = 0;
  /** produtos DISTINTOS por loja (não registros de preço) */
  const storeProducts = new Map<string, Set<string>>();

  for (const s of scans) {
    const name = (s.product_name ?? "").trim();
    const price = num(s.price_captured);
    if (!name || price === null || !s.establishment_id) continue;
    const store = byId.get(s.establishment_id);
    if (!store) continue;
    const fromNiche = nicheStoreIds.has(store.id);
    if (!productInCategory(def, { name, unit: s.unit }, fromNiche)) continue;

    priceCount += 1;
    const pk = productKey(name);
    const set = storeProducts.get(store.id) ?? new Set<string>();
    set.add(pk);
    storeProducts.set(store.id, set);

    const k = `${store.id}::${pk}`;
    const prev = latest.get(k);
    if (!prev || prev.row.created_at < s.created_at) latest.set(k, { row: s, store });
  }

  // Agrupa por produto equivalente
  const groups = new Map<
    string,
    { name: string; unit: string | null; entries: { price: number; store: EstabRow; at: string }[] }
  >();
  for (const { row, store } of latest.values()) {
    const name = (row.product_name ?? "").trim();
    const price = num(row.price_captured)!;
    const k = productKey(name);
    const g = groups.get(k) ?? { name, unit: row.unit, entries: [] };
    if (name.length < g.name.length) g.name = name;
    g.entries.push({ price, store, at: row.created_at });
    groups.set(k, g);
  }

  const products: HubProduct[] = [...groups.entries()]
    .map(([key, g]) => {
      const sorted = [...g.entries].sort((a, b) => a.price - b.price);
      const cheapest = sorted[0];
      return {
        key,
        name: g.name,
        unit: g.unit,
        minPrice: cheapest.price,
        maxPrice: sorted[sorted.length - 1].price,
        storeCount: new Set(g.entries.map((e) => e.store.id)).size,
        cheapestStore: cheapest.store.name,
        cheapestSlug: nEstablishment(cheapest.store.name),
        cheapestLogo: cheapest.store.logo_url,
        storeNames: [...new Set(g.entries.map((e) => e.store.name))],
        storePrices: [
          ...g.entries
            .reduce((m, e) => {
              const prev = m.get(e.store.id);
              if (!prev || e.price < prev.price) {
                m.set(e.store.id, { id: e.store.id, name: e.store.name, price: e.price });
              }
              return m;
            }, new Map<string, { id: string; name: string; price: number }>())
            .values(),
        ],
        updatedAt: g.entries.reduce((m, e) => (e.at > m ? e.at : m), g.entries[0].at),
      };
    })
    .sort((a, b) => a.minPrice - b.minPrice || b.storeCount - a.storeCount);

  /**
   * Economia por produto comparável (2+ lojas):
   *  • categoria → (maior − menor) / maior;
   *  • loja      → (maior − preçoDaLoja) / maior, acumulado por loja.
   * Usamos o maior preço como base para responder "quanto deixo de gastar".
   */
  const catSavings: number[] = [];
  const storeSavings = new Map<string, number[]>();
  for (const g of groups.values()) {
    // um preço por loja (o último) → dedupe defensivo por establishment
    const byStore = new Map<string, { price: number }>();
    for (const e of g.entries) {
      const prev = byStore.get(e.store.id);
      if (!prev || e.price < prev.price) byStore.set(e.store.id, { price: e.price });
    }
    if (byStore.size < 2) continue;
    const prices = [...byStore.values()].map((v) => v.price);
    const max = Math.max(...prices);
    const min = Math.min(...prices);
    if (!(max > 0)) continue;
    catSavings.push(((max - min) / max) * 100);
    for (const [storeId, v] of byStore) {
      const arr = storeSavings.get(storeId) ?? [];
      arr.push(((max - v.price) / max) * 100);
      storeSavings.set(storeId, arr);
    }
  }
  const avg = (xs: number[]): number | null =>
    xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10 : null;

  const stores: HubStore[] = estabs
    .filter((e) => nicheStoreIds.has(e.id) || (storeProducts.get(e.id)?.size ?? 0) > 0)
    .map((e) => {
      const sv = storeSavings.get(e.id) ?? [];
      return {
        id: e.id,
        name: e.name,
        slug: nEstablishment(e.name),
        logoUrl: e.logo_url,
        brandColor: e.brand_color,
        neighborhood: e.neighborhood,
        address: e.address,
        kind: e.kind,
        productCount: storeProducts.get(e.id)?.size ?? 0,
        isNicheStore: nicheStoreIds.has(e.id),
        avgSavingPct: avg(sv),
        comparedProducts: sv.length,
      };
    })
    // Ordem única (desktop e mobile): lojas de nicho primeiro, depois maior
    // "Economia média aqui". Lojas sem economia calculada vão para o fim.
    .sort(
      (a, b) =>
        Number(b.isNicheStore) - Number(a.isNicheStore) ||
        (b.avgSavingPct ?? -1) - (a.avgSavingPct ?? -1) ||
        b.comparedProducts - a.comparedProducts ||
        b.productCount - a.productCount,
    );


  return {
    slug: def.slug,
    label: def.label,
    desc: def.desc,
    stores,
    products: products.slice(0, MAX_LIST),
    returned: Math.min(products.length, MAX_LIST),
    totals: { products: products.length, prices: priceCount, stores: stores.length },
    avgSavingPct: avg(catSavings),
    comparableProducts: catSavings.length,
  };
}
