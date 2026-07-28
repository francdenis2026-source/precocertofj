/**
 * BasketOverviewCard — KPIs da Cesta Básica para a home do console admin.
 *
 * Consome `getBasketAdminOverview` e apresenta quatro leituras: itens
 * ativos, versão vigente, líder atual do ranking e impacto estimado
 * dos faltantes no top 3. Todos os estados (loading, empty, error)
 * são tratados explicitamente para não deixar a home admin em branco.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import {
  ArrowRightLeft,
  ListChecks,
  Trophy,
  Boxes,
  AlertTriangle,
} from "lucide-react";
import { getBasketAdminOverview } from "@/lib/basket-overview.functions";
import { AdminChip } from "@/components/admin/AdminChip";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";
import { tc } from "@/lib/typeclear";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

type Kpi = {
  key: string;
  label: string;
  value: string;
  hint: string;
  icon: typeof ListChecks;
  tone: "overview" | "catalog" | "commerce" | "people" | "system" | "warning" | "success" | "neutral";
};

export function BasketOverviewCard({ className }: { className?: string }) {
  const fetcher = useServerFn(getBasketAdminOverview);
  const query = useQuery({
    queryKey: ["admin", "basket-overview"],
    queryFn: () => fetcher(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const kpis = useMemo<Kpi[]>(() => {
    const d = query.data;
    if (!d) return [];
    const hasImpact = d.missingImpact.storesAffected > 0;
    return [
      {
        key: "items",
        label: "Itens ativos",
        value: d.activeItems > 0 ? String(d.activeItems) : "—",
        hint:
          d.activeItems > 0
            ? "essenciais habilitados na versão vigente"
            : "nenhum item cadastrado",
        icon: ListChecks,
        tone: "catalog",
      },
      {
        key: "version",
        label: "Versão vigente",
        value: d.version != null ? `v${d.version}` : "—",
        hint: d.activatedAt ? `atualizada em ${fmtDate(d.activatedAt)}` : "sem versão ativa",
        icon: Boxes,
        tone: "overview",
      },
      {
        key: "leader",
        label: "Líder do ranking",
        value: d.leader ? d.leader.storeName : "—",
        hint: d.leader
          ? `${brl(d.leader.total)} · ${d.leader.coverage.found}/${d.leader.coverage.total} itens`
          : "sem dados para comparar",
        icon: Trophy,
        tone: "commerce",
      },
      {
        key: "impact",
        label: "Impacto de faltantes",
        value: hasImpact ? `+${brl(d.missingImpact.totalDelta)}` : brl(0),
        hint: hasImpact
          ? `em ${d.missingImpact.storesAffected} mercado${d.missingImpact.storesAffected > 1 ? "s" : ""} do top 3`
          : "top 3 sem substituições sugeridas",
        icon: hasImpact ? AlertTriangle : ArrowRightLeft,
        tone: hasImpact ? "warning" : "success",
      },
    ];
  }, [query.data]);

  return (
    <section
      aria-labelledby="admin-basket-overview"
      data-admin-region="basket-overview"
      className={cn(
        "rounded-2xl border border-border/70 bg-card/80 p-3 md:p-4 shadow-sm",
        className,
      )}
    >
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-border/50 pb-2">
        <div className="min-w-0">
          <h2 id="admin-basket-overview" className={cn(tc.itemTitle, "text-foreground")}>
            Cesta Básica · panorama
          </h2>
          <p className={cn(tc.meta, "text-muted-foreground")}>
            Estado atual dos itens versionados, ranking e impacto de faltantes
          </p>
        </div>
        <div className="flex items-center gap-2">
          {query.isFetching && !query.isLoading && (
            <AdminChip tone="overview" size="sm" loading>
              atualizando…
            </AdminChip>
          )}
          <Link
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            to={"/admin_/cesta" as any}
            className="text-[11px] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            Gerenciar cesta →
          </Link>
        </div>
      </header>

      {query.isLoading ? (
        <ul className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <li
              key={i}
              className="h-[86px] animate-pulse rounded-xl border border-border/60 bg-muted/40"
              aria-hidden
            />
          ))}
        </ul>
      ) : query.isError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          Não foi possível carregar o panorama da cesta.{" "}
          <button
            type="button"
            className="font-medium underline underline-offset-2"
            onClick={() => query.refetch()}
          >
            Tentar novamente
          </button>
        </div>
      ) : query.data && query.data.activeItems === 0 ? (
        <div className="rounded-xl border border-amber-400/50 bg-amber-50/40 p-3 text-sm dark:bg-amber-500/5">
          <p className="font-medium text-foreground">Cesta sem itens configurados.</p>
          <p className="text-muted-foreground">
            Cadastre os essenciais em{" "}
            <Link
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              to={"/admin_/cesta" as any}
              className="font-medium text-primary hover:underline"
            >
              Admin · Cesta Básica
            </Link>{" "}
            para ativar o ranking e as substituições sugeridas.
          </p>
        </div>
      ) : (
        <ul
          role="list"
          className="grid grid-cols-2 gap-2 lg:grid-cols-4"
          data-testid="admin-basket-kpis"
        >
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <li
                key={k.key}
                className="flex flex-col gap-1.5 rounded-xl border border-border/70 bg-background/60 p-2.5"
                data-kpi={k.key}
              >
                <div className="flex items-center justify-between gap-2">
                  <AdminChip tone={k.tone} size="sm" className="uppercase tracking-wide">
                    <Icon className="h-3 w-3" aria-hidden />
                    {k.label}
                  </AdminChip>
                </div>
                <p
                  className={cn(
                    "truncate text-lg font-semibold text-foreground tabular-nums",
                  )}
                  title={k.value}
                >
                  {k.value}
                </p>
                <p className="text-[11px] text-muted-foreground">{k.hint}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
