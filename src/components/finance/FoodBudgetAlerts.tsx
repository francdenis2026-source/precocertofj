import { useMemo } from "react";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FinanceCategory, MonthlySummary } from "@/lib/finance.functions";
import { FOOD_SLUGS } from "@/lib/food-report";

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function FoodBudgetAlerts({
  cats,
  summary,
}: {
  cats: FinanceCategory[];
  summary: MonthlySummary | undefined;
}) {
  const rows = useMemo(() => {
    const foodCats = cats.filter(
      (c) => c.slug && (FOOD_SLUGS as readonly string[]).includes(c.slug) && (c.monthlyBudget ?? 0) > 0
    );
    return foodCats
      .map((c) => {
        const spent = summary?.byCategory.find((s) => s.categoryId === c.id)?.total ?? 0;
        const budget = c.monthlyBudget ?? 0;
        const pct = budget > 0 ? (spent / budget) * 100 : 0;
        const level: "ok" | "warn" | "over" =
          pct >= 100 ? "over" : pct >= (c.alertThreshold ?? 80) ? "warn" : "ok";
        return { c, spent, budget, pct, level };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [cats, summary]);

  const alerts = rows.filter((r) => r.level !== "ok");
  if (alerts.length === 0) return null;

  const over = alerts.filter((r) => r.level === "over");

  return (
    <div
      role="region"
      aria-label="Alertas de orçamento de alimentação"
      className={cn(
        "relative overflow-hidden rounded-2xl border p-4 md:p-5",
        over.length > 0
          ? "border-destructive/40 bg-destructive/5"
          : "border-amber-500/40 bg-amber-500/5"
      )}
    >
      <svg
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -right-6 -top-6 h-32 w-32 opacity-[0.10]",
          over.length > 0 ? "text-destructive" : "text-amber-600"
        )}
        viewBox="0 0 100 100"
        fill="none"
      >
        <path d="M50 8 L92 82 L8 82 Z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M50 34 L50 60" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <circle cx="50" cy="72" r="3" fill="currentColor" />
      </svg>

      <div className="mb-3 flex items-center gap-2">
        <div
          className={cn(
            "grid h-9 w-9 place-items-center rounded-xl ring-1",
            over.length > 0
              ? "bg-destructive/15 text-destructive ring-destructive/30"
              : "bg-amber-500/15 text-amber-700 ring-amber-500/30 dark:text-amber-300"
          )}
        >
          {over.length > 0 ? <AlertTriangle className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Orçamento de alimentação
          </p>
          <h3 className="font-display text-sm font-semibold md:text-base">
            {over.length > 0
              ? `${over.length} categoria${over.length > 1 ? "s" : ""} acima da meta`
              : `${alerts.length} categoria${alerts.length > 1 ? "s" : ""} próxima${alerts.length > 1 ? "s" : ""} do limite`}
          </h3>
        </div>
      </div>

      <ul className="space-y-2.5">
        {alerts.map(({ c, spent, budget, pct, level }) => {
          const over100 = level === "over";
          return (
            <li key={c.id} className="rounded-xl border bg-card/70 p-3">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span
                    aria-hidden="true"
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: c.color ?? "#2E7D6B" }}
                  />
                  {c.name}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "px-1.5 py-0 text-[10px] font-bold uppercase tracking-wider tabular-nums",
                    over100
                      ? "border-destructive/50 bg-destructive/10 text-destructive"
                      : "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  )}
                >
                  {pct.toFixed(0)}% usado
                </Badge>
              </div>
              <Progress
                value={Math.min(100, pct)}
                className={cn(
                  "h-2",
                  over100 && "[&>*]:bg-destructive",
                  !over100 && "[&>*]:bg-amber-500"
                )}
              />
              <p className="mt-1.5 flex items-center justify-between text-xs tabular-nums">
                <span className="text-muted-foreground">
                  {BRL(spent)} de {BRL(budget)}
                </span>
                <span
                  className={cn(
                    "font-semibold",
                    over100 ? "text-destructive" : "text-amber-700 dark:text-amber-300"
                  )}
                >
                  {over100 ? `+${BRL(spent - budget)}` : `restam ${BRL(Math.max(0, budget - spent))}`}
                </span>
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
