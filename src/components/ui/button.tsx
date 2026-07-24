import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-[background-color,color,box-shadow,transform,border-color,filter] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-200",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-elev-1 hover:bg-[color-mix(in_oklab,var(--primary)_88%,black_12%)] hover:shadow-elev-2 hover:ring-1 hover:ring-primary/40",
        destructive:
          "bg-destructive text-destructive-foreground shadow-elev-1 hover:bg-[color-mix(in_oklab,var(--destructive)_88%,black_12%)] hover:shadow-elev-2 hover:ring-1 hover:ring-destructive/45",
        outline:
          "border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground hover:border-primary/50 hover:shadow-elev-1",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-[color-mix(in_oklab,var(--secondary)_82%,var(--foreground)_10%)] hover:shadow-elev-1",
        ghost:
          "hover:bg-accent hover:text-accent-foreground hover:ring-1 hover:ring-border",
        link:
          "text-primary underline-offset-4 hover:underline hover:text-[color-mix(in_oklab,var(--primary)_85%,var(--foreground)_15%)] hover:-translate-y-0 active:scale-100",
        // ===== Navy Trust Executive — variantes oficiais =====
        /** Botão principal executivo: navy sólido, texto claro, sombra sutil. */
        executive:
          "bg-primary text-primary-foreground shadow-elev-1 hover:bg-[color-mix(in_oklab,var(--primary)_86%,black_14%)] hover:shadow-elev-2 hover:ring-1 hover:ring-primary/40 [&:hover_svg]:translate-x-[1px]",
        /** Ação de destaque editorial: dourado brushed com tinta navy. */
        gold:
          "btn-signal text-accent-foreground shadow-elev-1 hover:brightness-[1.06] hover:saturate-[1.05] hover:shadow-elev-2 hover:ring-1 hover:ring-[color-mix(in_oklab,var(--pc-home-gold,#f5b301)_60%,transparent)] active:brightness-95",
        /** Ghost navy: transparente, hover navy translúcido — para toolbars/tabs. */
        "ghost-navy":
          "text-primary hover:bg-primary/12 hover:text-primary hover:ring-1 hover:ring-primary/25 dark:text-foreground dark:hover:bg-foreground/10 dark:hover:ring-foreground/20",
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
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
