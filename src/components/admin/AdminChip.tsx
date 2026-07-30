/**
 * AdminChip — chip único do console `/admin` com pares de cor validados
 * para WCAG AA. Nunca use cores hard-coded (`bg-blue-500`) nos hubs;
 * prefira este componente para garantir contraste, foco e legibilidade
 * consistentes em claro/escuro.
 *
 * Os tones "people/catalog/commerce/system" espelham os tokens
 * `--pc-tone-*` definidos em `src/styles.css` e cobertos pelo teste
 * `src/styles/__tests__/tone-contrast.test.ts`.
 */

import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const chipVariants = cva(
  "inline-flex items-center gap-1 rounded-full border font-medium leading-none whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background data-[state=loading]:opacity-70 aria-disabled:cursor-not-allowed aria-disabled:opacity-60",
  {
    variants: {
      tone: {
        neutral:
          "border-border bg-secondary text-secondary-foreground hover:bg-secondary/85",
        people:
          "border-[color:var(--pc-tone-people)]/35 bg-[color:var(--pc-tone-people-soft)] text-[color:var(--pc-tone-people-ink)] hover:bg-[color:var(--pc-tone-people-soft)]/80",
        catalog:
          "border-[color:var(--pc-tone-catalog)]/35 bg-[color:var(--pc-tone-catalog-soft)] text-[color:var(--pc-tone-catalog-ink)] hover:bg-[color:var(--pc-tone-catalog-soft)]/80",
        commerce:
          "border-[color:var(--pc-tone-commerce)]/40 bg-[color:var(--pc-tone-commerce-soft)] text-[color:var(--pc-tone-commerce-ink)] hover:bg-[color:var(--pc-tone-commerce-soft)]/80",
        system:
          "border-[color:var(--pc-tone-system)]/35 bg-[color:var(--pc-tone-system-soft)] text-[color:var(--pc-tone-system-ink)] hover:bg-[color:var(--pc-tone-system-soft)]/80",
        overview:
          "border-[color:var(--pc-tone-overview)]/35 bg-[color:var(--pc-tone-overview-soft)] text-[color:var(--pc-tone-overview-ink)] hover:bg-[color:var(--pc-tone-overview-soft)]/80",
        success:
          "border-emerald-500/35 bg-emerald-500/12 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/18",
        warning:
          "border-amber-500/40 bg-amber-500/14 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20",
        danger:
          "border-destructive/35 bg-destructive/12 text-destructive hover:bg-destructive/18",
      },
      size: {
        sm: "px-2 py-0.5 text-[12.5px]",
        md: "px-2.5 py-1 text-xs",
        lg: "px-3 py-1.5 text-sm",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  },
);

export interface AdminChipProps
  extends Omit<ComponentPropsWithoutRef<"span">, "aria-disabled">,
    VariantProps<typeof chipVariants> {
  /** Marca visualmente o chip como carregando (mantém dimensões, reduz opacidade). */
  loading?: boolean;
  /** Marca visualmente como desabilitado e adiciona aria-disabled. */
  disabled?: boolean;
}

export const AdminChip = forwardRef<HTMLSpanElement, AdminChipProps>(
  function AdminChip({ className, tone, size, loading, disabled, ...rest }, ref) {
    return (
      <span
        ref={ref}
        data-chip="admin"
        data-tone={tone ?? "neutral"}
        data-state={loading ? "loading" : "idle"}
        aria-disabled={disabled || undefined}
        aria-busy={loading || undefined}
        className={cn(chipVariants({ tone, size }), className)}
        {...rest}
      />
    );
  },
);
