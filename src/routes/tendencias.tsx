import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Flame, Search, TrendingUp, MapPin, Layers } from "lucide-react";
import { PageHeader, SectionCard, EmptyState, LoadingSkeleton } from "@/components/layout";
import { MobileNav } from "@/components/nav/MobileNav";
import { getSearchTrendsSeries } from "@/lib/search-trends.functions";
import { useSearchTrendsRealtime } from "@/hooks/useSearchTrendsRealtime";
import { detectFoodCategory, ProductCategoryIcon } from "@/components/ds/ProductCategoryIcon";
import { regionLabel } from "@/lib/search-region";

export const Route = createFileRoute("/tendencias")({
  head: () => ({
    meta: [
      { title: "Tendências de busca — PreçoCerto" },
      {
        name: "description",
        content:
          "Veja em tempo real o que os moradores de Feijó mais procuram: gráficos por período, categoria e região das buscas de produtos.",
      },
      { property: "og:title", content: "Tendências de busca — PreçoCerto" },
      {
        property: "og:description",
        content: "Gráficos ao vivo dos produtos mais buscados por período, categoria e região.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrendsPage,
});

type Period = 1 | 7 | 30;

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: 1, label: "Hoje" },
  { value: 7, label: "7 dias" },
  { value: 30, label: "30 dias" },
];

const CATEGORY_LABELS: Record<string, string> = {
  arroz: "Arroz",
  feijao: "Feijão",
  graos: "Grãos",
  massa: "Massas",
  pao: "Padaria",
  farinha: "Farináceos",
  acucar: "Açúcar",
  cafe: "Café",
  leite: "Leite e derivados",
  queijo: "Queijos e frios",
  ovo: "Ovos",
  carne: "Carnes",
  frango: "Aves",
  peixe: "Peixes",
  embutido: "Embutidos",
  oleo: "Óleos",
  molho: "Molhos",
  tempero: "Temperos",
  enlatado: "Enlatados",
  biscoito: "Biscoitos",
  doce: "Doces",
  chocolate: "Chocolates",
  fruta: "Frutas",
  verdura: "Verduras e legumes",
  bebida: "Bebidas",
  refrigerante: "Refrigerantes",
  agua: "Água",
  suco: "Sucos",
  cerveja: "Bebidas alcoólicas",
  higiene: "Higiene",
  limpeza: "Limpeza",
  farmacia: "Farmácia",
  papel: "Papel e descartáveis",
  generic: "Outros",
};

const catLabel = (c: string) => CATEGORY_LABELS[c] ?? c;

function dayKeys(days: number): string[] {
  const out: string[] = [];
  const base = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(base.getTime() - i * 24 * 60 * 60 * 1000);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

function TrendsPage() {
  const [period, setPeriod] = useState<Period>(7);
  const [category, setCategory] = useState<string>("todas");
  const [region, setRegion] = useState<string>("todas");

  const seriesFn = useServerFn(getSearchTrendsSeries);
  const KEY = ["search-trends-series", period] as const;
  const q = useQuery({
    queryKey: KEY,
    queryFn: () => seriesFn({ data: { days: period } } as never),
    staleTime: 20_000,
  });
  useSearchTrendsRealtime([...KEY]);

  const points = useMemo(
    () =>
      ((q.data?.points ?? []) as Array<{
        date: string;
        query: string;
        region: string | null;
        count: number;
      }>).map((p) => ({ ...p, category: detectFoodCategory(p.query) })),
    [q.data],
  );

  /* Filtros disponíveis são derivados do próprio período consultado. */
  const categoryOptions = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of points) m.set(p.category, (m.get(p.category) ?? 0) + p.count);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [points]);

  const regionOptions = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of points) {
      const key = p.region ?? "__none__";
      m.set(key, (m.get(key) ?? 0) + p.count);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [points]);

  const filtered = useMemo(
    () =>
      points.filter(
        (p) =>
          (category === "todas" || p.category === category) &&
          (region === "todas" || (p.region ?? "__none__") === region),
      ),
    [points, category, region],
  );

  const chartData = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const k of dayKeys(period)) buckets.set(k, 0);
    for (const p of filtered) {
      if (!buckets.has(p.date)) continue;
      buckets.set(p.date, (buckets.get(p.date) ?? 0) + p.count);
    }
    return [...buckets.entries()].map(([date, buscas]) => ({
      date,
      label: shortDate(date),
      buscas,
    }));
  }, [filtered, period]);

  const topTerms = useMemo(() => {
    const m = new Map<string, { query: string; count: number; category: string }>();
    for (const p of filtered) {
      const cur = m.get(p.query);
      if (cur) cur.count += p.count;
      else m.set(p.query, { query: p.query, count: p.count, category: p.category });
    }
    return [...m.values()].sort((a, b) => b.count - a.count).slice(0, 12);
  }, [filtered]);

  const catChart = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of filtered) m.set(p.category, (m.get(p.category) ?? 0) + p.count);
    return [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([c, buscas]) => ({ categoria: catLabel(c), buscas }));
  }, [filtered]);

  const totalSearches = filtered.reduce((acc, p) => acc + p.count, 0);
  const uniqueTerms = new Set(filtered.map((p) => p.query)).size;
  const topTerm = topTerms[0]?.query ?? null;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <main className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <PageHeader
          title="Tendências de busca"
          description="O que os clientes estão procurando agora — atualizado em tempo real."
          breadcrumbs={[{ label: "Início", to: "/" }, { label: "Tendências" }]}
        />

        {/* Filtros */}
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-card p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden /> Período
            </span>
            <div role="group" aria-label="Período" className="flex flex-wrap gap-1.5">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPeriod(p.value)}
                  aria-pressed={period === p.value}
                  className={
                    "rounded-full border px-3 py-1 text-[12.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 " +
                    (period === p.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground")
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Layers className="h-3.5 w-3.5" aria-hidden /> Categoria
              </span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-9 rounded-lg border border-border bg-background px-2 text-[13px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <option value="todas">Todas as categorias</option>
                {categoryOptions.map(([c, n]) => (
                  <option key={c} value={c}>
                    {catLabel(c)} ({n})
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" aria-hidden /> Região
              </span>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="h-9 rounded-lg border border-border bg-background px-2 text-[13px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <option value="todas">Todas as regiões</option>
                {regionOptions.map(([r, n]) => (
                  <option key={r} value={r}>
                    {r === "__none__" ? "Sem região" : regionLabel(r)} ({n})
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Resumo */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: "Buscas no período", value: totalSearches.toLocaleString("pt-BR") },
            { label: "Termos diferentes", value: uniqueTerms.toLocaleString("pt-BR") },
            { label: "Termo líder", value: topTerm ?? "—" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-3">
              <p className="text-[12px] text-muted-foreground">{s.label}</p>
              <p className="truncate font-display text-lg font-semibold tabular-nums text-foreground">
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {q.isLoading ? (
          <LoadingSkeleton />
        ) : totalSearches === 0 ? (
          <EmptyState
            icon={Search}
            title="Ainda sem buscas neste recorte"
            description="Assim que os clientes pesquisarem produtos, os gráficos aparecem aqui automaticamente."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Volume de buscas por dia">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                    <defs>
                      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 10,
                        fontSize: 12,
                      }}
                      labelFormatter={(l) => `Dia ${l}`}
                      formatter={(v: any) => [v, "buscas"] as any}
                    />
                    <Area
                      type="monotone"
                      dataKey="buscas"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#trendFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title="Buscas por categoria">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={catChart}
                    layout="vertical"
                    margin={{ top: 4, right: 12, bottom: 4, left: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="categoria"
                      width={110}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 10,
                        fontSize: 12,
                      }}
                      formatter={(v: any) => [v, "buscas"] as any}
                    />
                    <Bar dataKey="buscas" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title="Termos mais buscados" className="lg:col-span-2">
              <ol className="grid gap-1.5 sm:grid-cols-2">
                {topTerms.map((t, i) => (
                  <li key={t.query}>
                    <Link
                      to="/buscar"
                      search={{ q: t.query } as never}
                      className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2 transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <span className="w-5 shrink-0 text-center text-[12px] font-bold tabular-nums text-muted-foreground">
                        {i + 1}
                      </span>
                      <ProductCategoryIcon
                        category={t.category as never}
                        aria-hidden
                        className="h-4 w-4 shrink-0 text-primary"
                      />
                      <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
                        {t.query}
                      </span>
                      {i === 0 ? (
                        <Flame className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                      ) : null}
                      <span className="shrink-0 text-[12.5px] font-semibold tabular-nums text-muted-foreground">
                        {t.count}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </SectionCard>
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  );
}
