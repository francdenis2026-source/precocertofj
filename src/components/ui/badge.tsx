import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-[background-color,color,border-color,box-shadow,transform,filter] duration-[var(--dur-base,150ms)] focus-visible:outline-none [role=button]:cursor-pointer [&[role=button]:hover]:-translate-y-[1px] [&[role=button]:active]:translate-y-0 [&[role=button]:active]:brightness-[0.95] [&>svg]:size-3 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-sm hover:bg-[color-mix(in_oklab,var(--primary)_85%,black_15%)] active:bg-[color-mix(in_oklab,var(--primary)_75%,black_25%)]",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklab,var(--secondary)_80%,var(--foreground)_12%)] active:bg-[color-mix(in_oklab,var(--secondary)_70%,var(--foreground)_20%)]",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-sm hover:bg-[color-mix(in_oklab,var(--destructive)_85%,black_15%)] active:bg-[color-mix(in_oklab,var(--destructive)_75%,black_25%)]",
        success:
          "border-emerald-500/30 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/25 hover:border-emerald-500/50 active:bg-emerald-500/35",
        warning:
          "border-amber-500/30 bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/25 hover:border-amber-500/50 active:bg-amber-500/35",
        info:
          "border-primary/25 bg-primary/15 text-primary hover:bg-primary/25 hover:border-primary/45 active:bg-primary/35 dark:text-foreground dark:border-foreground/25 dark:bg-foreground/12 dark:hover:bg-foreground/20",
        outline:
          "border-border text-foreground hover:bg-accent hover:text-accent-foreground hover:border-primary/45 active:bg-accent/85",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
