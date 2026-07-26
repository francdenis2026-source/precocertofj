import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Clock,
  Flag,
  MapPin,
  Maximize2,
  Paperclip,
  Store as StoreIcon,
  TrendingDown,
  TrendingUp,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { MobileNav } from "@/components/nav/MobileNav";
import {
  getCrossStoreComparison,
  getPublicProductDetail,
  listMyPriceReports,
  submitPriceReport,
  type BestOfferReason,
  type CrossStoreOffer,
  type MyPriceReport,
  type PricePoint,
} from "@/lib/stores-public.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const productQuery = (storeId: string, slug: string) =>
  queryOptions({
    queryKey: ["public-product", storeId, slug],
    queryFn: () => getPublicProductDetail({ data: { storeId, slug } }),
    staleTime: 30_000,
  });

const compareQuery = (storeId: string, slug: string) =>
  queryOptions({
    queryKey: ["public-product-compare", storeId, slug],
    queryFn: () => getCrossStoreComparison({ data: { storeId, slug } }),
    staleTime: 30_000,
  });

const myReportsQuery = (storeId: string, slug: string) =>
  queryOptions({
    queryKey: ["my-price-reports", storeId, slug],
    queryFn: () => listMyPriceReports({ data: { productSlug: slug, establishmentId: storeId } }),
    staleTime: 15_000,
  });

export const Route = createFileRoute("/loja/$id/produto/$slug")({
  loader: async ({ context, params }) => {
    try {
      await context.queryClient.ensureQueryData(productQuery(params.id, params.slug));
    } catch {
      throw notFound();
    }
  },
  head: ({ params }) => ({
    meta: [
      { title: `Produto — PreçoCerto` },
      { name: "description", content: `Detalhes de preço de ${params.slug}.` },
    ],
  }),
  notFoundComponent: () => (
    <div className="mx-auto max-w-md px-4 py-12 text-center">
      <p className="text-sm text-muted-foreground">Produto não encontrado.</p>
      <Link to="/" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
        Voltar
      </Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-md px-4 py-12 text-center">
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : "Erro ao carregar produto"}
      </p>
    </div>
  ),
  component: ProductDetailPage,
});

const fmt = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;
function bestReasonHeadline(r: BestOfferReason): string {
  if (r.rankedBy === "pricePerUnit" && r.ppuAdvantagePct != null && r.ppuAdvantagePct > 0.5) {
    return `Menor preço por unidade (−${r.ppuAdvantagePct.toFixed(1).replace(".", ",")}%)`;
  }
  if (r.tiebreakByRecency) return "Empate técnico — venceu por recência";
  if (r.priceAdvantagePct != null && r.priceAdvantagePct > 0) {
    return `Menor preço (−${r.priceAdvantagePct.toFixed(1).replace(".", ",")}%)`;
  }
  return "Melhor combinação de preço e recência";
}
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
const fmtDateFull = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
const fmtRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const day = 86_400_000;
  const d = Math.floor(diff / day);
  if (d <= 0) return "hoje";
  if (d === 1) return "ontem";
  if (d < 7) return `há ${d} dias`;
  if (d < 30) return `há ${Math.floor(d / 7)} semana${Math.floor(d / 7) > 1 ? "s" : ""}`;
  if (d < 365) return `há ${Math.floor(d / 30)} mês${Math.floor(d / 30) > 1 ? "es" : ""}`;
  return `há ${Math.floor(d / 365)} ano${Math.floor(d / 365) > 1 ? "s" : ""}`;
};

function ProductDetailPage() {
  const { id, slug } = Route.useParams();
  const { data } = useSuspenseQuery(productQuery(id, slug));
  const { store, product, history, variations } = data;
  const { data: compareData } = useQuery(compareQuery(id, slug));
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const trend =
    history.length >= 2
      ? history[history.length - 1].price - history[0].price
      : 0;

  return (
    <div className="min-h-[100svh] bg-background pb-[calc(var(--mobile-nav-height)+1.5rem)] text-foreground">
      <div className="mx-auto max-w-md px-4 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <Link
          to="/loja/$id"
          params={{ id }}
          className="inline-flex items-center gap-1.5 pt-2 text-[12px] font-semibold text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {store.name}
        </Link>

        {/* Hero — thumbnail à esquerda + detalhes à direita */}
        <header className="mt-3 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <div className="flex gap-3 p-3">
            {/* Foto profissional em tamanho compacto — clique abre galeria com zoom */}
            <button
              type="button"
              onClick={() => product.imageUrl && setGalleryOpen(true)}
              disabled={!product.imageUrl}
              aria-label={product.imageUrl ? "Ampliar foto" : "Sem foto disponível"}
              className="group relative grid h-[104px] w-[104px] shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/10 via-surface to-accent/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {product.imageUrl ? (
                <>
                  <img
                    src={product.imageUrl}
                    alt={product.productName}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                    width={208}
                    height={208}
                  />
                  <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-background/85 text-foreground backdrop-blur">
                    <Maximize2 className="h-2.5 w-2.5" />
                  </span>
                </>
              ) : (
                <span className="font-display text-[38px] font-bold text-primary/85">
                  {product.productName.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="absolute bottom-1 left-1 rounded-full bg-background/90 px-1.5 py-[1px] text-[8.5px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
                {product.category}
              </span>
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="font-display text-[16px] font-bold leading-tight text-foreground">
                {product.productName}
              </h1>
              <p className="mt-0.5 flex items-center gap-1 text-[10.5px] text-muted-foreground">
                <StoreIcon className="h-3 w-3 shrink-0" />
                <span className="truncate">{store.name}</span>
                <span className="mx-0.5">·</span>
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {[store.neighborhood, store.city].filter(Boolean).join(", ")}
                </span>
              </p>

              <div className="mt-2 flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[8.5px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Último preço
                  </p>
                  <p className="num font-display text-[24px] font-extrabold leading-none text-primary">
                    {fmt(product.price)}
                  </p>
                  {product.pricePerUnit != null && product.unitLabel && (
                    <p className="num mt-0.5 text-[10.5px] text-muted-foreground">
                      {product.unitLabel} {product.pricePerUnit.toFixed(2).replace(".", ",")}
                    </p>
                  )}
                </div>
                {history.length >= 2 && (
                  <div
                    className={
                      "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold " +
                      (trend < 0
                        ? "bg-savings/15 text-savings"
                        : trend > 0
                          ? "bg-destructive/10 text-destructive"
                          : "bg-muted text-muted-foreground")
                    }
                  >
                    {trend < 0 ? (
                      <TrendingDown className="h-3 w-3" />
                    ) : (
                      <TrendingUp className="h-3 w-3" />
                    )}
                    {trend === 0
                      ? "estável"
                      : `${trend < 0 ? "-" : "+"}${fmt(Math.abs(trend))}`}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Banner de última atualização — destaque */}
          <div className="flex items-center justify-between gap-3 border-t border-border bg-primary/5 px-4 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <Clock className="h-3.5 w-3.5 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Preço atualizado
                </p>
                <p className="truncate text-[11.5px] font-semibold text-foreground">
                  {fmtDateFull(product.lastDate)}
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10.5px] font-semibold text-primary">
              {fmtRelative(product.lastDate)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-border p-3">
            <Stat label="Mínimo" value={fmt(product.minPrice)} accent="savings" />
            <Stat label="Média" value={fmt(product.avgPrice)} />
            <Stat label="Máximo" value={fmt(product.maxPrice)} accent="destructive" />
          </div>
        </header>

        {/* Meta */}
        <section className="mt-4 grid grid-cols-2 gap-2">
          <MetaBox label="Tamanho" value={product.unit ?? "—"} />
          <MetaBox label="Registros" value={String(product.historyCount)} />
          {product.barcode && <MetaBox label="Código" value={product.barcode} />}
          <MetaBox label="Atualizado" value={fmtDate(product.lastDate)} />
        </section>


        {/* Variations */}
        {variations.length > 0 && (
          <section aria-label="Outros tamanhos" className="mt-5">
            <h2 className="mb-2 font-display text-[13px] font-semibold text-foreground">
              Outros tamanhos & variações
            </h2>
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
              {variations.map((v) => (
                <li key={v.slug}>
                  <Link
                    to="/loja/$id/produto/$slug"
                    params={{ id, slug: v.slug }}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-semibold text-foreground">
                        {v.productName}
                      </p>
                      <p className="text-[10.5px] text-muted-foreground">
                        {v.unit ?? "—"}
                        {v.pricePerUnit != null && v.unitLabel && (
                          <>
                            {" · "}
                            <span className="num">
                              {v.unitLabel} {v.pricePerUnit.toFixed(2).replace(".", ",")}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                    <p className="num shrink-0 font-display text-[14px] font-bold text-primary">
                      {fmt(v.price)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Price history */}
        {history.length > 0 && (
          <section aria-label="Histórico de preço" className="mt-5">
            <h2 className="mb-2 font-display text-[13px] font-semibold text-foreground">
              Histórico de preço
            </h2>
            <div className="overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-sm">
              <Sparkline points={history} />
              <ul className="mt-3 divide-y divide-border text-[12px]">
                {[...history].reverse().slice(0, 10).map((h, i) => (
                  <li key={`${h.date}-${i}`} className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">{fmtDate(h.date)}</span>
                    <span className="num font-semibold text-foreground">{fmt(h.price)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Comparação entre mercados */}
        <CompareSection
          offers={compareData ?? []}
          currentStoreId={id}
          slug={slug}
        />

        {/* Reportar preço */}
        <section className="mt-5">
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-4 py-3 text-[12.5px] font-semibold text-muted-foreground hover:border-primary hover:text-primary"
          >
            <Flag className="h-3.5 w-3.5" />
            Reportar preço incorreto ou desatualizado
          </button>
        </section>

        {/* Meus reportes deste produto */}
        <MyReportsSection storeId={id} slug={slug} />
      </div>

      {product.imageUrl && (
        <ImageGalleryDialog
          open={galleryOpen}
          onClose={() => setGalleryOpen(false)}
          src={product.imageUrl}
          alt={product.productName}
          caption={product.productName}
        />
      )}

      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        establishmentId={store.id}
        productName={product.productName}
        productSlug={product.slug}
        barcode={product.barcode}
        currentPrice={product.price}
      />

      <MobileNav />
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "savings" | "destructive";
}) {
  const color =
    accent === "savings"
      ? "text-savings"
      : accent === "destructive"
        ? "text-destructive"
        : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-background px-2 py-2 text-center">
      <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className={`num mt-0.5 font-display text-[13px] font-bold ${color}`}>{value}</p>
    </div>
  );
}

function MetaBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-2.5">
      <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-[12.5px] font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Sparkline({ points }: { points: PricePoint[] }) {
  if (points.length < 2) {
    return (
      <p className="text-center text-[11px] text-muted-foreground">
        Registro único — precisa de mais capturas para gerar tendência.
      </p>
    );
  }
  const w = 320;
  const h = 80;
  const min = Math.min(...points.map((p) => p.price));
  const max = Math.max(...points.map((p) => p.price));
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const path = points
    .map((p, i) => {
      const x = i * step;
      const y = h - ((p.price - min) / range) * (h - 10) - 5;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Linha de preço">
      <path d={path} fill="none" stroke="currentColor" strokeWidth={2} className="text-primary" />
      {points.map((p, i) => {
        const x = i * step;
        const y = h - ((p.price - min) / range) * (h - 10) - 5;
        return <circle key={i} cx={x} cy={y} r={2.5} className="fill-primary" />;
      })}
    </svg>
  );
}

/* ===================== Cross-store comparison ===================== */

function CompareSection({
  offers,
  currentStoreId,
  slug,
}: {
  offers: CrossStoreOffer[];
  currentStoreId: string;
  slug: string;
}) {
  if (offers.length < 2) return null;
  const best = offers[0];
  const current = offers.find((o) => o.storeId === currentStoreId);
  const currentIsBest = current && current.storeId === best.storeId;
  const diff = current ? current.price - best.price : 0;
  const diffPct = current && current.price > 0 ? (diff / current.price) * 100 : 0;
  const [reasonOpen, setReasonOpen] = useState(false);
  const reason = best.bestReason;

  return (
    <section aria-label="Comparação entre mercados" className="mt-5">
      <h2 className="mb-2 font-display text-[13px] font-semibold text-foreground">
        Comparação entre mercados ({offers.length})
      </h2>

      {!currentIsBest && current && diff > 0 && (
        <div className="mb-2 rounded-2xl border border-savings/40 bg-savings/10 px-3 py-2.5 text-[11.5px] text-savings">
          <p className="font-semibold">
            Economize {fmt(diff)}{" "}
            <span className="opacity-80">({diffPct.toFixed(1).replace(".", ",")}%)</span>
          </p>
          <p className="text-[10.5px] opacity-90">
            Melhor oferta em <strong>{best.storeName}</strong> por {fmt(best.price)}.
          </p>
        </div>
      )}

      {reason && (
        <div className="mb-2 rounded-2xl border border-border bg-surface">
          <button
            type="button"
            onClick={() => setReasonOpen((v) => !v)}
            aria-expanded={reasonOpen}
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
          >
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
              <span className="rounded-full bg-savings/20 px-1.5 py-[1px] text-[8.5px] font-bold uppercase tracking-wider text-savings">
                Melhor
              </span>
              <span className="truncate">{bestReasonHeadline(reason)}</span>
            </span>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {reasonOpen ? "ocultar" : "por quê?"}
            </span>
          </button>
          {reasonOpen && (
            <ul className="space-y-1 border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
              <li>
                <strong className="text-foreground">Critério:</strong>{" "}
                {reason.rankedBy === "pricePerUnit"
                  ? "Menor preço por unidade (mesma medida entre as ofertas)."
                  : "Menor preço absoluto (medidas diferem entre as ofertas)."}
              </li>
              {reason.rankedBy === "pricePerUnit" && reason.ppuAdvantagePct != null && (
                <li>
                  <strong className="text-foreground">Vantagem PPU:</strong>{" "}
                  {reason.ppuAdvantagePct.toFixed(1).replace(".", ",")}% mais barato que{" "}
                  {reason.runnerUpStoreName ?? "a 2ª melhor"}.
                </li>
              )}
              {reason.priceAdvantagePct != null && reason.priceAdvantagePct > 0 && (
                <li>
                  <strong className="text-foreground">Vantagem preço:</strong>{" "}
                  {reason.priceAdvantagePct.toFixed(1).replace(".", ",")}% abaixo do 2º colocado.
                </li>
              )}
              <li>
                <strong className="text-foreground">Recência:</strong> atualizado{" "}
                {reason.daysSinceUpdate === 0 ? "hoje" : `há ${reason.daysSinceUpdate} dia(s)`}
                {reason.runnerUpDaysSinceUpdate != null &&
                  ` · 2º colocado há ${reason.runnerUpDaysSinceUpdate} dia(s)`}
                .
              </li>
              {reason.tiebreakByRecency && (
                <li className="text-savings">
                  <strong>Desempate por recência:</strong> diferença inferior a 5% — preço mais
                  recente venceu.
                </li>
              )}
              <li className="text-[10px] opacity-80">
                Baseado em {reason.offersCount} mercados comparadas.
              </li>
            </ul>
          )}
        </div>
      )}

      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        {offers.map((o) => {
          const isBest = o.storeId === best.storeId;
          const isCurrent = o.storeId === currentStoreId;
          return (
            <li key={o.storeId}>
              <Link
                to="/loja/$id/produto/$slug"
                params={{ id: o.storeId, slug: o.slug }}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-background">
                  {o.storeLogoUrl ? (
                    <img
                      src={o.storeLogoUrl}
                      alt={o.storeName}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                      width={36}
                      height={36}
                    />
                  ) : (
                    <StoreIcon className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
                    <span className="truncate">{o.storeName}</span>
                    {isBest && (
                      <span className="shrink-0 rounded-full bg-savings/20 px-1.5 py-[1px] text-[8.5px] font-bold uppercase tracking-wider text-savings">
                        Melhor
                      </span>
                    )}
                    {isCurrent && !isBest && (
                      <span className="shrink-0 rounded-full bg-muted px-1.5 py-[1px] text-[8.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Atual
                      </span>
                    )}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {o.storeCity}/{o.storeState} · {fmtDate(o.lastDate)}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`num font-display text-[14px] font-bold ${isBest ? "text-savings" : "text-foreground"}`}
                  >
                    {fmt(o.price)}
                  </p>
                  {o.pricePerUnit != null && o.unitLabel && (
                    <p className="num text-[9.5px] text-muted-foreground">
                      {o.unitLabel} {o.pricePerUnit.toFixed(2).replace(".", ",")}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[10px] text-muted-foreground">
        Comparação baseada em produtos com mesmo código de barras ou nome equivalente.
        {slug ? "" : ""}
      </p>
    </section>
  );
}

/* ===================== My reports for this product ===================== */

const REASON_LABEL: Record<string, string> = {
  outdated: "Desatualizado",
  incorrect: "Valor incorreto",
  wrong_product: "Produto errado",
  other: "Outro",
};

const STATUS_META: Record<string, { label: string; classes: string }> = {
  pending: { label: "Em análise", classes: "bg-muted text-muted-foreground" },
  reviewed: { label: "Revisado", classes: "bg-primary/15 text-primary" },
  resolved: { label: "Resolvido", classes: "bg-savings/15 text-savings" },
  rejected: { label: "Rejeitado", classes: "bg-destructive/10 text-destructive" },
};

const ACTION_LABEL: Record<string, string> = {
  updated_price: "Preço atualizado",
  marked_correct: "Preço correto",
  no_action: "Sem ação",
  duplicate: "Duplicado",
};

function MyReportsSection({ storeId, slug }: { storeId: string; slug: string }) {
  const { data: reports, isLoading } = useQuery({
    ...myReportsQuery(storeId, slug),
    retry: false,
  });
  if (isLoading) return null;
  if (!reports || reports.length === 0) return null;

  return (
    <section aria-label="Meus reportes deste produto" className="mt-5">
      <h2 className="mb-2 font-display text-[13px] font-semibold text-foreground">
        Meus reportes ({reports.length})
      </h2>
      <ul className="space-y-2">
        {reports.map((r) => (
          <ReportCard key={r.id} report={r} />
        ))}
      </ul>
    </section>
  );
}

function ReportCard({ report }: { report: MyPriceReport }) {
  const meta = STATUS_META[report.status] ?? STATUS_META.pending;
  return (
    <li className="rounded-2xl border border-border bg-surface p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11.5px] font-semibold text-foreground">
            {REASON_LABEL[report.reason] ?? report.reason}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {new Date(report.createdAt).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
            {report.resolvedAt && (
              <>
                {" · resolvido em "}
                {new Date(report.resolvedAt).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                })}
              </>
            )}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider ${meta.classes}`}
        >
          {meta.label}
        </span>
      </div>
      {report.correctPrice != null && (
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Preço correto sugerido:{" "}
          <span className="num font-semibold text-foreground">
            R$ {report.correctPrice.toFixed(2).replace(".", ",")}
          </span>
        </p>
      )}
      {report.notes && (
        <p className="mt-1 line-clamp-2 text-[11px] italic text-muted-foreground">
          "{report.notes}"
        </p>
      )}
      {report.actionTaken && (
        <p className="mt-1.5 text-[10.5px] font-semibold text-primary">
          Ação: {ACTION_LABEL[report.actionTaken] ?? report.actionTaken}
        </p>
      )}
      {report.adminNotes && (
        <p className="mt-1 rounded-lg bg-muted/60 px-2 py-1.5 text-[10.5px] text-foreground">
          <span className="font-semibold">Admin:</span> {report.adminNotes}
        </p>
      )}
    </li>
  );
}

/* ===================== Image gallery dialog ===================== */

function ImageGalleryDialog({
  open,
  onClose,
  src,
  alt,
  caption,
}: {
  open: boolean;
  onClose: () => void;
  src: string;
  alt: string;
  caption: string;
}) {
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!open) {
      setZoom(1);
      setPos({ x: 0, y: 0 });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(z + 0.5, 4));
      if (e.key === "-") setZoom((z) => Math.max(z - 0.5, 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Foto de ${alt}`}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-full max-w-3xl flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 rounded-t-2xl bg-background/95 px-3 py-2 text-foreground">
          <p className="truncate text-[12.5px] font-semibold">{caption}</p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(z - 0.5, 1))}
              className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted"
              aria-label="Diminuir zoom"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="num w-10 text-center text-[11px] font-semibold">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(z + 0.5, 4))}
              className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted"
              aria-label="Aumentar zoom"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="ml-1 grid h-8 w-8 place-items-center rounded-full hover:bg-muted"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div
          className="relative overflow-hidden bg-black"
          style={{ width: "min(90vw, 720px)", height: "min(80vh, 720px)" }}
          onMouseDown={(e) => {
            if (zoom <= 1) return;
            setDragging({ x: e.clientX - pos.x, y: e.clientY - pos.y });
          }}
          onMouseMove={(e) => {
            if (!dragging) return;
            setPos({ x: e.clientX - dragging.x, y: e.clientY - dragging.y });
          }}
          onMouseUp={() => setDragging(null)}
          onMouseLeave={() => setDragging(null)}
          onDoubleClick={() => {
            setZoom((z) => (z >= 2 ? 1 : 2));
            setPos({ x: 0, y: 0 });
          }}
        >
          <img
            src={src}
            alt={alt}
            className="absolute left-1/2 top-1/2 max-h-none max-w-none select-none"
            style={{
              transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) scale(${zoom})`,
              transition: dragging ? "none" : "transform 120ms ease-out",
              cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "zoom-in",
            }}
            draggable={false}
          />
        </div>
        <p className="rounded-b-2xl bg-background/95 px-3 py-1.5 text-center text-[10px] text-muted-foreground">
          Clique duplo para alternar zoom · Arraste para mover · ESC para fechar
        </p>
      </div>
    </div>
  );
}

/* ===================== Report dialog ===================== */

function ReportDialog({
  open,
  onClose,
  establishmentId,
  productName,
  productSlug,
  barcode,
  currentPrice,
}: {
  open: boolean;
  onClose: () => void;
  establishmentId: string;
  productName: string;
  productSlug: string;
  barcode: string | null;
  currentPrice: number;
}) {
  const submit = useServerFn(submitPriceReport);
  const qc = useQueryClient();
  const [reason, setReason] = useState<"incorrect" | "outdated" | "wrong_product" | "other">(
    "outdated",
  );
  const [correctPrice, setCorrectPrice] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [uploadPct, setUploadPct] = useState<number>(0);

  useEffect(() => {
    if (!open) return;
    supabase.auth.getUser().then(({ data }) => {
      setAuthed(!!data.user);
      setUserId(data.user?.id ?? null);
    });
  }, [open]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!authed || !userId) {
      toast.error("Faça login para reportar um preço.");
      return;
    }
    if (evidenceFile) {
      if (evidenceFile.size > 8 * 1024 * 1024) {
        toast.error("Arquivo muito grande (máx 8MB).");
        return;
      }
      if (!/^(image\/|application\/pdf)/.test(evidenceFile.type)) {
        toast.error("Envie uma imagem ou PDF.");
        return;
      }
    }
    setBusy(true);
    setUploadPct(0);
    try {
      let evidencePath: string | null = null;
      if (evidenceFile) {
        const ext = evidenceFile.name.split(".").pop()?.toLowerCase() ?? "bin";
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;
        setUploadPct(30);
        const { error: upErr } = await supabase.storage
          .from("report-evidence")
          .upload(path, evidenceFile, { contentType: evidenceFile.type, upsert: false });
        if (upErr) throw upErr;
        evidencePath = path;
        setUploadPct(70);
      }
      const priceNum = correctPrice.trim() ? Number(correctPrice.replace(",", ".")) : null;
      await submit({
        data: {
          establishmentId,
          productName,
          productSlug,
          barcode,
          reportedPrice: currentPrice,
          correctPrice: priceNum && Number.isFinite(priceNum) ? priceNum : null,
          reason,
          notes: notes.trim() || null,
          evidenceUrl: evidencePath,
        },
      });
      setUploadPct(100);
      toast.success("Reporte enviado. Obrigado pela ajuda!");
      qc.invalidateQueries({ queryKey: ["my-price-reports"] });
      setNotes("");
      setCorrectPrice("");
      setEvidenceFile(null);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar reporte");
    } finally {
      setBusy(false);
      setUploadPct(0);
    }
  };

  const reasons: { key: typeof reason; label: string }[] = [
    { key: "outdated", label: "Desatualizado" },
    { key: "incorrect", label: "Valor incorreto" },
    { key: "wrong_product", label: "Produto errado" },
    { key: "other", label: "Outro" },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Reportar preço"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl bg-background p-4 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-[15px] font-bold text-foreground">
            Reportar preço
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-3 rounded-lg bg-muted/60 px-3 py-2 text-[11.5px] text-muted-foreground">
          <span className="font-semibold text-foreground">{productName}</span> — atual{" "}
          <span className="num font-semibold text-foreground">{fmt(currentPrice)}</span>
        </p>

        {authed === false && (
          <p className="mb-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11.5px] text-destructive">
            Você precisa estar logado para enviar reportes.{" "}
            <Link to="/login" className="font-semibold underline">
              Entrar
            </Link>
          </p>
        )}

        <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-widest text-muted-foreground">
          Motivo
        </label>
        <div className="mb-3 grid grid-cols-2 gap-1.5">
          {reasons.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setReason(r.key)}
              className={
                "rounded-lg border px-2.5 py-2 text-[11.5px] font-semibold transition-colors " +
                (reason === r.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface text-muted-foreground hover:border-primary/40")
              }
            >
              {r.label}
            </button>
          ))}
        </div>

        <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-widest text-muted-foreground">
          Preço correto (opcional)
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={correctPrice}
          onChange={(e) => setCorrectPrice(e.target.value)}
          placeholder="Ex: 4,99"
          className="mb-3 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] text-foreground focus:border-primary focus:outline-none"
        />

        <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-widest text-muted-foreground">
          Observação (opcional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Detalhe o que está errado ou desatualizado..."
          className="mb-3 w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-[13px] text-foreground focus:border-primary focus:outline-none"
        />

        <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-widest text-muted-foreground">
          Evidência (opcional — foto ou PDF, máx 8MB)
        </label>
        <label className="mb-3 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-surface px-3 py-2.5 text-[12px] text-muted-foreground hover:border-primary hover:text-primary">
          <Paperclip className="h-3.5 w-3.5" />
          <span className="truncate">
            {evidenceFile ? evidenceFile.name : "Selecionar arquivo…"}
          </span>
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => setEvidenceFile(e.target.files?.[0] ?? null)}
          />
          {evidenceFile && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setEvidenceFile(null);
              }}
              className="ml-auto rounded-full p-0.5 hover:bg-muted"
              aria-label="Remover arquivo"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </label>

        {busy && uploadPct > 0 && (
          <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${uploadPct}%` }}
            />
          </div>
        )}


        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-border bg-surface py-2.5 text-[12.5px] font-semibold text-muted-foreground hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={busy || authed === false}
            onClick={handleSubmit}
            className="flex-1 rounded-lg bg-primary py-2.5 text-[12.5px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Enviando..." : "Enviar reporte"}
          </button>
        </div>
      </div>
    </div>
  );
}
