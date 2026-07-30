import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft, Crown, MapPin, TrendingDown, TrendingUp } from "lucide-react";

import {
  getProductComparison,
  getWhereToBuyRegions,
  type ProductComparisonDetail,
  type WhereToBuyRegions,
} from "@/lib/where-to-buy.functions";
import { Button } from "@/components/ui/button";
import { IsolatedPage } from "@/components/layout/IsolatedPage";
import { RankingSkeleton, FadeSwap } from "@/components/layout/LoadingSkeleton";
import { HomeBrandLink } from "@/components/layout/HomeBrandLink";
import { tc } from "@/lib/typeclear";
import { cn } from "@/lib/utils";
import { Price } from "@/components/ds/Price";

export const Route = createFileRoute("/onde-comprar_/$produto")({
  head: ({ params }) => {
    const nome = decodeURIComponent(params.produto).replace(/-/g, " ");
    return {
      meta: [
        { title: `Onde comprar ${nome} mais barato — PreçoCerto` },
        {
          name: "description",
          content: `Ranking por estabelecimento, melhores preços por bairro e histórico de variação de ${nome}.`,
        },
        { property: "og:title", content: `Onde comprar ${nome} mais barato` },
        {
          property: "og:description",
          content: "Compare preços por bairro e veja o histórico de variação nos mercados parceiros.",
        },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: ProdutoComparacaoPage,
});

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
const shortDay = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

function ProdutoComparacaoPage() {
  const { produto } = Route.useParams();
  const productKey = decodeURIComponent(produto);

  const fetchDetail = useServerFn(getProductComparison);
  const fetchRegions = useServerFn(getWhereToBuyRegions);

  const [city, setCity] = useState<string | null>(null);
  const [neighborhood, setNeighborhood] = useState<string | null>(null);
  const [days, setDays] = useState(60);

  const regionsQ = useQuery({
    queryKey: ["where-to-buy-regions"],
    queryFn: () => fetchRegions() as Promise<WhereToBuyRegions>,
    staleTime: 10 * 60_000,
  });

  const detailQ = useQuery({
    queryKey: ["product-comparison", productKey, city, neighborhood, days],
    queryFn: () =>
      fetchDetail({ data: { productKey, city, neighborhood, days } }) as Promise<ProductComparisonDetail | null>,
    staleTime: 60_000,
  });

  const d = detailQ.data ?? null;
  const hoods = (regionsQ.data?.neighborhoods ?? []).filter((h) => !city || h.city === city);

  const stateKey = detailQ.isLoading ? "loading" : !d ? "empty" : "ready";

  return (
    <IsolatedPage className="bg-background">
      <header className="border-b border-[var(--pc-surface-1-border)] bg-[var(--pc-surface-1)]">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Button asChild variant="ghost" size="sm" className="h-8 px-2">
            <Link to="/onde-comprar">
              <ArrowLeft className="mr-1 h-4 w-4" /> Comparar
            </Link>
          </Button>
          <HomeBrandLink />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-4">
        <FadeSwap showKey={stateKey}>
        {detailQ.isLoading ? (
          <RankingSkeleton rows={6} />
        ) : !d ? (
          <p className={cn(tc.meta, "pc-surface-2 p-6 text-center")}>
            Não encontramos preços para este produto com os filtros atuais.
          </p>
        ) : (
          <div className="space-y-2.5">

            {/* Cabeçalho + destaque do mais barato */}
            <section className="pc-surface-2 p-3">
              <p className={cn(tc.eyebrow, "mb-1")}>Produto</p>
              <h1 className={cn(tc.sectionTitle, "mb-0.5")}>{d.productName}</h1>
              <p className={cn(tc.metaMuted, "mb-2")}>
                {d.ranking.length} {d.ranking.length === 1 ? "loja" : "lojas"} • média {brl(d.avgPrice)} • maior{" "}
                {brl(d.maxPrice)}
                {d.category ? ` • ${d.category}` : ""}
              </p>

              <div className="pc-surface-3 flex flex-wrap items-center gap-2 p-2.5">
                <Crown className="h-5 w-5 shrink-0 text-[var(--pc-gold-ink)]" />
                <div className="min-w-0 flex-1">
                  <p className={cn(tc.eyebrow)}>
                    Menor preço da plataforma
                  </p>
                  <p className={cn(tc.itemTitle, "truncate")}>
                    <span className={cn(tc.storeName)}>{d.ranking[0].storeName}</span>
                    {d.ranking[0].neighborhood ? ` — ${d.ranking[0].neighborhood}` : ""}
                  </p>
                </div>
                <p className="pc-price pc-price--lg pc-price--best" style={{ fontSize: "clamp(22px, 3vw, 32px)" }}>{brl(d.minPrice)}</p>
                {d.savingsPct > 0 && (
                  <span className="rounded-full bg-[var(--pc-gold-ink)]/10 px-2 py-0.5 text-[12px] font-semibold text-[var(--pc-gold-ink)]">
                    até {d.savingsPct}% de economia
                  </span>
                )}
              </div>
            </section>

            {/* Filtros */}
            <section className="flex flex-wrap items-center gap-1.5 pc-surface-2 px-2.5 py-2">
              <span className={cn(tc.meta, "inline-flex items-center gap-1 font-semibold")}>
                <MapPin className="h-3.5 w-3.5" /> Região
              </span>
              <Button
                size="sm"
                variant={city === null && neighborhood === null ? "default" : "outline"}
                className="h-7 px-2.5"
                onClick={() => {
                  setCity(null);
                  setNeighborhood(null);
                }}
              >
                Todas
              </Button>
              {(regionsQ.data?.cities ?? []).map((c) => (
                <Button
                  key={c}
                  size="sm"
                  variant={city === c ? "default" : "outline"}
                  className="h-7 px-2.5"
                  onClick={() => {
                    setCity(c);
                    setNeighborhood(null);
                  }}
                >
                  {c}
                </Button>
              ))}
              {hoods.slice(0, 10).map((h) => (
                <Button
                  key={h.name}
                  size="sm"
                  variant={neighborhood === h.name ? "default" : "outline"}
                  className="h-7 px-2.5"
                  onClick={() => setNeighborhood(neighborhood === h.name ? null : h.name)}
                >
                  {h.name}
                </Button>
              ))}
              <span className={cn(tc.meta, "ml-auto")}>Histórico</span>
              {[30, 60, 90].map((r) => (
                <Button
                  key={r}
                  size="sm"
                  variant={days === r ? "default" : "outline"}
                  className="h-7 px-2.5"
                  onClick={() => setDays(r)}
                >
                  {r}d
                </Button>
              ))}
            </section>

            <div className="grid gap-2.5 lg:grid-cols-2">
              {/* Ranking por estabelecimento */}
              <section className="pc-surface-2 p-2.5">
                <p className={cn(tc.eyebrow, "mb-1")}>Ranking</p><p className={cn(tc.sectionTitle, "mb-1.5")}>Por estabelecimento</p>
                <ul className="space-y-1">
                  {d.ranking.map((r) => (
                    <li
                      key={`${r.establishmentId ?? r.storeName}`}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-2 py-1.5",
                        r.position === 1 ? "border-emerald-500/50 bg-emerald-500/5" : "border-border/60",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-6 w-6 shrink-0 place-items-center rounded-md text-[12px] font-bold",
                          r.position === 1
                            ? "bg-emerald-600 text-white"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {r.position}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn(tc.itemTitle, "block truncate")}>{r.storeName}</span>
                        <span className={cn(tc.meta, "block truncate")}>
                          {[r.neighborhood, r.city].filter(Boolean).join(" • ") || "—"}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className={cn(tc.itemTitle, r.position === 1 && "text-emerald-600")}>
                          <span className="pc-price pc-price--md">{brl(r.price)}</span>
                        </span>
                        {r.diffPct > 0 && <span className={cn(tc.meta, "block")}>+{r.diffPct}%</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <div className="space-y-2.5">
                {/* Histórico de variação */}
                <section className="pc-surface-2 p-2.5">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className={cn(tc.sectionTitle)}>Histórico de variação</p>
                    {d.variationPct != null && (
                      <span
                        className={cn(
                          tc.meta,
                          "inline-flex items-center gap-1 font-semibold",
                          d.variationPct > 0 ? "text-destructive" : "text-emerald-600",
                        )}
                      >
                        {d.variationPct > 0 ? (
                          <TrendingUp className="h-3.5 w-3.5" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5" />
                        )}
                        {d.variationPct > 0 ? "+" : ""}
                        {d.variationPct}% em {days} dias
                      </span>
                    )}
                  </div>
                  {d.history.length < 2 ? (
                    <p className={cn(tc.meta, "py-8 text-center")}>
                      Ainda não há histórico suficiente para este produto.
                    </p>
                  ) : (
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={d.history.map((p) => ({ ...p, label: shortDay(p.day) }))}
                          margin={{ top: 4, right: 6, bottom: 0, left: -18 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 10 }} width={44} />
                          <Tooltip
                            formatter={(v: number, k) => [brl(Number(v)), k === "minPrice" ? "Menor" : "Média"]}
                            contentStyle={{ fontSize: 12 }}
                          />
                          <Area
                            type="monotone"
                            dataKey="minPrice"
                            stroke="hsl(var(--primary))"
                            fill="hsl(var(--primary) / 0.15)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </section>

                {/* Melhor preço por bairro */}
                <section className="pc-surface-2 p-2.5">
                  <p className={cn(tc.eyebrow, "mb-1")}>Cobertura</p><p className={cn(tc.sectionTitle, "mb-1.5")}>Melhor preço por bairro</p>
                  <ul className="space-y-1">
                    {d.byNeighborhood.map((h) => (
                      <li
                        key={h.neighborhood}
                        className="flex items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5"
                      >
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1">
                          <span className={cn(tc.itemTitle, "block truncate")}>{h.neighborhood}</span>
                          <span className={cn(tc.meta, "block truncate")}>
                            {h.storeName} • {h.stores} {h.stores === 1 ? "loja" : "lojas"}
                          </span>
                        </span>
                        <span className="pc-price pc-price--md shrink-0">{brl(h.minPrice)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
          </div>
        )}
        </FadeSwap>
      </main>
    </IsolatedPage>

  );
}
