import { createFileRoute } from "@tanstack/react-router";
import { adminBeforeLoad } from "@/lib/route-guards";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/brand/AppShell";
import { PageHeader } from "@/components/brand/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, DollarSign, ShoppingCart, Percent } from "lucide-react";
import { getPlanConversionMetrics, type PlanMetric } from "@/lib/checkout.functions";

export const Route = createFileRoute("/admin_/conversoes")({
  beforeLoad: adminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Conversão por plano — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConversoesPage,
});

function centsToBRL(cents: number): string {
  return (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ConversoesPage() {
  const fetchMetrics = useServerFn(getPlanConversionMetrics);
  const { data: metrics = [], isLoading } = useQuery({
    queryKey: ["plan-conversion-metrics"],
    queryFn: () => fetchMetrics(),
    refetchInterval: 30000,
  });

  const totalApproved = metrics.reduce((s, m) => s + Number(m.orders_approved || 0), 0);
  const totalPending = metrics.reduce((s, m) => s + Number(m.orders_pending || 0), 0);
  const totalOrders = metrics.reduce((s, m) => s + Number(m.orders_total || 0), 0);
  const totalNet = metrics.reduce((s, m) => s + Number(m.net_cents || 0), 0);
  const overallConversion = totalOrders > 0 ? Math.round((totalApproved / totalOrders) * 1000) / 10 : 0;

  return (
    <AppShell>
      <PageHeader
        title="Conversão por plano"
        description="Acompanhe pedidos, aprovações e receita por plano para ajustar preços."
        breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Conversões" }]}
        icon={<TrendingUp className="h-5 w-5" />}
      />
      <div className="mx-auto max-w-6xl space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi icon={<ShoppingCart className="h-4 w-4" />} label="Pedidos totais" value={String(totalOrders)} />
          <Kpi icon={<Percent className="h-4 w-4" />} label="Conversão geral" value={`${overallConversion}%`} hint={`${totalApproved} aprovados / ${totalPending} pendentes`} />
          <Kpi icon={<DollarSign className="h-4 w-4" />} label="Receita líquida" value={centsToBRL(totalNet)} />
          <Kpi
            icon={<TrendingUp className="h-4 w-4" />}
            label="Ticket médio"
            value={totalApproved > 0 ? centsToBRL(Math.round(totalNet / totalApproved)) : "R$ 0,00"}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Desempenho por plano</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Carregando…</div>
            ) : metrics.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Sem dados ainda.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plano</TableHead>
                      <TableHead className="text-right">Preço</TableHead>
                      <TableHead className="text-right">Pedidos</TableHead>
                      <TableHead className="text-right">Aprovados</TableHead>
                      <TableHead className="text-right">Pendentes</TableHead>
                      <TableHead className="text-right">Conversão</TableHead>
                      <TableHead className="text-right">Bruto</TableHead>
                      <TableHead className="text-right">Descontos</TableHead>
                      <TableHead className="text-right">Líquido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.map((m: PlanMetric) => (
                      <TableRow key={m.plan_id}>
                        <TableCell>
                          <div className="font-medium">{m.plan_name}</div>
                          <div className="text-xs text-muted-foreground">{m.plan_slug}</div>
                        </TableCell>
                        <TableCell className="text-right">{centsToBRL(m.price_cents)}</TableCell>
                        <TableCell className="text-right">{Number(m.orders_total)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="default">{Number(m.orders_approved)}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">{Number(m.orders_pending)}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{Number(m.conversion_pct)}%</TableCell>
                        <TableCell className="text-right">{centsToBRL(m.gross_cents)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {m.discount_cents > 0 ? `- ${centsToBRL(m.discount_cents)}` : "—"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">{centsToBRL(m.net_cents)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function Kpi({
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
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          {icon} {label}
        </div>
        <div className="mt-1 font-serif text-2xl">{value}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}
