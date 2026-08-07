import { shortenStoreName } from "@/lib/store-name";
import { cn } from "@/lib/utils";
import { SavingsBadge } from "@/components/product/SavingsBadge";
import { Price, type PriceSize } from "@/components/ds/Price";

/**
 * Bloco unificado de "preço em destaque" — usado no ProductCard do
 * comparador e da rota /melhores-precos para garantir a mesma
 * hierarquia visual (eyebrow + numeral grande + subtítulo + badge de
 * economia à direita quando há mais de 1 mercado).
 *
 * O componente é *apresentacional*: recebe dados já calculados e não
 * dispara mutações — mantém regras de negócio nas rotas.
 */
export function PriceHero({
  minPrice,
  avgPrice,
  savingsPct,
  cheapestStore,
  isMulti,
  align = "row",
  size = "md",
  className,
  eyebrow,
}: {
  minPrice: number;
  avgPrice?: number | null;
  savingsPct?: number | null;
  cheapestStore?: string | null;
  isMulti: boolean;
  align?: "row" | "column";
  size?: "sm" | "md" | "lg";
  className?: string;
  eyebrow?: string;
}) {
  const label = eyebrow ?? (isMulti ? "Lowest price" : "Price");
  /* Escala única de preço do design system (evita text-lg/2xl ad-hoc). */
  const numeralSize: PriceSize = ({ sm: "md", md: "lg", lg: "xl" } as const)[size];

  return (
    <div
      className={cn(
        "flex items-end justify-between gap-3",
        align === "column" && "flex-col items-start",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {label}
        </p>
        <Price as="p" value={Number(minPrice)} size={numeralSize} className="mt-0.5" />
        {cheapestStore && (
          <p className="mt-1 truncate text-[11px] text-muted-foreground">
            at{" "}
            <span className="font-medium text-foreground" title={cheapestStore}>
              {shortenStoreName(cheapestStore)}
            </span>
          </p>
        )}
      </div>
      {isMulti && (
        <div className="flex flex-col items-end gap-1 text-right">
          {avgPrice != null && Number.isFinite(Number(avgPrice)) && (
            <>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Average
              </p>
              <Price value={Number(avgPrice)} size="sm" tone="strike" as="p" />
            </>
          )}
          {savingsPct != null && Number(savingsPct) > 0 && (
            <SavingsBadge pct={Number(savingsPct)} variant="solid" size="sm" />
          )}
        </div>
      )}
    </div>
  );
}
