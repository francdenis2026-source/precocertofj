import { createServerFn } from "@tanstack/react-start";
import {
  buildTokenMatcher,
  buildSearchLookupQuery,
  computeMatchReasons,
  normalize,
  tokenizeQuery,
  type MatchReason,
  type SearchMode,
} from "@/lib/search-tokens";
import { scoreProductName } from "@/lib/search-scoring";
import {
  buildSynonymIndex,
  nameHasExcludedToken,
  nameStartsWithPrimarySynonym,
  resolveSynonymGroup,
  type SynonymGroup,
} from "@/lib/search-synonyms";

export type PriceSearchMarket = {
  marketName: string;
  marketKind: string | null;
  marketLogoUrl: string | null;
  marketBrandColor: string | null;
  establishmentId: string | null;
  priceAvg: number;
  priceMin: number;
  samples: number;
  lastSeen: string;
};

export type PriceSuggestion = {
  id: string;
  displayName: string;
  brand: string | null;
  category: string | null;
  imageUrl: string | null;
  matchReasons: MatchReason[];
};

export type ProductPricePoint = {
  marketName: string;
  marketKind: string | null;
  marketLogoUrl: string | null;
  marketBrandColor: string | null;
  establishmentId: string | null;
  price: number;
  when: string;
};

export type ProductGroup = {
  catalogId: string | null;
  productName: string;
  samples: number;
  min: number;
  avg: number;
  max: number;
  lastSeen: string;
  prices: ProductPricePoint[];
  matchReasons: MatchReason[];
};

export type PriceSearchResult = {
  query: string;
  mode: SearchMode;
  tokens: string[];
  samples: number;
  avg: number | null;
  min: number | null;
  max: number | null;
  cheapest: {
    marketName: string;
    marketLogoUrl: string | null;
    marketBrandColor: string | null;
    price: number;
    when: string;
  } | null;
  markets: PriceSearchMarket[];
  groups: ProductGroup[];
  recent: Array<{
    productName: string;
    price: number;
    marketName: string | null;
    when: string;
  }>;
  suggestions: PriceSuggestion[];
  /** Correção sugerida quando a busca do usuário parecia ter erro de digitação. */
  didYouMean: string | null;
  /** Grupo canônico detectado (ex.: "sal") quando a busca mapeia para um. */
  canonicalGroup: string | null;
  /** Quantos itens foram removidos pelo filtro "somente item puro". */
  excludedByPureFilter: number;
};
/**
 * Cache in-memory (por worker) dos grupos de sinônimos ativos.
 * TTL curto (10s) para pegar mudanças do painel admin rapidamente
 * sem custar 1 round-trip ao banco em cada busca.
 */
type CachedGroups = { at: number; groups: SynonymGroup[] };
const SYNONYM_TTL_MS = 10_000;
let synonymCache: CachedGroups | null = null;

async function getSynonymGroupsCached(
  supabaseAdmin: { from: (t: string) => unknown },
): Promise<SynonymGroup[]> {
  const now = Date.now();
  if (synonymCache && now - synonymCache.at < SYNONYM_TTL_MS) {
    return synonymCache.groups;
  }
  const client = supabaseAdmin as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (c: string, v: boolean) => Promise<{
          data: Array<{
            canonical: string;
            synonyms: string[] | null;
            exclude_tokens: string[] | null;
          }> | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
  const { data, error } = await client
    .from("search_synonym_groups")
    .select("canonical, synonyms, exclude_tokens")
    .eq("active", true);
  if (error) {
    // Em caso de falha, devolve o cache anterior (se houver) ou vazio;
    // os grupos hardcoded seguem funcionando como fallback.
    return synonymCache?.groups ?? [];
  }
  const groups: SynonymGroup[] = (data ?? []).map((r) => ({
    canonical: r.canonical,
    synonyms: r.synonyms ?? [],
    excludeTokens: r.exclude_tokens ?? [],
  }));
  synonymCache = { at: now, groups };
  return groups;
}


/** Public price search by product name. No auth required. */
export const searchProductPrice = createServerFn({ method: "POST" })
  .inputValidator((input: { query: string; mode?: SearchMode; pureOnly?: boolean }) => {
    const q = (input?.query ?? "").trim();
    if (q.length < 2) throw new Error("Digite ao menos 2 caracteres");
    if (q.length > 80) throw new Error("Busca muito longa");
    const mode: SearchMode = input?.mode === "loose" ? "loose" : "strict";
    const pureOnly = Boolean(input?.pureOnly);
    return { query: q, mode, pureOnly };
  })
  .handler(async ({ data }): Promise<PriceSearchResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const safe = data.query.replace(/[%_,]/g, " ").slice(0, 80);
    const mode = data.mode;

    // Tokens canônicos vindos do módulo compartilhado.
    const effectiveTokens = tokenizeQuery(safe);
    const lookupQuery = buildSearchLookupQuery(safe);
    const tokenMatchers = effectiveTokens.map((t) => buildTokenMatcher(t, mode));

    // Precompute first token for cache lookup (product_price_stats).
    const cacheTokens = effectiveTokens.length > 0 ? effectiveTokens : [];

    // Fetch suggestions + prices + cached stats in parallel.
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

    // Filtra scans: nome do produto deve conter TODOS os tokens efetivos
    // como palavra inteira (ou prefixo, para tokens longos / modo loose).
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

    // Sinônimos / exclusões — quando a busca mapeia para um item canônico
    // (ex.: "sal") e o usuário ativou "somente item puro", removemos ruídos
    // como "margarina c/sal", "biscoito água e sal", etc.
    // Grupos vindos do banco (painel admin) têm prioridade sobre os hardcoded.
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
    // Assina URLs de imagens armazenadas no bucket privado `logos` para que
    // possam ser exibidas no cliente (buckets públicos são bloqueados na plataforma).
    await Promise.all(
      suggestions.map(async (s) => {
        if (!s.imageUrl) return;
        const m = s.imageUrl.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/?#]+)\/([^?#]+)/);
        if (!m) return;
        const bucket = decodeURIComponent(m[1]);
        const path = decodeURIComponent(m[2]);
        if (bucket !== "logos" && bucket !== "scans") return;
        const { data: signed } = await supabaseAdmin.storage
          .from(bucket)
          .createSignedUrl(path, 60 * 60 * 24 * 7);
        if (signed?.signedUrl) s.imageUrl = signed.signedUrl;
      }),
    );
    const catalogIdByName = new Map(
      suggestions.map((s) => [normalize(s.displayName), s.id] as const),
    );

    // Fuzzy fallback: quando a busca estrita/parcial não retorna nada mas o
    // catálogo (via pg_trgm em search_catalog_suggestions) achou um item
    // parecido, tentamos re-filtrar scans usando os tokens da sugestão top.
    // Isso cobre casos de digitação como "fmeijão" → "feijão".
    let didYouMean: string | null = null;
    let effectiveMatchers = tokenMatchers;
    let effectiveFilterTokens = effectiveTokens;
    if (list.length === 0 && effectiveTokens.length > 0 && suggRows.length > 0) {
      // Escolhe a sugestão com maior similarity ao termo original.
      const topSugg = suggRows[0];
      const correctedTokens = tokenizeQuery(topSugg.display_name);
      if (correctedTokens.length > 0) {
        const corrMatchers = correctedTokens.map((t) => buildTokenMatcher(t, "loose"));
        const fuzzyList = rawList.filter((r) => {
          const n = normalize(r.product_name ?? "");
          if (!n) return false;
          // exige que ao menos metade dos tokens corrigidos apareça
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

    // Resolve establishment metadata (kind, logo, brand color) by market_name.
    const marketNames = Array.from(
      new Set(list.map((r) => (r.market_name ?? "").trim()).filter(Boolean)),
    );
    type EstabMeta = {
      id: string;
      kind: string | null;
      logoUrl: string | null;
      brandColor: string | null;
    };
    const metaByName = new Map<string, EstabMeta>();
    if (marketNames.length > 0) {
      const { data: estabs } = await (supabaseAdmin as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            in: (
              c: string,
              v: string[],
            ) => Promise<{
              data:
                | Array<{
                    id: string;
                    name: string;
                    kind: string | null;
                    logo_url: string | null;
                    brand_color: string | null;
                  }>
                | null;
              error: { message: string } | null;
            }>;
          };
        };
      })
        .from("establishments")
        .select("id, name, kind, logo_url, brand_color")
        .in("name", marketNames);
      for (const e of estabs ?? []) {
        metaByName.set(e.name, {
          id: e.id,
          kind: e.kind,
          logoUrl: e.logo_url,
          brandColor: e.brand_color,
        });
      }
    }
    const kindByName = new Map<string, string | null>();
    for (const [k, v] of metaByName) kindByName.set(k, v.kind);

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

    // markets é construído mais adiante, a partir das linhas do produto
    // principal (top group), para que o ranking reflita o menor preço do
    // produto efetivamente selecionado e não uma média entre produtos
    // diferentes que casam a busca.


    // Group by product name.
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
      const meta = metaByName.get(mn);
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

    // Score revisado — prioriza match exato e marca; penaliza nomes ruidosos.
    // Nomes de produto no `list` não trazem marca canônica (vem da sugestão
    // do catálogo), então o bônus de marca aqui é 0 por padrão.
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
        if (b._score !== a._score) return b._score - a._score;
        if (b.samples !== a.samples) return b.samples - a.samples;
        return a.min - b.min;
      })
      .slice(0, 15)
      .map(({ _score: _s, ...g }) => g);

    // Ranking de estabelecimentos: usa as linhas do produto principal
    // (primeiro grupo por score) — assim, ordenado por menor preço, o
    // ranking reflete diretamente onde o produto selecionado está mais
    // barato. Fallback: se não houver grupos (busca muito ampla), usa
    // todos os registros.
    const rankingSource: ProductPricePoint[] =
      groups.length > 0
        ? groups[0].prices
        : list
            .map((r) => {
              const mn = (r.market_name ?? "").trim();
              if (!mn) return null;
              const meta = metaByName.get(mn);
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
        const meta = metaByName.get(marketName);
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


    const cheapestRow = list.reduce<Row | null>((best, r) => {
      if (!best || Number(r.price_captured) < Number(best.price_captured)) return r;
      return best;
    }, null);
    const cheapest =
      cheapestRow && cheapestRow.market_name
        ? (() => {
            const meta = metaByName.get(cheapestRow.market_name.trim());
            return {
              marketName: cheapestRow.market_name,
              marketLogoUrl: meta?.logoUrl ?? null,
              marketBrandColor: meta?.brandColor ?? null,
              price: Number(cheapestRow.price_captured),
              when: cheapestRow.created_at,
            };
          })()
        : null;

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
  });


