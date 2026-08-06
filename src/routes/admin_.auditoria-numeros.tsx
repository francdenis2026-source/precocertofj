import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { adminBeforeLoad } from "@/lib/route-guards";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, AlertTriangle, CheckCircle2, RefreshCw, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/brand/AppShell";
import { AdminOnly } from "@/components/auth/AdminOnly";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getNumberAudit, type AuditMetric } from "@/lib/number-audit.functions";

export const Route = createFileRoute("/admin_/auditoria-numeros")({
  ssr: false,
  beforeLoad: adminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Auditoria de números — Admin" },
      {
        name: "description",
        content: "De onde vem cada número exibido no site: tabela, escopo e cross-check.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <Navigate to="/admin/auditoria" search={{ tab: "numeros" } as never} replace />,
});

const statusTone: Record<AuditMetric["status"], string> = {
  ok: "border-emerald-500/40",
  warn: "border-amber-500/60",
  critical: "border-destructive",
};

function StatusBadge({ status }: { status: AuditMetric["status"] }) {
  if (status === "ok") return <Badge variant="secondary">OK</Badge>;
  if (status === "warn") return <Badge className="bg-amber-500 text-black">Atenção</Badge>;
  return <Badge variant="destructive">Crítico</Badge>;
}

function SourceBlock({
  title,
  label,
  value,
  origin,
  scope,
}: {
  title: string;
  label: string;
  value: number;
  origin: string;
  scope: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="text-[12.5px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value.toLocaleString("pt-BR")}</div>
      <div className="mt-1 text-xs font-medium">{label}</div>
      <div className="mt-2 space-y-0.5 text-[12.5px] text-muted-foreground">
        <div>
          <span className="font-semibold">Origem:</span> <code className="font-mono">{origin}</code>
        </div>
        <div>
          <span className="font-semibold">Escopo:</span> <code className="font-mono">{scope}</code>
        </div>
      </div>
    </div>
  );
}

export function NumberAuditPage() {
  const fetchAudit = useServerFn(getNumberAudit);
  const q = useQuery({
    queryKey: ["admin", "number-audit"],
    queryFn: () => fetchAudit(),
    staleTime: 30_000,
  });

  const report = q.data;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Admin
            </Link>
          </Button>
          <Button size="sm" onClick={() => q.refetch()} disabled={q.isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${q.isFetching ? "animate-spin" : ""}`} />
            Reauditar
          </Button>
        </div>

        <div>
          <h1 className="text-2xl font-bold">Auditoria de números</h1>
          <p className="text-sm text-muted-foreground">
            Cada número público do site com sua tabela de origem, o escopo (filtros) e um
            cross-check independente. Divergência acima de 2% vira aviso; acima de 10%, crítico.
          </p>
        </div>

        {q.isLoading ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">Auditando…</CardContent>
          </Card>
        ) : q.isError ? (
          <Card>
            <CardContent className="p-8 text-center text-destructive">
              Erro ao executar a auditoria.
            </CardContent>
          </Card>
        ) : report ? (
          <>
            <Card className={statusTone[report.status]}>
              <CardHeader className="flex flex-row items-center gap-3">
                {report.status === "ok" ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                ) : (
                  <AlertTriangle
                    className={`h-6 w-6 ${report.status === "critical" ? "text-destructive" : "text-amber-500"}`}
                  />
                )}
                <div>
                  <CardTitle>
                    {report.status === "ok"
                      ? "Todos os números batem"
                      : report.status === "warn"
                        ? "Divergência leve detectada"
                        : "Divergência crítica detectada"}
                  </CardTitle>
                  <CardDescription>
                    Pior delta: {report.worstDeltaPct.toFixed(2)}% · {report.metrics.length} métricas
                    auditadas em {report.durationMs} ms ·{" "}
                    {new Date(report.checkedAt).toLocaleString("pt-BR")}
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>

            <div className="space-y-4">
              {report.metrics.map((m) => (
                <Card key={m.key} className={statusTone[m.status]}>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">{m.label}</CardTitle>
                        <CardDescription>Aparece em: {m.surface}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {m.crossCheck ? (
                          <span className="text-xs tabular-nums text-muted-foreground">
                            Δ {m.delta.toLocaleString("pt-BR")} ({m.deltaPct.toFixed(2)}%)
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">sem cross-check</span>
                        )}
                        <StatusBadge status={m.status} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <SourceBlock
                        title="Fonte primária"
                        label={m.primary.label}
                        value={m.primary.value}
                        origin={m.primary.origin}
                        scope={m.primary.scope}
                      />
                      {m.crossCheck ? (
                        <SourceBlock
                          title="Cross-check"
                          label={m.crossCheck.label}
                          value={m.crossCheck.value}
                          origin={m.crossCheck.origin}
                          scope={m.crossCheck.scope}
                        />
                      ) : null}
                    </div>
                    {m.note ? (
                      <p className="text-xs text-muted-foreground">{m.note}</p>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Próximos passos</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/metricas" search={{ tab: "numeros" } as any}>
                    Métricas &amp; reconstruir cache
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/consistencia" search={{ tab: "numeros" } as any}>
                    Consistência de contagens
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
