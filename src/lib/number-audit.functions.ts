import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";

export type AuditSource = {
  label: string;
  value: number;
  origin: string; // tabela / RPC
  scope: string; // filtros aplicados
};

export type AuditMetric = {
  key: string;
  label: string;
  surface: string; // onde o número aparece no site
  primary: AuditSource;
  crossCheck: AuditSource | null;
  delta: number;
  deltaPct: number;
  status: "ok" | "warn" | "critical";
  note?: string;
};

export type NumberAuditReport = {
  checkedAt: string;
  durationMs: number;
  metrics: AuditMetric[];
  worstDeltaPct: number;
  status: "ok" | "warn" | "critical";
};

const WARN_PCT = 2;
const CRITICAL_PCT = 10;

const norm = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function build(
  key: string,
  label: string,
  surface: string,
  primary: AuditSource,
  crossCheck: AuditSource | null,
  note?: string,
): AuditMetric {
  const delta = crossCheck ? Math.abs(primary.value - crossCheck.value) : 0;
  const base = crossCheck ? Math.max(primary.value, crossCheck.value, 1) : 1;
  const deltaPct = crossCheck ? Number(((delta / base) * 100).toFixed(2)) : 0;
  const status: AuditMetric["status"] =
    !crossCheck ? "ok" : deltaPct >= CRITICAL_PCT ? "critical" : deltaPct >= WARN_PCT ? "warn" : "ok";
  return { key, label, surface, primary, crossCheck, delta, deltaPct, status, note };
}

/**
 * Auditoria de números públicos: para cada métrica exibida no site, mostra a
 * origem (tabela/RPC), o escopo (filtros) e um cross-check independente,
 * sinalizando divergências.
 */
export const getNumberAudit = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(
  async (): Promise<NumberAuditReport> => {
    const started = Date.now();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;

    const [statsRes, compsRes, estCount, estActiveCount, scanRows, scanWithPrice, cacheCount] =
      await Promise.all([
        sb.rpc("platform_public_stats"),
        sb.rpc("get_price_comparisons"),
        sb.from("establishments").select("id", { count: "exact", head: true }),
        sb.from("establishments").select("id", { count: "exact", head: true }).eq("active", true),
        sb
          .from("scans")
          .select("id", { count: "exact", head: true })
          .eq("status", "salvo")
          .is("user_id", null),
        sb
          .from("scans")
          .select("id", { count: "exact", head: true })
          .eq("status", "salvo")
          .is("user_id", null)
          .not("price_captured", "is", null),
        sb.from("product_comparison_cache").select("product_key", { count: "exact", head: true }),
      ]);

    const statsRow = (Array.isArray(statsRes.data) ? statsRes.data[0] : null) as
      | { establishments: number | null; price_drops_7d: number | null; active_comparisons: number | null }
      | null;

    const comps = (Array.isArray(compsRes.data) ? compsRes.data : []) as Array<{
      product_name?: string | null;
      store_count?: number | null;
    }>;

    // Produtos distintos públicos (paginado — PostgREST corta em 1000 linhas)
    const distinctNames = new Set<string>();
    const PAGE = 1000;
    for (let from = 0; from < 40000; from += PAGE) {
      const res = await sb
        .from("scans")
        .select("product_name")
        .eq("status", "salvo")
        .is("user_id", null)
        .not("price_captured", "is", null)
        .range(from, from + PAGE - 1);
      const rows = (res.data ?? []) as Array<{ product_name: string | null }>;
      for (const r of rows) {
        const k = norm(r.product_name ?? "");
        if (k) distinctNames.add(k);
      }
      if (rows.length < PAGE) break;
    }

    const compsDistinct = new Set<string>();
    let comparaveis = 0;
    for (const c of comps) {
      const k = norm(c.product_name ?? "");
      if (k) compsDistinct.add(k);
      if (Number(c.store_count ?? 0) >= 2) comparaveis += 1;
    }

    const metrics: AuditMetric[] = [
      build(
        "establishments",
        "Mercados parceiros",
        "Homepage (barra de estatísticas), /estabelecimentos",
        {
          label: "RPC platform_public_stats.establishments",
          value: statsRow?.establishments ?? 0,
          origin: "RPC platform_public_stats",
          scope: "estabelecimentos ativos (definido dentro da RPC)",
        },
        {
          label: "COUNT establishments WHERE active",
          value: estActiveCount.count ?? 0,
          origin: "tabela establishments",
          scope: "active = true",
        },
        `Total na tabela (incl. inativos): ${estCount.count ?? 0}`,
      ),
      build(
        "products",
        "Produtos distintos",
        "Homepage (Produtos) e painel de métricas",
        {
          label: "DISTINCT product_name normalizado (scans)",
          value: distinctNames.size,
          origin: "tabela scans (paginado 1000/página)",
          scope: "status = 'salvo' AND user_id IS NULL AND price_captured IS NOT NULL",
        },
        {
          label: "DISTINCT product_name (RPC comparações)",
          value: compsDistinct.size,
          origin: "RPC get_price_comparisons",
          scope: "produtos com preço público agregado",
        },
        "Nomes normalizados: sem acento, minúsculas, pontuação → espaço.",
      ),
      build(
        "price_records",
        "Registros de preço",
        "Homepage (Registros de preço)",
        {
          label: "COUNT scans salvos públicos",
          value: scanRows.count ?? 0,
          origin: "tabela scans",
          scope: "status = 'salvo' AND user_id IS NULL",
        },
        {
          label: "COUNT scans salvos públicos com preço",
          value: scanWithPrice.count ?? 0,
          origin: "tabela scans",
          scope: "… AND price_captured IS NOT NULL",
        },
        "Diferença = registros salvos sem preço capturado.",
      ),
      build(
        "comparables",
        "Comparáveis (2+ mercados)",
        "Homepage (Comparáveis), /comparador",
        {
          label: "RPC platform_public_stats.active_comparisons",
          value: statsRow?.active_comparisons ?? 0,
          origin: "RPC platform_public_stats",
          scope: "comparações ativas (definido dentro da RPC)",
        },
        {
          label: "get_price_comparisons WHERE store_count >= 2",
          value: comparaveis,
          origin: "RPC get_price_comparisons",
          scope: "store_count >= 2",
        },
      ),
      build(
        "cache",
        "Cache de comparação",
        "Bastidores (/comparador, buscas)",
        {
          label: "COUNT product_comparison_cache",
          value: cacheCount.count ?? 0,
          origin: "tabela product_comparison_cache",
          scope: "todas as linhas",
        },
        {
          label: "Linhas retornadas por get_price_comparisons",
          value: comps.length,
          origin: "RPC get_price_comparisons",
          scope: "todas as linhas",
        },
        "Divergência aqui costuma indicar cache desatualizado — rode 'Reconstruir cache' em Métricas.",
      ),
      build(
        "price_drops",
        "Quedas de preço (7d)",
        "Painéis internos",
        {
          label: "RPC platform_public_stats.price_drops_7d",
          value: statsRow?.price_drops_7d ?? 0,
          origin: "RPC platform_public_stats",
          scope: "últimos 7 dias",
        },
        null,
      ),
    ];

    const worstDeltaPct = metrics.reduce((m, x) => Math.max(m, x.deltaPct), 0);
    const status: NumberAuditReport["status"] = metrics.some((m) => m.status === "critical")
      ? "critical"
      : metrics.some((m) => m.status === "warn")
        ? "warn"
        : "ok";

    return {
      checkedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
      metrics,
      worstDeltaPct,
      status,
    };
  },
);
