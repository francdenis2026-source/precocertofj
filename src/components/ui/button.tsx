import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-[background-color,color,box-shadow,transform,border-color,filter] duration-200 ease-out focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98] active:brightness-[0.96] active:shadow-inner data-[loading=true]:pointer-events-none data-[loading=true]:cursor-progress [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-200",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-elev-1 hover:bg-[color-mix(in_oklab,var(--primary)_88%,black_12%)] hover:shadow-elev-2 hover:ring-1 hover:ring-primary/40 active:bg-[color-mix(in_oklab,var(--primary)_78%,black_22%)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-elev-1 hover:bg-[color-mix(in_oklab,var(--destructive)_88%,black_12%)] hover:shadow-elev-2 hover:ring-1 hover:ring-destructive/45 active:bg-[color-mix(in_oklab,var(--destructive)_78%,black_22%)]",
        outline:
          "border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground hover:border-primary/50 hover:shadow-elev-1 active:bg-accent/80",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-[color-mix(in_oklab,var(--secondary)_82%,var(--foreground)_10%)] hover:shadow-elev-1 active:bg-[color-mix(in_oklab,var(--secondary)_72%,var(--foreground)_18%)]",
        ghost:
          "hover:bg-accent hover:text-accent-foreground hover:ring-1 hover:ring-border active:bg-accent/85",
        link:
          "text-primary underline-offset-4 hover:underline hover:text-[color-mix(in_oklab,var(--primary)_85%,var(--foreground)_15%)] hover:-translate-y-0 active:scale-100 active:text-[color-mix(in_oklab,var(--primary)_70%,var(--foreground)_30%)]",
        // ===== Navy Trust Executive — variantes oficiais =====
        executive:
          "bg-primary text-primary-foreground shadow-elev-1 hover:bg-[color-mix(in_oklab,var(--primary)_86%,black_14%)] hover:shadow-elev-2 hover:ring-1 hover:ring-primary/40 active:bg-[color-mix(in_oklab,var(--primary)_74%,black_26%)] [&:hover_svg]:translate-x-[1px]",
        gold:
          "btn-signal text-accent-foreground shadow-elev-1 hover:brightness-[1.06] hover:saturate-[1.05] hover:shadow-elev-2 hover:ring-1 hover:ring-[color-mix(in_oklab,var(--pc-home-gold,#f5b301)_60%,transparent)] active:brightness-[0.94] active:shadow-inner",
        "ghost-navy":
          "text-primary hover:bg-primary/12 hover:text-primary hover:ring-1 hover:ring-primary/25 active:bg-primary/20 dark:text-foreground dark:hover:bg-foreground/10 dark:hover:ring-foreground/20 dark:active:bg-foreground/15",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Exibe spinner, marca aria-busy e desabilita interação sem alterar layout. */
  loading?: boolean;
  /** Texto opcional para leitores de tela enquanto carrega. */
  loadingLabel?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, loadingLabel = "Carregando", disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const isBusy = loading === true;
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        data-loading={isBusy || undefined}
        aria-busy={isBusy || undefined}
        disabled={!asChild ? (disabled || isBusy) : undefined}
        {...props}
      >
        {isBusy ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />
            <span>{typeof children === "string" ? children : loadingLabel}</span>
            <span className="sr-only">{loadingLabel}</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
