import { createServerFn } from "@tanstack/react-start";
import { CATEGORY_LABELS } from "@/lib/product-category";

export type CatalogSearchItem = {
  catalogId: string;
  displayName: string;
  brand: string | null;
  category: string | null;
  imageUrl: string | null;
  minPrice: number | null;
  avgPrice: number | null;
  maxPrice: number | null;
  samples: number;
  storesCount: number;
  lastSeenAt: string | null;
};

export type CatalogFilterOptions = {
  categories: string[];
  brands: string[];
  priceBounds: { min: number; max: number };
};



export function categoryLabel(key: string | null | undefined): string {
  if (!key) return "Outros";
  return CATEGORY_LABELS[key] ?? key.replace(/_/g, " ");
}

/**
 * Server-only Supabase client. Public read-only using anon SELECT policies on
 * product_catalog and product_price_stats.
 */
async function getPublicClient() {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

type CatalogRow = {
  id: string;
  display_name: string | null;
  brand: string | null;
  category: string | null;
  image_url: string | null;
  normalized_name: string | null;
};

type ScanRow = {
  product_name: string | null;
  price_captured: number | string | null;
  market_name: string | null;
  created_at: string;
  establishment_id: string | null;
  unit: string | null;
};

function normalizeStr(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Advanced product search — agrega direto da tabela `scans` (fonte da verdade
 * de preços) e enriquece com metadados do `product_catalog` quando o nome
 * bate. Isso garante que qualquer produto cadastrado com preço apareça,
 * independentemente do estado da tabela `product_price_stats`.
 */
export const searchCatalogAdvanced = createServerFn({ method: "POST" })
  .validator(
    (data: {
      q?: string;
      category?: string | null;
      brand?: string | null;
      minPrice?: number | null;
      maxPrice?: number | null;
      sort?: "cheapest" | "priciest" | "recent";
      limit?: number;
    }) => ({
      q: String(data?.q ?? "").slice(0, 80).trim(),
      category:
        data?.category && String(data.category).trim().length > 0
          ? String(data.category).trim().slice(0, 40)
          : null,
      brand:
        data?.brand && String(data.brand).trim().length > 0
          ? String(data.brand).trim().slice(0, 60)
          : null,
      minPrice:
        typeof data?.minPrice === "number" && Number.isFinite(data.minPrice) && data.minPrice >= 0
          ? data.minPrice
          : null,
      maxPrice:
        typeof data?.maxPrice === "number" && Number.isFinite(data.maxPrice) && data.maxPrice >= 0
          ? data.maxPrice
          : null,
      sort: data?.sort === "priciest" || data?.sort === "recent" ? data.sort : "cheapest",
      limit: Math.min(60, Math.max(6, Math.floor(data?.limit ?? 24))),
    }),
  )
  .handler(async ({ data }): Promise<CatalogSearchItem[]> => {
    const supabase = await getPublicClient();
    const sel = (s: string): string => s;

    const needle = data.q ? data.q.replace(/[%_,]/g, " ").trim() : "";
    const tokens = needle
      ? normalizeStr(needle).split(" ").filter((t) => t.length >= 2)
      : [];

    // 1) Puxa scans com preço válido, opcionalmente filtrando pelo termo de busca.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let scansQ: any = supabase
      .from("scans")
      .select(sel("product_name, price_captured, market_name, created_at, establishment_id, unit"))
      .not("price_captured", "is", null)
      .gt("price_captured", 0)
      .order("created_at", { ascending: false })
      .limit(2000);
    if (needle) scansQ = scansQ.ilike("product_name", `%${needle}%`);

    const { data: scanRows, error: scanErr } = (await scansQ) as {
      data: ScanRow[] | null;
      error: { message: string } | null;
    };
    if (scanErr) throw new Error(scanErr.message);
    const scans = scanRows ?? [];
    if (scans.length === 0) return [];

    // 1.5) Descobre quais estabelecimentos são AÇOUGUES.
    // Regra: em açougues só mostramos cortes de carne (bovino/frango/suíno).
    // Assim, produtos "diversos" cadastrados em açougues não poluem a busca.
    const { data: butcherRows } = (await supabase
      .from("establishments")
      .select(sel("id"))
      .eq("kind", "acougue")
      .limit(200)) as { data: { id: string }[] | null; error: unknown };
    const butcherIds = new Set((butcherRows ?? []).map((r) => r.id));

    const { classifyButcherCut } = await import("@/lib/butcher-cuts");

    // 2) Agrupa scans por nome normalizado do produto.
    type Agg = {
      display: string;
      normKey: string;
      prices: number[];
      stores: Set<string>;
      lastSeen: string;
    };
    const byName = new Map<string, Agg>();
    // 1.6) Pré-indexa catálogo por nome normalizado só para checar categoria
    // no filtro de açougues (evita false-positives por regex de nome).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const catPre = (await supabase
      .from("product_catalog")
      .select(sel("display_name, normalized_name, category"))
      .limit(2000)) as { data: { display_name: string | null; normalized_name: string | null; category: string | null }[] | null };
    const catCategoryByKey = new Map<string, string | null>();
    for (const c of catPre.data ?? []) {
      const k1 = c.display_name ? normalizeStr(c.display_name) : "";
      const k2 = c.normalized_name ? normalizeStr(c.normalized_name) : "";
      if (k1) catCategoryByKey.set(k1, c.category);
      if (k2 && !catCategoryByKey.has(k2)) catCategoryByKey.set(k2, c.category);
    }

    for (const r of scans) {
      const raw = (r.product_name ?? "").trim();
      if (!raw) continue;
      const key = normalizeStr(raw);
      if (!key) continue;
      // Filtro açougue: em açougues só entram cortes de carne. Aceitamos se
      // (a) regex de corte bate OU (b) catálogo classifica como "carnes".
      // Se catálogo classifica como outra categoria explícita, descarta.
      if (r.establishment_id && butcherIds.has(r.establishment_id)) {
        const cut = classifyButcherCut(raw, r.unit);
        const cat = catCategoryByKey.get(key) ?? null;
        if (cat && cat !== "carnes") continue;
        if (!cut && cat !== "carnes") continue;
      }
      // Se veio termo, exige que TODOS os tokens estejam presentes.
      if (tokens.length > 0 && !tokens.every((t) => key.includes(t))) continue;
      const price = Number(r.price_captured);
      if (!Number.isFinite(price) || price <= 0) continue;
      const cur =
        byName.get(key) ??
        ({ display: raw, normKey: key, prices: [], stores: new Set<string>(), lastSeen: r.created_at } as Agg);
      cur.prices.push(price);
      const mn = (r.market_name ?? "").trim();
      if (mn) cur.stores.add(mn);
      if (r.created_at > cur.lastSeen) cur.lastSeen = r.created_at;
      byName.set(key, cur);
    }

    if (byName.size === 0) return [];

    // 3) Busca metadados do catálogo (categoria, marca, imagem) para enriquecer.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let catQ: any = supabase
      .from("product_catalog")
      .select(sel("id, display_name, brand, category, image_url, normalized_name"))
      .limit(1000);
    if (data.category) catQ = catQ.eq("category", data.category);
    if (data.brand) catQ = catQ.ilike("brand", `%${data.brand}%`);
    if (needle) {
      catQ = catQ.or(
        `display_name.ilike.%${needle}%,brand.ilike.%${needle}%,normalized_name.ilike.%${needle}%`,
      );
    }
    const { data: catalogRows } = (await catQ) as {
      data: CatalogRow[] | null;
      error: { message: string } | null;
    };
    const catalog = catalogRows ?? [];

    // Indexa por nome normalizado (display_name e normalized_name).
    type CatEntry = { id: string; brand: string | null; category: string | null; image: string | null; display: string };
    const catByKey = new Map<string, CatEntry>();
    for (const c of catalog) {
      const entry: CatEntry = {
        id: c.id,
        brand: c.brand,
        category: c.category,
        image: c.image_url,
        display: c.display_name ?? "",
      };
      if (c.display_name) catByKey.set(normalizeStr(c.display_name), entry);
      if (c.normalized_name) catByKey.set(normalizeStr(c.normalized_name), entry);
    }

    function findCatalogMatch(normKey: string): CatEntry | null {
      // 1) match exato
      const exact = catByKey.get(normKey);
      if (exact) return exact;
      // 2) match parcial: catalog display contido no scan ou vice-versa
      for (const [k, v] of catByKey) {
        if (normKey.includes(k) || k.includes(normKey)) return v;
      }
      return null;
    }

    // 4) Aplica filtros de categoria/marca (via catálogo) e preço; monta itens.
    //    Fallback: se filtro de catálogo zerar tudo, reprocessa sem o filtro
    //    para nunca devolver tela vazia enquanto houver preços em `scans`.
    const buildItems = (opts: { enforceCatFilter: boolean }): CatalogSearchItem[] => {
      const out: CatalogSearchItem[] = [];
      for (const agg of byName.values()) {
        const cat = findCatalogMatch(agg.normKey);
        if (opts.enforceCatFilter) {
          if ((data.category || data.brand) && !cat) continue;
          if (data.category && cat?.category !== data.category) continue;
          if (
            data.brand &&
            !(cat?.brand ?? "").toLowerCase().includes(data.brand.toLowerCase())
          )
            continue;
        }
        const min = Math.min(...agg.prices);
        const max = Math.max(...agg.prices);
        const avg = Number((agg.prices.reduce((a, b) => a + b, 0) / agg.prices.length).toFixed(2));
        if (data.minPrice != null && min < data.minPrice) continue;
        if (data.maxPrice != null && min > data.maxPrice) continue;
        out.push({
          catalogId: cat?.id ?? `scan:${agg.normKey}`,
          displayName: cat?.display || agg.display,
          brand: cat?.brand ?? null,
          category: cat?.category ?? null,
          imageUrl: cat?.image ?? null,
          minPrice: min,
          avgPrice: avg,
          maxPrice: max,
          samples: agg.prices.length,
          storesCount: agg.stores.size,
          lastSeenAt: agg.lastSeen,
        });
      }
      return out;
    };

    let items = buildItems({ enforceCatFilter: true });
    if (items.length === 0 && (data.category || data.brand)) {
      // Fallback: catálogo desalinhado — devolve resultados de scans mesmo assim.
      items = buildItems({ enforceCatFilter: false });
    }

    // 5) Relevância: prioriza correspondência exata do produto e da marca.
    const queryNorm = normalizeStr(needle);
    function relevance(it: CatalogSearchItem): number {
      if (tokens.length === 0) return 0;
      const name = normalizeStr(it.displayName);
      const brand = normalizeStr(it.brand ?? "");
      let score = 0;
      if (name === queryNorm) score += 100;
      if (queryNorm && name.startsWith(queryNorm)) score += 40;
      if (queryNorm && new RegExp(`(^|\\s)${queryNorm}(\\s|$)`).test(name)) score += 25;
      const nameWords = new Set(name.split(" ").filter(Boolean));
      const brandWords = new Set(brand.split(" ").filter(Boolean));
      for (const t of tokens) {
        if (nameWords.has(t)) score += 12;
        else if (name.includes(t)) score += 4;
        if (brandWords.has(t)) score += 15;
      }
      const extra = Math.max(0, name.split(" ").length - tokens.length - 3);
      score -= Math.min(6, extra);
      return score;
    }

    const ranked = items.map((it) => ({ it, rel: relevance(it) }));
    const cmp: (a: { it: CatalogSearchItem; rel: number }, b: { it: CatalogSearchItem; rel: number }) => number =
      data.sort === "priciest"
        ? (a, b) => (b.rel - a.rel) || ((b.it.minPrice ?? -Infinity) - (a.it.minPrice ?? -Infinity))
        : data.sort === "recent"
          ? (a, b) => (b.rel - a.rel) || (b.it.lastSeenAt ?? "").localeCompare(a.it.lastSeenAt ?? "")
          : (a, b) => (b.rel - a.rel) || ((a.it.minPrice ?? Infinity) - (b.it.minPrice ?? Infinity));

    return ranked.sort(cmp).slice(0, data.limit).map((x) => x.it);
  });

/**
 * Distinct categories and top brands for the filter UI, plus overall price bounds.
 */
export const getCatalogFilterOptions = createServerFn({ method: "GET" }).handler(
  async (): Promise<CatalogFilterOptions> => {
    const supabase = await getPublicClient();
    const sel = (s: string): string => s;

    const [catsRes, brandsRes, boundsRes] = await Promise.all([
      supabase
        .from("product_catalog")
        .select(sel("category"))
        .not("category", "is", null)
        .limit(1000),
      supabase
        .from("product_catalog")
        .select(sel("brand"))
        .not("brand", "is", null)
        .limit(2000),
      supabase
        .from("product_price_stats")
        .select(sel("min_price"))
        .not("min_price", "is", null)
        .limit(1000),
    ]);

    const catSet = new Set<string>();
    for (const r of (catsRes.data as { category: string | null }[] | null) ?? []) {
      if (r.category) catSet.add(r.category);
    }

    const brandCount = new Map<string, number>();
    for (const r of (brandsRes.data as { brand: string | null }[] | null) ?? []) {
      const b = (r.brand ?? "").trim();
      if (!b) continue;
      brandCount.set(b, (brandCount.get(b) ?? 0) + 1);
    }
    const brands = [...brandCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 60)
      .map(([b]) => b)
      .sort((a, b) => a.localeCompare(b, "pt-BR"));

    let min = Infinity;
    let max = 0;
    for (const r of (boundsRes.data as { min_price: number | null }[] | null) ?? []) {
      const v = r.min_price != null ? Number(r.min_price) : null;
      if (v == null || !Number.isFinite(v)) continue;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (!Number.isFinite(min)) min = 0;
    if (max < min) max = min + 100;

    return {
      categories: [...catSet].sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b), "pt-BR")),
      brands,
      priceBounds: { min: Math.floor(min), max: Math.ceil(max) },
    };
  },
);
