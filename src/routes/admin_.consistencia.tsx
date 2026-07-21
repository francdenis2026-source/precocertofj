import { createFileRoute, Link } from "@tanstack/react-router";
import { adminBeforeLoad } from "@/lib/route-guards";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/brand/AppShell";
import { AdminOnly } from "@/components/auth/AdminOnly";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { checkProductCountConsistency } from "@/lib/consistency-check.functions";

export const Route = createFileRoute("/admin_/consistencia")({
  ssr: false,
  beforeLoad: adminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Consistência de contagens — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AdminOnly>
      <ConsistencyPage />
    </AdminOnly>
  ),
});

function ConsistencyPage() {
  const fetchReport = useServerFn(checkProductCountConsistency);
  const q = useQuery({
    queryKey: ["admin", "consistency"],
    queryFn: () => fetchReport(),
    refetchInterval: 60_000, // polling a cada 60s
    staleTime: 30_000,
  });

  const report = q.data;
  const worst = report?.worstDeltaPct ?? 0;
  const overall: "ok" | "warn" | "critical" =
    worst >= 10 ? "critical" : worst >= 2 ? "warn" : "ok";

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Admin
            </Link>
          </Button>
          <Button size="sm" onClick={() => q.refetch()} disabled={q.isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${q.isFetching ? "animate-spin" : ""}`} />
            Verificar agora
          </Button>
        </div>

        <div>
          <h1 className="text-2xl font-bold">Consistência de contagens</h1>
          <p className="text-sm text-muted-foreground">
            Compara as fontes que alimentam Home, Comparador e cache. Alerta quando divergirem
            além de 2% (aviso) ou 10% (crítico). Verificações registradas nos logs do servidor.
          </p>
        </div>

        {q.isLoading ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Verificando…</CardContent></Card>
        ) : q.isError ? (
          <Card><CardContent className="p-8 text-center text-destructive">Erro ao carregar relatório</CardContent></Card>
        ) : report ? (
          <>
            <Card
              className={
                overall === "critical"
                  ? "border-destructive"
                  : overall === "warn"
                  ? "border-amber-500"
                  : "border-emerald-500"
              }
            >
              <CardHeader className="flex flex-row items-center gap-3">
                {overall === "ok" ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                ) : (
                  <AlertTriangle
                    className={`h-6 w-6 ${overall === "critical" ? "text-destructive" : "text-amber-500"}`}
                  />
                )}
                <div>
                  <CardTitle>
                    {overall === "ok"
                      ? "Tudo consistente"
                      : overall === "warn"
                      ? "Divergência leve detectada"
                      : "Divergência crítica"}
                  </CardTitle>
                  <CardDescription>
                    Pior delta: {report.worstDeltaPct.toFixed(2)}% · Verificado em{" "}
                    {new Date(report.checkedAt).toLocaleString()}
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Métricas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.metrics.map((m) => (
                  <div
                    key={m.key}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div>
                      <div className="font-medium">{m.label}</div>
                      <div className="text-xs text-muted-foreground">{m.source}</div>
                    </div>
                    <div className="text-xl font-bold tabular-nums">{m.value.toLocaleString()}</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Comparações</CardTitle>
                <CardDescription>Cada par de métricas é comparado com Δ absoluto e percentual.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.alerts.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                  >
                    <span>{a.message}</span>
                    <Badge
                      variant={
                        a.level === "critical"
                          ? "destructive"
                          : a.level === "warn"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {a.level === "ok" ? "OK" : a.level === "warn" ? "AVISO" : "CRÍTICO"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
