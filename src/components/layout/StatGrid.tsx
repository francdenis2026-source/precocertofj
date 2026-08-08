import { motion } from "framer-motion";
import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type Stat = {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  hint?: React.ReactNode;
  delta?: { value: string; direction?: "up" | "down" | "flat" };
  tone?: "default" | "primary" | "success" | "warning" | "danger";
};

export function StatGrid({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <div className={cn("grid gap-4 grid-cols-2 lg:grid-cols-4", className)}>
      {stats.map((s, i) => {
        const Icon = s.icon;
        const Trend = s.delta?.direction === "down" ? TrendingDown : TrendingUp;
        
        return (
          <div
            key={i}
            className={cn(
              "pc-stat-card transition-transform hover:-translate-y-1",
              s.tone === "primary" && "border-[var(--brand-primary)]/20 bg-[var(--bg-surface)] shadow-[var(--shadow-md)]",
              s.tone === "success" && "border-[var(--success)]/20 bg-[var(--bg-surface)] shadow-[var(--shadow-md)]",
              s.tone === "danger" && "border-[var(--danger)]/20 bg-[var(--bg-surface)] shadow-[var(--shadow-md)]"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                {s.label}
              </span>
              {Icon && <Icon className="h-4 w-4 text-[var(--text-tertiary)]" />}
            </div>
            
            <div className="mt-2 text-2xl md:text-3xl font-black tracking-tight text-[var(--text-primary)]">
              {s.value}
            </div>

            {(s.delta || s.hint) && (
              <div className="mt-2 flex items-center gap-2 text-[12px]">
                {s.delta && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold uppercase tracking-wider text-[10px]",
                      s.delta.direction === "down" ? "bg-[var(--danger)]/10 text-[var(--danger)]" : 
                      s.delta.direction === "flat" ? "bg-muted text-[var(--text-tertiary)]" : 
                      "bg-[var(--success)]/10 text-[var(--success)]"
                    )}
                  >
                    <Trend className="h-3 w-3" />
                    {s.delta.value}
                  </span>
                )}
                {s.hint && <span className="text-[var(--text-tertiary)] font-medium">{s.hint}</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}