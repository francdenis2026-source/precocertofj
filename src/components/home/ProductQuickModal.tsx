import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getPublicProduct,
  type PublicProduct,
} from "@/lib/public-product.functions";
import {
  Store as StoreIcon,
  TrendingDown,
  ArrowUpRight,
  Package,
  Sparkles,
  
  MapPin,
  AlertTriangle,
  Filter,
  RefreshCw,
} from "lucide-react";
import { HighlightMatch } from "@/components/search/HighlightMatch";
import { UnitPriceBadge } from "@/components/product/UnitPriceBadge";
import { ShareButton } from "@/components/ui/share-button";
import { cn } from "@/lib/utils";
import { useMyRoles } from "@/hooks/useMyRoles";

import { formatShortDate } from "@/components/product/TrustIndicator";
import { Price } from "@/components/ds/Price";
const dateFmt = (iso: string) => formatShortDate(iso);

const STALE_DAYS = 30;

/** Retorna dias completos desde a data ISO. */
function daysSince(iso: string): number {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return 0;
  return Math.max(0, Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24)));
}

function freshnessLabel(days: number): string {
  if (days <= 0) return "hoje";
  if (days === 1) return "há 1 dia";
  if (days < 30) return `há ${days} dias`;
  if (days < 60) return "há 1 mês";
  const months = Math.floor(days / 30);
  return `há ${months} meses`;
}

type SortMode = "cheapest" | "savings" | "recent";



const brl = (n: number | null | undefined) =>
  typeof n === "number"
    ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "—";

export function ProductQuickModal({
  slug,
  open,
  onOpenChange,
  fallbackName,
  queryTokens = [],
}: {
  slug: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  fallbackName?: string;
  queryTokens?: string[];
}) {

  const fetchProduct = useServerFn(getPublicProduct);
  const [data, setData] = useState<PublicProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const { isAdmin, loading: rolesLoading } = useMyRoles();

  useEffect(() => {
    if (!open || !slug) return;
    let cancelled = false;
    setLoading(true);
    setErr(null);
    if (reloadTick === 0) setData(null);
    fetchProduct({ data: { slug } })
      .then((r) => {
        if (!cancelled) {
          setData(r);
          setRefreshedAt(new Date());
        }
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setErr(e instanceof Error ? e.message : "Falha ao carregar");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, slug, reloadTick]);
  

  const title = data?.displayName ?? fallbackName ?? "Detalhes do produto";
  const drop =
    data?.currentPrice != null &&
    data?.previousPrice != null &&
    data.previousPrice > data.currentPrice
      ? Math.round(
          ((data.previousPrice - data.currentPrice) / data.previousPrice) * 100,
        )
      : null;

  // Filtros e ordenação da lista de mercados.
  const [sortMode, setSortMode] = useState<SortMode>("cheapest");
  const [selectedMarkets, setSelectedMarkets] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Reset filtros quando muda de produto.
  useEffect(() => {
    setSelectedMarkets(new Set());
    setSortMode("cheapest");
    setShowFilters(false);
  }, [slug]);

  const visibleMarkets = useMemo(() => {
    if (!data?.markets) return [];
    const base =
      selectedMarkets.size === 0
        ? data.markets
        : data.markets.filter((m) => selectedMarkets.has(m.marketName));
    const withMeta = base.map((m) => ({
      ...m,
      _savings: m.priceMin > 0 ? (m.priceMax - m.priceMin) / m.priceMin : 0,
      _daysOld: daysSince(m.lastSeen),
    }));
    switch (sortMode) {
      case "savings":
        return withMeta.sort((a, b) => b._savings - a._savings);
      case "recent":
        return withMeta.sort((a, b) => a._daysOld - b._daysOld);
      default:
        return withMeta.sort((a, b) => a.priceMin - b.priceMin);
    }
  }, [data, selectedMarkets, sortMode]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0">
        <div className="hairline-gold relative flex items-center gap-4 border-b border-[color-mix(in_oklab,var(--color-accent)_25%,transparent)] bg-gradient-to-br from-primary/8 via-surface to-transparent p-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color-mix(in_oklab,var(--color-accent)_55%,transparent)] to-transparent"
          />
          <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--color-accent)_25%,transparent)] bg-surface">
            {data?.imageUrl ? (
              <img
                src={data.imageUrl}
                alt={title}
                className="h-full w-full object-cover"
              />
            ) : (
              <Package
                className="h-8 w-8 text-muted-foreground"
                strokeWidth={1.4}
              />
            )}
          </div>
          <div className="min-w-0 flex-1 pr-8">
            <DialogHeader className="space-y-1.5 text-left">
              <span
                role="note"
                aria-label="Seção 01: Visão rápida"
                className="inline-flex w-fit items-center gap-1 rounded-full border border-accent-strong/40 bg-accent/10 px-2 py-0.5 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-strong"
              >
                <span aria-hidden="true" className="tabular-nums">01</span>
                <span aria-hidden="true" className="opacity-40">·</span>
                <span aria-hidden="true">Visão rápida</span>
              </span>
              <DialogTitle className="font-display text-[20px] font-semibold leading-tight tracking-tight text-foreground">
                <HighlightMatch text={title} tokens={queryTokens} />
              </DialogTitle>
            </DialogHeader>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {data?.brand && (
                <span className="font-display text-[12px] normal-case tracking-tight text-foreground">
                  <HighlightMatch text={data.brand} tokens={queryTokens} />
                </span>
              )}
              {data?.unit && (
                <>
                  <span aria-hidden="true" className="text-accent-strong/50">·</span>
                  <span>{data.unit}</span>
                </>
              )}
              {data?.barcode && (
                <>
                  <span aria-hidden="true" className="text-accent-strong/50">·</span>
                  <span className="tabular-nums">EAN {data.barcode}</span>
                </>
              )}
            </div>
          </div>

          {data?.slug && (
            <div className="absolute right-4 top-4 flex items-center gap-1.5">
              {!rolesLoading && isAdmin && (
                <button
                  type="button"
                  onClick={() => setReloadTick((t) => t + 1)}
                  disabled={loading}
                  aria-label="Atualizar preços (admin)"
                  title={
                    refreshedAt
                      ? `Atualizado às ${refreshedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                      : "Atualizar preços (somente admin)"
                  }
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground shadow-sm transition hover:border-accent-strong/50 hover:text-accent-strong disabled:opacity-50"
                >
                  <RefreshCw
                    className={cn("h-3.5 w-3.5", loading && "animate-spin")}
                    strokeWidth={1.8}
                  />
                </button>
              )}
              <ShareButton
                url={`/produto-publico/${data.slug}`}
                title={data.displayName}
                text={`Confira o preço de ${data.displayName} em todos os mercados`}
                label="Compartilhar"
                compact
              />
            </div>
          )}
        </div>



        <div className="space-y-5 p-5">
          {loading && (
            <div className="rounded-2xl border border-border bg-surface p-4 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Carregando informações do produto…
            </div>
          )}
          {err && (
            <p className="rounded-xl bg-destructive/90 px-3 py-2 text-xs font-medium text-white">
              {err}
            </p>
          )}

          {data && !loading && (
            <>
              {/* Preço em destaque */}
              <div className="hairline-gold relative rounded-2xl border border-[color-mix(in_oklab,var(--color-accent)_20%,transparent)] bg-surface p-3">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[color-mix(in_oklab,var(--color-accent)_55%,transparent)] to-transparent"
                />
                <div className="grid grid-cols-3 gap-2">
                  <Stat label="Menor" value={data.min} accent />
                  <Stat label="Média" value={data.avg} />
                  <Stat label="Maior" value={data.max} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <UnitPriceBadge
                    price={data.min}
                    productName={data.displayName}
                    showPack
                  />
                </div>
              </div>

              {drop != null && drop > 0 && (
                <div className="flex items-center gap-2 rounded-xl border border-[color-mix(in_oklab,var(--color-savings,var(--color-accent))_30%,transparent)] bg-savings/8 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-savings">
                  <TrendingDown className="h-4 w-4" strokeWidth={1.8} />
                  <span>
                    Caiu{" "}
                    <span className="font-display text-[13px] font-semibold normal-case tracking-tight tabular-nums">
                      {drop}%
                    </span>{" "}
                    desde a última leitura
                  </span>
                </div>
              )}

              {/* Mercados */}
              <section aria-label="Preços por mercado">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <div className="min-w-0">
                    <span
                      role="note"
                      aria-label="Seção 02: Preços por mercado"
                      className="inline-flex w-fit items-center gap-1 rounded-full border border-accent-strong/40 bg-accent/10 px-2 py-0.5 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-strong"
                    >
                      <span aria-hidden="true" className="tabular-nums">02</span>
                      <span aria-hidden="true" className="opacity-40">·</span>
                      <span aria-hidden="true">Por mercado</span>
                    </span>
                    <h3 className="mt-1 flex items-center gap-1.5 font-display text-[16px] font-semibold tracking-tight text-foreground">
                      <StoreIcon
                        className="h-4 w-4 text-accent-strong"
                        strokeWidth={1.6}
                        aria-hidden="true"
                      />
                      Estabelecimentos{" "}
                      <span className="font-sans text-[12px] font-medium text-muted-foreground tabular-nums">
                        ({data.markets.length})
                      </span>
                    </h3>
                  </div>

                  {data.samples > 0 && (
                    <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      {data.samples} amostra{data.samples > 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {data.markets.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border bg-surface px-3 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Ainda não temos preços por mercado para este item.
                  </p>
                ) : (
                  <>
                    {/* Toolbar de ordenação + filtro */}
                    <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-[color-mix(in_oklab,var(--color-accent)_20%,transparent)] bg-surface/60 px-2.5 py-2">
                      <div className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        <span>Ordenar:</span>
                      </div>
                      <div className="flex gap-1">
                        {([
                          ["cheapest", "Menor preço"],
                          ["savings", "Maior economia"],
                          ["recent", "Mais recente"],
                        ] as [SortMode, string][]).map(([mode, label]) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setSortMode(mode)}
                            className={cn(
                              "rounded-full border px-2.5 py-1 font-sans text-[11px] font-medium transition-colors",
                              sortMode === mode
                                ? "border-accent-strong bg-accent/20 text-accent-strong"
                                : "border-border bg-transparent text-muted-foreground hover:bg-accent/10",
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowFilters((v) => !v)}
                        className={cn(
                          "ml-auto inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-sans text-[11px] font-medium transition-colors",
                          selectedMarkets.size > 0
                            ? "border-accent-strong bg-accent/20 text-accent-strong"
                            : "border-border text-muted-foreground hover:bg-accent/10",
                        )}
                      >
                        <Filter className="h-3 w-3" strokeWidth={1.8} />
                        {selectedMarkets.size > 0
                          ? `${selectedMarkets.size} filtrado${selectedMarkets.size > 1 ? "s" : ""}`
                          : "Filtrar mercados"}
                      </button>
                    </div>

                    {showFilters && (
                      <div className="mb-2 flex flex-wrap gap-1.5 rounded-xl border border-dashed border-border bg-surface/40 px-2.5 py-2">
                        {data.markets.map((m) => {
                          const active = selectedMarkets.has(m.marketName);
                          return (
                            <button
                              key={m.marketName}
                              type="button"
                              onClick={() =>
                                setSelectedMarkets((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(m.marketName)) next.delete(m.marketName);
                                  else next.add(m.marketName);
                                  return next;
                                })
                              }
                              className={cn(
                                "rounded-full border px-2 py-0.5 font-sans text-[11px] font-medium transition-colors",
                                active
                                  ? "border-accent-strong bg-accent/20 text-accent-strong"
                                  : "border-border text-muted-foreground hover:bg-accent/10",
                              )}
                            >
                              {m.marketName}
                            </button>
                          );
                        })}
                        {selectedMarkets.size > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedMarkets(new Set())}
                            className="rounded-full px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground underline underline-offset-2 hover:text-foreground"
                          >
                            Limpar
                          </button>
                        )}
                      </div>
                    )}

                    <ul className="divide-y divide-[color-mix(in_oklab,var(--color-accent)_18%,transparent)] overflow-hidden border-t border-[color-mix(in_oklab,var(--color-accent)_25%,transparent)]">
                      {visibleMarkets.slice(0, 12).map((m, i) => {
                        const isBest = sortMode === "cheapest" && i === 0 && selectedMarkets.size === 0;
                        const best = data.markets[0]?.priceMin ?? m.priceMin;
                        const deltaPct =
                          best > 0 && m.priceMin > best
                            ? Math.round(((m.priceMin - best) / best) * 100)
                            : 0;
                        const days = m._daysOld;
                        const isStale = days >= STALE_DAYS;
                        return (
                          <li
                            key={m.marketName}
                            className={cn(
                              "flex flex-col gap-2 py-2.5 pr-0.5 sm:flex-row sm:items-center sm:justify-between",
                              isStale && "opacity-70",
                            )}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span
                                role="img"
                                aria-label={`Posição ${i + 1}`}
                                className={
                                  "grid h-7 w-7 shrink-0 place-items-center rounded-full border font-sans text-[11px] font-semibold tabular-nums " +
                                  (isBest
                                    ? "border-savings/50 bg-savings/15 text-savings"
                                    : "border-accent-strong/40 bg-accent/10 text-accent-strong")
                                }
                              >
                                <span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                              </span>

                              <div className="min-w-0 flex-1">
                                <p className="flex flex-wrap items-center gap-1.5 font-display text-[14px] font-medium tracking-tight text-foreground">
                                  {isBest && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-savings/40 bg-savings/15 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.22em] text-savings">
                                      <Sparkles className="h-2.5 w-2.5" strokeWidth={2} aria-hidden="true" />
                                      Mais barato
                                    </span>
                                  )}
                                  <span className="truncate">{m.marketName}</span>
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.22em]",
                                      isStale
                                        ? "border-destructive/40 bg-destructive/10 text-destructive"
                                        : days <= 7
                                          ? "border-savings/40 bg-savings/10 text-savings"
                                          : "border-border bg-surface text-muted-foreground",
                                    )}
                                    title={`Última leitura ${dateFmt(m.lastSeen)}`}
                                  >
                                    {isStale && <AlertTriangle className="h-2.5 w-2.5" strokeWidth={2} aria-hidden="true" />}
                                    {freshnessLabel(days)}
                                  </span>
                                </p>
                                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                                  <span>{m.samples} leitura{m.samples > 1 ? "s" : ""}</span>
                                  <span aria-hidden="true" className="text-accent-strong/50">·</span>
                                  <span className="normal-case tracking-normal">
                                    Últ. {dateFmt(m.lastSeen)}
                                  </span>
                                  {m.city && (
                                    <>
                                      <span aria-hidden="true" className="text-accent-strong/50">·</span>
                                      <span className="inline-flex items-center gap-0.5 normal-case tracking-normal">
                                        <MapPin className="h-2.5 w-2.5" strokeWidth={2} aria-hidden="true" />
                                        {m.neighborhood ? `${m.neighborhood}, ${m.city}` : m.city}
                                        {m.state ? `/${m.state}` : ""}
                                      </span>
                                    </>
                                  )}
                                  {!isBest && deltaPct > 0 && (
                                    <>
                                      <span aria-hidden="true" className="text-accent-strong/50">·</span>
                                      <span className="text-destructive">+{deltaPct}% vs melhor</span>
                                    </>
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="grid shrink-0 grid-cols-3 gap-2 text-right sm:min-w-[260px]">
                              <MiniStat label="Menor" value={m.priceMin} highlight />
                              <MiniStat label="Média" value={m.priceAvg} />
                              <MiniStat label="Maior" value={m.priceMax} />
                            </div>
                          </li>
                        );
                      })}
                    </ul>

                    {visibleMarkets.length === 0 && (
                      <p className="mt-2 rounded-xl border border-dashed border-border bg-surface px-3 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        Nenhum mercado corresponde ao filtro atual.
                      </p>
                    )}
                  </>
                )}
              </section>



              {/* Ranking por cidade */}
              {data.citiesRanking.length > 0 && (
                <section aria-label="Onde é mais barato por região">
                  <div className="mb-2">
                    <span
                      role="note"
                      aria-label="Seção 03: Onde é mais barato por região"
                      className="inline-flex w-fit items-center gap-1 rounded-full border border-accent-strong/40 bg-accent/10 px-2 py-0.5 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-strong"
                    >
                      <span aria-hidden="true" className="tabular-nums">03</span>
                      <span aria-hidden="true" className="opacity-40">·</span>
                      <span aria-hidden="true">Por região</span>
                    </span>
                    <h3 className="mt-1 flex items-center gap-1.5 font-display text-[16px] font-semibold tracking-tight text-foreground">
                      <MapPin className="h-4 w-4 text-accent-strong" strokeWidth={1.6} aria-hidden="true" />
                      Onde fica mais barato
                    </h3>
                  </div>
                  <ul className="grid gap-1.5 sm:grid-cols-2">
                    {data.citiesRanking.slice(0, 6).map((c, i) => (
                      <li
                        key={c.city}
                        className={
                          "flex items-center justify-between gap-2 rounded-xl border px-3 py-2 " +
                          (i === 0
                            ? "border-savings/40 bg-savings/8"
                            : "border-border bg-surface")
                        }
                      >
                        <div className="min-w-0">
                          <p className="truncate font-display text-[13px] font-medium tracking-tight text-foreground">
                            {c.city}{c.state ? `/${c.state}` : ""}
                          </p>
                          <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            {c.bestMarket} · {c.marketsCount} merc.
                          </p>
                        </div>
                        <div className="text-right">
                          <Price
                            as="p"
                            value={c.bestPrice}
                            size="md"
                            tone={i === 0 ? "best" : "default"}
                          />
                          <p className="mt-0 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            média <Price value={c.avgPrice} size="xs" tone="muted" />
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* CTA */}
              <div className="flex flex-col-reverse gap-2 border-t border-[color-mix(in_oklab,var(--color-accent)_25%,transparent)] pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="rounded-full border border-border bg-surface px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-foreground transition hover:border-[color-mix(in_oklab,var(--color-accent)_45%,transparent)]"
                >
                  Fechar
                </button>
                <Link
                  to="/produto-publico/$slug"
                  params={{ slug: data.slug }}
                  onClick={() => onOpenChange(false)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--color-accent)_55%,transparent)] bg-primary px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-primary-foreground shadow-[0_1px_0_color-mix(in_oklab,var(--color-accent)_45%,transparent)_inset] transition hover:opacity-90"
                >
                  Ver página completa
                  <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.8} />
                </Link>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  /** Valor monetário em reais — formatado pelo componente <Price />. */
  value: number | null | undefined;
  accent?: boolean;
}) {
  return (
    <div className="px-2.5 py-2 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent-strong">
        {label}
      </p>
      <Price
        as="p"
        value={value}
        size="lg"
        tone={accent ? "best" : "default"}
        className="mt-0.5 justify-center"
      />
    </div>
  );
}

function MiniStat({
  label,
  value,
  highlight,
}: {
  label: string;
  /** Valor monetário em reais — formatado pelo componente <Price />. */
  value: number | null | undefined;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-surface/60 px-1.5 py-1">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <Price
        as="p"
        value={value}
        size="sm"
        tone={highlight ? "best" : "default"}
        className="mt-0.5"
      />
    </div>
  );
}

