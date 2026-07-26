import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/lib/require-admin";
import { createServerFn } from "@tanstack/react-start";

export type PublicStore = {
  id: string;
  name: string;
  city: string;
  state: string;
  neighborhood: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  logoUrl: string | null;
  productCount: number;
  lastUpdate: string | null;
};

export type PricePoint = { price: number; date: string };

export type PublicStoreProduct = {
  slug: string;
  productName: string;
  baseName: string;
  brand: string | null;
  category: string;
  price: number;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  pricePerUnit: number | null; // in normalized unit
  unitLabel: string | null; // "R$/kg" | "R$/L" | null
  unit: string | null;
  quantity: number | null;
  lastDate: string;
  historyCount: number;
  imageUrl: string | null;
  barcode: string | null;
};

export type PublicStoreCatalog = {
  store: PublicStore;
  products: PublicStoreProduct[];
  categories: { key: string; label: string; count: number }[];
};

export type PublicProductDetail = {
  store: PublicStore;
  product: PublicStoreProduct;
  history: PricePoint[];
  variations: PublicStoreProduct[]; // other sizes/variants with same baseName
};

type EstabRow = {
  id: string;
  name: string;
  city: string;
  state: string;
  neighborhood: string | null;
  address: string | null;
  logo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  active: boolean;
};

type ScanRow = {
  product_name: string | null;
  price_captured: number | string | null;
  unit: string | null;
  quantity: number | string | null;
  barcode: string | null;
  image_url: string | null;
  created_at: string;
  establishment_id: string | null;
};

const toNum = (v: unknown): number | null => {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

// ---------- helpers ----------

const CATEGORY_RULES: { key: string; label: string; kws: RegExp }[] = [
  { key: "bebidas", label: "Bebidas & Café", kws: /\b(caf[eé]|ch[aá]|nescau|achocolatado|suco|refrigerante|cerveja|vinho|[aá]gua)\b/i },
  { key: "laticinios", label: "Laticínios", kws: /\b(manteiga|queijo|leite|iogurte|requeij[aã]o|creme de leite|nata)\b/i },
  { key: "carnes", label: "Carnes & Frios", kws: /\b(salsicha|fiambre|almondega|linguic|presunto|mortadela|salame|carne|frango|peixe|bacon)\b/i },
  { key: "mercearia", label: "Mercearia", kws: /\b(arroz|feij[aã]o|farinha|macarr[aã]o|espaguete|penne|[oó]leo|a[cç][uú]car|sal|fub[aá]|flocao|floc[aã]o|amido|sagu|mistura bolo|maisena)\b/i },
  { key: "prontos", label: "Prontos & Enlatados", kws: /\b(sop[aã]o|feijoada|nissin|cup noodles|molho|extrato|conserva|azeitona|ervilha|milho|sardinha|at[uú]m)\b/i },
  { key: "condimentos", label: "Condimentos", kws: /\b(ketchup|maionese|mostarda|azeite|vinagre|molho|tempero|shoyu)\b/i },
  { key: "padaria", label: "Padaria & Doces", kws: /\b(p[aã]o|biscoito|bolacha|bolo|torta|chocolate|doce|geleia|mel)\b/i },
  { key: "limpeza", label: "Limpeza", kws: /\b(sab[aã]o|detergente|amaciante|desinfetante|[aá]gua sanit|multiuso|esponja)\b/i },
  { key: "higiene", label: "Higiene", kws: /\b(shampoo|condicionador|sabonete|creme dental|pasta de dente|papel higi|absorvente|fralda|desodorante)\b/i },
];

function categorize(name: string): { key: string; label: string } {
  for (const r of CATEGORY_RULES) if (r.kws.test(name)) return { key: r.key, label: r.label };
  return { key: "outros", label: "Outros" };
}

const SIZE_RE = /\b(\d+(?:[.,]\d+)?)\s*(kg|g|mg|l|ml|un|unidades?|cx|caixa|lata|pct|pacote|garrafa)\b/i;

function parseSize(unit: string | null, quantity: number | null, name: string): {
  qty: number | null;
  unit: string | null;
  normalized: { value: number; base: "kg" | "l" | "un" } | null;
} {
  // Try from unit field first, else parse from name
  const src = (unit && unit.trim()) || "";
  let qty = quantity;
  let u = src;
  const m = (src.match(SIZE_RE) || name.match(SIZE_RE)) as RegExpMatchArray | null;
  if (m) {
    const num = Number(m[1].replace(",", "."));
    const raw = m[2].toLowerCase();
    if (Number.isFinite(num)) {
      qty = qty ?? num;
      u = `${num}${raw}`;
      if (raw === "kg") return { qty, unit: u, normalized: { value: num, base: "kg" } };
      if (raw === "g" || raw === "mg") return { qty, unit: u, normalized: { value: raw === "mg" ? num / 1e6 : num / 1000, base: "kg" } };
      if (raw === "l") return { qty, unit: u, normalized: { value: num, base: "l" } };
      if (raw === "ml") return { qty, unit: u, normalized: { value: num / 1000, base: "l" } };
      return { qty, unit: u, normalized: { value: num, base: "un" } };
    }
  }
  return { qty, unit: u || null, normalized: null };
}

function stripSize(name: string): string {
  return name
    .replace(SIZE_RE, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[·\-–—]+\s*$/g, "")
    .trim();
}

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// Receipt/nota-fiscal photos live under scans storage and should NEVER be used as product photos.
const RECEIPT_URL_RE = /(-nf-|\/scans\/|nota[-_]?fiscal|__l5e\/assets-v1\/)/i;
function isReceiptImage(url: string | null | undefined): boolean {
  if (!url) return true;
  return RECEIPT_URL_RE.test(url);
}

type CatalogImageRow = { barcode: string | null; normalized_name: string | null; image_url: string | null };
type ImageResolver = (barcode: string | null, baseName: string) => string | null;

async function loadCatalogImageResolver(): Promise<ImageResolver> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const table = supabaseAdmin.from("product_catalog" as never) as unknown as {
    select: (s: string) => {
      not: (c: string, op: string, v: unknown) => Promise<{ data: CatalogImageRow[] | null }>;
    };
  };
  const { data } = await table.select("barcode, normalized_name, image_url").not("image_url", "is", null);
  const byBarcode = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const r of data ?? []) {
    if (!r.image_url || isReceiptImage(r.image_url)) continue;
    if (r.barcode) byBarcode.set(r.barcode, r.image_url);
    if (r.normalized_name) byName.set(r.normalized_name.toUpperCase(), r.image_url);
  }
  return (barcode, baseName) => {
    if (barcode) {
      const hit = byBarcode.get(barcode);
      if (hit) return hit;
    }
    return byName.get(stripSize(baseName).toUpperCase()) ?? null;
  };
}

// Aggregate one product bucket
function buildProduct(
  rows: ScanRow[],
  productName: string,
  resolveImage: ImageResolver,
): PublicStoreProduct | null {
  const prices: { price: number; date: string }[] = [];
  let latestRow: ScanRow | null = null;
  for (const r of rows) {
    const p = toNum(r.price_captured);
    if (p == null) continue;
    prices.push({ price: p, date: r.created_at });
    if (!latestRow || new Date(r.created_at) > new Date(latestRow.created_at)) latestRow = r;
  }
  if (prices.length === 0 || !latestRow) return null;
  const nums = prices.map((x) => x.price);
  const minPrice = Math.min(...nums);
  const maxPrice = Math.max(...nums);
  const avgPrice = nums.reduce((a, b) => a + b, 0) / nums.length;
  const cat = categorize(productName);
  const parsed = parseSize(latestRow.unit, toNum(latestRow.quantity), productName);
  let pricePerUnit: number | null = null;
  let unitLabel: string | null = null;
  if (parsed.normalized && parsed.normalized.value > 0) {
    pricePerUnit = latestRow.price_captured != null ? toNum(latestRow.price_captured)! / parsed.normalized.value : null;
    unitLabel = parsed.normalized.base === "kg" ? "R$/kg" : parsed.normalized.base === "l" ? "R$/L" : "R$/un";
  }
  const catalogImage = resolveImage(latestRow.barcode, productName);
  return {
    slug: slugify(productName),
    productName,
    baseName: stripSize(productName),
    brand: null,
    category: cat.label,
    price: toNum(latestRow.price_captured)!,
    minPrice,
    maxPrice,
    avgPrice,
    pricePerUnit,
    unitLabel,
    unit: parsed.unit,
    quantity: parsed.qty,
    lastDate: latestRow.created_at,
    historyCount: prices.length,
    imageUrl: catalogImage,
    barcode: latestRow.barcode,
  };
}

// ---------- server fns ----------

export const listPublicStores = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicStore[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const estabTable = supabaseAdmin.from("establishments" as never) as unknown as {
      select: (s: string) => {
        eq: (c: string, v: boolean) => {
          order: (
            c: string,
          ) => Promise<{ data: EstabRow[] | null; error: { message: string } | null }>;
        };
      };
    };
    const { data: estabs, error } = await estabTable
      .select("id, name, city, state, neighborhood, address, logo_url, latitude, longitude, active")
      .eq("active", true)
      .order("name");
    if (error) throw new Error(error.message);

    const scansTable = supabaseAdmin.from("scans" as never) as unknown as {
      select: (s: string) => {
        not: (
          c: string,
          op: string,
          v: unknown,
        ) => Promise<{
          data: { establishment_id: string | null }[] | null;
          error: { message: string } | null;
        }>;
      };
    };
    const { data: scans } = await scansTable
      .select("establishment_id")
      .not("price_captured", "is", null);

    const counts = new Map<string, number>();
    for (const s of scans ?? []) {
      if (!s.establishment_id) continue;
      counts.set(s.establishment_id, (counts.get(s.establishment_id) ?? 0) + 1);
    }

    return (estabs ?? []).map((e) => ({
      id: e.id,
      name: e.name,
      city: e.city,
      state: e.state,
      neighborhood: e.neighborhood,
      address: e.address,
      latitude: e.latitude ?? null,
      longitude: e.longitude ?? null,
      logoUrl: e.logo_url,
      productCount: counts.get(e.id) ?? 0,
      lastUpdate: null,
    }));
  },
);

export type PlatformStats = {
  establishments: number;
  priceDrops7d: number;
  activeComparisons: number;
  products: number;
  /** Produtos distintos com preço público cadastrado (mesma base do painel de métricas). */
  totalItems: number;
  /** Total bruto de registros de preço (linhas), usado só como métrica secundária. */
  priceRecords: number;
  /** Economia média por produto comparado (avg − min), em R$. */
  estimatedSavings: number;
  /** Soma da economia potencial em todos os produtos comparados, em R$. */
  totalSavings: number;
  /** ISO da apuração dos números (quando a consulta ao banco terminou). */
  generatedAt: string;
  /** Janela de tempo considerada nas quedas de preço, em dias. */
  windowDays: number;
  /** false quando a integração com o banco falhou — a UI mostra erro/zero. */
  ok: boolean;
  /** Mensagem curta de erro, quando `ok` for false. */
  error: string | null;
};

/** Janela usada pela RPC `platform_public_stats` para detectar quedas de preço. */
export const PLATFORM_STATS_WINDOW_DAYS = 30;


export const getPlatformStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<PlatformStats> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const client = supabaseAdmin as unknown as {
      rpc: (
        fn: string,
      ) => Promise<{
        data:
          | Array<{
              establishments: number | null;
              price_drops_7d: number | null;
              active_comparisons: number | null;
              unique_products: number | null;
              avg_savings: number | null;
              total_savings: number | null;
            }>
          | null;
        error: { message: string } | null;
      }>;
    };

    const countClient = supabaseAdmin as unknown as {
      from: (t: string) => {
        select: (
          s: string,
          o: { count: "exact"; head: true },
        ) => {
          eq: (c: string, v: unknown) => {
            is: (c: string, v: null) => Promise<{ count: number | null }>;
          };
        };
      };
    };

    const [rpcRes, itemsCount] = await Promise.all([
      client.rpc("platform_public_stats").catch((e: unknown) => ({
        data: null,
        error: { message: e instanceof Error ? e.message : "falha na consulta" },
      })),
      countClient
        .from("scans")
        .select("id", { count: "exact", head: true })
        .eq("status", "salvo")
        .is("user_id", null)
        .catch(() => ({ count: null })),
    ]);

    const { data, error } = rpcRes;
    const row = data?.[0];
    const num = (v: unknown) => {
      const n = Number(v ?? 0);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    };

    // Todas as métricas agregadas vêm do banco (platform_public_stats), evitando
    // o teto de 1000 linhas do PostgREST que antes truncava produtos e economia.
    // Quando a integração falha, devolvemos zeros + `ok: false` para a UI mostrar
    // o estado de erro de forma consistente (nunca números inventados).
    const failed = Boolean(error) || !row;
    const unique = failed ? 0 : num(row?.unique_products);

    return {
      establishments: failed ? 0 : num(row?.establishments),
      priceDrops7d: failed ? 0 : num(row?.price_drops_7d),
      activeComparisons: failed ? 0 : num(row?.active_comparisons),
      products: unique,
      totalItems: unique,
      priceRecords: failed ? 0 : (itemsCount.count ?? 0),
      estimatedSavings: failed ? 0 : num(row?.avg_savings),
      totalSavings: failed ? 0 : num(row?.total_savings),
      generatedAt: new Date().toISOString(),
      windowDays: PLATFORM_STATS_WINDOW_DAYS,
      ok: !failed,
      error: failed ? (error?.message ?? "sem dados do banco") : null,
    };
  },
);




// ---------- Ranking: mercados com mais menor preço nos últimos 7 dias ----------

export type CategoryWins = { category: string; wins: number; appearances: number };

export type RankTrend = "up" | "down" | "flat" | "new";

export type CheapestStoreRank = {
  establishmentId: string;
  storeName: string;
  city: string;
  state: string;
  logoUrl: string | null;
  wins: number; // vitórias na janela atual (7d)
  winsPrev: number; // vitórias na janela anterior (7-14d)
  deltaWins: number; // diferença absoluta (wins - winsPrev)
  deltaPct: number; // variação percentual vs janela anterior
  trend: RankTrend;
  productsCompared: number;
  avgSavingsPct: number;
  avgTicketWins: number;
  exclusiveProducts: number;
  topCategories: CategoryWins[];
  distinctCategories: number;
};

export type CheapestRankingResponse = {
  rows: CheapestStoreRank[];
  summary: {
    totalProductsCompared: number;
    totalStores: number;
    categoriesCovered: number;
    avgSavingsPct: number;
    windowDays: number;
    filterCategory: string | null;
    filterType: string | null;
    availableCategories: { key: string; count: number }[];
    availableTypes: { key: string; count: number }[];
  };
};


type ScanRowRank = {
  product_name: string | null;
  price_captured: number | string | null;
  establishment_id: string | null;
  created_at: string;
};

// Classificação de categoria (leve, para não pagar RPC por linha).
function classifyRank(name: string): string {
  const n = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (/\b(leite|queijo|manteiga|margarina|iogurte|requeij|nata|coalh|danone|batavo|italac|itamb|qualy|vigor|piracanjuba|ninho)\b/.test(n)) return "laticinios";
  if (/\b(shampoo|sabonete|creme dental|pasta de dente|desodorante|absorvente|papel higienic|fralda|escova|higiene|higiê|antisseptic)\b/.test(n)) return "higiene";
  if (/\b(sabao|detergente|amaciante|agua sanit|desinfetante|multiuso|limp|lava roup|veja|omo|ariel|ype|ypê)\b/.test(n)) return "limpeza";
  if (/\b(cafe|café|arroz|feijao|feijão|acucar|açúcar|oleo|óleo|macarr|farinha|sal|molho|extrato|azeite|vinagre|tempero|milho|ervilha|sardinha|atum|maionese|mostarda|ketchup)\b/.test(n)) return "mercearia";
  if (/\b(biscoit|bolach|wafer|cookie|cracker)\b/.test(n)) return "biscoitos";
  if (/\b(refrigerante|suco|agua mineral|cerveja|energetic|energético|isotonic|coca|guarana|pepsi|amstel|skol|brahma|heineken)\b/.test(n)) return "bebidas";
  if (/\b(nescau|toddy|achocolatado|leite em po|leite po|nan|milkshake|cappuc|nescafe)\b/.test(n)) return "bebidas_em_po";
  if (/\b(chocolate|bala|pirulito|goma|bombom|doce|geleia|marmelada|gelatina|pudim|creme de leite|leite condens)\b/.test(n)) return "doces";
  if (/\b(carne|frango|peito|coxa|linguic|linguiç|salsich|bacon|hamburguer|hambúrguer|patinho|coxão|contra file|contra filé|picanha|acém|acem)\b/.test(n)) return "carnes";
  if (/\b(pao|pão|panetone|torrada|bolo|croissant|rosca)\b/.test(n)) return "padaria";
  if (/\b(congelado|nugget|batata palha|batata frita|pizza congel|acai|açaí)\b/.test(n)) return "congelados";
  return "outros";
}

function normRank(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Conta vitórias por estabelecimento numa janela (usado p/ janela anterior).
function tallyWins(scans: ScanRowRank[], keep: (name: string) => boolean): Map<string, number> {
  const perProduct = new Map<string, Map<string, number>>();
  for (const s of scans) {
    const name = (s.product_name ?? "").trim();
    const p = Number(s.price_captured);
    const est = s.establishment_id;
    if (!name || !est || !Number.isFinite(p) || p <= 0) continue;
    if (!keep(name)) continue;
    const key = normRank(name);
    if (!key) continue;
    const m = perProduct.get(key) ?? new Map<string, number>();
    const cur = m.get(est);
    if (cur == null || p < cur) m.set(est, p);
    perProduct.set(key, m);
  }
  const wins = new Map<string, number>();
  for (const [, m] of perProduct) {
    if (m.size < 2) continue;
    let minP = Infinity;
    let winners: string[] = [];
    for (const [est, p] of m) {
      if (p < minP) {
        minP = p;
        winners = [est];
      } else if (p === minP) {
        winners.push(est);
      }
    }
    for (const w of winners) wins.set(w, (wins.get(w) ?? 0) + 1);
  }
  return wins;
}


export const getCheapestStoresRanking = createServerFn({ method: "GET" })
  .inputValidator(
    (input: { category?: string | null; type?: string | null } | undefined) => input ?? {},
  )
  .handler(async ({ data }): Promise<CheapestRankingResponse> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { classifyProductType } = await import("@/lib/product-type");
    const now = Date.now();
    const since7 = new Date(now - 7 * 86_400_000).toISOString();
    const since14 = new Date(now - 14 * 86_400_000).toISOString();
    const filterCategory = data?.category?.trim() || null;
    const filterType = data?.type?.trim() || null;


    // Buscamos 14 dias em uma query só; separamos as janelas em memória.
    const scansClient = supabaseAdmin as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (c: string, v: string) => {
            is: (c: string, v: null) => {
              not: (c: string, op: string, v: unknown) => {
                gte: (c: string, v: string) => Promise<{
                  data: ScanRowRank[] | null;
                  error: { message: string } | null;
                }>;
              };
            };
          };
        };
      };
    };
    const { data: allScans, error } = await scansClient
      .from("scans")
      .select("product_name, price_captured, establishment_id, created_at")
      .eq("status", "salvo")
      .is("user_id", null)
      .not("establishment_id", "is", null)
      .gte("created_at", since14);
    if (error) throw new Error(error.message);

    const current: ScanRowRank[] = [];
    const prior: ScanRowRank[] = [];
    for (const s of allScans ?? []) {
      if (s.created_at >= since7) current.push(s);
      else prior.push(s);
    }
    const keep = (name: string): boolean => {
      if (filterCategory && classifyRank(name) !== filterCategory) return false;
      if (filterType && classifyProductType(name) !== filterType) return false;
      return true;
    };
    const priorWins = tallyWins(prior, keep);

    // Categorias disponíveis (baseadas nos scans atuais, ignorando filtro).
    const availableCatCount = new Map<string, number>();
    // Tipos disponíveis (respeitam filtro de categoria — se houver — para que
    // o usuário só veja tipos que fazem sentido na categoria escolhida).
    const availableTypeCount = new Map<string, number>();
    for (const s of current) {
      const name = (s.product_name ?? "").trim();
      if (!name) continue;
      const c = classifyRank(name);
      availableCatCount.set(c, (availableCatCount.get(c) ?? 0) + 1);
      if (!filterCategory || c === filterCategory) {
        const t = classifyProductType(name);
        if (t !== "outros") {
          availableTypeCount.set(t, (availableTypeCount.get(t) ?? 0) + 1);
        }
      }
    }

    // Trabalha somente com scans atuais (opcionalmente filtrados por cat/tipo).
    const scans = current.filter((s) => s.product_name && keep(s.product_name));



    // Normalização leve; para agrupar produtos "iguais"
    const norm = (s: string) =>
      s
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

    // Classificação de categoria (espelha classify_product_category no DB para
    // não pagar RPC por linha; é uma heurística leve o suficiente).
    const classify = (name: string): string => {
      const n = name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      if (/\b(leite|queijo|manteiga|margarina|iogurte|requeij|nata|coalh|danone|batavo|italac|itamb|qualy|vigor|piracanjuba|ninho)\b/.test(n)) return "laticinios";
      if (/\b(shampoo|sabonete|creme dental|pasta de dente|desodorante|absorvente|papel higienic|fralda|escova|higiene|higiê|antisseptic)\b/.test(n)) return "higiene";
      if (/\b(sabao|detergente|amaciante|agua sanit|desinfetante|multiuso|limp|lava roup|veja|omo|ariel|ype|ypê)\b/.test(n)) return "limpeza";
      if (/\b(cafe|café|arroz|feijao|feijão|acucar|açúcar|oleo|óleo|macarr|farinha|sal|molho|extrato|azeite|vinagre|tempero|milho|ervilha|sardinha|atum|maionese|mostarda|ketchup)\b/.test(n)) return "mercearia";
      if (/\b(biscoit|bolach|wafer|cookie|cracker)\b/.test(n)) return "biscoitos";
      if (/\b(refrigerante|suco|agua mineral|cerveja|energetic|energético|isotonic|coca|guarana|pepsi|amstel|skol|brahma|heineken|chá|cha \b)\b/.test(n)) return "bebidas";
      if (/\b(nescau|toddy|achocolatado|leite em po|leite po|nan|milkshake|cappuc|nescafe)\b/.test(n)) return "bebidas_em_po";
      if (/\b(chocolate|bala|pirulito|goma|bombom|doce|geleia|marmelada|gelatina|pudim|creme de leite|leite condens)\b/.test(n)) return "doces";
      if (/\b(carne|frango|peito|coxa|linguic|linguiç|salsich|bacon|hamburguer|hambúrguer|patinho|coxão|contra file|contra filé|picanha|acém|acem)\b/.test(n)) return "carnes";
      if (/\b(pao|pão|panetone|torrada|bolo|croissant|rosca)\b/.test(n)) return "padaria";
      if (/\b(congelado|nugget|batata palha|batata frita|pizza congel|acai|açaí)\b/.test(n)) return "congelados";
      return "outros";
    };

    // Group scans by (normalized product key, establishment) -> min price
    const perProductStore = new Map<
      string,
      { minByStore: Map<string, number>; category: string; displayName: string }
    >();
    for (const s of scans ?? []) {
      const name = (s.product_name ?? "").trim();
      const p = Number(s.price_captured);
      const est = s.establishment_id;
      if (!name || !est || !Number.isFinite(p) || p <= 0) continue;
      const key = norm(name);
      if (!key) continue;
      const entry =
        perProductStore.get(key) ??
        { minByStore: new Map<string, number>(), category: classify(name), displayName: name };
      const cur = entry.minByStore.get(est);
      if (cur == null || p < cur) entry.minByStore.set(est, p);
      perProductStore.set(key, entry);
    }

    const wins = new Map<string, number>();
    const appearances = new Map<string, number>();
    // categoryStats: est -> category -> { wins, appearances }
    const categoryStats = new Map<string, Map<string, { wins: number; appearances: number }>>();
    const savingsSum = new Map<string, number>(); // soma de % savings nas vitórias
    const savingsCount = new Map<string, number>();
    const winTicketSum = new Map<string, number>();
    const exclusiveByStore = new Map<string, number>();

    let totalCompared = 0;
    let globalSavingsSum = 0;
    let globalSavingsCount = 0;
    const globalCategories = new Set<string>();

    for (const [, entry] of perProductStore) {
      const { minByStore, category } = entry;
      globalCategories.add(category);

      if (minByStore.size === 1) {
        // Produto exclusivo — este mercado é o único que vende
        const [est] = Array.from(minByStore.keys());
        exclusiveByStore.set(est, (exclusiveByStore.get(est) ?? 0) + 1);
        continue;
      }
      if (minByStore.size < 2) continue;
      totalCompared += 1;

      // Menor preço + média dos concorrentes
      let minPrice = Infinity;
      let winner: string[] = [];
      const prices: number[] = [];
      for (const [est, price] of minByStore) {
        prices.push(price);
        appearances.set(est, (appearances.get(est) ?? 0) + 1);
        const catMap = categoryStats.get(est) ?? new Map();
        const catRow = catMap.get(category) ?? { wins: 0, appearances: 0 };
        catRow.appearances += 1;
        catMap.set(category, catRow);
        categoryStats.set(est, catMap);
        if (price < minPrice) {
          minPrice = price;
          winner = [est];
        } else if (price === minPrice) {
          winner.push(est);
        }
      }
      // média excluindo a menor
      const losers = prices.filter((p) => p > minPrice);
      const loserAvg = losers.length > 0 ? losers.reduce((a, b) => a + b, 0) / losers.length : minPrice;
      const savingsPct = loserAvg > 0 ? ((loserAvg - minPrice) / loserAvg) * 100 : 0;
      globalSavingsSum += savingsPct;
      globalSavingsCount += 1;

      for (const w of winner) {
        wins.set(w, (wins.get(w) ?? 0) + 1);
        savingsSum.set(w, (savingsSum.get(w) ?? 0) + savingsPct);
        savingsCount.set(w, (savingsCount.get(w) ?? 0) + 1);
        winTicketSum.set(w, (winTicketSum.get(w) ?? 0) + minPrice);
        const catMap = categoryStats.get(w)!;
        const catRow = catMap.get(category)!;
        catRow.wins += 1;
      }
    }

    const estIds = Array.from(
      new Set([
        ...wins.keys(),
        ...appearances.keys(),
        ...exclusiveByStore.keys(),
      ]),
    );
    const availableCategories = Array.from(availableCatCount.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);
    const availableTypes = Array.from(availableTypeCount.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);

    if (estIds.length === 0) {
      return {
        rows: [],
        summary: {
          totalProductsCompared: totalCompared,
          totalStores: 0,
          categoriesCovered: globalCategories.size,
          avgSavingsPct: 0,
          windowDays: 7,
          filterCategory,
          filterType,
          availableCategories,
          availableTypes,
        },
      };
    }



    const estabsClient = supabaseAdmin as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          in: (
            c: string,
            v: string[],
          ) => Promise<{
            data: EstabRow[] | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
    const { data: estabs, error: eErr } = await estabsClient
      .from("establishments")
      .select("id, name, city, state, neighborhood, address, logo_url, latitude, longitude, active")
      .in("id", estIds);
    if (eErr) throw new Error(eErr.message);

    const byId = new Map((estabs ?? []).map((e) => [e.id, e]));
    const rows: CheapestStoreRank[] = estIds
      .map((id) => {
        const e = byId.get(id);
        if (!e || !e.active) return null;
        const w = wins.get(id) ?? 0;
        const wPrev = priorWins.get(id) ?? 0;
        const app = appearances.get(id) ?? 0;
        const sSum = savingsSum.get(id) ?? 0;
        const sN = savingsCount.get(id) ?? 0;
        const catMap = categoryStats.get(id) ?? new Map<string, { wins: number; appearances: number }>();
        const topCategories: CategoryWins[] = Array.from(catMap.entries())
          .map(([category, v]) => ({ category, wins: v.wins, appearances: v.appearances }))
          .sort((a, b) => b.wins - a.wins || b.appearances - a.appearances)
          .slice(0, 3);
        const deltaWins = w - wPrev;
        const deltaPct = wPrev > 0 ? Number((((w - wPrev) / wPrev) * 100).toFixed(1)) : (w > 0 ? 100 : 0);
        const trend: RankTrend =
          wPrev === 0 && w > 0 ? "new" : deltaWins > 0 ? "up" : deltaWins < 0 ? "down" : "flat";
        return {
          establishmentId: id,
          storeName: e.name,
          city: e.city,
          state: e.state,
          logoUrl: e.logo_url,
          wins: w,
          winsPrev: wPrev,
          deltaWins,
          deltaPct,
          trend,
          productsCompared: app,
          avgSavingsPct: sN > 0 ? Number((sSum / sN).toFixed(1)) : 0,
          avgTicketWins: w > 0 ? Number(((winTicketSum.get(id) ?? 0) / w).toFixed(2)) : 0,
          exclusiveProducts: exclusiveByStore.get(id) ?? 0,
          topCategories,
          distinctCategories: catMap.size,
        };
      })
      .filter((v): v is CheapestStoreRank => v !== null)
      .sort((a, b) => b.wins - a.wins || b.productsCompared - a.productsCompared)
      .slice(0, 10);

    return {
      rows,
      summary: {
        totalProductsCompared: totalCompared,
        totalStores: rows.length,
        categoriesCovered: globalCategories.size,
        avgSavingsPct:
          globalSavingsCount > 0
            ? Number((globalSavingsSum / globalSavingsCount).toFixed(1))
            : 0,
        windowDays: 7,
        filterCategory,
        filterType,
        availableCategories,
        availableTypes,

      },
    };
  },
);








async function loadStoreAndScans(id: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const estabTable = supabaseAdmin.from("establishments" as never) as unknown as {
    select: (s: string) => {
      eq: (c: string, v: string) => {
        maybeSingle: () => Promise<{ data: EstabRow | null; error: { message: string } | null }>;
      };
    };
  };
  const { data: estab, error: eErr } = await estabTable
    .select("id, name, city, state, neighborhood, address, logo_url, latitude, longitude, active")
    .eq("id", id)
    .maybeSingle();
  if (eErr) throw new Error(eErr.message);
  if (!estab || !estab.active) throw new Error("Mercado não encontrada");

  const scansTable = supabaseAdmin.from("scans" as never) as unknown as {
    select: (s: string) => {
      eq: (c: string, v: string) => {
        not: (
          c: string,
          op: string,
          v: unknown,
        ) => {
          order: (
            c: string,
            o: { ascending: boolean },
          ) => Promise<{ data: ScanRow[] | null; error: { message: string } | null }>;
        };
      };
    };
  };
  const { data: scans, error: sErr } = await scansTable
    .select("product_name, price_captured, unit, quantity, barcode, image_url, created_at, establishment_id")
    .eq("establishment_id", id)
    .not("price_captured", "is", null)
    .order("created_at", { ascending: false });
  if (sErr) throw new Error(sErr.message);
  return { estab, scans: scans ?? [] };
}

function aggregateProducts(scans: ScanRow[], resolveImage: ImageResolver): PublicStoreProduct[] {
  const byName = new Map<string, ScanRow[]>();
  for (const s of scans) {
    const name = s.product_name?.trim();
    if (!name) continue;
    const key = name.toUpperCase();
    const list = byName.get(key) ?? [];
    list.push(s);
    byName.set(key, list);
  }
  const products: PublicStoreProduct[] = [];
  for (const [, rows] of byName) {
    const name = rows[0].product_name!.trim();
    const p = buildProduct(rows, name, resolveImage);
    if (p) products.push(p);
  }
  return products;
}

export const getPublicStoreCatalog = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => {
    if (!input.id?.trim()) throw new Error("id obrigatório");
    return input;
  })
  .handler(async ({ data }): Promise<PublicStoreCatalog> => {
    const { estab, scans } = await loadStoreAndScans(data.id);
    const resolveImage = await loadCatalogImageResolver();
    const products = aggregateProducts(scans, resolveImage).sort((a, b) =>
      a.productName.localeCompare(b.productName, "pt-BR"),
    );

    const catCounts = new Map<string, { label: string; count: number }>();
    for (const p of products) {
      const c = categorize(p.productName);
      const cur = catCounts.get(c.key) ?? { label: c.label, count: 0 };
      cur.count += 1;
      catCounts.set(c.key, cur);
    }
    const categories = Array.from(catCounts.entries())
      .map(([key, v]) => ({ key, label: v.label, count: v.count }))
      .sort((a, b) => b.count - a.count);

    const lastUpdate = products.reduce<string | null>((acc, p) => {
      if (!acc) return p.lastDate;
      return new Date(p.lastDate) > new Date(acc) ? p.lastDate : acc;
    }, null);

    return {
      store: {
        id: estab.id,
        name: estab.name,
        city: estab.city,
        state: estab.state,
        neighborhood: estab.neighborhood,
        address: estab.address,
        latitude: estab.latitude ?? null,
        longitude: estab.longitude ?? null,
        logoUrl: estab.logo_url,
        productCount: products.length,
        lastUpdate,
      },
      products,
      categories,
    };
  });

/* =============== Top produtos + histórico (drawer) =============== */

export type StoreTopProductWithHistory = {
  slug: string;
  productName: string;
  displayName: string;
  price: number;
  minPrice: number;
  avgPrice: number;
  maxPrice: number;
  imageUrl: string | null;
  category: string;
  points: PricePoint[]; // asc por data, no janelamento pedido
};

export const getStoreTopProductsHistory = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string; limit?: number; days?: number }) => {
    if (!input.id?.trim()) throw new Error("id obrigatório");
    return {
      id: input.id,
      limit: Math.min(Math.max(Number(input.limit ?? 5), 1), 10),
      days: Math.min(Math.max(Number(input.days ?? 30), 7), 90),
    };
  })
  .handler(async ({ data }): Promise<StoreTopProductWithHistory[]> => {
    const { estab, scans } = await loadStoreAndScans(data.id);
    void estab;
    const resolveImage = await loadCatalogImageResolver();
    const products = aggregateProducts(scans, resolveImage)
      .filter((p) => Number.isFinite(p.price) && p.price > 0)
      .sort((a, b) => a.price - b.price)
      .slice(0, data.limit);

    if (products.length === 0) return [];

    const cutoff = Date.now() - data.days * 24 * 60 * 60 * 1000;

    // Index scans by productName (uppercase) once
    const byName = new Map<string, ScanRow[]>();
    for (const s of scans) {
      const key = (s.product_name?.trim() ?? "").toUpperCase();
      if (!key) continue;
      const list = byName.get(key) ?? [];
      list.push(s);
      byName.set(key, list);
    }

    return products.map((p) => {
      const rows = byName.get(p.productName.toUpperCase()) ?? [];
      const points: PricePoint[] = [];
      for (const r of rows) {
        const price = toNum(r.price_captured);
        if (price == null) continue;
        const t = new Date(r.created_at).getTime();
        if (Number.isFinite(t) && t >= cutoff) {
          points.push({ price, date: r.created_at });
        }
      }
      points.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      return {
        slug: p.slug,
        productName: p.productName,
        displayName: p.productName,
        price: p.price,
        minPrice: p.minPrice,
        avgPrice: p.avgPrice,
        maxPrice: p.maxPrice,
        imageUrl: p.imageUrl,
        category: p.category,
        points,
      };
    });
  });


export const getPublicProductDetail = createServerFn({ method: "GET" })
  .inputValidator((input: { storeId: string; slug: string }) => {
    if (!input.storeId?.trim() || !input.slug?.trim()) throw new Error("params obrigatórios");
    return input;
  })
  .handler(async ({ data }): Promise<PublicProductDetail> => {
    const { estab, scans } = await loadStoreAndScans(data.storeId);
    const resolveImage = await loadCatalogImageResolver();
    const products = aggregateProducts(scans, resolveImage);
    const target = products.find((p) => p.slug === data.slug);
    if (!target) throw new Error("Produto não encontrado nesta mercado");

    // Full price history for this exact productName
    const history: PricePoint[] = [];
    for (const s of scans) {
      if ((s.product_name?.trim() || "").toUpperCase() !== target.productName.toUpperCase()) continue;
      const p = toNum(s.price_captured);
      if (p == null) continue;
      history.push({ price: p, date: s.created_at });
    }
    history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Variations: same baseName, different slug
    const variations = products
      .filter((p) => p.slug !== target.slug && p.baseName.toUpperCase() === target.baseName.toUpperCase())
      .sort((a, b) => a.price - b.price);

    return {
      store: {
        id: estab.id,
        name: estab.name,
        city: estab.city,
        state: estab.state,
        neighborhood: estab.neighborhood,
        address: estab.address,
        latitude: estab.latitude ?? null,
        longitude: estab.longitude ?? null,
        logoUrl: estab.logo_url,
        productCount: products.length,
        lastUpdate: target.lastDate,
      },
      product: target,
      history,
      variations,
    };
  });

// ============ Cross-store comparison ============

export type BestOfferReason = {
  rankedBy: "pricePerUnit" | "price";
  tiebreakByRecency: boolean;
  ppuAdvantagePct: number | null;
  priceAdvantagePct: number | null;
  daysSinceUpdate: number;
  runnerUpStoreName: string | null;
  runnerUpDaysSinceUpdate: number | null;
  offersCount: number;
};

export type CrossStoreOffer = {
  storeId: string;
  storeName: string;
  storeCity: string;
  storeState: string;
  storeLogoUrl: string | null;
  price: number;
  lastDate: string;
  productName: string;
  slug: string;
  unit: string | null;
  pricePerUnit: number | null;
  unitLabel: string | null;
  bestReason?: BestOfferReason;
};

export const getCrossStoreComparison = createServerFn({ method: "GET" })
  .inputValidator((input: { storeId: string; slug: string }) => {
    if (!input.storeId?.trim() || !input.slug?.trim()) throw new Error("params obrigatórios");
    return input;
  })
  .handler(async ({ data }): Promise<CrossStoreOffer[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) Load the reference product from the current store
    const resolveImage = await loadCatalogImageResolver();
    const { estab: refStore, scans: refScans } = await loadStoreAndScans(data.storeId);
    const refProducts = aggregateProducts(refScans, resolveImage);
    const ref = refProducts.find((p) => p.slug === data.slug);
    if (!ref) return [];

    // 2) Fetch all active establishments and their scans that match this product (barcode or baseName)
    const estabTable = supabaseAdmin.from("establishments" as never) as unknown as {
      select: (s: string) => {
        eq: (c: string, v: boolean) => Promise<{ data: EstabRow[] | null; error: { message: string } | null }>;
      };
    };
    const { data: estabs } = await estabTable
      .select("id, name, city, state, neighborhood, address, logo_url, latitude, longitude, active")
      .eq("active", true);

    const scansTable = supabaseAdmin.from("scans" as never) as unknown as {
      select: (s: string) => {
        not: (c: string, op: string, v: unknown) => {
          order: (
            c: string,
            o: { ascending: boolean },
          ) => Promise<{ data: ScanRow[] | null; error: { message: string } | null }>;
        };
      };
    };
    const { data: allScans } = await scansTable
      .select("product_name, price_captured, unit, quantity, barcode, image_url, created_at, establishment_id")
      .not("price_captured", "is", null)
      .order("created_at", { ascending: false });

    const byStore = new Map<string, ScanRow[]>();
    const baseUp = ref.baseName.toUpperCase();
    for (const s of allScans ?? []) {
      if (!s.establishment_id || s.establishment_id === data.storeId) continue;
      const name = s.product_name?.trim();
      if (!name) continue;
      const matchesBarcode = ref.barcode && s.barcode && s.barcode === ref.barcode;
      const matchesName = stripSize(name).toUpperCase() === baseUp;
      if (!matchesBarcode && !matchesName) continue;
      const list = byStore.get(s.establishment_id) ?? [];
      list.push(s);
      byStore.set(s.establishment_id, list);
    }

    const offers: CrossStoreOffer[] = [];
    const estabMap = new Map((estabs ?? []).map((e) => [e.id, e] as const));
    for (const [storeId, rows] of byStore) {
      const estab = estabMap.get(storeId);
      if (!estab) continue;
      // Use most recent matching row for that store
      rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const built = buildProduct(rows, rows[0].product_name!.trim(), resolveImage);
      if (!built) continue;
      offers.push({
        storeId,
        storeName: estab.name,
        storeCity: estab.city,
        storeState: estab.state,
        storeLogoUrl: estab.logo_url,
        price: built.price,
        lastDate: built.lastDate,
        productName: built.productName,
        slug: built.slug,
        unit: built.unit,
        pricePerUnit: built.pricePerUnit,
        unitLabel: built.unitLabel,
      });
    }

    // include reference store
    offers.push({
      storeId: refStore.id,
      storeName: refStore.name,
      storeCity: refStore.city,
      storeState: refStore.state,
      storeLogoUrl: refStore.logo_url,
      price: ref.price,
      lastDate: ref.lastDate,
      productName: ref.productName,
      slug: ref.slug,
      unit: ref.unit,
      pricePerUnit: ref.pricePerUnit,
      unitLabel: ref.unitLabel,
    });

    // Sort: primary = pricePerUnit when all offers share the same unit label, else price.
    // Recency tie-break: within 5% of the winner, prefer the more recent record.
    const allSameUnit = offers.length > 0 && offers.every((o) => o.unitLabel && o.unitLabel === offers[0].unitLabel);
    const rankedBy: "pricePerUnit" | "price" = allSameUnit ? "pricePerUnit" : "price";
    offers.sort((a, b) => {
      const av = allSameUnit && a.pricePerUnit != null ? a.pricePerUnit : a.price;
      const bv = allSameUnit && b.pricePerUnit != null ? b.pricePerUnit : b.price;
      const diff = av - bv;
      const ratio = Math.min(av, bv) > 0 ? Math.abs(diff) / Math.min(av, bv) : 0;
      if (ratio < 0.05) return new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime();
      return diff;
    });

    // Attach reason metadata to the winning offer
    if (offers.length >= 2) {
      const [w, r] = offers;
      const wv = allSameUnit && w.pricePerUnit != null ? w.pricePerUnit : w.price;
      const rv = allSameUnit && r.pricePerUnit != null ? r.pricePerUnit : r.price;
      const ratio = Math.min(wv, rv) > 0 ? Math.abs(wv - rv) / Math.min(wv, rv) : 0;
      const tiebreakByRecency = ratio < 0.05;
      const ppuAdvantagePct =
        w.pricePerUnit != null && r.pricePerUnit != null && r.pricePerUnit > 0
          ? ((r.pricePerUnit - w.pricePerUnit) / r.pricePerUnit) * 100
          : null;
      const priceAdvantagePct = r.price > 0 ? ((r.price - w.price) / r.price) * 100 : null;
      const today = Date.now();
      const daysSince = (d: string) => Math.max(0, Math.floor((today - new Date(d).getTime()) / 86_400_000));
      offers[0] = {
        ...w,
        bestReason: {
          rankedBy,
          tiebreakByRecency,
          ppuAdvantagePct,
          priceAdvantagePct,
          daysSinceUpdate: daysSince(w.lastDate),
          runnerUpStoreName: r.storeName,
          runnerUpDaysSinceUpdate: daysSince(r.lastDate),
          offersCount: offers.length,
        },
      };
    }
    return offers;
  });

// ============ Price report submission (auth required) ============


export type PriceReportInput = {
  establishmentId: string;
  productName: string;
  productSlug?: string | null;
  barcode?: string | null;
  reportedPrice?: number | null;
  correctPrice?: number | null;
  reason: "incorrect" | "outdated" | "wrong_product" | "other";
  notes?: string | null;
  evidenceUrl?: string | null;
};

export type MyPriceReport = {
  id: string;
  establishmentId: string;
  establishmentName: string | null;
  productName: string;
  productSlug: string | null;
  reason: string;
  reportedPrice: number | null;
  correctPrice: number | null;
  status: string;
  actionTaken: string | null;
  adminNotes: string | null;
  notes: string | null;
  evidenceUrl: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export const submitPriceReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: PriceReportInput) => {
    if (!input.establishmentId?.trim()) throw new Error("Mercado obrigatória");
    if (!input.productName?.trim()) throw new Error("Produto obrigatório");
    if (!["incorrect", "outdated", "wrong_product", "other"].includes(input.reason))
      throw new Error("Motivo inválido");
    return input;
  })
  .handler(async ({ data, context }): Promise<{ ok: true; id: string; replaced: boolean }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Look for prior pending reports from same user for same target — replace them so
    // the "current" evidence is always the latest submission and old files are removed.
    type Prior = { id: string; evidence_url: string | null };
    const priorTable = supabaseAdmin.from("price_reports" as never) as unknown as {
      select: (s: string) => {
        eq: (c: string, v: string) => {
          eq: (c: string, v: string) => {
            eq: (c: string, v: string) => {
              eq: (c: string, v: string) => Promise<{ data: Prior[] | null }>;
            };
          };
        };
      };
    };
    const { data: priors } = await priorTable
      .select("id, evidence_url")
      .eq("user_id", context.userId)
      .eq("establishment_id", data.establishmentId)
      .eq("product_slug", data.productSlug ?? "")
      .eq("status", "pending");

    let replaced = false;
    if (priors && priors.length) {
      const stalePaths = priors.map((p) => p.evidence_url).filter((p): p is string => !!p);
      if (stalePaths.length) {
        const storage = (supabaseAdmin as unknown as {
          storage: { from: (b: string) => { remove: (paths: string[]) => Promise<{ error: unknown }> } };
        }).storage;
        try { await storage.from("report-evidence").remove(stalePaths); } catch { /* ignore */ }
      }
      const delTable = supabaseAdmin.from("price_reports" as never) as unknown as {
        delete: () => { in: (c: string, v: string[]) => Promise<{ error: unknown }> };
      };
      await delTable.delete().in("id", priors.map((p) => p.id));
      replaced = true;
    }

    const supabase = context.supabase as unknown as {
      from: (t: string) => {
        insert: (row: Record<string, unknown>) => {
          select: (s: string) => {
            single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
          };
        };
      };
    };
    const { data: row, error } = await supabase
      .from("price_reports")
      .insert({
        user_id: context.userId,
        establishment_id: data.establishmentId,
        product_name: data.productName,
        product_slug: data.productSlug ?? null,
        barcode: data.barcode ?? null,
        reported_price: data.reportedPrice ?? null,
        correct_price: data.correctPrice ?? null,
        reason: data.reason,
        notes: data.notes ?? null,
        evidence_url: data.evidenceUrl ?? null,
      })
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Falha ao enviar reporte");
    return { ok: true, id: row.id, replaced };
  });

type PriceReportRow = {
  id: string;
  establishment_id: string;
  product_name: string;
  product_slug: string | null;
  barcode: string | null;
  reason: string;
  reported_price: number | string | null;
  correct_price: number | string | null;
  status: string;
  action_taken: string | null;
  admin_notes: string | null;
  notes: string | null;
  evidence_url: string | null;
  created_at: string;
  resolved_at: string | null;
  user_id: string | null;
};

function mapReport(r: PriceReportRow, estabName: string | null): MyPriceReport {
  return {
    id: r.id,
    establishmentId: r.establishment_id,
    establishmentName: estabName,
    productName: r.product_name,
    productSlug: r.product_slug,
    reason: r.reason,
    reportedPrice: r.reported_price != null ? Number(r.reported_price) : null,
    correctPrice: r.correct_price != null ? Number(r.correct_price) : null,
    status: r.status,
    actionTaken: r.action_taken,
    adminNotes: r.admin_notes,
    notes: r.notes,
    evidenceUrl: r.evidence_url,
    createdAt: r.created_at,
    resolvedAt: r.resolved_at,
  };
}

async function fetchEstabNames(ids: string[]): Promise<Map<string, string>> {
  const nameMap = new Map<string, string>();
  if (!ids.length) return nameMap;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const estabTable = supabaseAdmin.from("establishments" as never) as unknown as {
    select: (s: string) => { in: (c: string, v: string[]) => Promise<{ data: { id: string; name: string }[] | null }> };
  };
  const { data: es } = await estabTable.select("id, name").in("id", ids);
  for (const e of es ?? []) nameMap.set(e.id, e.name);
  return nameMap;
}

export const listMyPriceReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { productSlug?: string | null; establishmentId?: string | null } = {}) => input)
  .handler(async ({ data, context }): Promise<MyPriceReport[]> => {
    const supabase = context.supabase as unknown as {
      from: (t: string) => {
        select: (s: string) => unknown;
      };
    };
    type Q = {
      eq: (c: string, v: string) => Q;
      order: (c: string, o: { ascending: boolean }) => Promise<{ data: PriceReportRow[] | null; error: { message: string } | null }>;
    };
    let q = supabase.from("price_reports").select("*") as unknown as Q;
    q = q.eq("user_id", context.userId);
    if (data.productSlug) q = q.eq("product_slug", data.productSlug);
    if (data.establishmentId) q = q.eq("establishment_id", data.establishmentId);
    const { data: rows, error } = await q.order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const nameMap = await fetchEstabNames(Array.from(new Set((rows ?? []).map((r) => r.establishment_id).filter(Boolean))));
    return (rows ?? []).map((r) => mapReport(r, nameMap.get(r.establishment_id) ?? null));
  });

// ============ Admin ============

export type AdminPriceReport = MyPriceReport & { userId: string | null; userEmail: string | null };

export const listAdminPriceReports = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((input: { status?: string | null } = {}) => input)
  .handler(async ({ data }): Promise<AdminPriceReport[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    type Q = {
      eq: (c: string, v: string) => Q;
      order: (c: string, o: { ascending: boolean }) => Promise<{ data: PriceReportRow[] | null; error: { message: string } | null }>;
    };
    let q = supabaseAdmin.from("price_reports" as never).select("*") as unknown as Q;
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q.order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const nameMap = await fetchEstabNames(Array.from(new Set((rows ?? []).map((r) => r.establishment_id).filter(Boolean))));

    const userIds = Array.from(new Set((rows ?? []).map((r) => r.user_id).filter((v): v is string => !!v)));
    const emailMap = new Map<string, string>();
    if (userIds.length) {
      const authAdmin = (supabaseAdmin as unknown as {
        auth: { admin: { getUserById: (id: string) => Promise<{ data: { user: { email?: string | null } | null } | null }> } };
      }).auth.admin;
      for (const uid of userIds) {
        try {
          const { data: u } = await authAdmin.getUserById(uid);
          if (u?.user?.email) emailMap.set(uid, u.user.email);
        } catch { /* ignore */ }
      }
    }

    return (rows ?? []).map((r) => ({
      ...mapReport(r, nameMap.get(r.establishment_id) ?? null),
      userId: r.user_id,
      userEmail: r.user_id ? emailMap.get(r.user_id) ?? null : null,
    }));
  });

export type ReviewPriceReportInput = {
  id: string;
  status: "pending" | "reviewed" | "resolved" | "rejected";
  actionTaken?: "updated_price" | "marked_correct" | "no_action" | "duplicate" | null;
  adminNotes?: string | null;
};

export const reviewPriceReport = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: ReviewPriceReportInput) => {
    if (!input.id?.trim()) throw new Error("id obrigatório");
    if (!["pending", "reviewed", "resolved", "rejected"].includes(input.status))
      throw new Error("status inválido");
    if (input.actionTaken && !["updated_price", "marked_correct", "no_action", "duplicate"].includes(input.actionTaken))
      throw new Error("ação inválida");
    return input;
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const isDone = data.status === "resolved" || data.status === "rejected";
    const table = supabaseAdmin.from("price_reports" as never) as unknown as {
      update: (row: Record<string, unknown>) => {
        eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
      };
    };
    const { error } = await table
      .update({
        status: data.status,
        action_taken: data.actionTaken ?? null,
        admin_notes: data.adminNotes ?? null,
        resolved_at: isDone ? new Date().toISOString() : null,
        resolved_by: isDone ? context.userId : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getReportEvidenceSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { path: string }) => {
    if (!input.path?.trim()) throw new Error("path obrigatório");
    return input;
  })
  .handler(async ({ data }): Promise<{ url: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const storage = (supabaseAdmin as unknown as {
      storage: {
        from: (b: string) => {
          createSignedUrl: (p: string, expires: number) => Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }>;
        };
      };
    }).storage;
    const { data: signed, error } = await storage.from("report-evidence").createSignedUrl(data.path, 60 * 60);
    if (error || !signed) throw new Error(error?.message ?? "Falha ao gerar URL");
    return { url: signed.signedUrl };
  });

// ============ Evidence lifecycle (admin) ============

export type EvidenceCleanupResult = {
  scanned: number;
  filesDeleted: number;
  rowsUpdated: number;
  cutoffIso: string;
};

/**
 * Delete evidence files (and null out evidence_url) for reports that have been
 * resolved or rejected for longer than `olderThanDays` (default 30). Keeps the
 * report row so history / audit remains intact — only the storage object is
 * removed to keep the bucket tidy.
 */
export const cleanupExpiredEvidence = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { olderThanDays?: number } = {}) => ({
    olderThanDays: Math.max(1, Math.min(365, Math.floor(input.olderThanDays ?? 30))),
  }))
  .handler(async ({ data }): Promise<EvidenceCleanupResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cutoff = new Date(Date.now() - data.olderThanDays * 86_400_000).toISOString();

    type Row = { id: string; evidence_url: string | null };
    const table = supabaseAdmin.from("price_reports" as never) as unknown as {
      select: (s: string) => {
        in: (c: string, v: string[]) => {
          not: (c: string, op: string, v: unknown) => {
            lt: (c: string, v: string) => Promise<{ data: Row[] | null; error: { message: string } | null }>;
          };
        };
      };
      update: (row: Record<string, unknown>) => {
        in: (c: string, v: string[]) => Promise<{ error: { message: string } | null }>;
      };
    };
    const { data: rows, error } = await table
      .select("id, evidence_url")
      .in("status", ["resolved", "rejected"])
      .not("evidence_url", "is", null)
      .lt("resolved_at", cutoff);
    if (error) throw new Error(error.message);

    const scanned = rows?.length ?? 0;
    const paths = (rows ?? []).map((r) => r.evidence_url).filter((p): p is string => !!p);
    let filesDeleted = 0;
    if (paths.length) {
      const storage = (supabaseAdmin as unknown as {
        storage: { from: (b: string) => { remove: (p: string[]) => Promise<{ data: unknown[] | null; error: { message: string } | null }> } };
      }).storage;
      const { data: rm, error: rmErr } = await storage.from("report-evidence").remove(paths);
      if (rmErr) throw new Error(rmErr.message);
      filesDeleted = rm?.length ?? paths.length;
      await table.update({ evidence_url: null }).in("id", (rows ?? []).map((r) => r.id));
    }
    return { scanned, filesDeleted, rowsUpdated: paths.length, cutoffIso: cutoff };
  });

// ============ Cart cross-store comparison ============

export type CartCompareInput = {
  storeId: string;
  items: Array<{ productName: string; quantity: number }>;
};

export type CartCompareStoreItem = {
  productName: string;
  quantity: number;
  matched: boolean;
  matchedName: string | null;
  unitPrice: number | null;
  subtotal: number | null;
  lastDate: string | null;
};

export type CartCompareStore = {
  storeId: string;
  storeName: string;
  city: string;
  state: string;
  logoUrl: string | null;
  isReference: boolean;
  total: number;
  matchedCount: number;
  totalCount: number;
  items: CartCompareStoreItem[];
};

export const compareStoreCart = createServerFn({ method: "POST" })
  .inputValidator((input: CartCompareInput) => {
    if (!input?.storeId?.trim()) throw new Error("storeId obrigatório");
    const items = Array.isArray(input.items) ? input.items : [];
    const cleaned = items
      .map((it) => ({
        productName: (it.productName ?? "").trim(),
        quantity: Number(it.quantity),
      }))
      .filter(
        (it) => it.productName.length > 0 && Number.isFinite(it.quantity) && it.quantity > 0,
      )
      .slice(0, 100);
    if (!cleaned.length) throw new Error("cesta vazia");
    return { storeId: input.storeId, items: cleaned };
  })
  .handler(async ({ data }): Promise<CartCompareStore[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const resolveImage = await loadCatalogImageResolver();

    // 1) Reference store
    const { estab: refStore, scans: refScans } = await loadStoreAndScans(data.storeId);
    const refProducts = aggregateProducts(refScans, resolveImage);
    const refByName = new Map<string, PublicStoreProduct>();
    for (const p of refProducts) refByName.set(p.productName.toUpperCase(), p);
    const baseNames = new Map<string, string>(); // itemProductName -> baseUpper
    for (const it of data.items) {
      const ref = refByName.get(it.productName.toUpperCase());
      const base = (ref?.baseName ?? stripSize(it.productName)).toUpperCase();
      baseNames.set(it.productName, base);
    }

    // 2) All active establishments
    const estabTable = supabaseAdmin.from("establishments" as never) as unknown as {
      select: (s: string) => {
        eq: (
          c: string,
          v: boolean,
        ) => Promise<{ data: EstabRow[] | null; error: { message: string } | null }>;
      };
    };
    const { data: estabs } = await estabTable
      .select("id, name, city, state, neighborhood, address, logo_url, latitude, longitude, active")
      .eq("active", true);

    // 3) All scans (limit by recency to keep payload small)
    const scansTable = supabaseAdmin.from("scans" as never) as unknown as {
      select: (s: string) => {
        not: (
          c: string,
          op: string,
          v: unknown,
        ) => {
          order: (
            c: string,
            o: { ascending: boolean },
          ) => Promise<{ data: ScanRow[] | null; error: { message: string } | null }>;
        };
      };
    };
    const { data: allScans } = await scansTable
      .select("product_name, price_captured, unit, quantity, barcode, image_url, created_at, establishment_id")
      .not("price_captured", "is", null)
      .order("created_at", { ascending: false });

    // Group scans by establishment
    const byStore = new Map<string, ScanRow[]>();
    for (const s of allScans ?? []) {
      if (!s.establishment_id) continue;
      const arr = byStore.get(s.establishment_id) ?? [];
      arr.push(s);
      byStore.set(s.establishment_id, arr);
    }

    // For each store, for each cart item, find most recent match by baseName or barcode
    const results: CartCompareStore[] = [];
    for (const est of estabs ?? []) {
      const rows = byStore.get(est.id) ?? [];
      const isRef = est.id === data.storeId;
      const items: CartCompareStoreItem[] = [];
      let total = 0;
      let matchedCount = 0;
      for (const it of data.items) {
        const base = baseNames.get(it.productName) ?? stripSize(it.productName).toUpperCase();
        const refBarcode = refByName.get(it.productName.toUpperCase())?.barcode ?? null;
        let match: ScanRow | null = null;
        for (const r of rows) {
          const nm = r.product_name?.trim();
          if (!nm) continue;
          const matchesBarcode = refBarcode && r.barcode === refBarcode;
          const matchesName = stripSize(nm).toUpperCase() === base;
          if (matchesBarcode || matchesName) {
            match = r;
            break; // rows already ordered desc by created_at
          }
        }
        if (match) {
          const price = toNum(match.price_captured) ?? 0;
          const subtotal = price * it.quantity;
          total += subtotal;
          matchedCount += 1;
          items.push({
            productName: it.productName,
            quantity: it.quantity,
            matched: true,
            matchedName: match.product_name ?? null,
            unitPrice: price,
            subtotal,
            lastDate: match.created_at,
          });
        } else {
          items.push({
            productName: it.productName,
            quantity: it.quantity,
            matched: false,
            matchedName: null,
            unitPrice: null,
            subtotal: null,
            lastDate: null,
          });
        }
      }
      results.push({
        storeId: est.id,
        storeName: est.name,
        city: est.city,
        state: est.state,
        logoUrl: est.logo_url,
        isReference: isRef,
        total: Number(total.toFixed(2)),
        matchedCount,
        totalCount: data.items.length,
        items,
      });
    }

    // Sort: reference first, then by lowest total among stores with full match, then by matched desc, then total asc
    results.sort((a, b) => {
      if (a.isReference && !b.isReference) return -1;
      if (!a.isReference && b.isReference) return 1;
      const aFull = a.matchedCount === a.totalCount ? 0 : 1;
      const bFull = b.matchedCount === b.totalCount ? 0 : 1;
      if (aFull !== bFull) return aFull - bFull;
      if (a.matchedCount !== b.matchedCount) return b.matchedCount - a.matchedCount;
      return a.total - b.total;
    });

    // Suppress refStore if it somehow wasn't in estabs
    if (!results.some((r) => r.isReference)) {
      results.unshift({
        storeId: refStore.id,
        storeName: refStore.name,
        city: refStore.city,
        state: refStore.state,
        logoUrl: refStore.logo_url,
        isReference: true,
        total: 0,
        matchedCount: 0,
        totalCount: data.items.length,
        items: data.items.map((it) => ({
          productName: it.productName,
          quantity: it.quantity,
          matched: false,
          matchedName: null,
          unitPrice: null,
          subtotal: null,
          lastDate: null,
        })),
      });
    }

    return results;
  });

