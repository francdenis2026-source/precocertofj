import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ListingCountProps {
  /** Quantidade visível após filtros. */
  count: number;
  /** Total sem filtros. Opcional. */
  total?: number;
  /** Substantivo (default "produto"). */
  noun?: string;
  /** Chips/labels descrevendo filtros ativos. */
  extras?: ReactNode;
  className?: string;
}

/**
 * Texto padronizado com contagem de itens da listagem.
 * Usa `text-muted-foreground` (contraste AA) com valores em `<strong>`.
 */
export function ListingCount({
  count,
  total,
  noun = "product",
  extras,
  className,
}: ListingCountProps) {
  const plural = count === 1 ? noun : `${noun}s`;
  return (
    <p
      className={cn(
        "text-xs text-muted-foreground",
        className,
      )}
      aria-live="polite"
    >
      <strong className="font-semibold tabular-nums text-foreground">{count}</strong>
      {total != null && total !== count ? (
        <>
          {" "}
          of{" "}
          <strong className="font-semibold tabular-nums text-foreground">{total}</strong>
        </>
      ) : null}{" "}
      {plural}
      {extras}
    </p>
  );
}
