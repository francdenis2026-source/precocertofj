import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { MobileNav } from "@/components/nav/MobileNav";

import {
  ArrowLeft,
  ChevronDown,
  Info,
  Package,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Trophy,
  ArrowDownWideNarrow,
  Percent,
  Filter,
} from "lucide-react";
import { getPublicProduct, type PublicProduct } from "@/lib/public-product.functions";
import { QuickCompareStrip } from "@/components/product/QuickCompareStrip";
import { ProductImage } from "@/components/product/ProductImage";
import { useSignedLogoUrl } from "@/hooks/use-signed-logo-urls";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { ProductDetailSkeleton, ErrorState, EmptyState } from "@/components/feedback";
import { PaywallInline } from "@/components/paywall/PaywallInline";
import { FreeQuotaBadge } from "@/components/paywall/FreeQuotaBadge";
import { useTeaserQuota } from "@/hooks/use-teaser-quota";
import { ShareButton, SignupCTA } from "@/components/ds";
import { useSession } from "@/hooks/useSession";
import { ProtectedGate } from "@/components/auth/ProtectedGate";


const fmt = (n: number | null | undefined) =>
  typeof n === "number" ? `R$ ${n.toFixed(2).replace(".", ",")}` : "—";

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

const productQuery = (slug: string, fn: (args: { data: { slug: string } }) => Promise<PublicProduct | null>) =>
  queryOptions({
    queryKey: ["public-product", slug],
    queryFn: () => fn({ data: { slug } }),
    staleTime: 60_000,
  });

export const Route = createFileRoute("/produto-publico/$slug")({
  head: ({ loaderData }: { loaderData?: PublicProduct }) => {
    const name = loaderData?.displayName ?? "Produto";
    const image = loaderData?.imageUrl;
    return {
      meta: [
        { title: `${name} — Preços em mercados | PreçoCerto` },
        {
          name: "description",
          content: `Veja preço atual, histórico e onde comprar ${name} mais barato.`,
        },
        { property: "og:title", content: `${name} — PreçoCerto` },
        {
          property: "og:description",
          content: `Preço atual, anterior e locais que vendem ${name}.`,
        },
        ...(image ? [{ property: "og:image", content: image }] : []),
      ],
    };
  },
  loader: async ({ params }) => {
    const res = await getPublicProduct({ data: { slug: params.slug } });
    if (!res) throw notFound();
    return res;
  },
  component: () => (
    <ProtectedGate>
      <ProductPublicPage />
    </ProtectedGate>
  ),
  pendingComponent: () => (
    <div className="mx-auto max-w-4xl px-4 py-4 md:px-6 md:py-6">
      <ProductDetailSkeleton />
    </div>
  ),
  errorComponent: ({ error, reset }) => (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <ErrorState title="Erro ao carregar produto" message={error.message} onRetry={reset} />
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <EmptyState
        icon={Package}
        title="Produto não encontrado"
        message="Este produto não existe ou foi removido do catálogo."
        action={
          <Link
            to="/comparador"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
          >
            Voltar ao comparador
          </Link>
        }
      />
    </div>
  ),
});

type SortKey = "price" | "savings" | "recent";

function ProductPublicPage() {
  const fetchProduct = useServerFn(getPublicProduct);
  const { slug } = Route.useParams();
  const initial = Route.useLoaderData();
  const { data } = useSuspenseQuery({
    ...productQuery(slug, fetchProduct),
    initialData: initial,
  });

  const signedImage = useSignedLogoUrl(data?.imageUrl);
  const { user } = useSession();

  const [sort, setSort] = useState<SortKey>("price");
  const [marketFilter, setMarketFilter] = useState<string>("all");

  // Cota grátis para visitantes: consome 1 crédito por produto único visto na
  // sessão (via `consumeOnce(slug)`). Recarregar/re-abrir o mesmo produto
  // NÃO gasta de novo — evitando desperdício por navegação/refresh.
  const quota = useTeaserQuota(3);
  useEffect(() => {
    if (!quota.loading && quota.isVisitor) quota.consumeOnce(`product:${slug}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quota.loading, slug]);
  const paywalled = quota.isVisitor && quota.exceeded;


  const bestMarket = useMemo(() => {
    if (!data) return null;
    return [...data.markets].sort((a, b) => a.priceMin - b.priceMin)[0] ?? null;
  }, [data]);

  const baseBest = bestMarket?.priceMin ?? data?.currentPrice ?? null;

  const filteredMarkets = useMemo(() => {
    if (!data) return [];
    const list = data.markets.filter(
      (m) => marketFilter === "all" || m.marketName === marketFilter,
    );
    const base = baseBest ?? 0;
    const sorted = [...list].sort((a, b) => {
      if (sort === "price") return a.priceMin - b.priceMin;
      if (sort === "recent")
        return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
      // savings: gap to overall priciest → % below max
      const maxOf = Math.max(...list.map((x) => x.priceMax || x.priceMin));
      const savA = maxOf > 0 ? (maxOf - a.priceMin) / maxOf : 0;
      const savB = maxOf > 0 ? (maxOf - b.priceMin) / maxOf : 0;
      if (savB !== savA) return savB - savA;
      return a.priceMin - base - (b.priceMin - base);
    });
    return sorted;
  }, [data, sort, marketFilter, baseBest]);

  if (!data) return null;

  const delta =
    data.currentPrice != null && data.previousPrice != null
      ? data.currentPrice - data.previousPrice
      : null;
  const deltaPct =
    delta != null && data.previousPrice
      ? (delta / data.previousPrice) * 100
      : null;

  const cheapest = bestMarket;
  const priciest = [...data.markets].sort((a, b) => b.priceMax - a.priceMax)[0];
  const spread =
    cheapest && priciest && priciest.priceMax > 0
      ? ((priciest.priceMax - cheapest.priceMin) / priciest.priceMax) * 100
      : 0;

  const bestPrice = data.currentPrice ?? cheapest?.priceMin ?? null;
  const maxPrice = Math.max(
    ...data.markets.map((m) => m.priceMax || m.priceMin),
    bestPrice ?? 0,
  );

  return (
    <div className="min-h-[100svh] bg-background pb-[calc(var(--mobile-nav-height)+1.5rem)] text-foreground md:pb-10">
      <FreeQuotaBadge variant="floating" />

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-2.5 md:px-6">
          <Link
            to="/comparador"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
            Voltar
          </Link>
          <span
            role="note"
            aria-label="Seção: Detalhes do produto"
            className="hidden items-center rounded-full border border-accent-strong/30 bg-accent/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-strong sm:inline-flex"
          >
            Detalhes do produto
          </span>
          <div className="flex items-center gap-2">
            <ShareButton
              title={`PreçoCerto — ${data.displayName}`}
              text={`Veja onde ${data.displayName} está mais barato`}
            />
            
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-3 py-3 md:px-6 md:py-5">
        {/* Hero — sticky compact so preço e delta ficam visíveis */}
        <section className="rounded-2xl border border-border bg-card p-3 md:p-4">
          <div className="grid gap-3 md:grid-cols-[120px_minmax(0,1fr)] md:gap-4">
            {/* Image */}
            <div className="relative mx-auto w-full max-w-[140px] overflow-hidden rounded-xl border border-border bg-gradient-to-br from-muted/60 to-background md:mx-0">
              <div className="aspect-square w-full">
                <ProductImage
                  src={signedImage ?? data.imageUrl}
                  alt={data.displayName}
                  fallbackIcon={Package}
                  fallbackLabel={data.displayName}
                  loading="eager"
                  className="h-full w-full"
                  imageClassName="object-contain p-2"
                />
              </div>
              {cheapest && data.markets.length > 1 && (
                <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-savings px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-savings-foreground shadow-sm">
                  <TrendingDown className="h-2.5 w-2.5" />
                  -{spread.toFixed(0)}%
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex min-w-0 flex-col">
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <span
                  role="note"
                  aria-label="Categoria: Produto"
                  className="inline-flex items-center rounded-full border border-accent-strong/30 bg-accent/10 px-2 py-0.5 text-accent-strong"
                >
                  Produto
                </span>
                {data.brand && (
                  <>
                    <span className="opacity-40" aria-hidden="true">·</span>
                    <span className="text-foreground">{data.brand}</span>
                  </>
                )}
                {data.unit && (
                  <>
                    <span className="opacity-40" aria-hidden="true">·</span>
                    <span>{data.unit}</span>
                  </>
                )}
              </div>
              <h1 className="mt-1.5 font-display text-base font-extrabold leading-tight tracking-tight text-foreground sm:text-lg md:text-xl">
                {data.displayName}
              </h1>

              {/* Price hero — visível sem rolagem */}
              <div className="mt-2.5 flex items-end justify-between gap-3 rounded-xl border border-border bg-background p-2.5 md:p-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-strong">
                    Melhor preço
                  </p>
                  <p className="mt-1 font-display text-[22px] font-extrabold tabular-nums leading-none text-primary sm:text-[28px]">
                    {fmt(bestPrice)}
                  </p>
                  {cheapest && (
                    <p className="mt-1 truncate text-[11px] text-muted-foreground">
                      em <span className="font-semibold text-foreground">{cheapest.marketName}</span>
                    </p>
                  )}
                  {delta != null && delta !== 0 && (
                    <p
                      className={`mt-1 inline-flex items-center gap-1 text-[11px] font-semibold ${
                        delta < 0 ? "text-savings" : "text-destructive"
                      }`}
                    >
                      {delta < 0 ? (
                        <TrendingDown className="h-3 w-3" />
                      ) : (
                        <TrendingUp className="h-3 w-3" />
                      )}
                      {delta < 0 ? "" : "+"}
                      {fmt(delta)}
                      {deltaPct != null && (
                        <span className="opacity-80">
                          {" "}({deltaPct > 0 ? "+" : ""}
                          {deltaPct.toFixed(1).replace(".", ",")}%)
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <AddToCartButton
                  slug={data.slug}
                  label={data.displayName}
                  variant="solid"
                  stopPropagation={false}
                />
              </div>

              {data.samples > 0 && (
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  <MiniStat label="Média" value={fmt(data.avg)} />
                  <MiniStat label="Mínimo" value={fmt(data.min)} />
                  <MiniStat label="Amostras" value={String(data.samples)} />
                </div>
              )}
            </div>
          </div>
        </section>

        {paywalled ? (
          <section className="mt-4">
            <PaywallInline
              title="Desbloqueie o histórico e o comparativo entre mercados"
              subtitle="Você já viu 3 produtos grátis. Crie sua conta para continuar consultando preços em cada mercado, tendências e alertas — tudo sem custo."
            />
          </section>
        ) : (
          <>
            {/* History chart */}
            {data.history.length >= 2 && (
              <section className="mt-3 rounded-2xl border border-border bg-card p-3 md:p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-strong">
                      Tendência
                    </p>
                    <h2 className="font-display text-sm font-bold text-foreground md:text-base">
                      Histórico de preços
                    </h2>
                  </div>
                  <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {data.history.length} dias
                  </span>
                </div>
                <Sparkline
                  points={data.history.map((h) => ({ x: h.date, y: h.min }))}
                  secondary={data.history.map((h) => ({ x: h.date, y: h.avg }))}
                />
              </section>
            )}

            {/* Quick compare strip: menor/maior preço, spread e atualização */}
            {data.markets.length > 1 && (
              <div className="mt-3">
                <QuickCompareStrip markets={data.markets} />
              </div>
            )}

            {/* Controls: sort + filter */}
            <section className="mt-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
                <h2 className="font-display text-sm font-bold text-foreground md:text-base">
                  Comparar mercados
                </h2>
                <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {filteredMarkets.length} de {data.markets.length}
                </span>
              </div>

              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <SortChip
                  active={sort === "price"}
                  onClick={() => setSort("price")}
                  icon={<ArrowDownWideNarrow className="h-3 w-3" strokeWidth={2.25} />}
                  label="Menor preço"
                />
                <SortChip
                  active={sort === "savings"}
                  onClick={() => setSort("savings")}
                  icon={<Percent className="h-3 w-3" strokeWidth={2.25} />}
                  label="Maior economia"
                />
                <SortChip
                  active={sort === "recent"}
                  onClick={() => setSort("recent")}
                  icon={<TrendingUp className="h-3 w-3" strokeWidth={2.25} />}
                  label="Mais recente"
                />

                {data.markets.length > 1 && (
                  <div className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2 py-1">
                    <Filter className="h-3 w-3 text-muted-foreground" strokeWidth={2} />
                    <select
                      value={marketFilter}
                      onChange={(e) => setMarketFilter(e.target.value)}
                      className="bg-transparent text-[11px] font-medium text-foreground outline-none"
                      aria-label="Filtrar por mercado"
                    >
                      <option value="all">Todos mercados</option>
                      {data.markets.map((m) => (
                        <option key={m.marketName} value={m.marketName}>
                          {m.marketName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {filteredMarkets.length === 0 ? (
                <EmptyState
                  icon={ShoppingBag}
                  title="Sem resultados"
                  message="Nenhum mercado corresponde a esse filtro."
                />
              ) : (
                <ul className="space-y-1.5">
                  {filteredMarkets.map((m, idx) => (
                    <MarketCard
                      key={m.marketName}
                      m={m}
                      index={idx}
                      isBest={idx === 0 && sort !== "recent"}
                      bestPrice={baseBest ?? m.priceMin}
                      maxPrice={maxPrice}
                      brand={data.brand}
                      unit={data.unit}
                      barcode={data.barcode}
                    />
                  ))}
                </ul>
              )}

              <div className="mt-3 flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.25} />
                <p>
                  A barra de fundo mostra o preço em relação ao mais alto encontrado. Toque em um card para ver marca, unidade e observações.
                </p>
              </div>
            </section>
          </>
        )}

        {!user ? (
          <div className="mt-6">
            <SignupCTA context="build-list" />
          </div>
        ) : null}
      </div>
      <MobileNav />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-2 py-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-strong">
        {label}
      </p>
      <p className="mt-1 font-display text-[17px] font-semibold tabular-nums leading-tight text-foreground">
        {value}
      </p>
    </div>
  );
}

function SortChip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors " +
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
        (active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/50")
      }
    >
      {icon}
      {label}
    </button>
  );
}

function MarketCard({
  m,
  index,
  isBest,
  bestPrice,
  maxPrice,
  brand,
  unit,
  barcode,
}: {
  m: PublicProduct["markets"][number];
  index: number;
  isBest: boolean;
  bestPrice: number;
  maxPrice: number;
  brand: string | null;
  unit: string | null;
  barcode: string | null;
}) {
  const [open, setOpen] = useState(false);
  const diff = m.priceMin - bestPrice;
  const diffPct = bestPrice > 0 ? (diff / bestPrice) * 100 : 0;
  const barPct = maxPrice > 0 ? Math.max(8, (m.priceMin / maxPrice) * 100) : 100;
  const variation =
    m.priceMax > 0 && m.priceMin > 0
      ? ((m.priceMax - m.priceMin) / m.priceMax) * 100
      : 0;
  const position = String(index + 1).padStart(2, "0");

  return (
    <li
      className={
        "group relative overflow-hidden rounded-xl border transition-colors " +
        (isBest
          ? "border-savings/40 bg-savings/[0.06]"
          : "border-border bg-card hover:bg-muted/30 focus-within:border-primary/50")
      }
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative w-full px-3 py-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
        aria-expanded={open}
      >
        <span
          aria-hidden="true"
          className={
            "absolute inset-y-0 left-0 z-0 " +
            (isBest ? "bg-savings/10" : "bg-muted/40")
          }
          style={{ width: `${barPct}%` }}
        />
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {isBest ? (
              <span
                role="img"
                aria-label="Melhor preço — posição 01"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-savings text-savings-foreground"
              >
                <Trophy className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
              </span>
            ) : (
              <span
                role="img"
                aria-label={`Posição ${position}`}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-accent-strong/30 bg-accent/10 font-display text-[11px] font-bold tabular-nums text-accent-strong"
              >
                {position}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {m.marketName}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {isBest ? (
                  <span className="font-semibold uppercase tracking-[0.18em] text-savings">
                    Melhor preço
                  </span>
                ) : diff > 0 ? (
                  <>
                    <span className="font-semibold text-destructive">+{fmt(diff)}</span>
                    <span className="opacity-90"> ({diffPct.toFixed(0)}% acima)</span>
                  </>
                ) : (
                  <>Média {fmt(m.priceAvg)}</>
                )}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span
              className={
                "font-display font-semibold tabular-nums leading-none " +
                (isBest
                  ? "text-[22px] text-savings"
                  : "text-[16px] text-foreground")
              }
            >
              {fmt(m.priceMin)}
            </span>
            <ChevronDown
              className={
                "h-4 w-4 text-muted-foreground transition-transform " +
                (open ? "rotate-180" : "")
              }
              strokeWidth={2}
              aria-hidden="true"
            />
          </div>
        </div>
      </button>

      {open && (
        <div className="relative z-10 border-t border-border bg-background/70 px-3 py-3">
          <div className="grid grid-cols-2 gap-2 text-[11px] md:grid-cols-4">
            <Detail label="Marca" value={brand ?? "—"} />
            <Detail label="Unidade" value={unit ?? "—"} />
            <Detail label="Amostras" value={String(m.samples)} />
            <Detail label="Variação" value={`${variation.toFixed(0)}%`} />
            <Detail label="Preço médio" value={fmt(m.priceAvg)} highlight />
            <Detail label="Menor preço" value={fmt(m.priceMin)} highlight />
            <Detail label="Maior preço" value={fmt(m.priceMax)} highlight />
            <Detail label="Último scan" value={fmtDate(m.lastSeen)} />
          </div>

          {m.history.length >= 2 && (
            <div className="mt-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Últimos preços neste mercado
              </p>
              <Sparkline
                points={m.history.map((h) => ({ x: h.date, y: h.min }))}
                compact
              />
            </div>
          )}

          {barcode && (
            <p className="mt-3 truncate text-[11px] text-muted-foreground">
              <span className="font-semibold uppercase tracking-widest">
                Código de barras:
              </span>{" "}
              <span className="font-mono text-foreground">{barcode}</span>
            </p>
          )}

          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Preços variam por lote, promoções e datas. Os valores mostrados são o menor, médio e maior registrados nos últimos scans deste mercado.
          </p>
        </div>
      )}
    </li>
  );
}

function Detail({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-card px-2 py-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-strong">
        {label}
      </p>
      <p
        className={
          highlight
            ? "mt-1 truncate font-display text-[17px] font-semibold tabular-nums leading-tight text-foreground"
            : "mt-0.5 truncate text-xs font-semibold text-foreground"
        }
      >
        {value}
      </p>
    </div>
  );
}

function Sparkline({
  points,
  secondary,
  compact,
}: {
  points: Array<{ x: string; y: number }>;
  secondary?: Array<{ x: string; y: number }>;
  compact?: boolean;
}) {
  const w = 600;
  const h = compact ? 60 : 110;
  const padX = 6;
  const padY = 8;
  if (points.length < 2) return null;

  const allY = [
    ...points.map((p) => p.y),
    ...(secondary?.map((p) => p.y) ?? []),
  ];
  const yMin = Math.min(...allY);
  const yMax = Math.max(...allY);
  const yRange = yMax - yMin || 1;

  const toX = (i: number, len: number) =>
    padX + (i / Math.max(1, len - 1)) * (w - padX * 2);
  const toY = (y: number) => h - padY - ((y - yMin) / yRange) * (h - padY * 2);

  const path = (arr: Array<{ y: number }>) =>
    arr
      .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i, arr.length)} ${toY(p.y)}`)
      .join(" ");

  const areaPath = (arr: Array<{ y: number }>) => {
    if (arr.length < 2) return "";
    const line = path(arr);
    const first = `${toX(0, arr.length)} ${h - padY}`;
    const last = `${toX(arr.length - 1, arr.length)} ${h - padY}`;
    return `${line} L ${last} L ${first} Z`;
  };

  const last = points[points.length - 1];
  const first = points[0];
  const trend = last.y - first.y;

  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-auto w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="Gráfico de histórico de preços"
      >
        <defs>
          <linearGradient id="sparkGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={areaPath(points)}
          fill="url(#sparkGrad)"
          className="text-primary"
        />
        {secondary && (
          <path
            d={path(secondary)}
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
            strokeDasharray="3 3"
            className="text-muted-foreground"
          />
        )}
        <path
          d={path(points)}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          className="text-primary"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={toX(points.length - 1, points.length)}
          cy={toY(last.y)}
          r={3}
          className="fill-primary"
        />
      </svg>
      {!compact && (
        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {fmtDate(first.x)} · {fmt(first.y)}
          </span>
          <span
            className={
              "inline-flex items-center gap-1 font-semibold " +
              (trend < 0
                ? "text-savings"
                : trend > 0
                  ? "text-destructive"
                  : "text-muted-foreground")
            }
          >
            {trend < 0 ? (
              <TrendingDown className="h-3 w-3" />
            ) : trend > 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : null}
            {trend === 0 ? "estável" : `${trend > 0 ? "+" : ""}${fmt(trend)}`}
          </span>
          <span>
            {fmtDate(last.x)} · {fmt(last.y)}
          </span>
        </div>
      )}
    </div>
  );
}
