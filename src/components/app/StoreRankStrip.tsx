import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Loader2, TrendingDown } from "lucide-react";

import { Price } from "@/components/ds/Price";
import { getCheapestStoresRanking } from "@/lib/stores-public.functions";
import { cn } from "@/lib/utils";

/**
 * Ranking compacto dos mercados mais baratos (7 dias) para o painel do
 * cliente. Sem filtros duplicados — a versão completa vive em
 * /melhores-precos.
 */
export function StoreRankStrip({
  onOpenStore,
  storeNames,
}: {
  onOpenStore: (name: string) => void;
  storeNames: Set<string>;
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
      className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card"
    >
      <header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border/70 px-3 py-2">
        <div className="min-w-0">
          <h2 className="truncate text-[13px] font-bold text-foreground">
            Mercados mais baratos
          </h2>
          <p className="truncate text-[12px] text-muted-foreground">
            {summary
              ? `${summary.totalProductsCompared} produtos comparados · ${summary.windowDays} dias`
              : "últimos 7 dias"}
          </p>
        </div>
        <Link
          to="/melhores-precos"
          className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[11.5px] font-semibold text-primary hover:border-primary/50"
        >
          Ver todos
        </Link>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {q.isLoading ? (
          <div className="flex items-center gap-2 p-4 text-[13px] text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Calculando…
          </div>
        ) : rows.length === 0 ? (
          <p className="p-4 text-[13px] text-muted-foreground">
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
                    className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-2 text-left transition-colors enabled:hover:bg-muted/50 disabled:cursor-default"
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
                      <span className="block truncate text-[13px] font-semibold text-foreground">
                        {r.storeName}
                      </span>
                      <span className="block truncate text-[12px] text-muted-foreground">
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
