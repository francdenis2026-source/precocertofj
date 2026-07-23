import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  compareEstablishments,
  listComparableEstablishments,
  type CompareResult,
  type PublicEstablishmentLite,
} from "@/lib/compare-establishments.functions";
import { PageHeader, SectionCard } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MobileNav } from "@/components/nav/MobileNav";
import { EmptyState, InlineError, Spinner } from "@/components/feedback";
import { ExportMenu } from "@/components/data/ExportMenu";
import type { ExportColumn } from "@/lib/export";
import { Store, Scale, Trophy, TrendingDown, TrendingUp, Minus } from "lucide-react";

export const Route = createFileRoute("/comparar")({
  head: () => ({
    meta: [
      { title: "Comparar estabelecimentos — PreçoCerto" },
      {
        name: "description",
        content:
          "Compare preços lado a lado entre estabelecimentos de Feijó, veja o menor preço e a variação no tempo para cada item.",
      },
      { property: "og:title", content: "Comparar estabelecimentos — PreçoCerto" },
      {
        property: "og:description",
        content: "Menor preço e variação no tempo entre estabelecimentos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CompareRoute,
});

const MAX = 6;
const DAYS_OPTIONS = [7, 30, 90] as const;

function CompareRoute() {
  const fetchList = useServerFn(listComparableEstablishments);
  const fetchCompare = useServerFn(compareEstablishments);

  const stores = useQuery({
    queryKey: ["comparable-establishments"],
    queryFn: () => fetchList(),
    staleTime: 5 * 60_000,
  });

  const [selected, setSelected] = useState<string[]>([]);
  const [productQuery, setProductQuery] = useState("");
  const [days, setDays] = useState<number>(30);
  const [runKey, setRunKey] = useState(0);

  useEffect(() => {
    if (selected.length === 0 && stores.data && stores.data.length >= 2) {
      setSelected(stores.data.slice(0, Math.min(3, stores.data.length)).map((s) => s.id));
    }
  }, [stores.data, selected.length]);

  const comparison = useQuery<CompareResult>({
    queryKey: ["compare", selected.slice().sort().join(","), productQuery.trim(), days, runKey],
    queryFn: () =>
      fetchCompare({
        data: {
          establishmentIds: selected,
          productQuery: productQuery.trim() || undefined,
          days,
        },
      }),
    enabled: selected.length >= 2,
    staleTime: 60_000,
  });

  const estById = useMemo(() => {
    const map = new Map<string, PublicEstablishmentLite>();
    for (const s of stores.data ?? []) map.set(s.id, s);
    return map;
  }, [stores.data]);

  function toggleStore(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX) return prev;
      return [...prev, id];
    });
  }

  const result = comparison.data;
  const totalsByEst = useMemo(() => {
    const map = new Map<string, { total: number; coverage: number }>();
    for (const t of result?.basketTotals ?? []) map.set(t.establishmentId, t);
    return map;
  }, [result]);

  const exportColumns: ExportColumn<CompareResult["rows"][number]>[] = useMemo(() => {
    const base: ExportColumn<CompareResult["rows"][number]>[] = [
      { key: "product", header: "Produto", accessor: (r) => r.productName },
      {
        key: "avg",
        header: "Média",
        align: "right",
        accessor: (r) => (r.avgPrice != null ? r.avgPrice.toFixed(2).replace(".", ",") : ""),
      },
    ];
    for (const est of result?.establishments ?? []) {
      base.push({
        key: `est-${est.id}`,
        header: est.name,
        align: "right",
        accessor: (r) => {
          const c = r.cells.find((x) => x.establishmentId === est.id);
          return c?.price != null ? c.price.toFixed(2).replace(".", ",") : "";
        },
      });
    }
    return base;
  }, [result]);

  return (
    <div className="min-h-[100dvh] bg-background pb-[calc(var(--mobile-nav-height)+1rem)] text-foreground">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <PageHeader
          breadcrumbs={[{ label: "Comparar" }]}
          title="Comparar estabelecimentos"
          description="Selecione até 6 lojas e veja preços lado a lado, com variação no tempo e cesta total."
        />

        <SectionCard title="Filtros" description="Ajuste sua comparação." className="mb-6">
          <div className="grid gap-4">
            <div>
              <Label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Estabelecimentos ({selected.length}/{MAX})
              </Label>
              {stores.isPending && <Spinner />}
              {stores.isError && <InlineError message="Falha ao carregar estabelecimentos." />}
              {stores.data && (
                <div className="flex flex-wrap gap-2">
                  {stores.data.map((s) => {
                    const active = selected.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleStore(s.id)}
                        className={`press-sm tap-safe inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium focus-ring transition-colors ${
                          active
                            ? "border-primary bg-primary text-primary-foreground shadow-elev-1"
                            : "border-border bg-card text-foreground hover:border-ring/40"
                        }`}
                      >
                        <Store className="h-3.5 w-3.5" strokeWidth={1.8} />
                        <span className="truncate max-w-[10rem]">{s.name}</span>
                        {s.neighborhood && (
                          <span className="text-[10px] uppercase tracking-wide opacity-70">
                            {s.neighborhood}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
              <div>
                <Label htmlFor="cmp-query" className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Buscar produto (opcional)
                </Label>
                <Input
                  id="cmp-query"
                  placeholder="ex: arroz, café, leite…"
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Período
                </Label>
                <div className="flex gap-1">
                  {DAYS_OPTIONS.map((d) => (
                    <Button
                      key={d}
                      type="button"
                      variant={days === d ? "default" : "outline"}
                      size="sm"
                      className="press-sm"
                      onClick={() => setDays(d)}
                    >
                      {d}d
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex items-end gap-2">
                <Button
                  size="sm"
                  className="press-sm"
                  onClick={() => setRunKey((k) => k + 1)}
                  disabled={selected.length < 2 || comparison.isFetching}
                >
                  <Scale className="mr-2 h-4 w-4 icon-nudge" />
                  Comparar
                </Button>
                {result && result.rows.length > 0 && (
                  <ExportMenu<CompareResult["rows"][number]>
                    context="comparacao"
                    columns={exportColumns}
                    getRows={() => result.rows}
                    meta={{
                      title: "Comparação de estabelecimentos",
                      subtitle: `${result.rows.length} produtos • últimos ${days} dias`,
                      filters: [
                        productQuery ? `Busca: ${productQuery}` : "Todos os produtos",
                        `Lojas: ${result.establishments.map((e) => e.name).join(", ")}`,
                      ],
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </SectionCard>

        {selected.length < 2 && (
          <EmptyState
            icon={Scale}
            title="Selecione pelo menos 2 estabelecimentos"
            message="Escolha até 6 lojas nos chips acima para começar a comparação."
          />
        )}

        {comparison.isPending && selected.length >= 2 && (
          <div className="grid place-items-center py-12">
            <Spinner />
          </div>
        )}
        {comparison.isError && (
          <InlineError
            message={
              comparison.error instanceof Error
                ? comparison.error.message
                : "Falha ao carregar comparação."
            }
          />
        )}

        {result && result.rows.length === 0 && !comparison.isPending && (
          <EmptyState
            icon={Store}
            title="Sem produtos em comum"
            message="Nenhum histórico de preço encontrado no período para as lojas selecionadas."
          />
        )}

        {result && result.rows.length > 0 && (
          <>
            <SectionCard title="Cesta total" description="Soma dos menores preços por estabelecimento." className="mb-6">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {result.establishments.map((est) => {
                  const t = totalsByEst.get(est.id);
                  const isWinner = result.cheapestBasket === est.id;
                  const full = t && t.coverage === result.rows.length;
                  return (
                    <div
                      key={est.id}
                      className={`reveal rounded-xl border p-4 transition-all ${
                        isWinner
                          ? "border-neon bg-neon/5 shadow-elev-2"
                          : "border-border bg-card shadow-elev-1"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="grid h-8 w-8 place-items-center rounded-md text-xs font-bold text-white"
                          style={{ backgroundColor: est.brandColor ?? "hsl(var(--primary))" }}
                        >
                          {est.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">{est.name}</div>
                          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                            {t?.coverage ?? 0}/{result.rows.length} itens
                          </div>
                        </div>
                        {isWinner && (
                          <Badge className="bg-neon text-neon-foreground">
                            <Trophy className="mr-1 h-3 w-3" /> Mais barato
                          </Badge>
                        )}
                      </div>
                      <div className="mt-3 font-mono text-2xl font-bold tabular-nums">
                        R$ {(t?.total ?? 0).toFixed(2).replace(".", ",")}
                      </div>
                      {!full && (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Cesta parcial — nem todos os itens têm preço aqui.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title="Comparação lado a lado" description="Menor preço destacado por linha." bodyClassName="p-0">
              <div className="scroll-shadow overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-muted/40 text-[11px] uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="px-3 py-3 text-left">Produto</th>
                      <th className="px-3 py-3 text-right">Média</th>
                      {result.establishments.map((est) => (
                        <th key={est.id} className="px-3 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: est.brandColor ?? "hsl(var(--primary))" }}
                            />
                            <span className="max-w-[7rem] truncate">{est.name}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {result.rows.map((row) => (
                      <tr key={row.productKey} className="interactive-row">
                        <td className="px-3 py-3 font-medium">{row.productName}</td>
                        <td className="px-3 py-3 text-right font-mono text-muted-foreground tabular-nums">
                          {row.avgPrice != null
                            ? `R$ ${row.avgPrice.toFixed(2).replace(".", ",")}`
                            : "—"}
                        </td>
                        {result.establishments.map((est) => {
                          const cell = row.cells.find((c) => c.establishmentId === est.id);
                          return (
                            <td key={est.id} className="px-3 py-3 text-right">
                              {cell?.price == null ? (
                                <span className="text-xs text-muted-foreground">—</span>
                              ) : (
                                <div className="flex flex-col items-end gap-0.5">
                                  <span
                                    className={`font-mono text-base font-bold tabular-nums ${
                                      cell.isCheapest ? "text-neon" : "text-foreground"
                                    }`}
                                  >
                                    R$ {cell.price.toFixed(2).replace(".", ",")}
                                  </span>
                                  <ChangeChip pct={cell.changePct} />
                                  <Sparkline
                                    series={cell.series}
                                    color={est.brandColor ?? "hsl(var(--primary))"}
                                  />
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </>
        )}

        {estById.size === 0 && stores.isPending && (
          <div className="grid place-items-center py-16">
            <Spinner />
          </div>
        )}
      </div>
      <MobileNav />
    </div>
  );
}

function ChangeChip({ pct }: { pct: number | null }) {
  if (pct == null) return null;
  const Icon = pct < 0 ? TrendingDown : pct > 0 ? TrendingUp : Minus;
  const tone =
    pct < 0 ? "text-neon" : pct > 0 ? "text-destructive" : "text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-0.5 font-mono text-[10px] font-semibold ${tone}`}>
      <Icon className="h-3 w-3" strokeWidth={2} />
      {pct > 0 ? "+" : ""}
      {pct.toFixed(1)}%
    </span>
  );
}

function Sparkline({
  series,
  color,
}: {
  series: Array<{ t: string; p: number }>;
  color: string;
}) {
  if (!series || series.length < 2) return null;
  const w = 80;
  const h = 20;
  const prices = series.map((s) => s.p);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const points = prices
    .map((p, i) => {
      const x = (i / (prices.length - 1)) * w;
      const y = h - ((p - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
