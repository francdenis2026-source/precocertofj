import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FinanceCategory, FinanceTransaction } from "@/lib/finance.functions";
import { FOOD_SLUGS, txMode } from "@/lib/food-report";

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const MODE_COLORS = {
  cesta: "#2E7D6B",
  compra: "#B08948",
  itens: "#3B6FA0",
  outro: "#94A3B8",
} as const;

const MODE_LABEL = {
  cesta: "Cesta",
  compra: "Compra",
  itens: "Itens",
  outro: "Outro",
} as const;

function sumFood(
  txs: FinanceTransaction[],
  foodIds: Set<string>
): { cesta: number; compra: number; itens: number; outro: number; total: number } {
  const acc = { cesta: 0, compra: 0, itens: 0, outro: 0, total: 0 };
  for (const t of txs) {
    if (!t.categoryId || !foodIds.has(t.categoryId)) continue;
    const m = txMode(t);
    acc[m] += t.amount;
    acc.total += t.amount;
  }
  return acc;
}

export function FoodTrendChart({
  cats,
  currentTx,
  previousTx,
  monthLabel,
  prevMonthLabel,
}: {
  cats: FinanceCategory[];
  currentTx: FinanceTransaction[];
  previousTx: FinanceTransaction[];
  monthLabel: string;
  prevMonthLabel: string;
}) {
  const foodIds = useMemo(
    () =>
      new Set(
        cats
          .filter((c) => c.slug && (FOOD_SLUGS as readonly string[]).includes(c.slug))
          .map((c) => c.id)
      ),
    [cats]
  );

  const cur = useMemo(() => sumFood(currentTx, foodIds), [currentTx, foodIds]);
  const prev = useMemo(() => sumFood(previousTx, foodIds), [previousTx, foodIds]);

  const data = (["cesta", "compra", "itens", "outro"] as const).map((m) => ({
    mode: MODE_LABEL[m],
    key: m,
    Anterior: Number(prev[m].toFixed(2)),
    Atual: Number(cur[m].toFixed(2)),
    color: MODE_COLORS[m],
  }));

  const delta = cur.total - prev.total;
  const deltaPct = prev.total > 0 ? (delta / prev.total) * 100 : 0;
  const hasData = cur.total > 0 || prev.total > 0;

  return (
    <div className="rounded-2xl border bg-card p-4 md:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tendência mensal
          </p>
          <h3 className="font-display text-base font-semibold md:text-lg">
            Alimentação por tipo de registro
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground capitalize">
            {prevMonthLabel} <span aria-hidden="true">→</span> {monthLabel}
          </p>
        </div>
        {hasData && (
          <Badge
            variant="outline"
            className={cn(
              "gap-1 px-2 py-1 text-xs font-semibold tabular-nums",
              delta > 0
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            )}
          >
            {delta > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {delta >= 0 ? "+" : ""}
            {prev.total > 0 ? `${deltaPct.toFixed(1)}%` : BRL(delta)}
          </Badge>
        )}
      </div>

      {!hasData ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Sem lançamentos de alimentação nos últimos dois meses.
        </p>
      ) : (
        <>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="mode" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
                />
                <ReferenceLine y={0} stroke="hsl(var(--border))" />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: any) => BRL(Number(v)) as any}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                <Bar dataKey="Anterior" fill="hsl(var(--muted-foreground) / 0.5)" radius={[6, 6, 0, 0]} maxBarSize={38} />
                <Bar dataKey="Atual" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={38} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
            {data.map((d) => {
              const dDelta = d.Atual - d.Anterior;
              return (
                <div key={d.key} className="rounded-lg border bg-muted/30 p-2">
                  <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: d.color }} aria-hidden="true" />
                    {d.mode}
                  </dt>
                  <dd className="mt-0.5 font-display text-sm font-semibold tabular-nums">{BRL(d.Atual)}</dd>
                  {d.Anterior > 0 && (
                    <dd
                      className={cn(
                        "text-[11px] font-semibold tabular-nums",
                        dDelta > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {dDelta >= 0 ? "+" : ""}
                      {BRL(dDelta)}
                    </dd>
                  )}
                </div>
              );
            })}
          </dl>
        </>
      )}
    </div>
  );
}
