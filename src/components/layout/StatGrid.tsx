import { ReactNode } from "react";
import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type Stat = {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  hint?: ReactNode;
  delta?: { value: string; direction?: "up" | "down" | "flat" };
  tone?: "default" | "primary" | "success" | "warning" | "danger";
};

const toneMap: Record<NonNullable<Stat["tone"]>, string> = {
  default: "border-border/60 bg-card",
  primary: "border-primary/25 bg-primary/5",
  success: "border-emerald-500/25 bg-emerald-500/5",
  warning: "border-amber-500/25 bg-amber-500/5",
  danger: "border-destructive/25 bg-destructive/5",
};

export function StatGrid({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <div
      className={cn(
        "grid gap-3 sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {stats.map((s, i) => {
        const Icon = s.icon;
        const Trend = s.delta?.direction === "down" ? TrendingDown : TrendingUp;
        return (
          <div
            key={i}
            className={cn(
              "rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md",
              toneMap[s.tone ?? "default"],
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
                {s.label}
              </span>
              {Icon && <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />}
            </div>
            <div className="mt-2 text-[clamp(1.4rem,2vw,1.75rem)] font-semibold leading-tight text-foreground">
              {s.value}
            </div>
            {(s.delta || s.hint) && (
              <div className="mt-1.5 flex items-center gap-2 text-[12.5px] text-muted-foreground">
                {s.delta && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11.5px] font-medium",
                      s.delta.direction === "down"
                        ? "bg-destructive/10 text-destructive"
                        : s.delta.direction === "flat"
                        ? "bg-muted text-muted-foreground"
                        : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                    )}
                  >
                    <Trend className="h-3 w-3" />
                    {s.delta.value}
                  </span>
                )}
                {s.hint}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
