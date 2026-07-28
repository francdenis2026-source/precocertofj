/**
 * Painel de sugestões de substituição para itens faltantes.
 *
 * Renderiza, para um mercado específico, quais itens da cesta ele não
 * tem e sugere trocas dentro da mesma categoria — mostrando delta vs.
 * a média entre mercados e o novo total hipotético.
 */

import { useMemo } from "react";
import { ArrowRightLeft, AlertTriangle } from "lucide-react";
import type { BasketComparisonResult } from "@/lib/basket.functions";
import { suggestSubstitutions } from "@/lib/basket-suggestions";
import { cn } from "@/lib/utils";

type Props = {
  data: BasketComparisonResult | null;
  storeId: string | null;
  className?: string;
};

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function BasketSubstitutionPanel({ data, storeId, className }: Props) {
  const suggestions = useMemo(
    () => (data && storeId ? suggestSubstitutions(data, storeId) : []),
    [data, storeId],
  );
  const store = useMemo(
    () => (data && storeId ? data.stores.find((s) => s.establishmentId === storeId) : null),
    [data, storeId],
  );

  if (!data || !storeId) return null;
  if (!store) return null;
  if (suggestions.length === 0) return null;

  return (
    <section
      className={cn(
        "rounded-2xl border border-amber-200/60 dark:border-amber-500/30 bg-amber-50/40 dark:bg-amber-500/5 p-4",
        className,
      )}
      aria-label={`Substituições sugeridas em ${store.establishmentName}`}
    >
      <header className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <h3 className="text-sm font-semibold text-foreground">
          {suggestions.length} substituição{suggestions.length > 1 ? "ões" : ""} sugerida
          {suggestions.length > 1 ? "s" : ""} · {store.establishmentName}
        </h3>
      </header>
      <p className="mt-1 text-xs text-muted-foreground">
        Este mercado não tem alguns itens da cesta. Sugerimos trocas dentro da mesma categoria
        e mostramos como isso muda o custo total.
      </p>

      <ul className="mt-3 flex flex-col divide-y divide-amber-200/50 dark:divide-amber-500/20">
        {suggestions.map((s) => (
          <li
            key={`${s.missingKey}->${s.substituteKey}`}
            className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto] items-center gap-2 py-2 text-sm"
          >
            <div className="text-muted-foreground">
              <span className="font-medium text-foreground/80 line-through decoration-red-500/60">
                {s.missingLabel}
              </span>
              {s.referencePrice != null ? (
                <span className="ml-2 text-[11px] tabular-nums">
                  ~{fmtBRL(s.referencePrice)}
                </span>
              ) : (
                <span className="ml-2 text-[11px]">sem referência</span>
              )}
            </div>
            <ArrowRightLeft className="hidden md:block h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <div>
              <span className="font-medium text-foreground">{s.substituteLabel}</span>
              <span className="ml-2 tabular-nums text-[11px] text-muted-foreground">
                {fmtBRL(s.substitutePrice)}
                {s.substituteQuantity !== 1 ? ` × ${s.substituteQuantity}` : ""}
              </span>
            </div>
            <div
              className={cn(
                "text-right text-xs tabular-nums font-medium",
                s.deltaVsAverage > 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-emerald-600 dark:text-emerald-400",
              )}
              title="Impacto estimado no total do mercado"
            >
              {s.deltaVsAverage > 0 ? "+" : ""}
              {fmtBRL(s.deltaVsAverage)}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
