import {
  buildTokenMatcher,
  buildSearchLookupQuery,
  computeMatchReasons,
  normalize,
  tokenizeQuery,
  type SearchMode,
} from "@/lib/search-tokens";
import { scoreProductName } from "@/lib/search-scoring";
import { equivalentGroupLabel, selectCheapestEquivalentIndexes } from "@/lib/equivalent-group";
import {
  buildSynonymIndex,
  nameHasExcludedToken,
  nameStartsWithPrimarySynonym,
  resolveSynonymGroup,
} from "@/lib/search-synonyms";
import { getSynonymGroupsCached } from "@/lib/search-synonyms.server";
import { getSignedUrlCached } from "@/lib/signed-url-cache.server";
import type {
  PriceSearchMarket,
  PriceSearchResult,
  PriceSuggestion,
  ProductGroup,
  ProductPricePoint,
} from "@/lib/price-search.functions";

/** Cache curto do resultado completo da busca (mesmo termo + filtros). */
const searchResultCache = new Map<string, { at: number; value: PriceSearchResult }>();
const SEARCH_CACHE_TTL_MS = 45_000;
const SEARCH_CACHE_MAX = 120;

export async function performPriceSearch(data: {
  query: string;
  mode: SearchMode;
  pureOnly: boolean;
  /** Ignora o cache curto — usado quando chega preço novo em tempo real. */
  fresh?: boolean;
}): Promise<PriceSearchResult> {
  const cacheKey = `${data.query.trim().toLowerCase()}|${data.mode}|${data.pureOnly ? 1 : 0}`;
  const hit = searchResultCache.get(cacheKey);
  if (!data.fresh && hit && Date.now() - hit.at < SEARCH_CACHE_TTL_MS) return hit.value;

  const result = await runPriceSearch(data);

  if (searchResultCache.size >= SEARCH_CACHE_MAX) {
    const oldest = searchResultCache.keys().next().value;
    if (oldest) searchResultCache.delete(oldest);
  }
  searchResultCache.set(cacheKey, { at: Date.now(), value: result });
  return result;
}

async function runPriceSearch(data: {
  query: string;
  mode: SearchMode;
  pureOnly: boolean;
}): Promise<PriceSearchResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const safe = data.query.replace(/[%_,]/g, " ").slice(0, 80);
  const mode = data.mode;

  const effectiveTokens = tokenizeQuery(safe);
  const lookupQuery = buildSearchLookupQuery(safe);
  const tokenMatchers = effectiveTokens.map((t) => buildTokenMatcher(t, mode));
  const cacheTokens = effectiveTokens.length > 0 ? effectiveTokens : [];

  // Segurança de relevância: se após tokenização não resta nenhum termo
  // significativo (ex.: apenas stopwords/conectivos "de", "em", "kg"),
  // não retornamos resultados — evita listar todo o catálogo.
  if (effectiveTokens.length === 0) {
    return {
      query: data.query,
      mode,
      tokens: [],
      samples: 0,
      avg: null,
      min: null,
      max: null,
      cheapest: null,
      markets: [],
      groups: [],
      recent: [],
      suggestions: [],
      didYouMean: null,
      canonicalGroup: null,
      excludedByPureFilter: 0,
    };
  }


  const cacheClient = supabaseAdmin as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        ilike: (c: string, v: string) => {
          order: (c: string, o: { ascending: boolean }) => {
            limit: (n: number) => Promise<{
              data:
                | Array<{
                    display_name: string | null;
                    min_price: number | string;
                    avg_price: number | string;
                    max_price: number | string;
                    samples: number;
                  }>
                | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    };
  };
  const cachePromise = cacheTokens.length > 0
    ? cacheClient
        .from("product_price_stats")
        .select("display_name, min_price, avg_price, max_price, samples")
        .ilike("display_name", `%${cacheTokens[0]}%`)
        .order("samples", { ascending: false })
        .limit(30)
    : Promise.resolve({ data: [], error: null });

  const [scansRes, suggestionsRes, cacheRes] = await Promise.all([
    supabaseAdmin.rpc("search_scans_unaccented" as never, {
      _q: lookupQuery,
      _limit: 300,
    } as never),
    supabaseAdmin.rpc("search_catalog_suggestions" as never, {
      _q: lookupQuery,
      _limit: 8,
    } as never),
    cachePromise,
  ]);
  if (scansRes.error) throw new Error(scansRes.error.message);

  type Row = {
    product_name: string | null;
    price_captured: number | null;
    market_name: string | null;
    created_at: string;
  };

  const rawList = ((scansRes.data ?? []) as Row[]).filter(
    (r) => r.price_captured !== null && Number(r.price_captured) > 0,
  );
  let list = tokenMatchers.length === 0
    ? rawList
    : rawList.filter((r) => {
        const n = normalize(r.product_name ?? "");
        if (!n) return false;
        return tokenMatchers.every((re) => re.test(n));
      });

  const dbGroups = await getSynonymGroupsCached(supabaseAdmin);
  const synonymIndex = buildSynonymIndex(dbGroups);
  const synonymGroup = resolveSynonymGroup(effectiveTokens, synonymIndex, data.query);
  const canonicalGroup = synonymGroup?.canonical ?? null;
  let excludedByPureFilter = 0;
  if (synonymGroup && data.pureOnly) {
    const before = list.length;
    list = list.filter(
      (r) =>
        nameStartsWithPrimarySynonym(r.product_name ?? "", synonymGroup) &&
        !nameHasExcludedToken(r.product_name ?? "", synonymGroup),
    );
    excludedByPureFilter = before - list.length;
  } else if (synonymGroup) {
    const canonicalRows = list.filter(
      (r) =>
        nameStartsWithPrimarySynonym(r.product_name ?? "", synonymGroup) &&
        !nameHasExcludedToken(r.product_name ?? "", synonymGroup),
    );
    if (canonicalRows.length >= 2) {
      excludedByPureFilter = list.length - canonicalRows.length;
      list = canonicalRows;
    }
  }

  type SuggRow = {
    id: string;
    display_name: string;
    brand: string | null;
    category: string | null;
    image_url: string | null;
  };
  const suggRows = (suggestionsRes.data ?? []) as SuggRow[];
  const suggestions: PriceSuggestion[] = suggRows
    .map((r) => {
      const { score, reasons } = scoreProductName(
        r.display_name,
        effectiveTokens,
        r.brand,
        data.query,
      );
      return {
        id: r.id,
        displayName: r.display_name,
        brand: r.brand,
        category: r.category,
        imageUrl: r.image_url,
        matchReasons: reasons.length > 0
          ? reasons
          : computeMatchReasons(effectiveTokens, r.display_name, r.brand),
        _score: score,
      };
    })
    .sort((a, b) => b._score - a._score || a.displayName.localeCompare(b.displayName, "pt-BR"))
    .map(({ _score: _s, ...s }) => s);

  await Promise.all(
    suggestions.map(async (s) => {
      const signed = await getSignedUrlCached(supabaseAdmin, s.imageUrl);
      if (signed) s.imageUrl = signed;
    }),
  );

  const catalogIdByName = new Map(
    suggestions.map((s) => [normalize(s.displayName), s.id] as const),
  );

  let didYouMean: string | null = null;
  let effectiveMatchers = tokenMatchers;
  let effectiveFilterTokens = effectiveTokens;
  if (list.length === 0 && effectiveTokens.length > 0 && suggRows.length > 0) {
    const topSugg = suggRows[0];
    const correctedTokens = tokenizeQuery(topSugg.display_name);
    if (correctedTokens.length > 0) {
      const corrMatchers = correctedTokens.map((t) => buildTokenMatcher(t, "loose"));
      const fuzzyList = rawList.filter((r) => {
        const n = normalize(r.product_name ?? "");
        if (!n) return false;
        const hits = corrMatchers.reduce((acc, re) => (re.test(n) ? acc + 1 : acc), 0);
        return hits >= Math.max(1, Math.ceil(corrMatchers.length / 2));
      });
      if (fuzzyList.length > 0) {
        list = fuzzyList;
        effectiveMatchers = corrMatchers;
        effectiveFilterTokens = correctedTokens;
        didYouMean = topSugg.display_name;
      }
    }
  }

  if (list.length === 0) {
    return {
      query: data.query,
      mode,
      tokens: effectiveTokens,
      samples: 0,
      avg: null,
      min: null,
      max: null,
      cheapest: null,
      markets: [],
      groups: [],
      recent: [],
      suggestions,
      didYouMean,
      canonicalGroup,
      excludedByPureFilter,
    };
  }

  const marketNames = Array.from(
    new Set(list.map((r) => (r.market_name ?? "").trim()).filter(Boolean)),
  );
  type EstabMeta = {
    id: string;
    kind: string | null;
    logoUrl: string | null;
    brandColor: string | null;
    address: string | null;
    neighborhood: string | null;
    city: string | null;
    latitude: number | null;
    longitude: number | null;
  };

  const metaByName = new Map<string, EstabMeta>();
  const metaKey = (n: string) =>
    (n ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, " ")
      .trim()
      .toUpperCase();
  const metaKeys: Array<[string, EstabMeta]> = [];
  const getMeta = (n: string | null | undefined): EstabMeta | undefined => {
    if (!n) return undefined;
    const direct = metaByName.get(n.trim()) ?? metaByName.get(metaKey(n));
    if (direct) return direct;
    // Fallback: nome do scan contém (ou está contido em) o nome do estabelecimento
    // ex.: "MERCEARIA ACOUGUE & PANIFICADORA DOCE DIA" → "DOCE DIA".
    const key = metaKey(n);
    let best: EstabMeta | undefined;
    let bestLen = 0;
    for (const [k, meta] of metaKeys) {
      if (k.length < 5) continue;
      if ((key.includes(k) || k.includes(key)) && k.length > bestLen) {
        best = meta;
        bestLen = k.length;
      }
    }
    return best;
  };

  if (marketNames.length > 0) {
    const { data: estabs } = await (supabaseAdmin as unknown as {
      from: (t: string) => {
        select: (s: string) => Promise<{
          data:
            | Array<{
                id: string;
                name: string;
                kind: string | null;
                logo_url: string | null;
                brand_color: string | null;
                address: string | null;
                neighborhood: string | null;
                city: string | null;
                latitude: number | null;
                longitude: number | null;
              }>
            | null;
          error: { message: string } | null;
        }>;
      };
    })
      .from("establishments")
      .select("id, name, kind, logo_url, brand_color, address, neighborhood, city, latitude, longitude");
    for (const e of estabs ?? []) {
      const meta: EstabMeta = {
        id: e.id,
        kind: e.kind,
        logoUrl: e.logo_url,
        brandColor: e.brand_color,
        address: e.address ?? null,
        neighborhood: e.neighborhood ?? null,
        city: e.city ?? null,
        latitude: e.latitude ?? null,
        longitude: e.longitude ?? null,
      };
      metaByName.set(e.name, meta);
      const key = metaKey(e.name);
      const existing = metaByName.get(key);
      // Prefere o registro que tem logo quando há nomes equivalentes.
      if (!existing || (!existing.logoUrl && meta.logoUrl)) metaByName.set(key, meta);
      if (meta.logoUrl) metaKeys.push([key, meta]);
    }

  }



  const prices = list.map((r) => Number(r.price_captured));
  let avg = Number((prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2));
  let min = Math.min(...prices);
  let max = Math.max(...prices);

  const cacheRows = (cacheRes.data ?? []) as Array<{
    display_name: string | null;
    min_price: number | string;
    avg_price: number | string;
    max_price: number | string;
    samples: number;
  }>;
  if (cacheRows.length > 0 && effectiveFilterTokens.length > 0) {
    const match = cacheRows.find((r) => {
      const n = normalize(r.display_name ?? "");
      return effectiveMatchers.every((re) => re.test(n));
    });
    if (match && Number(match.samples) >= list.length) {
      min = Number(match.min_price);
      avg = Number(Number(match.avg_price).toFixed(2));
      max = Number(match.max_price);
    }
  }

  const byProduct = new Map<
    string,
    { display: string; rows: ProductPricePoint[] }
  >();
  for (const r of list) {
    const raw = (r.product_name ?? data.query).trim();
    const key = normalize(raw);
    if (!key) continue;
    const cur = byProduct.get(key) ?? { display: raw, rows: [] };
    const mn = (r.market_name ?? "").trim() || "—";
    const meta = getMeta(mn);
    cur.rows.push({
      marketName: mn,
      marketKind: meta?.kind ?? null,
      marketLogoUrl: meta?.logoUrl ?? null,
      marketBrandColor: meta?.brandColor ?? null,
      establishmentId: meta?.id ?? null,
      price: Number(r.price_captured),
      when: r.created_at,
    });
    byProduct.set(key, cur);
  }

  const groups: ProductGroup[] = Array.from(byProduct.values())
    .map((g) => {
      const ps = g.rows.map((x) => x.price);
      const gMin = Math.min(...ps);
      const gMax = Math.max(...ps);
      const gAvg = Number((ps.reduce((a, b) => a + b, 0) / ps.length).toFixed(2));
      const lastSeen = g.rows.reduce(
        (acc, x) => (new Date(x.when) > new Date(acc) ? x.when : acc),
        g.rows[0].when,
      );
      const { score, reasons } = scoreProductName(
        g.display,
        effectiveFilterTokens,
        null,
        didYouMean ?? data.query,
      );
      return {
        catalogId: catalogIdByName.get(normalize(g.display)) ?? null,
        productName: g.display,
        samples: g.rows.length,
        min: gMin,
        avg: gAvg,
        max: gMax,
        lastSeen,
        prices: g.rows.sort((a, b) => a.price - b.price),
        matchReasons: reasons,
        _score: score,
      };
    })
    .sort((a, b) => {
      if (a.min !== b.min) return a.min - b.min;
      if (b._score !== a._score) return b._score - a._score;
      return b.samples - a.samples;
    })
    .slice(0, 15)
    .map(({ _score: _s, ...g }) => g);

  const eqIdx = groups.length > 0
    ? selectCheapestEquivalentIndexes(
        groups.map((g) => ({
          name: g.productName,
          minPrice: g.min,
          samples: g.samples,
        })),
        didYouMean ?? data.query,
      )
    : [];
  const eqGroups = eqIdx.map((i) => groups[i]).filter(Boolean);
  const eqPrices = eqGroups.flatMap((g) => g.prices);
  const firstEqPrice = eqPrices[0] ?? null;
  const bestPoint = firstEqPrice
    ? eqPrices.reduce((best, p) => (p.price < best.price ? p : best), firstEqPrice)
    : null;
  const refGroup = bestPoint
    ? eqGroups.find((g) => g.prices.some((p) => p === bestPoint)) ?? eqGroups[0] ?? groups[0] ?? null
    : eqGroups[0] ?? groups[0] ?? null;

  const rankingSource: ProductPricePoint[] =
    eqPrices.length > 0
      ? eqPrices
      : groups.length > 0
      ? groups[0].prices
      : list
          .map((r) => {
            const mn = (r.market_name ?? "").trim();
            if (!mn) return null;
            const meta = getMeta(mn);
            return {
              marketName: mn,
              marketKind: meta?.kind ?? null,
              marketLogoUrl: meta?.logoUrl ?? null,
              marketBrandColor: meta?.brandColor ?? null,
              establishmentId: meta?.id ?? null,
              price: Number(r.price_captured),
              when: r.created_at,
            } as ProductPricePoint;
          })
          .filter((x): x is ProductPricePoint => x != null);

  const byMarket = new Map<
    string,
    { total: number; count: number; min: number; lastSeen: string }
  >();
  for (const p of rankingSource) {
    const key = p.marketName;
    if (!key) continue;
    const cur = byMarket.get(key) ?? {
      total: 0,
      count: 0,
      min: p.price,
      lastSeen: p.when,
    };
    cur.total += p.price;
    cur.count += 1;
    if (p.price < cur.min) cur.min = p.price;
    if (new Date(p.when) > new Date(cur.lastSeen)) cur.lastSeen = p.when;
    byMarket.set(key, cur);
  }
  const markets: PriceSearchMarket[] = Array.from(byMarket.entries())
    .map(([marketName, v]) => {
      const meta = getMeta(marketName);
      return {
        marketName,
        marketKind: meta?.kind ?? null,
        marketLogoUrl: meta?.logoUrl ?? null,
        marketBrandColor: meta?.brandColor ?? null,
        establishmentId: meta?.id ?? null,
        priceAvg: Number((v.total / v.count).toFixed(2)),
        priceMin: Number(v.min.toFixed(2)),
        samples: v.count,
        lastSeen: v.lastSeen,
      };
    })
    .sort((a, b) => {
      if (a.priceMin !== b.priceMin) return a.priceMin - b.priceMin;
      return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
    })
    .slice(0, 20);

  let cheapest: PriceSearchResult["cheapest"] = null;
  if (refGroup && eqPrices.length > 0) {
    const ps = eqPrices.map((p) => p.price);
    min = Math.min(...ps);
    max = Math.max(...ps);
    avg = Number((ps.reduce((a, b) => a + b, 0) / ps.length).toFixed(2));
    const best = bestPoint ?? eqPrices[0];
    cheapest = {
      marketName: best.marketName,
      marketLogoUrl: best.marketLogoUrl,
      marketBrandColor: best.marketBrandColor,
      price: best.price,
      when: best.when,
      productName:
        eqGroups.length > 1
          ? equivalentGroupLabel(eqGroups.map((g) => g.productName), refGroup.productName)
          : refGroup.productName,
    };
  } else {
    const cheapestRow = list.reduce<Row | null>((best, r) => {
      if (!best || Number(r.price_captured) < Number(best.price_captured)) return r;
      return best;
    }, null);
    if (cheapestRow && cheapestRow.market_name) {
      const meta = getMeta(cheapestRow.market_name.trim());
      cheapest = {
        marketName: cheapestRow.market_name,
        marketLogoUrl: meta?.logoUrl ?? null,
        marketBrandColor: meta?.brandColor ?? null,
        price: Number(cheapestRow.price_captured),
        when: cheapestRow.created_at,
        productName: cheapestRow.product_name ?? null,
      };
    }
  }

  const recent = list.slice(0, 5).map((r) => ({
    productName: r.product_name ?? data.query,
    price: Number(r.price_captured),
    marketName: r.market_name,
    when: r.created_at,
  }));

  return {
    query: data.query,
    mode,
    tokens: effectiveTokens,
    samples: list.length,
    avg,
    min,
    max,
    cheapest,
    markets,
    groups,
    recent,
    suggestions,
    didYouMean,
    canonicalGroup,
    excludedByPureFilter,
  };
}