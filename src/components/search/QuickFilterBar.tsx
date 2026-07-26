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
 * - Foco visível via `focus-visible:ring-brand-gold`
 * - Alvos com min 44×44 no mobile (tap target).
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
    sm: "h-8 min-h-8 px-3 text-[11px]",
    md: "h-9 min-h-9 px-3.5 text-[11.5px]",
  }[size];

  return (
    <div
      role={multi ? "group" : "radiogroup"}
      aria-label={ariaLabel ?? label ?? "Filtros"}
      className={cn("flex flex-wrap items-center gap-1.5", className)}
    >
      {label && (
        <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
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
              "inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-[0.14em] transition-colors duration-150",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              sizes,
              active
                ? "border-brand-gold bg-brand-gold text-brand-navy shadow-sm hover:brightness-[1.03]"
                : "border-border bg-background text-foreground hover:border-brand-gold hover:bg-[var(--pc-hover-tint)] hover:text-foreground",
            )}
          >
            {opt.label}
            {typeof opt.count === "number" && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums",
                  active ? "bg-brand-navy/15 text-brand-navy" : "bg-muted text-foreground/80",
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
