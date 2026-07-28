import { useMemo, useState } from "react";
import { computeUnitPrice } from "@/lib/unit-price";
import { UnitPriceBadge } from "@/components/product/UnitPriceBadge";
import { X, RefreshCw, Trophy, AlertTriangle, Clock } from "lucide-react";
import { useMyRoles } from "@/hooks/useMyRoles";


/**
 * Diálogo/painel de comparação lado-a-lado de 2+ produtos escolhidos
 * a partir dos resultados de busca. Ranqueia estabelecimentos por
 * custo total combinado, destaca preços defasados e permite compartilhar
 * um link público da comparação.
 */

export type CompareEntry = {
  productName: string;
  slug?: string | null;
  prices: {
    marketName: string;
    price: number;
    when: string;
  }[];
};

const fmt = (n: number | null | undefined) =>
  typeof n === "number" ? `R$ ${n.toFixed(2).replace(".", ",")}` : "—";

/** Retorna dias desde a data (string ISO) ou null. */
function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

function freshnessLabel(days: number | null): { label: string; stale: boolean } | null {
  if (days == null) return null;
  if (days === 0) return { label: "hoje", stale: false };
  if (days === 1) return { label: "1 dia", stale: false };
  if (days < 30) return { label: `${days} dias`, stale: false };
  if (days < 60) return { label: `${days} dias`, stale: true };
  return { label: `${Math.floor(days / 30)} meses`, stale: true };
}

export function ProductCompareDialog({
  entries,
  onClose,
  onRemove,
  onRefresh,
}: {
  entries: CompareEntry[];
  onClose: () => void;
  onRemove: (productName: string) => void;
  onRefresh?: () => void;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const { isAdmin, loading: rolesLoading } = useMyRoles();

  // market → productName index → cheapest match
  const rows = useMemo(() => {
    const markets = new Set<string>();
    for (const e of entries) for (const p of e.prices) markets.add(p.marketName);

    const perMarket = Array.from(markets).map((market) => {
      const cells = entries.map((e) => {
        const matches = e.prices
          .filter((p) => p.marketName === market)
          .sort((a, b) => a.price - b.price);
        return matches[0] ?? null;
      });
      const validPrices = cells
        .map((c) => (c ? c.price : null))
        .filter((v): v is number => v != null);
      const minRow = validPrices.length ? Math.min(...validPrices) : null;
      const total = cells.every((c) => c != null)
        ? cells.reduce((acc, c) => acc + (c ? c.price : 0), 0)
        : null;
      return { market, cells, minRow, total };
    });

    // Ranking: linhas com total completo primeiro, ordenadas por total; depois demais alfabéticas
    const withTotal = perMarket.filter((r) => r.total != null).sort((a, b) => (a.total! - b.total!));
    const withoutTotal = perMarket
      .filter((r) => r.total == null)
      .sort((a, b) => a.market.localeCompare(b.market));
    return [...withTotal, ...withoutTotal];
  }, [entries]);

  const bestTotal = rows.find((r) => r.total != null)?.total ?? null;
  const worstTotal = [...rows].reverse().find((r) => r.total != null)?.total ?? null;
  const totalSavings =
    bestTotal != null && worstTotal != null && worstTotal > bestTotal
      ? worstTotal - bestTotal
      : null;

  // O compartilhamento externo por link foi removido junto com a rota /comparar.
  // A comparação segue disponível apenas dentro do app.


  async function handleRefresh() {
    if (!onRefresh || refreshing) return;
    try {
      setRefreshing(true);
      await Promise.resolve(onRefresh());
    } finally {
      setTimeout(() => setRefreshing(false), 600);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="hairline-gold relative w-full max-w-4xl overflow-hidden rounded-2xl border border-primary/25 bg-background shadow-2xl"
      >
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent-strong">
              Comparar produtos
            </p>
            <h2
              id="compare-title"
              className="font-display text-base font-semibold tracking-tight text-foreground"
            >
              {entries.length} item{entries.length > 1 ? "s" : ""} · ranking por custo total
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            {onRefresh && !rolesLoading && isAdmin ? (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                aria-label="Atualizar preços (admin)"
                title="Atualizar preços (somente admin)"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground shadow-sm transition hover:border-accent-strong/50 hover:text-accent-strong disabled:opacity-50"
              >
                <RefreshCw
                  className={"h-3.5 w-3.5 " + (refreshing ? "animate-spin" : "")}
                  strokeWidth={1.8}
                />
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar comparação"
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-background/95 backdrop-blur">
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  Estabelecimento
                </th>
                {entries.map((e) => (
                  <th
                    key={e.productName}
                    className="min-w-[160px] px-3 py-2 text-left font-mono text-[11px] uppercase tracking-widest text-muted-foreground"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="line-clamp-2 normal-case tracking-tight text-foreground">
                        {e.productName}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemove(e.productName)}
                        aria-label={`Remover ${e.productName} da comparação`}
                        className="shrink-0 rounded-full p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </th>
                ))}
                <th className="min-w-[110px] px-3 py-2 text-right font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={entries.length + 2}
                    className="px-3 py-6 text-center font-mono text-[11px] text-muted-foreground"
                  >
                    Nenhum estabelecimento em comum.
                  </td>
                </tr>
              ) : (
                rows.map(({ market, cells, minRow, total }, rowIdx) => {
                  const isBest = total != null && total === bestTotal;
                  return (
                    <tr
                      key={market}
                      className={
                        "border-b border-border/60 last:border-b-0 " +
                        (isBest ? "bg-savings/5" : "")
                      }
                    >
                      <td className="px-3 py-2 align-top">
                        <div className="flex items-center gap-1.5">
                          {isBest ? (
                            <Trophy className="h-3.5 w-3.5 text-accent-strong" strokeWidth={2.4} />
                          ) : total != null ? (
                            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted/60 font-mono text-[11px] font-bold text-muted-foreground">
                              {rowIdx + 1}
                            </span>
                          ) : (
                            <span aria-hidden="true" className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[11px] text-muted-foreground">
                              ·
                            </span>
                          )}
                          <span className="font-display text-[13px] font-medium tracking-tight text-foreground">
                            {market}
                          </span>
                        </div>
                      </td>
                      {cells.map((cell, i) => {
                        const entry = entries[i];
                        if (!cell) {
                          return (
                            <td
                              key={i}
                              className="px-3 py-2 align-top font-mono text-[11px] text-muted-foreground"
                            >
                              —
                            </td>
                          );
                        }
                        const isMin = minRow != null && cell.price === minRow;
                        const days = daysSince(cell.when);
                        const fresh = freshnessLabel(days);
                        return (
                          <td
                            key={i}
                            className={"px-3 py-2 align-top " + (isMin ? "bg-accent/10" : "")}
                          >
                            <p
                              className={
                                "pc-price pc-price--md " +
                                (isMin ? "pc-price--best" : "")
                              }
                            >
                              {fmt(cell.price)}
                            </p>
                            <UnitPriceBadge
                              price={cell.price}
                              productName={entry.productName}
                              className="mt-1"
                            />
                            {fresh ? (
                              <p
                                className={
                                  "mt-1 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-widest " +
                                  (fresh.stale
                                    ? "text-destructive"
                                    : "text-muted-foreground")
                                }
                              >
                                {fresh.stale ? (
                                  <AlertTriangle className="h-2.5 w-2.5" />
                                ) : (
                                  <Clock className="h-2.5 w-2.5" />
                                )}
                                {fresh.stale ? "defasado" : "há"} {fresh.label}
                              </p>
                            ) : null}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-right align-top">
                        {total != null ? (
                          <>
                            <p
                              className={
                                "pc-price pc-price--md " +
                                (isBest ? "pc-price--best" : "")
                              }
                            >
                              {fmt(total)}
                            </p>
                            {isBest ? (
                              <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-accent-strong">
                                melhor total
                              </p>
                            ) : bestTotal != null ? (
                              <p className="mt-1 pc-price pc-price--sm pc-price--muted">
                                +{fmt(total - bestTotal)}
                              </p>
                            ) : null}
                          </>
                        ) : (
                          <span className="font-mono text-[11px] text-muted-foreground">
                            parcial
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <footer className="border-t border-border px-4 py-2.5">
          {totalSavings != null ? (
            <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-savings/30 bg-savings/[0.06] px-3 py-2">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-savings">
                Economia máxima
              </span>
              <span className="pc-price pc-price--md pc-price--savings">
                {fmt(totalSavings)}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                comparando o mais barato ao mais caro no mesmo carrinho
              </span>
            </div>
          ) : null}
          <p className="font-mono text-[11px] text-muted-foreground">
            Ranking por custo total (somando o preço mais baixo de cada item por
            estabelecimento). Preço unitário em{" "}
            <span className="text-accent-strong">R$/kg</span> ou{" "}
            <span className="text-accent-strong">R$/L</span> quando disponível.
            Preços com mais de 30 dias aparecem como{" "}
            <span className="text-destructive">defasados</span>.
          </p>
          {(() => {
            const bestSummary = entries
              .map((e) => {
                const cheapest = [...e.prices].sort((a, b) => a.price - b.price)[0];
                const u = cheapest ? computeUnitPrice(cheapest.price, e.productName) : null;
                return { name: e.productName, cheapest, unit: u };
              })
              .filter((x) => x.cheapest);
            if (bestSummary.length === 0) return null;
            const total = bestSummary.reduce(
              (acc, x) => acc + (x.cheapest ? x.cheapest.price : 0),
              0,
            );
            return (
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/[0.04] px-3 py-2">
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent-strong">
                  Melhor combinação
                </span>
                {bestSummary.map((x) => (
                  <span
                    key={x.name}
                    className="inline-flex items-center gap-1 font-mono text-[11px] text-foreground"
                  >
                    <span className="max-w-[160px] truncate">{x.name}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="pc-price pc-price--sm pc-price--best">{fmt(x.cheapest?.price)}</span>
                    <span className="text-muted-foreground">em {x.cheapest?.marketName}</span>
                  </span>
                ))}
                <span className="ml-auto pc-price pc-price--md">
                  Σ {fmt(total)}
                </span>
              </div>
            );
          })()}
        </footer>
      </div>
    </div>
  );
}

export function CompareTray({
  count,
  onOpen,
  onClear,
}: {
  count: number;
  onOpen: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;
  return (
    <div
      role="region"
      aria-label="Bandeja de comparação"
      className="pointer-events-auto fixed inset-x-0 bottom-3 z-40 mx-auto flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-background/95 px-3 py-2 shadow-lg backdrop-blur"
    >
      <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        Comparar
      </span>
      <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 font-mono text-[11px] font-bold tabular-nums text-primary-foreground">
        {count}
      </span>
      <button
        type="button"
        onClick={onOpen}
        disabled={count < 2}
        className="rounded-full bg-primary px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Ver comparação
      </button>
      <button
        type="button"
        onClick={onClear}
        className="rounded-full border border-border px-2 py-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
      >
        Limpar
      </button>
      {count < 2 ? (
        <span className="font-mono text-[11px] text-muted-foreground">
          selecione ao menos 2
        </span>
      ) : null}
    </div>
  );
}
