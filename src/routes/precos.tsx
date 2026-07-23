import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AppShell } from "@/components/brand/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowDownRight, ArrowUpRight, LineChart as LineChartIcon, Minus, Loader2 } from "lucide-react";
import {
  listPricedProducts,
  getProductPriceSeries,
  type PricedProduct,
  type PricePoint,
} from "@/lib/price-history.functions";
import { ProductImage } from "@/components/product/ProductImage";
import { useMyRoles } from "@/hooks/useMyRoles";


export const Route = createFileRoute("/precos")({
  head: () => ({
    meta: [
      { title: "Histórico de preços — PreçoCerto" },
      {
        name: "description",
        content:
          "Acompanhe a evolução dos preços dos produtos dos supermercados parceiros e veja a variação em relação à leitura anterior.",
      },
      { property: "og:title", content: "Histórico de preços — PreçoCerto" },
      {
        property: "og:description",
        content: "Gráfico de preços por produto e variação em relação à leitura anterior.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrecosPage,
});

const fmtBRL = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

function VariationBadge({ pct }: { pct: number | null }) {
  if (pct == null)
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <Minus className="h-3 w-3" /> 1ª leitura
      </Badge>
    );
  if (Math.abs(pct) < 0.01)
    return (
      <Badge variant="outline" className="gap-1">
        <Minus className="h-3 w-3" /> estável
      </Badge>
    );
  const up = pct > 0;
  return (
    <Badge
      variant="outline"
      className={
        up
          ? "gap-1 border-destructive/40 bg-destructive/10 text-destructive"
          : "gap-1 border-savings/40 bg-savings/10 text-savings"
      }
    >
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {up ? "+" : ""}
      {pct.toFixed(1).replace(".", ",")}%
    </Badge>
  );
}

function PrecosPage() {
  const { isAdmin } = useMyRoles();

  const fetchList = useServerFn(listPricedProducts);
  const fetchSeries = useServerFn(getProductPriceSeries);
  const [list, setList] = useState<PricedProduct[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [series, setSeries] = useState<PricePoint[] | null>(null);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [query, setQuery] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchList()
      .then((rows) => {
        setList(rows);
        if (rows[0] && !selected) setSelected(rows[0].productName);
      })
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)));
  }, [fetchList, selected]);

  useEffect(() => {
    if (!selected) return;
    setLoadingSeries(true);
    fetchSeries({ data: { productName: selected } })
      .then(setSeries)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoadingSeries(false));
  }, [selected, fetchSeries]);

  const filtered = useMemo(() => {
    if (!list) return null;
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => p.productName.toLowerCase().includes(q));
  }, [list, query]);

  const chartData = useMemo(
    () =>
      (series ?? []).map((p) => ({
        date: fmtDate(p.date),
        price: Number(p.price.toFixed(2)),
        marketName: p.marketName,
      })),
    [series],
  );

  const stats = useMemo(() => {
    if (!series || series.length === 0) return null;
    const prices = series.map((p) => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const first = prices[0];
    const last = prices[prices.length - 1];
    const varTotal = first > 0 ? ((last - first) / first) * 100 : null;
    return { min, max, first, last, varTotal, count: series.length };
  }, [series]);

  return (
    <AppShell>
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <header className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <LineChartIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl">Histórico de preços</h1>
            <p className="text-sm text-muted-foreground">
              Cada cupom fiscal registrado alimenta a série. Compare leituras e veja a variação.
            </p>
          </div>
        </header>

        {err && (
          <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {err}
          </p>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          {/* Lista de produtos */}
          <Card className="max-h-[70vh] overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Produtos monitorados</CardTitle>
              <CardDescription>
                {list ? `${list.length} produto${list.length === 1 ? "" : "s"}` : "Carregando…"}
              </CardDescription>
              <Input
                placeholder="Buscar produto…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="mt-2"
              />
            </CardHeader>
            <CardContent className="p-0">
              <ul className="max-h-[52vh] overflow-y-auto divide-y">
                {list === null && (
                  <li className="p-4 text-center">
                    <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />
                  </li>
                )}
                {filtered && filtered.length === 0 && (
                  <li className="p-4 text-center text-sm text-muted-foreground">
                    Nenhum produto encontrado.
                  </li>
                )}
                {filtered?.map((p) => {
                  const active = selected === p.productName;
                  return (
                    <li key={p.productName}>
                      <button
                        type="button"
                        onClick={() => setSelected(p.productName)}
                        aria-pressed={active}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-inset ${
                          active ? "bg-primary/10" : "hover:bg-muted/50"
                        }`}
                      >
                        <ProductImage
                          src={p.imageUrl}
                          alt={p.displayName}
                          width={56}
                          height={56}
                          fallbackLabel={p.displayName}
                          className="h-14 w-14 flex-none rounded-md border bg-muted"
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <span className="line-clamp-2 text-sm font-medium">{p.displayName}</span>
                          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                            <span className="font-mono">{fmtBRL(p.lastPrice)}</span>
                            <VariationBadge pct={p.variationPct} />
                          </div>
                          <span className="block text-[10px] text-muted-foreground">
                            {p.readings} leitura{p.readings === 1 ? "" : "s"} · última {fmtDate(p.lastDate)}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          {/* Detalhe / gráfico */}
          <div className="space-y-4">
            {!selected && (
              <Card>
                <CardContent className="py-16 text-center text-sm text-muted-foreground">
                  {list && list.length === 0
                    ? "Nenhum cupom registrado ainda. Cadastre um em Admin > Registrar cupom fiscal."
                    : "Selecione um produto para ver o histórico."}
                </CardContent>
              </Card>
            )}

            {selected && (
              <>
                {(() => {
                  const current = list?.find((p) => p.productName === selected);
                  return (
                    <Card>
                      <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                        <ProductImage
                          src={current?.imageUrl}
                          alt={current?.displayName ?? selected}
                          width={96}
                          height={96}
                          sizes="96px"
                          fit="contain"
                          fallbackLabel={current?.displayName ?? selected}
                          className="h-24 w-24 flex-none rounded-lg border bg-muted"
                        />
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-lg">{current?.displayName ?? selected}</CardTitle>
                          <CardDescription>
                            {current?.brand ? `${current.brand} · ` : ""}
                            {stats
                              ? `${stats.count} leitura${stats.count === 1 ? "" : "s"} · mín. ${fmtBRL(stats.min)} · máx. ${fmtBRL(stats.max)}`
                              : "Carregando série…"}
                          </CardDescription>
                        </div>
                      </CardHeader>
                  <CardContent>
                    {loadingSeries && (
                      <div className="flex h-64 items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {!loadingSeries && chartData.length > 0 && (
                      <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 12, right: 24, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="signalStroke" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="var(--color-primary)" />
                                <stop offset="100%" stopColor="var(--color-savings)" />
                              </linearGradient>
                              <linearGradient id="signalFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="var(--color-border)"
                              opacity={0.6}
                            />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                              stroke="var(--color-border)"
                            />
                            <YAxis
                              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                              stroke="var(--color-border)"
                              tickFormatter={(v: number) => `R$${v.toFixed(2)}`}
                              domain={[
                                (dataMin: number) => Math.max(0, dataMin * 0.9),
                                (dataMax: number) => dataMax * 1.1,
                              ]}
                            />
                            <Tooltip
                              formatter={(v: number) => [fmtBRL(v), "Preço"]}
                              labelFormatter={(l) => `Data: ${l}`}
                              cursor={{ stroke: "var(--color-primary)", strokeOpacity: 0.35, strokeWidth: 1 }}
                              contentStyle={{
                                background: "var(--color-card)",
                                border: "1px solid var(--color-border)",
                                borderRadius: 10,
                                fontSize: 12,
                                color: "var(--color-foreground)",
                                boxShadow:
                                  "0 10px 30px -12px color-mix(in oklab, var(--color-primary) 45%, transparent)",
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="price"
                              stroke="url(#signalStroke)"
                              strokeWidth={2.5}
                              fill="url(#signalFill)"
                              dot={{ r: 3, fill: "var(--color-primary)", stroke: "var(--color-background)", strokeWidth: 1 }}
                              activeDot={{ r: 6, fill: "var(--color-savings)", stroke: "var(--color-primary)", strokeWidth: 2 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    {!loadingSeries && chartData.length === 0 && (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        Sem leituras registradas.
                      </p>
                    )}
                    {stats && stats.varTotal != null && stats.count > 1 && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Variação total (1ª → última leitura):{" "}
                        <span
                          className={
                            stats.varTotal > 0.01
                              ? "font-mono font-bold text-destructive"
                              : stats.varTotal < -0.01
                                ? "font-mono font-bold text-savings"
                                : "font-mono"
                          }
                        >
                          {stats.varTotal > 0 ? "+" : ""}
                          {stats.varTotal.toFixed(2).replace(".", ",")}%
                        </span>
                      </p>
                    )}
                  </CardContent>
                </Card>
                  );
                })()}

                {series && series.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Leituras</CardTitle>
                      <CardDescription>
                        Cada linha representa um cupom fiscal registrado. Variação = comparação com a leitura anterior.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                            <tr>
                              <th className="px-4 py-2 text-left">Data</th>
                              <th className="px-4 py-2 text-left">Mercado</th>
                              <th className="px-4 py-2 text-right">Preço</th>
                              <th className="px-4 py-2 text-right">Variação</th>
                            </tr>
                          </thead>
                          <tbody>
                            {series.map((p, idx) => {
                              const prev = idx > 0 ? series[idx - 1].price : null;
                              const pct = prev && prev > 0 ? ((p.price - prev) / prev) * 100 : null;
                              return (
                                <tr key={`${p.date}-${idx}`} className="border-b last:border-0">
                                  <td className="px-4 py-2 font-mono text-xs">{fmtDateTime(p.date)}</td>
                                  <td className="px-4 py-2">{p.marketName ?? "—"}</td>
                                  <td className="px-4 py-2 text-right font-mono">{fmtBRL(p.price)}</td>
                                  <td className="px-4 py-2 text-right">
                                    <VariationBadge pct={pct} />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {isAdmin && (
              <p className="text-xs text-muted-foreground">
                Precisa registrar um novo cupom?{" "}
                <Link to="/admin/cupom" className="underline">
                  Cupom individual
                </Link>{" "}
                ou{" "}
                <Link to="/admin/cupom-lote" className="underline">
                  em lote
                </Link>
                .
              </p>
            )}

          </div>
        </div>
      </section>
    </AppShell>
  );
}
