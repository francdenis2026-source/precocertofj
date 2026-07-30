import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getProductDetail, type ProductDetail } from "@/lib/product-detail.functions";
import { useSession } from "@/hooks/useSession";
import { MobileNav } from "@/components/nav/MobileNav";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import {
  ArrowLeft,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Package,
  Sparkles,
  BarChart3,
  MapPin,
  Share2,
  Check,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PriceHistoryDrawer } from "@/components/scans/PriceHistoryDrawer";
import { Price } from "@/components/ds/Price";

export const Route = createFileRoute("/produto/$id")({
  head: () => ({
    meta: [
      { title: "Detalhe do produto — PreçoCerto" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProductDetailPage,
});

const fmt = (n: number | null | undefined) =>
  typeof n === "number" ? `R$ ${n.toFixed(2).replace(".", ",")}` : "—";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

function ProductDetailPage() {
  const { id } = useParams({ from: "/produto/$id" });
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const fetchDetail = useServerFn(getProductDetail);
  const [data, setData] = useState<ProductDetail | null | undefined>(undefined);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    fetchDetail({ data: { id } })
      .then(setData)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)));
  }, [id, user, loading, navigate, fetchDetail]);

  const savings = useMemo(() => {
    if (!data?.cheapest || !data.history.avg) return null;
    const diff = data.history.avg - data.cheapest.price;
    if (diff <= 0) return null;
    const pct = (diff / data.history.avg) * 100;
    return { diff, pct };
  }, [data]);

  const priceVsAvg = useMemo(() => {
    if (!data?.history.avg || !data.currentPrice) return null;
    const diff = ((data.currentPrice - data.history.avg) / data.history.avg) * 100;
    return diff;
  }, [data]);

  const handleShare = async () => {
    if (!data) return;
    const text = `${data.name} — a partir de ${fmt(data.history.min ?? data.currentPrice)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: data.name, text });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="min-h-[100svh] bg-background pb-[calc(var(--mobile-nav-height)+1.5rem)] text-foreground">
      <Breadcrumbs
        items={[
          { label: "Pesquisa", to: "/buscar" },
          { label: data?.name ?? "Produto" },
        ]}
      />
      <div className="mx-auto max-w-xl px-4 pt-4 sm:px-6">
        <header className="mb-5 flex items-center justify-between">
          <Link
            to="/historico/scans"
            aria-label="Voltar"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground transition hover:bg-secondary"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          </Link>
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5">
            <Package className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Produto
            </span>
          </div>
          <button
            onClick={handleShare}
            aria-label="Compartilhar"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground transition hover:bg-secondary"
          >
            {copied ? (
              <Check className="h-4 w-4 text-savings" strokeWidth={2.5} />
            ) : (
              <Share2 className="h-4 w-4" strokeWidth={2} />
            )}
          </button>
        </header>

        {err && (
          <p className="rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {err}
          </p>
        )}
        {data === undefined && !err && (
          <div className="space-y-3">
            <div className="h-40 animate-pulse rounded-3xl bg-secondary" />
            <div className="h-24 animate-pulse rounded-3xl bg-secondary" />
            <div className="h-32 animate-pulse rounded-3xl bg-secondary" />
          </div>
        )}
        {data === null && (
          <div className="rounded-3xl border border-border bg-surface p-8 text-center">
            <Package className="mx-auto mb-3 h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
            <p className="font-display text-base font-semibold">Produto não encontrado</p>
            <p className="mt-1 font-sans text-sm text-muted-foreground">
              O item pode ter sido removido do seu catálogo.
            </p>
          </div>
        )}

        {data && (
          <div className="space-y-4">
            {/* HERO — identity */}
            <section className="rounded-3xl border border-border bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-widest text-primary">
                    {data.category}
                  </span>
                  <h1 className="mt-2 font-display text-2xl font-bold leading-tight tracking-tight text-foreground">
                    {data.name}
                  </h1>
                  <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
                    EAN {data.ean} · {data.unit}
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    onClick={() => setHistoryOpen(true)}
                  >
                    <History className="mr-1 h-3.5 w-3.5" /> Comparar entre mercados
                  </Button>
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    Seu preço cadastrado
                  </p>
                  <Price as="p" value={data.currentPrice} size="lg" className="mt-1" />
                </div>
                {priceVsAvg !== null && Math.abs(priceVsAvg) >= 0.5 && (
                  <div
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold tabular-nums ${
                      priceVsAvg > 0
                        ? "bg-destructive/10 text-destructive"
                        : "bg-savings/10 text-savings"
                    }`}
                  >
                    {priceVsAvg > 0 ? (
                      <TrendingUp className="h-3 w-3" strokeWidth={2.5} />
                    ) : (
                      <TrendingDown className="h-3 w-3" strokeWidth={2.5} />
                    )}
                    {priceVsAvg > 0 ? "+" : ""}
                    {priceVsAvg.toFixed(1)}% vs média
                  </div>
                )}
              </div>
            </section>

            {/* HERO — cheapest market (headline block) */}
            {data.cheapest ? (
              <section className="relative overflow-hidden rounded-3xl border border-savings/30 bg-gradient-to-br from-savings/15 via-savings/5 to-transparent p-5">
                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-savings/20 blur-3xl" />
                <div className="relative">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-savings" strokeWidth={2.5} />
                    <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-savings">
                      Mais barato encontrado
                    </p>
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 font-display text-base font-semibold text-foreground">
                        <ShoppingBag className="h-4 w-4 shrink-0 text-savings" strokeWidth={2} />
                        <span className="truncate">{data.cheapest.marketName}</span>
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        Visto em {fmtDate(data.cheapest.when)}
                      </p>
                    </div>
                    <div className="text-right">
                      <Price as="p" value={data.cheapest.price} size="xl" tone="best" />
                    </div>
                  </div>
                  {savings && (
                    <div className="mt-4 flex items-center gap-2 rounded-xl bg-surface/80 px-3 py-2 backdrop-blur">
                      <TrendingDown className="h-3.5 w-3.5 text-savings" strokeWidth={2.5} />
                      <p className="font-sans text-xs text-foreground">
                        Economia de{" "}
                        <Price value={savings.diff} size="sm" tone="savings" />{" "}
                        <span className="text-muted-foreground">
                          ({savings.pct.toFixed(0)}% abaixo da média)
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </section>
            ) : (
              <section className="rounded-3xl border border-dashed border-border bg-surface p-5 text-center">
                <MapPin className="mx-auto mb-2 h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                <p className="font-sans text-sm text-muted-foreground">
                  Ainda não há scans comparáveis deste produto.
                </p>
              </section>
            )}

            {/* Stats — min / avg / max hierarchy */}
            <section className="rounded-3xl border border-border bg-surface p-5">
              <div className="mb-4 flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
                <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Faixa de preços · {data.history.samples} scan
                  {data.history.samples === 1 ? "" : "s"}
                </p>
              </div>

              {/* Min (primary), Avg (secondary), Max (tertiary) */}
              <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-2">
                <PriceStat
                  label="Mínimo"
                  value={data.history.min}
                  tone="savings"
                  icon={<TrendingDown className="h-3.5 w-3.5" strokeWidth={2.5} />}
                  highlight
                />
                <PriceStat label="Média" value={data.history.avg} tone="primary" />
                <PriceStat
                  label="Máximo"
                  value={data.history.max}
                  tone="muted"
                  icon={<TrendingUp className="h-3 w-3" strokeWidth={2} />}
                />
              </div>

              {/* Range bar visualisation */}
              {data.history.min !== null &&
                data.history.max !== null &&
                data.history.max > data.history.min && (
                  <div className="mt-5">
                    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div className="absolute inset-y-0 left-0 right-0 bg-gradient-to-r from-savings via-primary to-destructive/70" />
                      {data.history.avg !== null && (
                        <div
                          className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded-full bg-foreground"
                          style={{
                            left: `${
                              ((data.history.avg - data.history.min) /
                                (data.history.max - data.history.min)) *
                              100
                            }%`,
                          }}
                          aria-hidden
                        />
                      )}
                    </div>
                    <div className="mt-1.5 flex justify-between font-mono text-[11px] tabular-nums text-muted-foreground">
                      <span>{fmt(data.history.min)}</span>
                      <span>{fmt(data.history.max)}</span>
                    </div>
                  </div>
                )}
            </section>

            {/* Markets comparison */}
            {data.markets.length > 0 && (
              <section>
                <div className="mb-2.5 flex items-center justify-between px-1">
                  <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Por estabelecimento
                  </p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {data.markets.length} local{data.markets.length === 1 ? "" : "is"}
                  </p>
                </div>
                <ul className="space-y-2">
                  {data.markets.map((m, i) => {
                    const isBest = i === 0;
                    return (
                      <li
                        key={m.marketName}
                        className={`flex items-center gap-3 rounded-2xl border p-3.5 transition ${
                          isBest
                            ? "border-savings/40 bg-savings/5"
                            : "border-border bg-surface"
                        }`}
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold tabular-nums ${
                            isBest
                              ? "bg-savings text-savings-foreground"
                              : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {i + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-sans text-sm font-semibold text-foreground">
                            {m.marketName}
                          </p>
                          <p className="font-mono text-[11px] text-muted-foreground">
                            {m.samples} scan{m.samples > 1 ? "s" : ""} · último{" "}
                            {fmtDate(m.lastSeen)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-display text-base font-bold tabular-nums ${
                              isBest ? "text-savings" : "text-foreground"
                            }`}
                          >
                            {fmt(m.priceAvg)}
                          </p>
                          {isBest && (
                            <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-savings">
                              melhor preço
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
      <MobileNav />
      <PriceHistoryDrawer
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        productName={data?.name}
      />
    </div>
  );
}

function PriceStat({
  label,
  value,
  tone,
  icon,
  highlight,
}: {
  label: string;
  /** Valor numérico em reais; a formatação é do componente <Price />. */
  value: number | null | undefined;
  tone: "savings" | "primary" | "muted";
  icon?: React.ReactNode;
  highlight?: boolean;
}) {
  const toneClasses =
    tone === "savings"
      ? "text-savings"
      : tone === "primary"
      ? "text-foreground"
      : "text-muted-foreground";
  return (
    <div
      className={`rounded-2xl p-3 ${
        highlight ? "bg-savings/10 ring-1 ring-savings/30" : "bg-secondary/50"
      }`}
    >
      <p className="flex items-center gap-1 font-mono text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </p>
      <Price
        as="p"
        value={value}
        size={highlight ? "lg" : "md"}
        tone={tone === "savings" ? "savings" : tone === "muted" ? "muted" : "default"}
        className="mt-1.5"
      />
    </div>
  );
}
