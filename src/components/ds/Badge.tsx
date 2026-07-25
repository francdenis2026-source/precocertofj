import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full font-medium leading-none whitespace-nowrap transition-colors",
  {
    variants: {
      variant: {
        default: "bg-secondary text-secondary-foreground",
        primary: "bg-primary/10 text-[color:var(--badge-primary-fg)] ring-1 ring-inset ring-primary/25",
        savings: "bg-savings text-savings-foreground shadow-elev-1",
        savingsSoft: "bg-savings/10 text-savings ring-1 ring-inset ring-savings/25",
        warning: "bg-warning/15 text-[color:var(--badge-warning-fg)] ring-1 ring-inset ring-warning/30",
        destructive: "bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/25",
        outline: "border border-border bg-background text-foreground",
        muted: "bg-muted text-muted-foreground",
      },
      size: {
        sm: "px-2 py-0.5 text-[11px]",
        md: "px-2.5 py-1 text-xs",
        lg: "px-3 py-1.5 text-sm",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export interface BadgeProps
  extends ComponentPropsWithoutRef<"span">,
    VariantProps<typeof badgeVariants> {}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, variant, size, ...rest },
  ref,
) {
  return <span ref={ref} className={cn(badgeVariants({ variant, size }), className)} {...rest} />;
});

/** Helper de formatação BRL — usa Intl com tabular fallback. */
export function formatBRL(value: number): string {
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    return `R$ ${value.toFixed(2).replace(".", ",")}`;
  }
}
