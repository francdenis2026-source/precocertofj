/**
 * Overview KPIs da Cesta Básica para a home do console admin.
 *
 * Reúne, em uma única chamada protegida por `requireAdmin`:
 *  - itens ativos (contagem, versão vigente)
 *  - líder atual do ranking (menor total escopo cesta completa)
 *  - impacto estimado de faltantes no top 3 (soma dos deltas de
 *    substituições sugeridas)
 *
 * A intenção é dar ao administrador uma leitura rápida do estado da
 * cesta e do quanto os faltantes distorcem o ranking, sem depender
 * de múltiplos endpoints.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";
import { getBasketComparison } from "@/lib/basket.functions";
import { projectVerdictWithSubstitutions } from "@/lib/basket-suggestions";

export type BasketAdminOverview = {
  activeItems: number;
  version: number | null;
  versionLabel: string | null;
  activatedAt: string | null;
  leader: {
    storeId: string;
    storeName: string;
    total: number;
    coverage: { found: number; total: number };
  } | null;
  missingImpact: {
    storesAffected: number;
    totalDelta: number;
  };
  updatedAt: string;
};

export const getBasketAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<BasketAdminOverview> => {
    const nowIso = new Date().toISOString();

    // Ativa versão e itens.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const setQuery = await (supabaseAdmin as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (c: string, v: boolean) => {
            maybeSingle: () => Promise<{
              data: {
                id: string;
                version: number;
                label: string;
                updated_at: string;
              } | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    })
      .from("basket_item_sets")
      .select("id, version, label, updated_at")
      .eq("active", true)
      .maybeSingle();

    let activeItems = 0;
    if (setQuery.data?.id) {
      const countQuery = await (supabaseAdmin as unknown as {
        from: (t: string) => {
          select: (
            s: string,
            o: { count: "exact"; head: true },
          ) => {
            eq: (c: string, v: string) => {
              eq: (
                c: string,
                v: boolean,
              ) => Promise<{ count: number | null; error: { message: string } | null }>;
            };
          };
        };
      })
        .from("basket_items")
        .select("id", { count: "exact", head: true })
        .eq("set_id", setQuery.data.id)
        .eq("enabled", true);
      activeItems = countQuery.count ?? 0;
    }

    // Ranking + faltantes.
    let leader: BasketAdminOverview["leader"] = null;
    let missingImpact = { storesAffected: 0, totalDelta: 0 };

    try {
      const comparison = await getBasketComparison({ data: {} });

      if (comparison.stores.length > 0) {
        const top = comparison.stores[0];
        leader = {
          storeId: top.establishmentId,
          storeName: top.establishmentName,
          total: top.total,
          coverage: { found: top.itemsFound, total: top.totalItems },
        };


        const projections = projectVerdictWithSubstitutions(comparison);
        const top3 = new Set(
          comparison.stores.slice(0, 3).map((s) => s.establishmentId),
        );
        let affected = 0;
        let delta = 0;
        for (const p of projections) {
          if (!top3.has(p.storeId) || p.substitutionsApplied === 0) continue;
          affected += 1;
          delta += p.hypotheticalTotal - p.originalTotal;
        }
        missingImpact = {
          storesAffected: affected,
          totalDelta: Number(delta.toFixed(2)),
        };
      }
    } catch (err) {
      // Se a comparação falhar (config ausente, sem preços), preserva os KPIs
      // parciais e sinaliza pelo `leader === null`.
      console.warn("[getBasketAdminOverview] comparison failed:", err);
    }

    return {
      activeItems,
      version: setQuery.data?.version ?? null,
      versionLabel: setQuery.data?.label ?? null,
      activatedAt: setQuery.data?.updated_at ?? null,
      leader,
      missingImpact,
      updatedAt: nowIso,
    };
  });
