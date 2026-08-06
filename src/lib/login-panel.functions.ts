import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const filterSchema = z
  .object({
    city: z.string().trim().max(80).optional().nullable(),
    neighborhood: z.string().trim().max(80).optional().nullable(),
  })
  .optional()
  .default({});

const RADAR_GROUPS = {
  graos: ["mercearia", "bebidas_em_po"],
  carnes: ["carnes", "laticinios", "congelados"],
  higiene: ["higiene", "limpeza"],
  bebidas: ["bebidas", "biscoitos", "doces", "padaria"],
} as const;

export type RadarGroupKey = keyof typeof RADAR_GROUPS;

const radarInputSchema = z.object({
  group: z.enum(["graos", "carnes", "higiene", "bebidas"]),
  city: z.string().trim().max(80).optional().nullable(),
  limit: z.number().int().min(1).max(20).optional().default(8),
});

export type RadarCategoryProduct = {
  productKey: string;
  displayName: string;
  category: string | null;
  imageUrl: string | null;
  catalogSlug: string | null;
  minPrice: number;
  avgPrice: number;
  maxPrice: number;
  savingsPct: number;
  storeCount: number;
  cheapestStore: string | null;
  cheapestEstablishmentId: string | null;
  cheapestLogoUrl: string | null;
};

export type RadarCategoryTop = {
  group: RadarGroupKey;
  products: RadarCategoryProduct[];
};



export type LoginPanelMarket = {
  id: string;
  name: string;
  city: string | null;
  logoUrl: string | null;
  brandColor: string | null;
  scans: number;
};

export type LoginPanelHeadline = {
  eyebrow: string;
  title: string;
  highlight: string;
  suffix: string;
  lead: string;
  weekIso: string;
};

export type LoginPanelMetrics = {
  totalItems: number;
  totalMarkets: number;
  monthlySavings: number;
  avgSpread: number;
  avgSpreadPct: number;
  maxSpread: number;
  comparableItems: number;
  topMarkets: LoginPanelMarket[];
  headline: LoginPanelHeadline;
};

// ISO week number (year-week) — deterministic rotation key.
function isoWeek(now = new Date()): { year: number; week: number; key: string } {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: d.getUTCFullYear(), week, key: `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}` };
}

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(Math.max(0, v));

export const getLoginPanelMetrics = createServerFn({ method: "POST" })
  .validator((input: unknown) => filterSchema.parse(input))
  .handler(async ({ data }): Promise<LoginPanelMetrics> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const cityFilter = data?.city?.trim() || null;
  const neighborhoodFilter = data?.neighborhood?.trim() || null;

  // Filter establishments by region if provided.
  let estabsQuery = supabaseAdmin
    .from("establishments")
    .select("id, name, city, neighborhood, logo_url, brand_color, active")
    .eq("active", true);
  if (cityFilter) estabsQuery = estabsQuery.eq("city", cityFilter);
  if (neighborhoodFilter) estabsQuery = estabsQuery.eq("neighborhood", neighborhoodFilter);

  const [{ data: estabsRaw }, { data: scansRaw }, { data: cache }] = await Promise.all([
    estabsQuery,
    supabaseAdmin.from("scans").select("establishment_id"),
    supabaseAdmin
      .from("product_comparison_cache")
      .select("product_key, store_count, min_price, max_price, savings_pct"),
  ]);

  const counts = new Map<string, number>();
  for (const s of scansRaw ?? []) {
    if (!s.establishment_id) continue;
    counts.set(s.establishment_id, (counts.get(s.establishment_id) ?? 0) + 1);
  }

  const markets: LoginPanelMarket[] = (estabsRaw ?? [])
    .map((e) => ({
      id: e.id as string,
      name: e.name as string,
      city: (e.city as string | null) ?? null,
      logoUrl: (e.logo_url as string | null) ?? null,
      brandColor: (e.brand_color as string | null) ?? null,
      scans: counts.get(e.id as string) ?? 0,
    }))
    .filter((m) => m.scans > 0)
    .sort((a, b) => b.scans - a.scans);

  // Escolhe top 3 distintos por nome-canônico (evita repetidos genéricos).
  const seen = new Set<string>();
  const topMarkets: LoginPanelMarket[] = [];
  for (const m of markets) {
    const canonical = m.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\b(mercantil|mercearia|supermercado|comercial|drogarias?|farmacias?|super|market|sa|s\.a\.)\b/gi, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    if (!canonical || seen.has(canonical)) continue;
    seen.add(canonical);
    topMarkets.push(m);
    if (topMarkets.length === 3) break;
  }

  // Métricas de economia — considera apenas produtos com pelo menos 2 mercados.
  const comparable = (cache ?? []).filter((r) => (r.store_count ?? 0) > 1);
  const spreads = comparable
    .map((r) => Number(r.max_price ?? 0) - Number(r.min_price ?? 0))
    .filter((v) => v > 0);
  const pctList = comparable
    .map((r) => Number(r.savings_pct ?? 0))
    .filter((v) => v > 0);

  const avgSpread = spreads.length ? spreads.reduce((a, b) => a + b, 0) / spreads.length : 0;
  const maxSpread = spreads.length ? Math.max(...spreads) : 0;
  const avgSpreadPct = pctList.length ? pctList.reduce((a, b) => a + b, 0) / pctList.length : 0;

  // Cesta mensal aproximada: 25 itens comparados x economia média x 4 semanas.
  const monthlySavings = Math.round(avgSpread * 25 * 4);

  const totalItems = cache?.length ?? 0;
  const totalMarkets = markets.length;

  // Rotação semanal — 4 manchetes, indexadas pela semana ISO.
  const { week, key } = isoWeek();
  const headlines: Array<Omit<LoginPanelHeadline, "weekIso">> = [
    {
      eyebrow: "Reportagem de preços · Edição desta semana",
      title: "Famílias em Feijó economizam até",
      highlight: `${brl(monthlySavings)}/mês`,
      suffix: "comparando a cesta antes de comprar.",
      lead: `Variação média de ${avgSpreadPct.toFixed(1)}% entre os mercados locais monitorados diariamente pelos assinantes.`,
    },
    {
      eyebrow: "Análise semanal · Feijó",
      title: "A maior diferença registrada esta semana chegou a",
      highlight: brl(maxSpread),
      suffix: "no mesmo produto entre dois pontos de venda da cidade.",
      lead: `${comparable.length} produtos com preço comparável em Feijó — atualização diária pela comunidade.`,
    },
    {
      eyebrow: "Panorama · Cesta local",
      title: `${totalItems.toLocaleString("pt-BR")} itens monitorados revelam variação de`,
      highlight: `${avgSpreadPct.toFixed(1)}%`,
      suffix: "entre os pontos de venda da cidade.",
      lead: `Farinha, café e arroz seguem entre os produtos com maior oscilação semanal.`,
    },
    {
      eyebrow: "Bolso da família · Semana em Feijó",
      title: "Comparar antes de comprar rende até",
      highlight: `${brl(monthlySavings)}/mês`,
      suffix: "para quem monta a lista pelo PreçoCerto.",
      lead: `Base viva com ${totalItems.toLocaleString("pt-BR")} produtos e ${totalMarkets} mercados acompanhados pela comunidade.`,
    },
  ];
  const pick = headlines[week % headlines.length];
  const headline: LoginPanelHeadline = { ...pick, weekIso: key };

  return {
    totalItems,
    totalMarkets,
    monthlySavings,
    avgSpread,
    avgSpreadPct,
    maxSpread,
    comparableItems: comparable.length,
    topMarkets,
    headline,
  };
});

export const getRadarCategoryTop = createServerFn({ method: "POST" })
  .validator((input: unknown) => radarInputSchema.parse(input))
  .handler(async ({ data }): Promise<RadarCategoryTop> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const categories = RADAR_GROUPS[data.group as RadarGroupKey];
    const cityFilter = data.city?.trim() || null;

    const { data: rows } = await supabaseAdmin
      .from("product_comparison_cache")
      .select(
        "product_key, display_name, category, image_url, catalog_slug, min_price, avg_price, max_price, savings_pct, store_count, cheapest_store, cheapest_establishment_id"
      )
      .in("category", categories as unknown as string[])
      .gt("store_count", 1)
      .order("savings_pct", { ascending: false })
      .limit(60);

    let filtered = rows ?? [];

    if (cityFilter && filtered.length > 0) {
      const ids = Array.from(
        new Set(filtered.map((r) => r.cheapest_establishment_id).filter(Boolean) as string[])
      );
      if (ids.length > 0) {
        const { data: estabs } = await supabaseAdmin
          .from("establishments")
          .select("id, city")
          .in("id", ids);
        const inCity = new Set(
          (estabs ?? [])
            .filter((e) => (e.city as string | null)?.trim() === cityFilter)
            .map((e) => e.id as string)
        );
        const regional = filtered.filter(
          (r) => r.cheapest_establishment_id && inCity.has(r.cheapest_establishment_id as string)
        );
        if (regional.length >= 3) filtered = regional;
      }
    }

    const top = filtered.slice(0, data.limit);

    const estabIds = Array.from(
      new Set(top.map((r) => r.cheapest_establishment_id).filter(Boolean) as string[])
    );
    let logoMap = new Map<string, string | null>();
    if (estabIds.length > 0) {
      const { data: estabs } = await supabaseAdmin
        .from("establishments")
        .select("id, logo_url")
        .in("id", estabIds);
      logoMap = new Map(
        (estabs ?? []).map((e) => [e.id as string, (e.logo_url as string | null) ?? null])
      );
    }

    const products: RadarCategoryProduct[] = top.map((r) => ({
      productKey: r.product_key as string,
      displayName: (r.display_name as string) ?? "",
      category: (r.category as string | null) ?? null,
      imageUrl: (r.image_url as string | null) ?? null,
      catalogSlug: (r.catalog_slug as string | null) ?? null,
      minPrice: Number(r.min_price ?? 0),
      avgPrice: Number(r.avg_price ?? 0),
      maxPrice: Number(r.max_price ?? 0),
      savingsPct: Number(r.savings_pct ?? 0),
      storeCount: Number(r.store_count ?? 0),
      cheapestStore: (r.cheapest_store as string | null) ?? null,
      cheapestEstablishmentId: (r.cheapest_establishment_id as string | null) ?? null,
      cheapestLogoUrl: r.cheapest_establishment_id
        ? logoMap.get(r.cheapest_establishment_id as string) ?? null
        : null,
    }));

    return { group: data.group as RadarGroupKey, products };
  });
