import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

export type EconomyStat = {
  avgSavingsPct: number;
  productsWithComparison: number;
  bestSavingsPct: number;
};

export type RecentProduct = {
  slug: string;
  name: string;
  price: number;
  marketName: string | null;
  when: string; // ISO date
  stores: number;
  previousPrice: number | null;
  dropPct: number | null; // percentual positivo = queda; null se não houver histórico relevante
};

export type LiveTickerStats = {
  lastUpdate: string | null; // ISO
  checkedToday: number;
  totalRecent: number; // últimos 7 dias
};

/**
 * Public — dados do "pregão ao vivo" para o badge do letreiro.
 */
export const getLiveTickerStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<LiveTickerStats> => {
    try {
      setResponseHeader(
        "cache-control",
        "public, max-age=60, s-maxage=120, stale-while-revalidate=600",
      );
    } catch {
      /* ignore */
    }

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [latestRes, todayRes, weekRes] = await Promise.all([
        supabaseAdmin
          .from("scans")
          .select("created_at")
          .eq("status", "salvo")
          .not("price_captured", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabaseAdmin
          .from("scans")
          .select("id", { count: "exact", head: true })
          .eq("status", "salvo")
          .not("price_captured", "is", null)
          .gte("created_at", startOfToday.toISOString()),
        supabaseAdmin
          .from("scans")
          .select("id", { count: "exact", head: true })
          .eq("status", "salvo")
          .not("price_captured", "is", null)
          .gte("created_at", sevenDaysAgo.toISOString()),
      ]);

      return {
        lastUpdate: (latestRes.data?.created_at as string | undefined) ?? null,
        checkedToday: todayRes.count ?? 0,
        totalRecent: weekRes.count ?? 0,
      };
    } catch {
      return { lastUpdate: null, checkedToday: 0, totalRecent: 0 };
    }
  },
);

/**
 * Public — economia média identificada (menor vs. maior preço do mesmo produto
 * entre estabelecimentos, para produtos com pelo menos 2 mercados).
 *
 * Metodologia (v2 — a v1 divulgava ~10% e confundia o usuário):
 *  - A média simples sobre TODOS os produtos comparáveis é puxada para baixo
 *    por dezenas de itens com diferença de centavos (ruído de arredondamento
 *    de etiqueta). Isso subestimava a economia real de quem compara.
 *  - Passamos a considerar apenas produtos em que vale a pena trocar de
 *    mercado: diferença >= `MIN_RELEVANT_PCT` (5%). Se a amostra relevante for
 *    pequena demais (< 10 itens), voltamos à média geral para não inflar.
 *  - Nunca devolvemos números inventados: em erro/base vazia devolvemos zeros e
 *    a UI (buildLivePanel) esconde a métrica em vez de mentir.
 */
const MIN_RELEVANT_PCT = 5;
const MIN_RELEVANT_SAMPLE = 10;

const EMPTY_ECONOMY: EconomyStat = {
  avgSavingsPct: 0,
  productsWithComparison: 0,
  bestSavingsPct: 0,
};

export const getEconomyStat = createServerFn({ method: "GET" }).handler(
  async (): Promise<EconomyStat> => {
    try {
      setResponseHeader(
        "cache-control",
        "public, max-age=300, s-maxage=600, stale-while-revalidate=1800",
      );
    } catch {
      /* ignore */
    }

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // Usa o cache de comparação já materializado (savings_pct por produto)
      const { data, error } = await supabaseAdmin
        .from("product_comparison_cache")
        .select("savings_pct, store_count")
        .gte("store_count", 2);

      if (error || !data || data.length === 0) return EMPTY_ECONOMY;

      const savings = data
        .map((r) => Number(r.savings_pct))
        .filter((n) => Number.isFinite(n) && n > 0);
      if (savings.length === 0) return EMPTY_ECONOMY;

      const relevant = savings.filter((n) => n >= MIN_RELEVANT_PCT);
      const sample = relevant.length >= MIN_RELEVANT_SAMPLE ? relevant : savings;

      const avg = sample.reduce((a, b) => a + b, 0) / sample.length;
      const best = Math.max(...savings);

      return {
        // Uma casa decimal: "13,4%" comunica precisão de medição real,
        // diferente do "10%" arredondado que parecia estimativa de marketing.
        avgSavingsPct: Number(avg.toFixed(1)),
        productsWithComparison: sample.length,
        bestSavingsPct: Math.round(best),
      };
    } catch {
      return EMPTY_ECONOMY;
    }
  },
);


/**
 * Public — últimos produtos cadastrados com o mercado mais comum.
 */
export const getRecentProducts = createServerFn({ method: "GET" })
  .inputValidator((input?: { limit?: number }) => {
    const limit = Math.min(Math.max(input?.limit ?? 6, 1), 24);
    return { limit };
  })
  .handler(async ({ data: { limit } }): Promise<RecentProduct[]> => {
    // ...
    // fix the loop or reference

    try {
      setResponseHeader(
        "cache-control",
        "public, max-age=120, s-maxage=300, stale-while-revalidate=900",
      );
    } catch {
      /* ignore */
    }

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // Puxa scans recentes salvos e agrupa por produto normalizado no cliente.
      const { data: rows, error } = await supabaseAdmin
        .from("scans")
        .select("product_name, price_captured, market_name, establishment_id, created_at")
        .eq("status", "salvo")
        .is("user_id", null)
        .not("product_name", "is", null)
        .not("price_captured", "is", null)
        .order("created_at", { ascending: false })
        .limit(400);

      if (error || !rows) return [];

      const normalize = (s: string) =>
        s
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, " ")
          .trim();

      type Bucket = {
        latest: {
          product_name: string;
          price_captured: number;
          market_name: string | null;
          created_at: string;
        };
        prices: number[]; // ordem: mais recente -> mais antigo
        marketCounts: Map<string, number>;
        stores: Set<string>;
      };

      const buckets = new Map<string, Bucket>();

      for (const r of rows) {
        const name = (r.product_name ?? "").trim();
        if (!name) continue;
        const key = normalize(name);
        if (!key) continue;
        let b = buckets.get(key);
        if (!b) {
          b = {
            latest: {
              product_name: name,
              price_captured: Number(r.price_captured),
              market_name: r.market_name ?? null,
              created_at: r.created_at,
            },
            prices: [],
            marketCounts: new Map(),
            stores: new Set(),
          };
          buckets.set(key, b);
        }
        b.prices.push(Number(r.price_captured));
        const mk = (r.market_name ?? "").trim();
        if (mk) b.marketCounts.set(mk, (b.marketCounts.get(mk) ?? 0) + 1);
        if (r.establishment_id) b.stores.add(r.establishment_id as string);
      }

      const arr = Array.from(buckets.entries())
        .map(([key, b]) => {
          const topMarket =
            Array.from(b.marketCounts.entries()).sort((a, c) => c[1] - a[1])[0]?.[0] ??
            b.latest.market_name;

          const current = b.latest.price_captured;
          const prior = b.prices.slice(1).filter((p) => Number.isFinite(p) && p > 0);
          const ref = prior.length ? Math.max(...prior) : null;
          const drop = ref && ref > current ? ((ref - current) / ref) * 100 : null;

          return {
            slug: key.replace(/\s+/g, "-"),
            name: b.latest.product_name,
            price: current,
            marketName: topMarket ?? null,
            when: b.latest.created_at,
            stores: b.stores.size,
            previousPrice: ref,
            dropPct: drop !== null ? Math.round(drop * 10) / 10 : null,
          };
        })
        .sort((a, b) => (a.when < b.when ? 1 : -1))
        .slice(0, limit);


      return arr;
    } catch {
      return [];
    }
  });
