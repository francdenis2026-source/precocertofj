import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Retorna as consultas mais buscadas na plataforma nos últimos N dias,
 * agregando `analytics_events` onde `event_name = 'search_query'` e
 * `meta.q` contém o termo pesquisado (já normalizado).
 */
export const listPopularQueries = createServerFn({ method: "GET" })
  .inputValidator((input: { days?: number; limit?: number } | undefined) => input ?? {})
  .handler(async ({ data }) => {
    const days = Math.min(Math.max(data.days ?? 30, 1), 90);
    const limit = Math.min(Math.max(data.limit ?? 6, 1), 20);

    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const url = process.env.SUPABASE_URL!;
    const supa = createClient<Database>(url, key, {
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

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data: rows, error } = await supa
      .from("analytics_events")
      .select("meta")
      .eq("event_name", "search_query")
      .gte("created_at", since)
      .limit(5000);

    if (error) return [] as { query: string; count: number }[];

    const tally = new Map<string, { query: string; count: number }>();
    for (const r of rows ?? []) {
      const meta = (r as { meta: unknown }).meta as Record<string, unknown> | null;
      const raw = meta && typeof meta.q === "string" ? meta.q : "";
      const q = raw.trim().toLowerCase();
      if (!q || q.length < 2 || q.length > 60) continue;
      const cur = tally.get(q);
      if (cur) cur.count += 1;
      else tally.set(q, { query: q, count: 1 });
    }

    return [...tally.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  });
