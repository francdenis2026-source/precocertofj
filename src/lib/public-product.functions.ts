import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { normalizeProductName, signStorageImageUrl } from "@/lib/product-image-utils";
import { comparePriceEntries, sortByPriceStable } from "@/lib/price-rank";

export type PublicProductMarket = {
  marketName: string;
  city: string | null;
  neighborhood: string | null;
  state: string | null;
  priceAvg: number;
  priceMin: number;
  priceMax: number;
  samples: number;
  lastSeen: string;
  history: Array<{ date: string; min: number }>;
};

export type PublicProductCityRank = {
  city: string;
  state: string | null;
  bestMarket: string;
  bestPrice: number;
  bestSamples: number;
  bestLastSeen: string;
  marketsCount: number;
  avgPrice: number;
};

export type PublicProduct = {
  slug: string;
  displayName: string;
  brand: string | null;
  unit: string | null;
  barcode: string | null;
  imageUrl: string | null;
  currentPrice: number | null;
  previousPrice: number | null;
  samples: number;
  avg: number | null;
  min: number | null;
  max: number | null;
  markets: PublicProductMarket[];
  citiesRanking: PublicProductCityRank[];
  history: Array<{ date: string; min: number; avg: number }>;
  recent: Array<{
    price: number;
    marketName: string | null;
    when: string;
  }>;
};


const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Public product detail by slug (uuid do catálogo) ou nome. Sem auth. */
export const getPublicProduct = createServerFn({ method: "POST" })
  .inputValidator((input: { slug: string }) => {
    const slug = (input?.slug ?? "").trim();
    if (slug.length < 2) throw new Error("slug inválido");
    if (slug.length > 120) throw new Error("slug muito longo");
    return { slug };
  })
  .handler(async ({ data }): Promise<PublicProduct | null> => {
    try {
      setResponseHeader(
        "cache-control",
        "public, max-age=30, s-maxage=60, stale-while-revalidate=300",
      );
    } catch {
      /* fora de contexto HTTP */
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) tenta localizar no catálogo por id (uuid) ou nome
    const isUuid = UUID_RE.test(data.slug);
    const catalogQuery = isUuid
      ? supabaseAdmin
          .from("product_catalog")
          .select("id, normalized_name, display_name, brand, default_unit, barcode, image_url")
          .eq("id", data.slug)
          .maybeSingle()
      : supabaseAdmin
          .from("product_catalog")
          .select("id, normalized_name, display_name, brand, default_unit, barcode, image_url")
          .or(
            `display_name.ilike.%${data.slug.replace(/[%_,]/g, " ")}%,normalized_name.ilike.%${normalizeProductName(data.slug).replace(/[%_,]/g, " ")}%`,
          )
          .limit(1)
          .maybeSingle();

    const { data: cat } = await catalogQuery;

    const displayName = cat?.display_name ?? data.slug;
    const barcode = cat?.barcode ?? null;

    // 2) busca scans: usa RPC unaccented + tokens (remove tamanhos/unidades para não travar em variações)
    const stripSize = (s: string) =>
      s
        .toLowerCase()
        .replace(/\d+(?:[.,]\d+)?\s*(kg|g|mg|ml|l|litros?|un|und|unid|unidades?|pack|cx|kit|pct)\b/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    const queryText = stripSize(displayName).slice(0, 120);

    type Row = {
      price_captured: number | null;
      market_name: string | null;
      created_at: string;
    };
    let rows: Row[] = [];

    if (barcode) {
      const { data: byBar } = await supabaseAdmin
        .from("scans")
        .select("price_captured, market_name, created_at")
        .eq("barcode", barcode)
        .not("price_captured", "is", null)
        .order("created_at", { ascending: false })
        .limit(300);
      rows = (byBar ?? []) as Row[];
    }

    if (rows.length === 0) {
      const { data: rpcRows } = await supabaseAdmin.rpc("search_scans_unaccented", {
        _q: queryText,
        _limit: 300,
      });
      rows = (rpcRows ?? []) as unknown as Row[];
    }

    const list = rows.filter(
      (r) => r.price_captured !== null && Number(r.price_captured) > 0,
    );



    const imageUrl = await signStorageImageUrl(cat?.image_url ?? null, supabaseAdmin);

    if (list.length === 0) {
      return {
        slug: cat?.id ?? data.slug,
        displayName,
        brand: cat?.brand ?? null,
        unit: cat?.default_unit ?? null,
        barcode,
        imageUrl,
        currentPrice: null,
        previousPrice: null,
        samples: 0,
        avg: null,
        min: null,
        max: null,
        markets: [],
        citiesRanking: [],
        history: [],
        recent: [],
      };
    }

    const prices = list.map((r) => Number(r.price_captured));
    const avg = Number((prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2));
    const min = Math.min(...prices);
    const max = Math.max(...prices);

    const dayKey = (iso: string) => iso.slice(0, 10);

    // Overall daily history (min + avg per day), oldest → newest, last 60 days
    const dayAgg = new Map<string, { min: number; total: number; count: number }>();
    for (const r of list) {
      const price = Number(r.price_captured);
      const key = dayKey(r.created_at);
      const cur = dayAgg.get(key) ?? { min: price, total: 0, count: 0 };
      if (price < cur.min) cur.min = price;
      cur.total += price;
      cur.count += 1;
      dayAgg.set(key, cur);
    }
    const history = Array.from(dayAgg.entries())
      .map(([date, v]) => ({
        date,
        min: Number(v.min.toFixed(2)),
        avg: Number((v.total / v.count).toFixed(2)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-60);

    const byMarket = new Map<
      string,
      {
        total: number;
        count: number;
        min: number;
        max: number;
        lastSeen: string;
        days: Map<string, number>;
      }
    >();
    for (const r of list) {
      const key = (r.market_name ?? "").trim();
      if (!key) continue;
      const price = Number(r.price_captured);
      const cur = byMarket.get(key) ?? {
        total: 0,
        count: 0,
        min: price,
        max: price,
        lastSeen: r.created_at,
        days: new Map<string, number>(),
      };
      cur.total += price;
      cur.count += 1;
      if (price < cur.min) cur.min = price;
      if (price > cur.max) cur.max = price;
      if (new Date(r.created_at) > new Date(cur.lastSeen)) cur.lastSeen = r.created_at;
      const dk = dayKey(r.created_at);
      const dayMin = cur.days.get(dk);
      cur.days.set(dk, dayMin == null ? price : Math.min(dayMin, price));
      byMarket.set(key, cur);
    }

    // Enriquecer com cidade/bairro via establishments (por nome)
    const marketNames = Array.from(byMarket.keys());
    const geoByName = new Map<
      string,
      { city: string | null; neighborhood: string | null; state: string | null }
    >();
    if (marketNames.length > 0) {
      const { data: estabs } = await supabaseAdmin
        .from("establishments")
        .select("name, city, neighborhood, state")
        .in("name", marketNames);
      for (const e of (estabs ?? []) as Array<{
        name: string;
        city: string | null;
        neighborhood: string | null;
        state: string | null;
      }>) {
        geoByName.set(e.name, {
          city: e.city,
          neighborhood: e.neighborhood,
          state: e.state,
        });
      }
    }

    const markets: PublicProductMarket[] = Array.from(byMarket.entries())
      .map(([marketName, v]) => {
        const geo = geoByName.get(marketName) ?? { city: null, neighborhood: null, state: null };
        return {
          marketName,
          city: geo.city,
          neighborhood: geo.neighborhood,
          state: geo.state,
          priceAvg: Number((v.total / v.count).toFixed(2)),
          priceMin: Number(v.min.toFixed(2)),
          priceMax: Number(v.max.toFixed(2)),
          samples: v.count,
          lastSeen: v.lastSeen,
          history: Array.from(v.days.entries())
            .map(([date, m]) => ({ date, min: Number(m.toFixed(2)) }))
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-30),
        };
      })
      .sort((a, b) =>
        comparePriceEntries(
          { store: a.marketName, price: a.priceMin, samples: a.samples, lastSeen: a.lastSeen },
          { store: b.marketName, price: b.priceMin, samples: b.samples, lastSeen: b.lastSeen },
        ),
      )
      .slice(0, 12);

    // Ranking segmentado por cidade
    const byCity = new Map<
      string,
      {
        state: string | null;
        entries: PublicProductMarket[];
      }
    >();
    for (const m of markets) {
      if (!m.city) continue;
      const key = m.city;
      const cur = byCity.get(key) ?? { state: m.state, entries: [] };
      cur.entries.push(m);
      byCity.set(key, cur);
    }
    const citiesRanking: PublicProductCityRank[] = Array.from(byCity.entries())
      .map(([city, v]) => {
        const sorted = sortByPriceStable(v.entries, (m) => ({
          store: m.marketName,
          price: m.priceMin,
          samples: m.samples,
          lastSeen: m.lastSeen,
        }));
        const best = sorted[0];
        const avgCity = Number(
          (
            sorted.reduce((s, x) => s + x.priceMin, 0) / sorted.length
          ).toFixed(2),
        );
        return {
          city,
          state: v.state,
          bestMarket: best.marketName,
          bestPrice: best.priceMin,
          bestSamples: best.samples,
          bestLastSeen: best.lastSeen,
          marketsCount: sorted.length,
          avgPrice: avgCity,
        };
      })
      .sort((a, b) =>
        comparePriceEntries(
          { store: a.bestMarket, price: a.bestPrice, samples: a.bestSamples, lastSeen: a.bestLastSeen },
          { store: b.bestMarket, price: b.bestPrice, samples: b.bestSamples, lastSeen: b.bestLastSeen },
        ),
      );

    const currentPrice = Number(list[0].price_captured);
    const previousPrice =
      list.length > 1 ? Number(list[1].price_captured) : null;

    const recent = list.slice(0, 6).map((r) => ({
      price: Number(r.price_captured),
      marketName: r.market_name,
      when: r.created_at,
    }));

    return {
      slug: cat?.id ?? data.slug,
      displayName,
      brand: cat?.brand ?? null,
      unit: cat?.default_unit ?? null,
      barcode,
      imageUrl,
      currentPrice,
      previousPrice,
      samples: list.length,
      avg,
      min,
      max,
      markets,
      citiesRanking,
      history,
      recent,
    };
  });

