import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export type TrendingSearch = {
  query: string;
  count: number;
  dayCount: number;
  lastAt: string | null;
  /** Termo com tração hoje (aparece com selo de "em alta"). */
  hot: boolean;
};

/**
 * Termos realmente buscados pelos clientes, agregados em `search_trends`
 * (atualizada por trigger a cada evento `search_query`).
 *
 * Ranking = buscas de hoje pesam 3x + volume total, com desempate por
 * recência. Assim um termo que "bombou" hoje sobe na frente do histórico.
 */
export const listTrendingSearches = createServerFn({ method: "GET" })
  .inputValidator((input: { limit?: number } | undefined) => input ?? {})
  .handler(async ({ data }): Promise<TrendingSearch[]> => {
    const limit = Math.min(Math.max(data.limit ?? 24, 1), 40);

    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const url = process.env.SUPABASE_URL!;
    const supa = createClient(url, key, {
      auth: { persistSession: false },
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

    const { data: rows, error } = await supa
      .from("search_trends")
      .select("query, total_count, day_count, day_bucket, last_at")
      .order("last_at", { ascending: false })
      .limit(400);

    if (error || !rows) return [];

    const today = new Date().toISOString().slice(0, 10);

    const mapped = (rows as any[])
      .map((r) => {
        const dayCount = r.day_bucket === today ? Number(r.day_count ?? 0) : 0;
        const total = Number(r.total_count ?? 0);
        return {
          query: String(r.query ?? "").trim(),
          count: total,
          dayCount,
          lastAt: (r.last_at as string) ?? null,
          hot: dayCount >= 2,
          score: dayCount * 3 + total,
        };
      })
      .filter((r) => r.query.length >= 2);

    mapped.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.lastAt ?? "").localeCompare(a.lastAt ?? "");
    });

    return mapped.slice(0, limit).map(({ score: _score, ...rest }) => rest);
  });

/**
 * Série temporal das buscas reais (hoje / 7 dias / 30 dias), agregada por
 * dia + termo + região. Mesma fonte do Realtime (`analytics_events` →
 * `search_trends`), então a página de Tendências e a homepage nunca
 * divergem.
 */
export const getSearchTrendsSeries = createServerFn({ method: "GET" })
  .inputValidator((input: { days?: number } | undefined) => {
    const raw = input?.days ?? 7;
    const days = raw <= 1 ? 1 : raw <= 7 ? 7 : 30;
    return { days };
  })
  .handler(async ({ data }) => {
    const { fetchTrendPoints } = await import("@/lib/search-trends.server");
    return fetchTrendPoints(data.days);
  });
