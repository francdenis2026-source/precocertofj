import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";

export type ConsistencyMetric = {
  key: string;
  label: string;
  value: number;
  source: string;
};

export type ConsistencyAlert = {
  level: "ok" | "warn" | "critical";
  from: string;
  to: string;
  delta: number;
  deltaPct: number;
  message: string;
};

export type ConsistencyReport = {
  checkedAt: string;
  metrics: ConsistencyMetric[];
  alerts: ConsistencyAlert[];
  worstDeltaPct: number;
};

const WARN_PCT = 2; // > 2% já sinaliza atenção
const CRITICAL_PCT = 10; // > 10% é alerta grave

/**
 * Compara as diferentes fontes de contagem de produtos e emite alertas quando
 * há divergência acima dos limites. Fontes:
 *   1. scans salvos: distinct product_name (fonte bruta)
 *   2. product_comparison_cache (o que aparece no /comparador)
 *   3. platform_public_stats.active_comparisons (o que a Home mostra)
 */
export const checkProductCountConsistency = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(
  async (): Promise<ConsistencyReport> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const client = supabaseAdmin as unknown as {
      rpc: (fn: string) => Promise<{ data: unknown; error: { message: string } | null }>;
      from: (t: string) => {
        select: (
          s: string,
          opts?: { count?: "exact"; head?: boolean },
        ) => {
          eq: (
            c: string,
            v: unknown,
          ) => Promise<{ count: number | null; error: { message: string } | null }>;
        } & Promise<{ count: number | null; error: { message: string } | null }>;
      };
    };

    // 1) Distinct product_name em scans salvos — via RPC dedicada para evitar teto de 1000 do PostgREST
    const distinctSql = await client.rpc("get_price_comparisons");
    const compsRows = Array.isArray(distinctSql.data) ? (distinctSql.data as unknown[]) : [];

    // 2) product_comparison_cache count (head/count)
    const cacheRes = await client
      .from("product_comparison_cache")
      .select("product_key", { count: "exact", head: true });

    // 3) platform_public_stats (o que a Home usa como base agregada)
    const statsRes = await client.rpc("platform_public_stats");
    const statsRow = Array.isArray(statsRes.data) ? (statsRes.data[0] as {
      active_comparisons: number | null;
      establishments: number | null;
      price_drops_7d: number | null;
    } | undefined) : undefined;

    // Métricas comparáveis (mesma população: total de produtos catalogados)
    const metrics: ConsistencyMetric[] = [
      {
        key: "cache_rows",
        label: "product_comparison_cache",
        value: cacheRes.count ?? 0,
        source: "product_comparison_cache (COUNT)",
      },
      {
        key: "rpc_comparisons",
        label: "RPC get_price_comparisons",
        value: compsRows.length,
        source: "RPC usada pelo /comparador e Home",
      },
    ];

    // Métrica informativa (subconjunto — apenas produtos com 2+ estabelecimentos).
    // Não entra no cálculo de divergência porque representa outra população.
    const informationalMetrics: ConsistencyMetric[] = [
      {
        key: "active_comparisons",
        label: "platform_public_stats.active_comparisons",
        value: statsRow?.active_comparisons ?? 0,
        source: "Subconjunto — produtos com 2+ estabelecimentos (não comparável)",
      },
    ];

    // Compara apenas métricas da mesma população
    const alerts: ConsistencyAlert[] = [];
    for (let i = 0; i < metrics.length; i++) {
      for (let j = i + 1; j < metrics.length; j++) {
        const a = metrics[i];
        const b = metrics[j];
        const delta = Math.abs(a.value - b.value);
        const base = Math.max(a.value, b.value, 1);
        const pct = (delta / base) * 100;
        let level: ConsistencyAlert["level"] = "ok";
        if (pct >= CRITICAL_PCT) level = "critical";
        else if (pct >= WARN_PCT) level = "warn";
        const msg = `${a.label} (${a.value}) vs ${b.label} (${b.value}) — Δ ${delta} (${pct.toFixed(2)}%)`;
        if (level !== "ok") {
          // eslint-disable-next-line no-console
          console.warn(`[consistency:${level}] ${msg}`);
        }
        alerts.push({
          level,
          from: a.key,
          to: b.key,
          delta,
          deltaPct: Number(pct.toFixed(2)),
          message: msg,
        });
      }
    }

    const worstDeltaPct = alerts.reduce((m, x) => Math.max(m, x.deltaPct), 0);

    return {
      checkedAt: new Date().toISOString(),
      metrics: [...metrics, ...informationalMetrics],
      alerts,
      worstDeltaPct,
    };
  },
);
