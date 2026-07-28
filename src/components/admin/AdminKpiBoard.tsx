import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
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
import {
  chartTheme,
  tickStyle,
  tooltipStyle,
  tooltipLabelStyle,
  tooltipItemStyle,
} from "@/lib/admin-chart-theme";
import { ChartSkeleton, ChartEmpty } from "@/components/admin/ChartStates";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  FileDown,
  Download,
  Loader2,
  Store,
} from "lucide-react";
import {
  getAdminKpiBoard,
  getBestPricesReport,
  type AdminKpiBoard,
  type BestPriceRow,
} from "@/lib/admin-kpis.functions";
import { exportRowsToCSV, exportRowsToPDF, stampedFilename } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { tc } from "@/lib/typeclear";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
const shortDay = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

const RANGES = [7, 30, 90] as const;

function Block({
  icon,
  title,
  note,
  actions,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  note: string;
  actions?: React.ReactNode;
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
        {actions}
      </div>
      {children}
    </div>
  );
}

export function AdminKpiBoard() {
  const fetchBoard = useServerFn(getAdminKpiBoard);
  const fetchBest = useServerFn(getBestPricesReport);

  const [days, setDays] = useState<number>(30);
  const [minChangePct, setMinChangePct] = useState<number>(8);
  const [exporting, setExporting] = useState<null | "csv" | "pdf">(null);

  const boardQ = useQuery({
    queryKey: ["admin-kpi-board", days, minChangePct],
    queryFn: () => fetchBoard({ data: { days, minChangePct } }) as Promise<AdminKpiBoard>,
    staleTime: 90_000,
    gcTime: 30 * 60_000,
  });

  const board = boardQ.data;

  const evolution = useMemo(
    () => (board?.evolution ?? []).map((p) => ({ ...p, label: shortDay(p.day) })),
    [board],
  );
  const shares = useMemo(() => (board?.stores ?? []).slice(0, 8), [board]);

  const bestPriceColumns = [
    { key: "productName", header: "Produto", accessor: (r: BestPriceRow) => r.productName },
    { key: "price", header: "Menor preço", accessor: (r: BestPriceRow) => r.price.toFixed(2), align: "right" as const },
    { key: "storeName", header: "Onde", accessor: (r: BestPriceRow) => r.storeName },
    { key: "neighborhood", header: "Bairro", accessor: (r: BestPriceRow) => r.neighborhood ?? "—" },
    { key: "city", header: "Cidade", accessor: (r: BestPriceRow) => r.city ?? "—" },
    { key: "avgPrice", header: "Média", accessor: (r: BestPriceRow) => r.avgPrice.toFixed(2), align: "right" as const },
    { key: "savingsPct", header: "Economia %", accessor: (r: BestPriceRow) => r.savingsPct.toFixed(1), align: "right" as const },
    { key: "storeCount", header: "Lojas", accessor: (r: BestPriceRow) => r.storeCount, align: "right" as const },
  ];

  const exportBest = async (format: "csv" | "pdf") => {
    setExporting(format);
    try {
      const rows = (await fetchBest({ data: { limit: 300 } })) as BestPriceRow[];
      if (!rows.length) {
        toast.error("Nenhum preço disponível para exportar.");
        return;
      }
      const filename = stampedFilename("melhores-precos");
      if (format === "csv") {
        exportRowsToCSV(filename, bestPriceColumns, rows);
      } else {
        await exportRowsToPDF(filename, bestPriceColumns, rows, {
          title: "Relatório de melhores preços",
          subtitle: `${rows.length} produtos • gerado automaticamente pelo console PreçoCerto`,
          filters: [`Período de referência: últimos ${days} dias`],
        });
      }
      toast.success(`Relatório exportado em ${format.toUpperCase()}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao exportar relatório.");
    } finally {
      setExporting(null);
    }
  };

  return (
    <section className="space-y-2" aria-label="Painel de KPIs de preços">
      {/* Barra de controles */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border/70 bg-card px-2.5 py-2">
        <span className={cn(tc.meta, "mr-1 font-semibold uppercase tracking-wide")}>Período</span>
        {RANGES.map((r) => (
          <Button
            key={r}
            type="button"
            size="sm"
            variant={days === r ? "default" : "outline"}
            className="h-7 px-2.5"
            onClick={() => setDays(r)}
          >
            {r}d
          </Button>
        ))}
        <span className={cn(tc.meta, "ml-2")}>Alerta a partir de</span>
        <Input
          type="number"
          min={1}
          max={90}
          value={minChangePct}
          onChange={(e) => setMinChangePct(Math.max(1, Math.min(90, Number(e.target.value) || 1)))}
          className="h-7 w-16 px-2 text-[12.5px]"
          aria-label="Variação mínima em porcentagem para alertas"
        />
        <span className={cn(tc.meta)}>%</span>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2.5"
            disabled={exporting !== null}
            onClick={() => exportBest("csv")}
          >
            {exporting === "csv" ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="mr-1 h-3.5 w-3.5" />
            )}
            Melhores preços CSV
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-7 px-2.5"
            disabled={exporting !== null}
            onClick={() => exportBest("pdf")}
          >
            {exporting === "pdf" ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileDown className="mr-1 h-3.5 w-3.5" />
            )}
            PDF
          </Button>
        </div>
      </div>

      {boardQ.isLoading ? (
        <div className="grid gap-2 lg:grid-cols-3">
          <ChartSkeleton height={144} label="Carregando evolução" />
          <ChartSkeleton height={144} label="Carregando participação" />
          <ChartSkeleton height={144} label="Carregando alertas" />
        </div>
      ) : boardQ.isError ? (
        <p className={cn(tc.meta, "rounded-xl border border-destructive/40 bg-destructive/5 p-3")}>
          Não foi possível carregar os KPIs.
        </p>
      ) : board ? (
        <div className="grid gap-2 lg:grid-cols-3">
          {/* Evolução de preços */}
          <Block
            icon={<Activity className="h-3.5 w-3.5" />}
            title="Evolução de preços"
            note={`${board.totals.prices} registros • ${board.totals.products} produtos`}
          >
            <div className="h-36">
              {evolution.length === 0 ? (
                <ChartEmpty height={144} title="Sem evolução no período" />
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolution} margin={{ top: 4, right: 6, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                  <XAxis dataKey="label" tick={tickStyle} tickLine={false} axisLine={{ stroke: chartTheme.grid }} interval="preserveStartEnd" />
                  <YAxis tick={tickStyle} tickLine={false} axisLine={{ stroke: chartTheme.grid }} width={44} />
                  <Tooltip
                    formatter={(v: number, name) => [brl(Number(v)), name === "avgPrice" ? "Média" : "Menor"]}
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                    itemStyle={tooltipItemStyle}
                    cursor={{ stroke: chartTheme.accent, strokeWidth: 1, strokeDasharray: "2 3" }}
                  />
                  <Line type="monotone" dataKey="avgPrice" stroke={chartTheme.primary} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="minPrice" stroke={chartTheme.accent} strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              )}
            </div>
          </Block>

          {/* Participação por estabelecimento */}
          <Block
            icon={<Store className="h-3.5 w-3.5" />}
            title="Participação por estabelecimento"
            note={`${board.totals.stores} lojas com preços no período`}
            actions={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 shrink-0 px-2"
                aria-label="Exportar participação por estabelecimento em CSV"
                onClick={() =>
                  exportRowsToCSV(
                    stampedFilename("participacao-estabelecimentos"),
                    [
                      { key: "name", header: "Estabelecimento", accessor: (r) => r.name },
                      { key: "neighborhood", header: "Bairro", accessor: (r) => r.neighborhood ?? "—" },
                      { key: "prices", header: "Preços", accessor: (r) => r.prices },
                      { key: "share", header: "Participação %", accessor: (r) => r.share },
                      { key: "products", header: "Produtos", accessor: (r) => r.products },
                      { key: "avgPrice", header: "Preço médio", accessor: (r) => r.avgPrice.toFixed(2) },
                      { key: "cheapestWins", header: "Menor preço (vitórias)", accessor: (r) => r.cheapestWins },
                    ],
                    board.stores,
                  )
                }
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            }
          >
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={shares} margin={{ top: 4, right: 6, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9 }}
                    tickFormatter={(v: string) => (v.length > 10 ? `${v.slice(0, 10)}…` : v)}
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 10 }} width={44} unit="%" />
                  <Tooltip
                    formatter={(v: number) => [`${Number(v).toFixed(1)}%`, "Participação"]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="share" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Block>

          {/* Alertas de variação */}
          <Block
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
            title="Alertas de variação"
            note={`${board.totals.upAlerts} altas • ${board.totals.downAlerts} quedas ≥ ${minChangePct}%`}
            actions={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 shrink-0 px-2"
                aria-label="Exportar alertas de variação em CSV"
                onClick={() =>
                  exportRowsToCSV(
                    stampedFilename("alertas-variacao"),
                    [
                      { key: "productName", header: "Produto", accessor: (r) => r.productName },
                      { key: "storeName", header: "Estabelecimento", accessor: (r) => r.storeName },
                      { key: "previousPrice", header: "Preço anterior", accessor: (r) => r.previousPrice?.toFixed(2) ?? "—" },
                      { key: "price", header: "Preço atual", accessor: (r) => r.price.toFixed(2) },
                      { key: "changePct", header: "Variação %", accessor: (r) => r.changePct },
                      { key: "capturedAt", header: "Quando", accessor: (r) => new Date(r.capturedAt).toLocaleString("pt-BR") },
                    ],
                    board.alerts,
                  )
                }
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            }
          >
            <ul className="max-h-36 space-y-1 overflow-y-auto pr-1">
              {board.alerts.length === 0 ? (
                <li className={cn(tc.meta, "py-6 text-center")}>Nenhuma variação relevante no período.</li>
              ) : (
                board.alerts.slice(0, 40).map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5"
                  >
                    <span
                      className={cn(
                        "grid h-5 w-5 shrink-0 place-items-center rounded",
                        a.direction === "up"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-emerald-500/10 text-emerald-600",
                      )}
                    >
                      {a.direction === "up" ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn(tc.itemTitle, "block truncate")}>{a.productName}</span>
                      <span className={cn(tc.meta, "block truncate")}>
                        {a.storeName} • {a.previousPrice != null ? `${brl(a.previousPrice)} → ` : ""}
                        {brl(a.price)}
                      </span>
                    </span>
                    <span
                      className={cn(
                        tc.meta,
                        "shrink-0 font-semibold",
                        a.direction === "up" ? "text-destructive" : "text-emerald-600",
                      )}
                    >
                      {a.changePct > 0 ? "+" : ""}
                      {a.changePct}%
                    </span>
                  </li>
                ))
              )}
            </ul>
          </Block>
        </div>
      ) : null}
    </section>
  );
}

export default AdminKpiBoard;
