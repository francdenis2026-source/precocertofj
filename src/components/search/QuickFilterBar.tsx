import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type QuickFilterOption<T extends string = string> = {
  value: T;
  label: ReactNode;
  hint?: string;
  count?: number;
};

/**
 * Barra de filtros rápidos reutilizável — usada em /buscar e /comparador
 * para expor sort/mode/tipo em chips consistentes.
 *
 * Acessibilidade:
 * - `role="radiogroup"` (single) ou lista de switches (multi-toggle)
 * - `aria-checked` reflete o estado ativo
 * - Foco visível via `focus-visible:ring-primary`
 * - Suporta navegação via Tab e ativação por Enter/Space (default do <button>)
 */
export function QuickFilterBar<T extends string>({
  label,
  options,
  value,
  onChange,
  multi = false,
  size = "md",
  className,
  ariaLabel,
}: {
  label?: string;
  options: readonly QuickFilterOption<T>[];
  value: T | T[] | null;
  onChange: (next: T | null) => void;
  multi?: boolean;
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
}) {
  const activeSet = new Set<string>(
    Array.isArray(value) ? value : value ? [value] : [],
  );
  const sizes = {
    sm: "px-2.5 py-1 text-[10px]",
    md: "px-3 py-1.5 text-[11px]",
  }[size];

  return (
    <div
      role={multi ? "group" : "radiogroup"}
      aria-label={ariaLabel ?? label ?? "Filtros"}
      className={cn("flex flex-wrap items-center gap-1.5", className)}
    >
      {label && (
        <span className="mr-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {label}
        </span>
      )}
      {options.map((opt) => {
        const active = activeSet.has(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            role={multi ? "switch" : "radio"}
            aria-checked={active}
            aria-label={typeof opt.label === "string" ? opt.label : undefined}
            title={opt.hint}
            onClick={() => onChange(active ? null : opt.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border font-mono font-semibold uppercase tracking-[0.16em] transition",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              sizes,
              active
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {opt.label}
            {typeof opt.count === "number" && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums",
                  active ? "bg-background/25 text-primary-foreground" : "bg-background text-muted-foreground",
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
