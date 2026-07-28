/**
 * /admin/auditoria-acessos — Auditoria de acessos e login.
 *
 * Exibe tendências (série temporal), top IPs, motivos de falha e
 * uma tabela paginada com filtros por período, IP e motivo.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { adminBeforeLoad } from "@/lib/route-guards";
import {
  adminGetLoginStats,
  adminListLoginEvents,
} from "@/lib/admin-customers.functions";
import {
  adminBlockIp,
  adminUnblockIp,
  adminListBlockedIps,
} from "@/lib/admin-security.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { ShieldAlert, Activity, RefreshCw, TrendingUp, Ban, Shield } from "lucide-react";
import { AppShell } from "@/components/brand/AppShell";
import { ChartSkeleton, ChartEmpty } from "@/components/admin/ChartStates";

export const Route = createFileRoute("/admin_/auditoria-acessos")({
  ssr: false,
  beforeLoad: adminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Auditoria de acessos · PreçoCerto Admin" },
      {
        name: "description",
        content:
          "Tendências de login, tentativas por IP, motivos de falha e histórico completo de acessos.",
      },
    ],
  }),
  component: () => (
    <AppShell scope="admin">
      <AuditoriaAcessosPage />
    </AppShell>
  ),
});

function fmt(v: string | null | undefined) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString("pt-BR");
  } catch {
    return v;
  }
}

function AuditoriaAcessosPage() {
  const [sinceDays, setSinceDays] = useState(14);
  const [ip, setIp] = useState("");
  const [reason, setReason] = useState("");
  const [onlyFailures, setOnlyFailures] = useState(false);

  const getStats = useServerFn(adminGetLoginStats);
  const getEvents = useServerFn(adminListLoginEvents);

  const stats = useQuery({
    queryKey: ["admin", "login-stats", sinceDays],
    queryFn: () => getStats({ data: { sinceDays } }),
    staleTime: 30_000,
  });

  const events = useQuery({
    queryKey: ["admin", "login-events", { sinceDays, ip, reason, onlyFailures }],
    queryFn: () =>
      getEvents({
        data: {
          sinceDays,
          ip: ip.trim(),
          reason: reason.trim(),
          onlyFailures,
          limit: 300,
        },
      }),
    staleTime: 15_000,
  });

  const total = stats.data?.total ?? 0;
  const successRate =
    total > 0 ? Math.round(((stats.data?.totalSuccess ?? 0) / total) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Painel administrativo
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-foreground">
            Auditoria de acessos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tendências de login, tentativas por IP e motivos de falha.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sinceDays}
            onChange={(e) => setSinceDays(Number(e.target.value))}
            className="h-9 rounded-md border bg-background px-2 text-sm"
            aria-label="Período"
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={14}>Últimos 14 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={60}>Últimos 60 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void stats.refetch();
              void events.refetch();
            }}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </Button>
        </div>
      </header>

      {/* KPIs */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Activity className="h-4 w-4" />}
          label="Tentativas totais"
          value={total}
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Sucessos"
          value={stats.data?.totalSuccess ?? 0}
          accent="ok"
        />
        <KpiCard
          icon={<ShieldAlert className="h-4 w-4" />}
          label="Falhas"
          value={stats.data?.totalFailure ?? 0}
          accent="warn"
        />
        <KpiCard label="Taxa de sucesso" value={`${successRate}%`} accent="ok" />
      </section>

      {/* Gráfico série temporal */}
      <Card>
        <CardHeader>
          <CardTitle>Tendência de acessos</CardTitle>
          <CardDescription>
            Sucessos e falhas por dia no período selecionado.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          {stats.isLoading ? (
            <ChartSkeleton height={272} label="Carregando tendência de acessos" />
          ) : (stats.data?.series?.length ?? 0) === 0 ? (
            <ChartEmpty height={272} title="Sem acessos no período" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.data?.series ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="day"
                  tickFormatter={(d: string) => d.slice(5)}
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  allowDecimals={false}
                />
                <Tooltip
                  labelFormatter={(d) => `Dia ${d}`}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 10,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--popover))",
                    color: "hsl(var(--popover-foreground))",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                  }}
                  labelStyle={{ color: "hsl(var(--popover-foreground))", fontWeight: 600 }}
                  itemStyle={{ color: "hsl(var(--popover-foreground))" }}
                  cursor={{ fill: "rgba(148,163,184,0.12)" }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: "hsl(var(--foreground))" }} />
                {/* Cores com contraste ≥ 3:1 (WCAG 1.4.11) tanto em fundo claro como escuro. */}
                <Bar dataKey="success" name="Sucessos" fill="#059669" stackId="a" />
                <Bar dataKey="failure" name="Falhas" fill="#dc2626" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top IPs + Motivos + Bloqueados */}
      <section className="grid gap-4 lg:grid-cols-3">
        <TopIpsCard topIps={stats.data?.topIps ?? []} />
        <Card>
          <CardHeader>
            <CardTitle>Motivos de falha</CardTitle>
            <CardDescription>Agregado no período.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(stats.data?.topReasons ?? []).length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhum motivo registrado.
              </p>
            ) : (
              (stats.data?.topReasons ?? []).map((row) => (
                <div
                  key={row.reason}
                  className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-sm"
                >
                  <span className="text-xs">{row.reason}</span>
                  <Badge variant="outline">{row.count}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <BlockedIpsCard />
      </section>

      {/* Filtros + Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de tentativas</CardTitle>
          <CardDescription>
            Filtre por IP ou motivo. Máx. 300 registros por consulta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <Label className="text-xs">IP contém</Label>
              <Input
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="ex: 187.19"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Motivo contém</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="ex: pin incorreto"
                className="mt-1"
              />
            </div>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={onlyFailures}
                  onChange={(e) => setOnlyFailures(e.target.checked)}
                  className="h-4 w-4"
                />
                Apenas falhas
              </label>
            </div>
            <div className="flex items-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void events.refetch()}
                className="w-full"
              >
                Aplicar filtros
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      Carregando…
                    </TableCell>
                  </TableRow>
                ) : (events.data ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      Nenhum registro encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  (events.data ?? []).map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs">{fmt(e.created_at)}</TableCell>
                      <TableCell className="text-xs">{e.email ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{e.cpf_masked ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{e.ip_address ?? "—"}</TableCell>
                      <TableCell>
                        {e.success ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600">OK</Badge>
                        ) : (
                          <Badge variant="destructive">Falha</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {e.reason ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  accent,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
  accent?: "ok" | "warn";
}) {
  const border =
    accent === "ok"
      ? "border-emerald-500/30 bg-emerald-500/5"
      : accent === "warn"
      ? "border-destructive/30 bg-destructive/5"
      : "";
  return (
    <Card className={border}>
      <CardContent className="p-4">
        <p className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground">
          {icon}
          {label}
        </p>
        <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-foreground">
          {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
        </p>
      </CardContent>
    </Card>
  );
}

function TopIpsCard({ topIps }: { topIps: { ip: string; count: number }[] }) {
  const qc = useQueryClient();
  const blockFn = useServerFn(adminBlockIp);
  const [pending, setPending] = useState<string | null>(null);

  async function block(ip: string) {
    const ttlStr = prompt(`Bloquear ${ip} por quantos minutos? (padrão 60)`, "60");
    if (ttlStr === null) return;
    const ttl = Math.max(1, Math.min(60 * 24 * 30, Number(ttlStr) || 60));
    const reason = prompt("Motivo do bloqueio (opcional):", "excesso de falhas") ?? "";
    try {
      setPending(ip);
      await blockFn({ data: { ip, ttlMinutes: ttl, reason } });
      toast.success(`IP ${ip} bloqueado por ${ttl} min.`);
      qc.invalidateQueries({ queryKey: ["admin", "blocked-ips"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao bloquear");
    } finally {
      setPending(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>IPs com mais falhas</CardTitle>
        <CardDescription>Top 8 no período. Clique em "Bloquear" para restringir.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {topIps.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma falha registrada.</p>
        ) : (
          topIps.map((row) => (
            <div
              key={row.ip}
              className="flex items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm"
            >
              <span className="font-mono text-xs">{row.ip}</span>
              <div className="flex items-center gap-2">
                <Badge variant="destructive">{row.count}</Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => block(row.ip)}
                  disabled={pending === row.ip || row.ip === "desconhecido"}
                >
                  <Ban className="h-3 w-3" />
                  Bloquear
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function BlockedIpsCard() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListBlockedIps);
  const unblockFn = useServerFn(adminUnblockIp);
  const q = useQuery({
    queryKey: ["admin", "blocked-ips"],
    queryFn: () => listFn(),
    staleTime: 15_000,
  });
  const mut = useMutation({
    mutationFn: (ip: string) => unblockFn({ data: { ip } }),
    onSuccess: () => {
      toast.success("IP desbloqueado.");
      qc.invalidateQueries({ queryKey: ["admin", "blocked-ips"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao desbloquear"),
  });
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <Shield className="h-4 w-4" /> Bloqueios ativos
        </CardTitle>
        <CardDescription>
          IPs restritos temporariamente. Ações ficam registradas no log de auditoria.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {q.isLoading ? (
          <p className="py-4 text-center text-xs text-muted-foreground">Carregando…</p>
        ) : (q.data ?? []).length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">Nenhum IP bloqueado.</p>
        ) : (
          (q.data ?? []).map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between gap-2 rounded-md border border-destructive/30 bg-background px-3 py-2 text-sm"
            >
              <div>
                <p className="font-mono text-xs">{row.ip}</p>
                <p className="text-[11px] text-muted-foreground">
                  até {new Date(row.blocked_until).toLocaleString("pt-BR")}
                  {row.reason ? ` · ${row.reason}` : ""}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => mut.mutate(row.ip)}
                disabled={mut.isPending}
              >
                Liberar
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
