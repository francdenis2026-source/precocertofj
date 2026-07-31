import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Loader2, TrendingDown } from "lucide-react";

import { Price } from "@/components/ds/Price";
import { getCheapestStoresRanking } from "@/lib/stores-public.functions";
import { cn } from "@/lib/utils";
import { tc } from "@/lib/typeclear";

/**
 * Ranking compacto dos mercados mais baratos (7 dias) para o painel do
 * cliente. Sem filtros duplicados — a versão completa vive em
 * /melhores-precos.
 */
export function StoreRankStrip({
  onOpenStore,
  storeNames,
  bare = false,
}: {
  onOpenStore: (name: string) => void;
  storeNames: Set<string>;
  /** Sem moldura própria — usado dentro do painel unificado com abas. */
  bare?: boolean;
}) {
  const fetchRanking = useServerFn(getCheapestStoresRanking);
  const q = useQuery({
    queryKey: ["app-rank-compact"],
    queryFn: () => fetchRanking({ data: { category: null, type: null } }),
    staleTime: 5 * 60_000,
  });

  const rows = (q.data?.rows ?? []).slice(0, 5);
  const summary = q.data?.summary;

  return (
    <section
      aria-label="Mercados mais baratos"
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden",
        bare
          ? ""
          : "max-h-[46vh] rounded-lg border border-border/70 bg-card/94 shadow-sm backdrop-blur-md lg:max-h-none",
      )}
    >
      {bare ? (
        <p className={cn(tc.panelNote, "shrink-0 truncate border-b border-border/70 px-3 py-1.5")}>
          {summary
            ? `${summary.totalProductsCompared} produtos comparados · ${summary.windowDays} dias`
            : "últimos 7 dias"}
        </p>
      ) : (
        <header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border/70 px-3 py-2">
          <div className="min-w-0">
            <h2 className={cn(tc.panelTitle, "truncate")}>Mercados mais baratos</h2>
            <p className={cn(tc.panelNote, "truncate")}>
              {summary
                ? `${summary.totalProductsCompared} produtos comparados · ${summary.windowDays} dias`
                : "últimos 7 dias"}
            </p>
          </div>
          <Link
            to="/melhores-precos"
            className={cn(
              tc.filter,
              "shrink-0 rounded-md border border-border px-2.5 py-1 text-primary hover:border-primary/50",
            )}
          >
            Ver todos
          </Link>
        </header>
      )}


      <div className="min-h-0 flex-1 overflow-y-auto">
        {q.isLoading ? (
          <div className={cn(tc.meta, "flex items-center gap-2 p-4")}>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Calculando…
          </div>
        ) : rows.length === 0 ? (
          <p className={cn(tc.meta, "p-4")}>
            Ainda não temos comparações suficientes nesta região.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {rows.map((r, i) => {
              const clickable = storeNames.has(r.storeName.trim().toLowerCase());
              return (
                <li key={r.establishmentId}>
                  <button
                    type="button"
                    onClick={() => clickable && onOpenStore(r.storeName)}
                    disabled={!clickable}
                     className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-1.5 text-left transition-colors enabled:hover:bg-muted/50 disabled:cursor-default"
                  >
                    <span
                      className={cn(
                        "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold",
                        i === 0
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                       <span className={cn(tc.storeName, "block truncate")}>
                        {r.storeName}
                      </span>
                       <span className={cn(tc.metaMuted, "block truncate")}>
                        {r.wins} menores preços · ticket médio{" "}
                        <Price value={r.avgTicketWins} size="xs" tone="muted" />
                      </span>
                    </span>
                    {r.avgSavingsPct > 0 && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-savings/15 px-2 py-0.5 text-[11.5px] font-semibold text-savings-foreground">
                        <TrendingDown className="h-3 w-3" aria-hidden />
                        {r.avgSavingsPct}%
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
