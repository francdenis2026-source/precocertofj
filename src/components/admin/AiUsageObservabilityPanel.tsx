import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  getAiUsageOverview,
  type AiUsageOverview,
} from "@/lib/ai-observability.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PriceCents } from "@/components/ds/PriceCents";
import { Activity, AlertTriangle, Clock, Coins, Loader2, Users } from "lucide-react";

const RANGES = [
  { label: "24h", hours: 24 },
  { label: "7d", hours: 24 * 7 },
  { label: "30d", hours: 24 * 30 },
] as const;

function formatMs(ms: number) {
  const value = Number(ms || 0);
  return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`;
}


function failureRate(calls: number, failures: number) {
  if (!calls) return 0;
  return (failures / calls) * 100;
}

/**
 * Observabilidade de uso da IA: custo estimado, chamadas por usuário,
 * taxa de falhas e tempo de execução — para detectar abuso e calibrar limites.
 */
export function AiUsageObservabilityPanel() {
  const fetchOverview = useServerFn(getAiUsageOverview);
  const [hours, setHours] = useState<number>(24);

  const { data, isLoading, isFetching } = useQuery<AiUsageOverview>({
    queryKey: ["ai-usage-overview", hours],
    queryFn: () => fetchOverview({ data: { hours } }),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const totals = data?.totals;
  const rate = totals ? failureRate(totals.calls, totals.failures) : 0;
  const peak = useMemo(() => {
    if (!data?.series?.length) return null;
    return data.series.reduce((a, b) => (b.calls > a.calls ? b : a));
  }, [data]);

  const alerts: string[] = [];
  if (totals && rate >= 20) {
    alerts.push(`Taxa de falha alta: ${rate.toFixed(1)}% das chamadas no período.`);
  }
  if (totals && totals.p95DurationMs >= 15000) {
    alerts.push(`Latência p95 elevada (${formatMs(totals.p95DurationMs)}).`);
  }
  const heavyUser = data?.topUsers?.[0];
  if (heavyUser && totals && totals.calls > 0 && heavyUser.calls / totals.calls >= 0.5 && totals.calls >= 20) {
    alerts.push(
      `${heavyUser.email ?? "Um usuário"} concentra ${Math.round((heavyUser.calls / totals.calls) * 100)}% das chamadas — possível abuso.`,
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" /> Uso e custo da IA
          </CardTitle>
          <CardDescription>
            Custo estimado, chamadas por usuário, falhas e tempo de execução.
          </CardDescription>
        </div>
        <div className="flex shrink-0 gap-1">
          {RANGES.map((r) => (
            <Button
              key={r.hours}
              size="sm"
              variant={hours === r.hours ? "default" : "outline"}
              onClick={() => setHours(r.hours)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {data && (
          <>
            {alerts.length > 0 && (
              <ul className="space-y-1 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                {alerts.map((a) => (
                  <li key={a} className="flex items-start gap-2 text-xs text-foreground">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                    {a}
                  </li>
                ))}
              </ul>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric
                icon={<Activity className="h-4 w-4 text-primary" />}
                label="Chamadas"
                value={totals ? totals.calls.toLocaleString("pt-BR") : "0"}
                hint={peak ? `pico ${peak.calls} em ${peak.bucket.slice(11)}h` : undefined}
              />
              <Metric
                icon={<Coins className="h-4 w-4 text-primary" />}
                label="Custo estimado"
                value={formatCents(totals?.creditsCents ?? 0)}
                hint={`${(totals?.tokens ?? 0).toLocaleString("pt-BR")} tokens`}
              />
              <Metric
                icon={<AlertTriangle className="h-4 w-4 text-primary" />}
                label="Falhas"
                value={`${totals?.failures ?? 0}`}
                hint={`${rate.toFixed(1)}% do total`}
              />
              <Metric
                icon={<Clock className="h-4 w-4 text-primary" />}
                label="Tempo médio"
                value={formatMs(totals?.avgDurationMs ?? 0)}
                hint={`p95 ${formatMs(totals?.p95DurationMs ?? 0)}`}
              />
            </div>

            <Section title="Por função">
              {data.byFunction.length === 0 ? (
                <Empty />
              ) : (
                <ul className="divide-y divide-border">
                  {data.byFunction.map((f) => (
                    <li
                      key={f.functionName}
                      className="flex flex-wrap items-center gap-2 py-2 text-xs"
                    >
                      <span className="flex-1 truncate font-medium text-foreground">
                        {f.functionName}
                      </span>
                      <span className="font-mono text-muted-foreground">{f.calls} chamadas</span>
                      <span className="font-mono text-muted-foreground">
                        {formatMs(f.avgDurationMs)}
                      </span>
                      <span className="font-mono tabular-nums text-foreground">
                        {formatCents(f.creditsCents)}
                      </span>
                      {f.failures > 0 && (
                        <Badge variant="destructive">{f.failures} falha(s)</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Maiores consumidores" icon={<Users className="h-3.5 w-3.5" />}>
              {data.topUsers.length === 0 ? (
                <Empty />
              ) : (
                <ul className="divide-y divide-border">
                  {data.topUsers.map((u) => (
                    <li
                      key={u.userId ?? "anon"}
                      className="flex flex-wrap items-center gap-2 py-2 text-xs"
                    >
                      <span className="flex-1 truncate text-foreground">
                        {u.email ?? u.userId ?? "—"}
                      </span>
                      <span className="font-mono text-muted-foreground">{u.calls} chamadas</span>
                      <span className="font-mono tabular-nums text-foreground">
                        {formatCents(u.creditsCents)}
                      </span>
                      {u.failures > 0 && <Badge variant="outline">{u.failures} falha(s)</Badge>}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {data.recentFailures.length > 0 && (
              <Section title="Falhas recentes">
                <ul className="divide-y divide-border">
                  {data.recentFailures.map((f) => (
                    <li key={f.id} className="flex flex-wrap items-center gap-2 py-2 text-xs">
                      <span className="w-28 shrink-0 font-mono text-muted-foreground">
                        {new Date(f.createdAt).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="shrink-0 font-medium text-foreground">{f.functionName}</span>
                      <span className="flex-1 truncate text-muted-foreground">
                        {f.errorMessage ?? "erro desconhecido"}
                      </span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {isFetching && (
              <p className="text-right text-[11px] text-muted-foreground">atualizando…</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="mt-1 font-display text-lg font-semibold tabular-nums text-foreground">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="mb-1 flex items-center gap-1.5">
        {icon}
        <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function Empty() {
  return <p className="py-3 text-center text-xs text-muted-foreground">Sem dados no período.</p>;
}
