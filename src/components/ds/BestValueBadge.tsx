/**
 * <BestValueBadge /> — selo de "Melhor custo-benefício".
 *
 * Critério: menor preço por unidade normalizada (R$/kg ou R$/L). Não confundir
 * com o selo da coroa ("Menor preço"), que usa o valor absoluto da etiqueta.
 * Este selo só deve ser renderizado quando as embalagens comparadas têm
 * tamanhos diferentes — a decisão fica em `pickBestValue` (src/lib/best-value).
 *
 * Visual: paleta primária (azul/navy) para se distinguir do dourado da coroa,
 * garantindo que o usuário leia os dois selos como critérios distintos.
 */
import { Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BestValueResult } from "@/lib/best-value";

export interface BestValueBadgeProps {
  /** Resultado de `pickBestValue`. */
  result: Pick<BestValueResult, "label" | "sourceLabel" | "advantagePct" | "differsFromCheapest">;
  /** Compacto: só o ícone + R$/un (para linhas densas). */
  compact?: boolean;
  className?: string;
}

export function BestValueBadge({ result, compact = false, className }: BestValueBadgeProps) {
  const pct = Math.round(result.advantagePct);
  const title =
    `Melhor custo-benefício: ${result.label}` +
    (result.sourceLabel ? ` (embalagem ${result.sourceLabel})` : "") +
    (result.differsFromCheapest && pct > 0
      ? ` — ${pct}% mais barato por unidade que a etiqueta mais barata`
      : "");

  return (
    <span
      role="img"
      data-testid="best-value-badge"
      data-best-value="true"
      aria-label={title}
      title={title}
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full border border-primary/45",
        "bg-primary/10 px-2 py-[2px] text-[10px] font-bold uppercase tracking-[0.12em] text-primary",
        className,
      )}
    >
      <Scale className="h-2.5 w-2.5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
      {compact ? null : <span className="truncate">Melhor custo-benefício</span>}
      <span className="tabular-nums font-semibold normal-case tracking-normal">
        {result.label}
      </span>
    </span>
  );
}

export default BestValueBadge;
