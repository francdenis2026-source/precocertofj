import { useMemo } from "react";
import { Crown, Repeat } from "lucide-react";

/**
 * Strip horizontal compacto de comparação lado a lado por item.
 *
 * Mostra as top-N mercados (padrão 5) para um mesmo essencial, com o menor
 * preço em destaque e a variação percentual em relação ao mínimo — sem
 * abrir modal/detalhes. Rolagem horizontal em telas pequenas.
 */
export type PriceStripRow = {
  establishmentId: string;
  establishmentName: string;
  price: number;
};

export function ItemPriceStrip({
  rows,
  activeEstablishmentId,
  onPick,
  fmt,
  max = 6,
  className = "",
}: {
  rows: PriceStripRow[];
  activeEstablishmentId?: string | null;
  onPick?: (row: PriceStripRow) => void;
  fmt: (n: number) => string;
  max?: number;
  className?: string;
}) {
  const { top, cheapestPrice, spread } = useMemo(() => {
    if (rows.length === 0) return { top: [] as PriceStripRow[], cheapestPrice: 0, spread: 0 };
    const sorted = [...rows].sort((a, b) => a.price - b.price);
    const cheapest = sorted[0].price;
    const most = sorted[sorted.length - 1].price;
    return {
      top: sorted.slice(0, max),
      cheapestPrice: cheapest,
      spread: cheapest > 0 ? ((most - cheapest) / cheapest) * 100 : 0,
    };
  }, [rows, max]);

  if (top.length === 0) return null;

  return (
    <div className={"relative " + className}>
      <div className="mb-1 flex items-center justify-between gap-2 px-0.5">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Comparar mercados · {rows.length}
        </p>
        {spread > 0 ? (
          <span
            className="rounded-full border border-accent-strong/40 bg-accent/10 px-1.5 py-[1px] font-mono text-[11px] uppercase tracking-[0.16em] text-accent-strong"
            title="Diferença entre a mais barata e a mais cara"
          >
            variação {spread.toFixed(0)}%
          </span>
        ) : null}
      </div>
      <div
        className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="list"
        aria-label="Preços por estabelecimento"
      >
        {top.map((r) => {
          const isCheapest = r.price === cheapestPrice;
          const isActive = activeEstablishmentId === r.establishmentId;
          const pctVsMin =
            cheapestPrice > 0 ? ((r.price - cheapestPrice) / cheapestPrice) * 100 : 0;
          const content = (
            <>
              <div className="flex items-center gap-1">
                {isCheapest ? (
                  <Crown
                    className="h-3 w-3 text-accent-strong"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                ) : null}
                <span className="truncate font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  {r.establishmentName}
                </span>
              </div>
              <p
                className={
                  "mt-0.5 font-display text-[13px] font-bold leading-tight tabular-nums " +
                  (isCheapest ? "text-accent-strong" : "text-foreground")
                }
              >
                {fmt(r.price)}
              </p>
              <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                {isCheapest ? "menor" : `+${pctVsMin.toFixed(0)}%`}
              </p>
            </>
          );
          const base =
            "min-w-[112px] max-w-[132px] shrink-0 rounded-lg border p-1.5 text-left transition ";
          const skin = isActive
            ? "border-primary bg-primary/5 shadow-sm"
            : isCheapest
              ? "border-accent-strong/50 bg-accent/10"
              : "border-border bg-background hover:border-primary/40";
          if (!onPick) {
            return (
              <div key={r.establishmentId} role="listitem" className={base + skin}>
                {content}
              </div>
            );
          }
          return (
            <button
              key={r.establishmentId}
              type="button"
              role="listitem"
              onClick={() => onPick(r)}
              aria-label={`Trocar para ${r.establishmentName} por ${fmt(r.price)}`}
              className={
                base +
                skin +
                " cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              }
            >
              {content}
              <span className="mt-1 inline-flex items-center gap-1 rounded border border-border bg-surface px-1 py-[1px] font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                <Repeat className="h-2.5 w-2.5" aria-hidden="true" /> escolher
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
