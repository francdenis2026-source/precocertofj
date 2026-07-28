import { createFileRoute, Navigate } from "@tanstack/react-router";
import { adminBeforeLoad } from "@/lib/route-guards";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { BarChart3, TrendingUp, Users, MousePointerClick, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/brand/AppShell";
import { PageHeader } from "@/components/brand/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AdminOnly } from "@/components/auth/AdminOnly";
import {
  getVisitorDailyMetrics,
  getUnlockRateByRoute,
} from "@/lib/analytics.functions";

export const Route = createFileRoute("/admin_/analytics")({
  ssr: false,
  beforeLoad: adminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Analytics de visitantes — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <Navigate to="/admin/metricas" search={{ tab: "analytics" } as never} replace />,
});

type DailyRow = {
  day: string;
  visitors: number;
  users: number;
  total_events: number;
};

type RouteRow = {
  route: string;
  views: number;
  unlock_clicks: number;
  conversions: number;
};

export function AnalyticsPage() {
  const [days, setDays] = useState(14);
  const dailyFn = useServerFn(getVisitorDailyMetrics);
  const routeFn = useServerFn(getUnlockRateByRoute);

  const dailyQ = useQuery({
    queryKey: ["admin", "analytics", "daily", days],
    queryFn: () => dailyFn({ data: { days } }),
    staleTime: 60_000,
  });

  const routeQ = useQuery({
    queryKey: ["admin", "analytics", "routes", days],
    queryFn: () => routeFn({ data: { days } }),
    staleTime: 60_000,
  });

  const daily = (dailyQ.data ?? []) as DailyRow[];
  const routes = (routeQ.data ?? []) as RouteRow[];

  const totals = useMemo(() => {
    return daily.reduce(
      (acc, r) => {
        acc.visitors += Number(r.visitors ?? 0);
        acc.users += Number(r.users ?? 0);
        acc.events += Number(r.total_events ?? 0);
        return acc;
      },
      { visitors: 0, users: 0, events: 0 },
    );
  }, [daily]);

  const maxDaily = useMemo(() => {
    let m = 1;
    for (const r of daily) {
      m = Math.max(m, Number(r.visitors ?? 0) + Number(r.users ?? 0));
    }
    return m;
  }, [daily]);

  const globalCtr =
    routes.reduce((a, r) => a + Number(r.views ?? 0), 0) > 0
      ? routes.reduce((a, r) => a + Number(r.unlock_clicks ?? 0), 0) /
        routes.reduce((a, r) => a + Number(r.views ?? 0), 0)
      : 0;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Painel · Analytics"
        title="Analytics de visitantes"
        description={`Visitantes vs cadastrados e taxa de clique em "desbloquear" — últimos ${days} dias.`}
        breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Analytics" }]}
        icon={<BarChart3 className="h-5 w-5" />}
        goldRule
        actions={
          <>
            {[7, 14, 30, 90].map((d) => (
              <Button
                key={d}
                variant={days === d ? "executive" : "outline"}
                size="sm"
                onClick={() => setDays(d)}
              >
                {d}d
              </Button>
            ))}
            <Button
              variant="ghost-navy"
              size="icon"
              onClick={() => {
                dailyQ.refetch();
                routeQ.refetch();
              }}
              aria-label="Recarregar"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </>
        }
      />
      <div className="mx-auto w-full max-w-[1400px] px-4 pb-6 sm:px-6">
        {/* KPIs — linha compacta */}
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            icon={<Users className="h-4 w-4" />}
            label="Visitantes únicos (sessões)"
            value={totals.visitors}
          />
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Usuários cadastrados ativos"
            value={totals.users}
          />
          <StatCard
            icon={<MousePointerClick className="h-4 w-4" />}
            label="CTR global desbloquear"
            value={`${(globalCtr * 100).toFixed(1)}%`}
          />
        </div>

        {/* Dois painéis lado a lado — cabem em uma viewport */}
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <BarChart3 className="h-4 w-4 text-primary" /> Volume diário
              </CardTitle>
              <CardDescription className="text-xs">
                Azul = anônimos · Verde = cadastrados.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pt-0">
              {dailyQ.isLoading ? (
                <p className="text-sm text-muted-foreground">Carregando…</p>
              ) : daily.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sem eventos no intervalo.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {daily.map((r) => {
                    const v = Number(r.visitors ?? 0);
                    const u = Number(r.users ?? 0);
                    const vw = Math.round((v / maxDaily) * 100);
                    const uw = Math.round((u / maxDaily) * 100);
                    return (
                      <div
                        key={r.day}
                        className="grid grid-cols-[54px_minmax(0,1fr)_72px] items-center gap-2 text-xs"
                      >
                        <span className="tabular-nums text-muted-foreground">
                          {new Date(r.day).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </span>
                        <div className="relative h-4 rounded bg-muted/60">
                          <div
                            className="absolute inset-y-0 left-0 rounded-l bg-blue-500/70"
                            style={{ width: `${vw}%` }}
                            title={`Visitantes: ${v}`}
                          />
                          <div
                            className="absolute inset-y-0 rounded-r bg-emerald-500/70"
                            style={{ left: `${vw}%`, width: `${uw}%` }}
                            title={`Usuários: ${u}`}
                          />
                        </div>
                        <span className="text-right tabular-nums text-muted-foreground">
                          {v} · {u}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                Taxa de clique em desbloquear por rota
              </CardTitle>
              <CardDescription className="text-xs">
                Views · Clicks · CTR · Conversões após login.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-8">Rota</TableHead>
                    <TableHead className="h-8 text-right">Views</TableHead>
                    <TableHead className="h-8 text-right">Clicks</TableHead>
                    <TableHead className="h-8 text-right">CTR</TableHead>
                    <TableHead className="h-8 text-right">Conv.</TableHead>
                    <TableHead className="h-8 text-right">Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routes.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground"
                      >
                        Sem dados no período.
                      </TableCell>
                    </TableRow>
                  ) : (
                    routes.map((r) => {
                      const views = Number(r.views ?? 0);
                      const clicks = Number(r.unlock_clicks ?? 0);
                      const conv = Number(r.conversions ?? 0);
                      const ctr = views > 0 ? (clicks / views) * 100 : 0;
                      const cr = clicks > 0 ? (conv / clicks) * 100 : 0;
                      return (
                        <TableRow key={r.route}>
                          <TableCell className="py-1.5 font-mono text-[11px]">
                            {r.route}
                          </TableCell>
                          <TableCell className="py-1.5 text-right tabular-nums text-xs">
                            {views}
                          </TableCell>
                          <TableCell className="py-1.5 text-right tabular-nums text-xs">
                            {clicks}
                          </TableCell>
                          <TableCell className="py-1.5 text-right tabular-nums">
                            <Badge
                              variant={ctr >= 5 ? "default" : "secondary"}
                              className="px-1.5 py-0 text-[10px]"
                            >
                              {ctr.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="py-1.5 text-right tabular-nums text-xs">
                            {conv}
                          </TableCell>
                          <TableCell className="py-1.5 text-right tabular-nums">
                            <Badge
                              variant={cr >= 20 ? "default" : "outline"}
                              className="px-1.5 py-0 text-[10px]"
                            >
                              {cr.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-3">
        <div className="rounded-full bg-primary/10 p-2 text-primary">{icon}</div>
        <div className="min-w-0">
          <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="text-lg font-semibold tabular-nums">
            {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
