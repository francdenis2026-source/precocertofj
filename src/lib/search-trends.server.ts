import { createClient } from "@supabase/supabase-js";

export type TrendPoint = {
  /** YYYY-MM-DD (fuso local do servidor) */
  date: string;
  query: string;
  region: string | null;
  count: number;
};

export type TrendsSeriesResult = {
  days: number;
  points: TrendPoint[];
  /** Regiões observadas no período (para popular o filtro). */
  regions: string[];
};

/** Cliente público (somente leitura) para consultas agregadas. */
export function publicClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const url = process.env.SUPABASE_URL!;
  return createClient(url, key, {
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
}

/**
 * Lê os eventos `search_query` dos últimos `days` dias e devolve pontos
 * agregados por (dia, termo, região). O recorte por categoria acontece no
 * cliente, que já sabe classificar o termo com `detectFoodCategory`.
 */
export async function fetchTrendPoints(days: number): Promise<TrendsSeriesResult> {
  const supa = publicClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: rows, error } = await supa
    .from("analytics_events")
    .select("created_at, meta")
    .eq("event_name", "search_query")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(8000);

  if (error || !rows) return { days, points: [], regions: [] };

  const tally = new Map<string, TrendPoint>();
  const regions = new Set<string>();

  for (const r of rows as Array<{ created_at: string; meta: unknown }>) {
    const meta = (r.meta ?? {}) as Record<string, unknown>;
    const raw = typeof meta.q === "string" ? meta.q : "";
    const query = raw.trim().toLowerCase().replace(/\s{2,}/g, " ");
    if (query.length < 2 || query.length > 60) continue;

    const regionRaw = typeof meta.region === "string" ? meta.region.trim().toLowerCase() : "";
    const region = regionRaw ? regionRaw.slice(0, 40) : null;
    if (region) regions.add(region);

    const date = String(r.created_at).slice(0, 10);
    const key = `${date}|${query}|${region ?? ""}`;
    const cur = tally.get(key);
    if (cur) cur.count += 1;
    else tally.set(key, { date, query, region, count: 1 });
  }

  return {
    days,
    points: [...tally.values()],
    regions: [...regions].sort(),
  };
}
