import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, FileDown, CalendarRange, Loader2, RefreshCw, TrendingDown, Layers, Activity, Rows2, Rows3 } from "lucide-react";
import { getAdminInsights, type AdminInsights } from "@/lib/admin-insights.functions";
import { exportRowsToCSV, exportRowsToPDF, stampedFilename } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { tc } from "@/lib/typeclear";
import { cn } from "@/lib/utils";
import {
  chartMetrics,
  chartTheme,
  legendStyle,
  tickStyle,
  tooltipItemStyle,
  tooltipLabelStyle,
  tooltipStyle,
  type ChartDensity,
} from "@/lib/admin-chart-theme";
import { ChartEmpty, ChartSkeleton } from "@/components/admin/ChartStates";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
const shortDay = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7);

function Panel({
  icon,
  title,
  note,
  onExport,
  height,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  note: string;
  onExport: () => void;
  height: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-border/70 bg-card p-2.5 text-card-foreground">
      <div className="mb-1.5 flex items-start gap-2">
        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn(tc.itemTitle, "truncate text-card-foreground")}>{title}</p>
          <p className={cn(tc.meta, "truncate text-muted-foreground/90")}>{note}</p>
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
      <div style={{ height }} className="w-full">{children}</div>
    </div>
  );
}


const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => isoDay(new Date(Date.now() - n * 86_400_000));
const PRESETS = [
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
] as const;

function InsightsSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-live="polite">
      <div className="h-7 w-full animate-pulse rounded-full bg-muted/60" />
      <div className="grid gap-2.5 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-border/70 bg-card p-2.5">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-6 w-6 shrink-0 animate-pulse rounded-md bg-muted/70" />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="h-3 w-2/3 animate-pulse rounded bg-muted/70" />
                <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted/50" />
              </div>
            </div>
            <div className="h-[132px] w-full animate-pulse rounded-lg bg-muted/40" />
          </div>
        ))}
      </div>
    </div>
  );
}

const DENSITY_KEY = "pc.admin.insights.density";

export function AdminInsightsPanel() {
  const fetchInsights = useServerFn(getAdminInsights);
  const queryClient = useQueryClient();
  const [from, setFrom] = useState(() => daysAgo(29));
  const [to, setTo] = useState(() => isoDay(new Date()));
  const [cats, setCats] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [density, setDensity] = useState<ChartDensity>(() => {
    if (typeof window === "undefined") return "compact";
    return (window.localStorage.getItem(DENSITY_KEY) as ChartDensity) ?? "compact";
  });
  const metrics = chartMetrics(density);
  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(DENSITY_KEY, density);
  }, [density]);


  /* Alternância rápida de filtros não dispara uma chamada por clique:
     só o último estado (após 320 ms parado) vira uma query. */
  const [debounced, setDebounced] = useState(() => ({ from, to, cats: "" }));
  useEffect(() => {
    const t = setTimeout(() => setDebounced({ from, to, cats: [...cats].sort().join(",") }), 320);
    return () => clearTimeout(t);
  }, [from, to, cats]);

  const insightsOptions = useMemo(
    () => ({
      queryKey: ["admin", "insights", debounced.from, debounced.to, debounced.cats] as const,
      queryFn: () =>
        fetchInsights({
          data: {
            from: debounced.from,
            to: debounced.to,
            categories: debounced.cats ? debounced.cats.split(",") : [],
          },
        }),
      staleTime: 90_000,
      gcTime: 30 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnMount: false as const,
      placeholderData: (prev?: AdminInsights) => prev,
    }),
    [debounced, fetchInsights],
  );

  const query = useQuery<AdminInsights>(insightsOptions);

  /* Pré-aquece os presets vizinhos enquanto o admin lê o painel. */
  useEffect(() => {
    if (query.isFetching) return;
    const id = window.setTimeout(() => {
      for (const p of PRESETS) {
        const f = daysAgo(p.days - 1);
        const t = isoDay(new Date());
        if (f === debounced.from && t === debounced.to && !debounced.cats) continue;
        void queryClient.prefetchQuery({
          queryKey: ["admin", "insights", f, t, debounced.cats],
          queryFn: () =>
            fetchInsights({
              data: { from: f, to: t, categories: debounced.cats ? debounced.cats.split(",") : [] },
            }),
          staleTime: 90_000,
          gcTime: 30 * 60_000,
        });
      }
    }, 900);
    return () => window.clearTimeout(id);
  }, [debounced, fetchInsights, query.isFetching, queryClient]);

  const hardRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin", "insights"] });
    await fetchInsights({
      data: {
        from: debounced.from,
        to: debounced.to,
        categories: debounced.cats ? debounced.cats.split(",") : [],
        refresh: true,
      },
    }).then((fresh) => queryClient.setQueryData(insightsOptions.queryKey, fresh));
  };


  const data = query.data;
  const coverage = useMemo(() => (data?.coverage ?? []).slice(0, 7), [data]);
  const activePreset = useMemo(() => {
    if (to !== isoDay(new Date())) return null;
    return PRESETS.find((p) => daysAgo(p.days - 1) === from)?.days ?? null;
  }, [from, to]);

  const applyPreset = (days: number) => {
    setFrom(daysAgo(days - 1));
    setTo(isoDay(new Date()));
  };
  const toggleCat = (slug: string) =>
    setCats((prev: string[]) => (prev.includes(slug) ? prev.filter((s: string) => s !== slug) : [...prev, slug]));

  const reportRows = useMemo(() => {
    if (!data) return [];
    const catLabels = data.categories.length
      ? data.coverage
          .filter((c) => data.categories.includes(c.slug))
          .map((c) => c.label)
          .join(", ")
      : "Todas as categorias";
    const rows: Array<{ section: string; metric: string; value: string }> = [
      { section: "Resumo", metric: "Período", value: `${data.range.from} a ${data.range.to} (${data.range.days} dias)` },
      { section: "Resumo", metric: "Categorias", value: catLabels },
      { section: "KPI", metric: "Produtos distintos", value: String(data.totals.products) },
      { section: "KPI", metric: "Registros de preço", value: String(data.totals.prices) },
      { section: "KPI", metric: "Preços verificados", value: String(data.totals.verified) },
      { section: "KPI", metric: "Lojas ativas", value: String(data.totals.stores) },
      { section: "KPI", metric: "Novos preços (24h)", value: String(data.totals.last24h) },
    ];
    for (const c of data.coverage) {
      rows.push({
        section: "Cobertura",
        metric: c.label,
        value: `${c.products} produtos · ${c.stores} lojas · ${c.prices} preços · ${c.share}%`,
      });
    }
    for (const t of data.trend) {
      rows.push({
        section: "Tendência",
        metric: t.day,
        value: `média ${brl(t.minPriceAvg)} · mínimo ${brl(t.minPrice)} · ${t.samples} registros`,
      });
    }
    for (const r of data.recent) {
      rows.push({ section: "Atualizações", metric: r.day, value: `${r.prices} preços · ${r.verified} verificados` });
    }
    return rows;
  }, [data]);

  const reportColumns = [
    { key: "section", header: "Bloco", accessor: (r: { section: string }) => r.section },
    { key: "metric", header: "Indicador", accessor: (r: { metric: string }) => r.metric },
    { key: "value", header: "Valor", accessor: (r: { value: string }) => r.value },
  ];

  const filterLines = data
    ? [
        `Período: ${new Date(`${data.range.from}T12:00:00`).toLocaleDateString("pt-BR")} a ${new Date(`${data.range.to}T12:00:00`).toLocaleDateString("pt-BR")} (${data.range.days} dias)`,
        `Categorias: ${
          data.categories.length
            ? data.coverage.filter((c) => data.categories.includes(c.slug)).map((c) => c.label).join(", ")
            : "todas"
        }`,
      ]
    : [];

  const handlePDF = async () => {
    if (!data) return;
    setExporting(true);
    try {
      await exportRowsToPDF(stampedFilename("relatorio-kpis-admin"), reportColumns, reportRows, {
        title: "Relatório de indicadores — Console administrativo",
        subtitle: "KPIs, cobertura por categoria e evolução de preços",
        filters: filterLines,
      });
    } finally {
      setExporting(false);
    }
  };

  if (query.isLoading && !data) return <InsightsSkeleton />;
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
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border/70 bg-card/60 p-1.5">
        <CalendarRange className="ml-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        {PRESETS.map((p) => (
          <button
            key={p.days}
            type="button"
            onClick={() => applyPreset(p.days)}
            aria-pressed={activePreset === p.days}
            className={cn(
              tc.control,
              "h-7 rounded-full border px-2.5 transition-colors",
              activePreset === p.days
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/70 bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
        <input
          type="date"
          value={from}
          max={to}
          onChange={(e) => setFrom(e.target.value)}
          aria-label="Data inicial do relatório"
          className={cn(tc.control, "h-7 rounded-md border border-border/70 bg-background px-2")}
        />
        <span className={cn(tc.meta, "text-muted-foreground")}>até</span>
        <input
          type="date"
          value={to}
          min={from}
          max={isoDay(new Date())}
          onChange={(e) => setTo(e.target.value)}
          aria-label="Data final do relatório"
          className={cn(tc.control, "h-7 rounded-md border border-border/70 bg-background px-2")}
        />
        <div className="ml-auto flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className={cn(tc.control, "h-7 rounded-full px-2.5")}
            onClick={() => exportRowsToCSV(stampedFilename("relatorio-kpis-admin"), reportColumns, reportRows)}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" /> CSV
          </Button>
          <Button
            size="sm"
            className={cn(tc.control, "h-7 rounded-full px-2.5")}
            onClick={handlePDF}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileDown className="mr-1.5 h-3.5 w-3.5" />
            )}
            PDF
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={() => setDensity((d) => (d === "compact" ? "normal" : "compact"))}
            aria-label={density === "compact" ? "Aumentar altura dos gráficos" : "Reduzir altura dos gráficos"}
            aria-pressed={density === "compact"}
            title={density === "compact" ? "Modo compacto ativo" : "Modo compacto"}
          >
            {density === "compact" ? <Rows3 className="h-3.5 w-3.5" /> : <Rows2 className="h-3.5 w-3.5" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={() => void hardRefresh()}
            aria-label="Atualizar indicadores"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", query.isFetching && "animate-spin")} />
          </Button>

        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <p className={cn(tc.tag, "mr-1 text-muted-foreground")}>
          {data.totals.products} produtos · {data.totals.prices} preços · {data.totals.last24h} em 24h
        </p>
        <button
          type="button"
          onClick={() => setCats([])}
          aria-pressed={cats.length === 0}
          className={cn(
            tc.control,
            "h-6 rounded-full border px-2",
            cats.length === 0
              ? "border-primary bg-primary/10 text-primary"
              : "border-border/70 text-muted-foreground hover:text-foreground",
          )}
        >
          Todas
        </button>
        {data.coverage.slice(0, 10).map((c) => (
          <button
            key={c.slug}
            type="button"
            onClick={() => toggleCat(c.slug)}
            aria-pressed={cats.includes(c.slug)}
            className={cn(
              tc.control,
              "h-6 rounded-full border px-2",
              cats.includes(c.slug)
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/70 text-muted-foreground hover:text-foreground",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>


      <div className="grid gap-2.5 lg:grid-cols-3">
        <Panel
          icon={<TrendingDown className="h-3.5 w-3.5" />}
          title="Tendência de menor preço"
          note={`Média dos menores preços por produto (${data.range.days} dias)`}
          height={metrics.height}
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
          {query.isFetching && !data.trend.length ? (
            <ChartSkeleton height={metrics.height} label="Carregando tendência" />
          ) : data.trend.length === 0 ? (
            <ChartEmpty
              height={metrics.height}
              title="Sem preços coletados"
              hint="Amplie o período ou remova filtros de categoria."
            />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trend} margin={{ top: metrics.marginTop, right: 6, bottom: 0, left: -14 }}>
                <defs>
                  <linearGradient id="pcTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartTheme.primary} stopOpacity={0.55} />
                    <stop offset="100%" stopColor={chartTheme.primary} stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                <XAxis dataKey="day" tickFormatter={shortDay} tick={{ ...tickStyle, fontSize: metrics.tickFontSize }} tickLine={false} axisLine={{ stroke: chartTheme.grid }} minTickGap={18} />
                <YAxis tick={{ ...tickStyle, fontSize: metrics.tickFontSize }} tickLine={false} axisLine={false} width={metrics.yAxisWidth + 4} tickFormatter={(v) => brl(Number(v))} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  cursor={{ stroke: chartTheme.accent, strokeWidth: 1, strokeDasharray: "2 3" }}
                  labelFormatter={(l) => `Dia ${shortDay(String(l))}`}
                  formatter={(v: number, n) => [n === "samples" ? String(v) : brl(Number(v)), n === "minPriceAvg" ? "Média" : n === "minPrice" ? "Mínimo" : "Registros"]}
                />
                <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={7} formatter={(n) => (n === "minPriceAvg" ? "Média" : "Mínimo")} />
                <Area type="monotone" dataKey="minPriceAvg" stroke={chartTheme.primary} strokeWidth={metrics.strokeWidth} fill="url(#pcTrend)" />
                <Line type="monotone" dataKey="minPrice" stroke={chartTheme.accent} strokeWidth={metrics.strokeWidth - 0.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel
          icon={<Layers className="h-3.5 w-3.5" />}
          title="Cobertura por categoria"
          note="Produtos distintos monitorados em cada nicho"
          height={metrics.height}
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
          {query.isFetching && !coverage.length ? (
            <ChartSkeleton height={metrics.height} label="Carregando cobertura" />
          ) : coverage.length === 0 ? (
            <ChartEmpty
              height={metrics.height}
              title="Nenhuma categoria com produtos"
              hint="Registre preços em pelo menos uma categoria."
            />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={coverage} margin={{ top: metrics.marginTop, right: 6, bottom: 0, left: -14 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                <XAxis dataKey="label" tick={{ ...tickStyle, fontSize: metrics.tickFontSize }} tickLine={false} axisLine={{ stroke: chartTheme.grid }} interval={0} angle={-18} textAnchor="end" height={metrics.xAxisAngleHeight} />
                <YAxis tick={{ ...tickStyle, fontSize: metrics.tickFontSize }} tickLine={false} axisLine={false} width={36} allowDecimals={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  cursor={{ fill: "rgba(226, 232, 240, 0.08)" }}
                  formatter={(v: number, n) => [String(v), n === "products" ? "Produtos" : "Lojas"]}
                />
                <Bar dataKey="products" fill={chartTheme.primary} radius={[4, 4, 0, 0]} maxBarSize={metrics.barMaxSize} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel
          icon={<Activity className="h-3.5 w-3.5" />}
          title="Atualizações recentes"
          note="Novos registros de preço por dia (14 dias)"
          height={metrics.height}
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
          {query.isFetching && !data.recent.length ? (
            <ChartSkeleton height={metrics.height} label="Carregando atualizações" />
          ) : data.recent.length === 0 ? (
            <ChartEmpty
              height={metrics.height}
              title="Nenhuma atualização recente"
              hint="Novos preços aparecerão aqui quando registrados."
            />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.recent} margin={{ top: metrics.marginTop, right: 6, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                <XAxis dataKey="day" tickFormatter={shortDay} tick={{ ...tickStyle, fontSize: metrics.tickFontSize }} tickLine={false} axisLine={{ stroke: chartTheme.grid }} minTickGap={14} />
                <YAxis tick={{ ...tickStyle, fontSize: metrics.tickFontSize }} tickLine={false} axisLine={false} width={34} allowDecimals={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  cursor={{ stroke: chartTheme.accent, strokeWidth: 1, strokeDasharray: "2 3" }}
                  labelFormatter={(l) => `Dia ${shortDay(String(l))}`}
                  formatter={(v: number, n) => [String(v), n === "prices" ? "Novos preços" : "Verificados"]}
                />
                <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={7} formatter={(n) => (n === "prices" ? "Novos preços" : "Verificados")} />
                <Line type="monotone" dataKey="prices" stroke={chartTheme.primary} strokeWidth={metrics.strokeWidth} dot={false} />
                <Line type="monotone" dataKey="verified" stroke={chartTheme.accent} strokeWidth={metrics.strokeWidth - 0.4} strokeDasharray="4 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

    </section>
  );
}
