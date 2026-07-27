import { useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, Loader2, RefreshCw, TrendingDown, Layers, Activity } from "lucide-react";
import { getAdminInsights, type AdminInsights } from "@/lib/admin-insights.functions";
import { exportRowsToCSV, stampedFilename } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { tc } from "@/lib/typeclear";
import { cn } from "@/lib/utils";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
const shortDay = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7);

function Panel({
  icon,
  title,
  note,
  onExport,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  note: string;
  onExport: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-border/70 bg-card p-2.5">
      <div className="mb-1.5 flex items-start gap-2">
        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn(tc.itemTitle, "truncate")}>{title}</p>
          <p className={cn(tc.meta, "truncate")}>{note}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onExport}
          className="h-7 shrink-0 px-2"
          aria-label={`Exportar ${title} em CSV`}
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="h-[132px] w-full">{children}</div>
    </div>
  );
}

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 10,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--popover))",
  color: "hsl(var(--popover-foreground))",
} as const;

export function AdminInsightsPanel() {
  const fetchInsights = useServerFn(getAdminInsights);
  const query = useQuery<AdminInsights>({
    queryKey: ["admin", "insights"],
    queryFn: () => fetchInsights(),
    staleTime: 60_000,
  });

  const data = query.data;
  const coverage = useMemo(() => (data?.coverage ?? []).slice(0, 7), [data]);

  if (query.isLoading) {
    return (
      <div className="flex h-[172px] items-center justify-center rounded-xl border border-border/70 bg-card text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando indicadores…
      </div>
    );
  }
  if (query.isError || !data) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3">
        <p className={tc.meta}>Não foi possível carregar os indicadores.</p>
        <Button size="sm" variant="outline" onClick={() => query.refetch()}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Tentar de novo
        </Button>
      </div>
    );
  }

  return (
    <section aria-label="Indicadores comparativos" className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={cn(tc.tag, "text-muted-foreground")}>
          Indicadores · {data.totals.products} produtos · {data.totals.prices} preços ·{" "}
          {data.totals.last24h} nas últimas 24h
        </p>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className={cn(tc.control, "h-7 rounded-full px-2.5")}
            onClick={() =>
              exportRowsToCSV(
                stampedFilename("kpis-admin"),
                [
                  { key: "metric", header: "Indicador", accessor: (r: { metric: string }) => r.metric },
                  { key: "value", header: "Valor", accessor: (r: { value: string }) => r.value },
                ],
                [
                  { metric: "Produtos distintos", value: String(data.totals.products) },
                  { metric: "Registros de preço", value: String(data.totals.prices) },
                  { metric: "Preços verificados", value: String(data.totals.verified) },
                  { metric: "Lojas ativas", value: String(data.totals.stores) },
                  { metric: "Novos preços (24h)", value: String(data.totals.last24h) },
                  { metric: "Gerado em", value: new Date(data.generatedAt).toLocaleString("pt-BR") },
                ],
              )
            }
          >
            <Download className="mr-1.5 h-3.5 w-3.5" /> CSV geral
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={() => query.refetch()}
            aria-label="Atualizar indicadores"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", query.isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="grid gap-2.5 lg:grid-cols-3">
        <Panel
          icon={<TrendingDown className="h-3.5 w-3.5" />}
          title="Tendência de menor preço"
          note="Média dos menores preços por produto (30 dias)"
          onExport={() =>
            exportRowsToCSV(
              stampedFilename("tendencia-menor-preco"),
              [
                { key: "day", header: "Dia", accessor: (r) => r.day },
                { key: "avg", header: "Média menor preço", accessor: (r) => r.minPriceAvg },
                { key: "min", header: "Menor preço", accessor: (r) => r.minPrice },
                { key: "samples", header: "Registros", accessor: (r) => r.samples },
              ],
              data.trend,
            )
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.trend} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
              <defs>
                <linearGradient id="pcTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="day" tickFormatter={shortDay} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={18} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => brl(Number(v))} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(l) => `Dia ${shortDay(String(l))}`}
                formatter={(v: number, n) => [n === "samples" ? String(v) : brl(Number(v)), n === "minPriceAvg" ? "Média" : n === "minPrice" ? "Mínimo" : "Registros"]}
              />
              <Area type="monotone" dataKey="minPriceAvg" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#pcTrend)" />
              <Line type="monotone" dataKey="minPrice" stroke="hsl(var(--muted-foreground))" strokeWidth={1} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          icon={<Layers className="h-3.5 w-3.5" />}
          title="Cobertura por categoria"
          note="Produtos distintos monitorados em cada nicho"
          onExport={() =>
            exportRowsToCSV(
              stampedFilename("cobertura-categorias"),
              [
                { key: "label", header: "Categoria", accessor: (r) => r.label },
                { key: "products", header: "Produtos", accessor: (r) => r.products },
                { key: "stores", header: "Lojas", accessor: (r) => r.stores },
                { key: "prices", header: "Preços", accessor: (r) => r.prices },
                { key: "share", header: "% do catálogo", accessor: (r) => r.share },
              ],
              data.coverage,
            )
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={coverage} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={0} angle={-18} textAnchor="end" height={34} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={34} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n) => [String(v), n === "products" ? "Produtos" : "Lojas"]} />
              <Bar dataKey="products" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          icon={<Activity className="h-3.5 w-3.5" />}
          title="Atualizações recentes"
          note="Novos registros de preço por dia (14 dias)"
          onExport={() =>
            exportRowsToCSV(
              stampedFilename("atualizacoes-recentes"),
              [
                { key: "day", header: "Dia", accessor: (r) => r.day },
                { key: "prices", header: "Novos preços", accessor: (r) => r.prices },
                { key: "verified", header: "Verificados", accessor: (r) => r.verified },
              ],
              data.recent,
            )
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.recent} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="day" tickFormatter={shortDay} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={14} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(l) => `Dia ${shortDay(String(l))}`}
                formatter={(v: number, n) => [String(v), n === "prices" ? "Novos preços" : "Verificados"]}
              />
              <Line type="monotone" dataKey="prices" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="verified" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </section>
  );
}
