import { type ComponentProps, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconTile } from "@/components/ui/icon-tile";

export interface StatCardProps extends ComponentProps<"div"> {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  /** Ícone Lucide — renderizado dentro de um IconTile primary size sm. */
  icon?: LucideIcon;
  /** Tom do IconTile (default: primary). */
  iconTone?: "surface" | "primary" | "accent";
  trend?: {
    value: string;
    direction?: "up" | "down" | "neutral";
  };
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  iconTone = "primary",
  trend,
  className,
  ...rest
}: StatCardProps) {
  // Solid badges guarantee WCAG AA in both light and dark modes because we
  // pair each accent color with its own *-foreground token.
  const trendBadge =
    trend?.direction === "up"
      ? "bg-savings text-savings-foreground"
      : trend?.direction === "down"
        ? "bg-warning text-warning-foreground"
        : "bg-muted text-foreground";

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-2 rounded-[var(--radius-xl)] border border-border bg-card p-4",
        "shadow-[0_10px_30px_-20px_color-mix(in_oklab,var(--color-primary)_50%,transparent)]",
        "transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-[0_16px_40px_-20px_color-mix(in_oklab,var(--color-primary)_65%,transparent)]",
        className,
      )}
      {...rest}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--color-primary) 40%, var(--color-savings) 60%, transparent)",
        }}
      />
      <div className="flex items-start justify-between gap-2">
        <span className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
        {icon ? (
          <IconTile icon={icon} tone={iconTone} size="sm" density="compact" interactive />
        ) : null}
      </div>

      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-display text-[26px] font-bold leading-none tracking-tight text-foreground md:text-[28px]">
          {value}
        </span>
        {trend ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[12.5px] font-semibold leading-none",
              trendBadge,
            )}
          >
            {trend.value}
          </span>
        ) : null}
      </div>

      {hint ? (
        <p className="text-[12.5px] leading-snug text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export default StatCard;
