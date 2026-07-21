import { shortenStoreName } from "@/lib/store-name";
import { cn } from "@/lib/utils";
import { SavingsBadge } from "@/components/product/SavingsBadge";

function formatBRL(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Bloco unificado de "preço em destaque" — usado no ProductCard do
 * comparador e da rota /melhores-precos para garantir a mesma
 * hierarquia visual (eyebrow + numeral grande + subtítulo + badge de
 * economia à direita quando há mais de 1 loja).
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
  const label = eyebrow ?? (isMulti ? "Menor preço" : "Preço");
  const numeralSize = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
  }[size];

  return (
    <div
      className={cn(
        "flex items-end justify-between gap-3",
        align === "column" && "flex-col items-start",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "mt-0.5 font-display font-extrabold leading-none tabular-nums text-primary",
            numeralSize,
          )}
        >
          {formatBRL(Number(minPrice))}
        </p>
        {cheapestStore && (
          <p className="mt-1 truncate text-[11px] text-muted-foreground">
            em{" "}
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
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Média
              </p>
              <p className="font-mono text-sm text-muted-foreground line-through">
                {formatBRL(Number(avgPrice))}
              </p>
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
