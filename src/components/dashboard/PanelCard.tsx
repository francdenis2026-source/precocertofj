import { type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PanelCardProps extends Omit<ComponentProps<"section">, "title"> {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  eyebrow?: ReactNode;
  padded?: boolean;
}

export function PanelCard({
  title,
  description,
  actions,
  footer,
  eyebrow,
  padded = true,
  className,
  children,
  ...rest
}: PanelCardProps) {
  return (
    <section
      className={cn(
        "flex flex-col rounded-xl border border-border/60 bg-card",
        "shadow-[0_10px_28px_-22px_color-mix(in_oklab,var(--color-primary)_55%,transparent)]",
        "transition-colors hover:border-primary/40",
        className,
      )}
      {...rest}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 px-4 py-3 md:px-5 md:py-3.5">
        <div className="flex flex-col gap-0.5">
          {eyebrow ? (
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              {eyebrow}
            </span>
          ) : null}
          <h3 className="font-display text-[15px] font-bold leading-tight text-foreground md:text-base">
            {title}
          </h3>
          {description ? (
            <p className="text-[12.5px] leading-snug text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </header>

      <div className={cn("flex-1", padded && "px-4 py-3.5 md:px-5 md:py-4")}>{children}</div>

      {footer ? (
        <footer className="border-t border-border/50 px-4 py-2.5 text-[12.5px] text-muted-foreground md:px-5">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}

export default PanelCard;
