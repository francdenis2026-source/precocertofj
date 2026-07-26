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
  updatedAt: string;
};

export type CategoryHub = {
  slug: string;
  label: string;
  desc: string;
  stores: HubStore[];
  products: HubProduct[];
  totals: { products: number; prices: number; stores: number };
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
  const storeCounts = new Map<string, number>();

  for (const s of scans) {
    const name = (s.product_name ?? "").trim();
    const price = num(s.price_captured);
    if (!name || price === null || !s.establishment_id) continue;
    const store = byId.get(s.establishment_id);
    if (!store) continue;
    const fromNiche = nicheStoreIds.has(store.id);
    if (!productInCategory(def, { name, unit: s.unit }, fromNiche)) continue;

    priceCount += 1;
    storeCounts.set(store.id, (storeCounts.get(store.id) ?? 0) + 1);

    const k = `${store.id}::${productKey(name)}`;
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
        updatedAt: g.entries.reduce((m, e) => (e.at > m ? e.at : m), g.entries[0].at),
      };
    })
    .sort((a, b) => b.storeCount - a.storeCount || a.minPrice - b.minPrice);

  const stores: HubStore[] = estabs
    .filter((e) => nicheStoreIds.has(e.id) || (storeCounts.get(e.id) ?? 0) > 0)
    .map((e) => ({
      id: e.id,
      name: e.name,
      slug: nEstablishment(e.name),
      logoUrl: e.logo_url,
      brandColor: e.brand_color,
      neighborhood: e.neighborhood,
      address: e.address,
      kind: e.kind,
      productCount: storeCounts.get(e.id) ?? 0,
      isNicheStore: nicheStoreIds.has(e.id),
    }))
    .sort((a, b) => Number(b.isNicheStore) - Number(a.isNicheStore) || b.productCount - a.productCount);

  return {
    slug: def.slug,
    label: def.label,
    desc: def.desc,
    stores,
    products: products.slice(0, 300),
    totals: { products: products.length, prices: priceCount, stores: stores.length },
  };
}
