import { useQuery } from "@tanstack/react-query";
import { Price } from "@/components/ds/Price";
import { useEffect, useRef, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { 
  AlertTriangle, 
  ArrowRight, 
  RotateCcw, 
  Store, 
  TrendingDown,
  History,
  Scale,
  BellPlus
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProductImage } from "@/components/ds/ProductImage";
import { StoreBadge } from "@/components/brand/StoreBadge";
import { BestValueBadge } from "@/components/ds/BestValueBadge";
import { pickBestValue } from "@/lib/best-value";
import { getPublicProduct } from "@/lib/public-product.functions";
import { formatShortDate } from "@/components/product/TrustIndicator";
import { dedupeByStorePrice, storeKey } from "@/lib/price-rank";

export type QuickViewProduct = {
  name: string;
  unit?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  cheapestStore?: string | null;
  cheapestLogo?: string | null;
  storeCount?: number | null;
  updatedAt?: string | null;
};

/**
 * Modal compacto de produto: imagem, unidade, menor preço e preço por
 * estabelecimento. Carrega detalhes públicos sob demanda.
 */
export function ProductQuickView({
  product,
  onClose,
}: {
  product: QuickViewProduct | null;
  onClose: () => void;
}) {
  const fetchProduct = useServerFn(getPublicProduct);
  // Foco inicial no corpo do modal; Radix devolve o foco ao gatilho ao fechar.
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (product) openerRef.current = document.activeElement as HTMLElement | null;
  }, [product]);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["public-product-quickview", product?.name ?? ""],
    queryFn: () => fetchProduct({ data: { slug: product!.name } }),
    enabled: Boolean(product?.name),
    staleTime: 60_000,
  });

  // Lista canônica: um registro por estabelecimento, ordem estável em empates.
  const allMarkets = dedupeByStorePrice(data?.markets ?? [], (m) => ({
    store: m.marketName,
    price: m.priceMin,
    samples: m.samples,
    lastSeen: m.lastSeen,
  }));
  const markets = allMarkets.slice(0, 8);

  /**
   * Ofertas separadas por embalagem (1L vs 2L vs 5L).
   *
   * Só entram em cena quando há mais de um tamanho conhecido — caso contrário a
   * lista simples acima já é suficiente e evita ruído visual no modal.
   */
  const rawGroups = (data?.sizeGroups ?? []).filter((g) => g.markets.length > 0);
  const sizeGroups =
    rawGroups.length > 1
      ? rawGroups.map((g) => ({
          ...g,
          markets: dedupeByStorePrice(g.markets, (m) => ({
            store: m.marketName,
            price: m.priceMin,
            samples: m.samples,
            lastSeen: m.lastSeen,
          })).slice(0, 8),
        }))
      : [];

  // "Menor preço" sai sempre da mesma lista renderizada abaixo; com um único
  // estabelecimento o destaque repetiria a linha, então é omitido.
  const cheapest = allMarkets.length > 1 ? allMarkets[0] : null;
  const cheapestLogo =
    cheapest && storeKey(cheapest.marketName) === storeKey(product?.cheapestStore)
      ? (product?.cheapestLogo ?? null)
      : null;

  /**
   * "Melhor custo-benefício" no modal.
   *
   * Aqui todas as ofertas são do MESMO produto (mesma embalagem), então o
   * vencedor por unidade coincide com o menor preço. O selo continua útil
   * porque traduz a etiqueta em R$/kg ou R$/L — mas precisa dos mesmos
   * guardas anti-ruído do `BestValueBadge`:
   *  - `requireDifferentSizes: false` (comparação intra-produto);
   *  - `pickBestValue` devolve null sem tamanho detectável, com bases
   *    misturadas (kg vs L) ou com menos de 2 ofertas;
   *  - `computeUnitPrice` (interno) não extrapola g/ml abaixo de 1kg/1L.
   */
  const bestValue = pickBestValue(
    allMarkets.map((m) => ({
      key: m.marketName,
      price: m.priceMin,
      name: product?.name ?? data?.displayName ?? "",
      sizeUnit: product?.unit ?? data?.unit ?? null,
    })),
    { requireDifferentSizes: false },
  );



  return (
    <Dialog open={Boolean(product)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-md gap-0 overflow-hidden p-0"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          bodyRef.current?.focus();
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          openerRef.current?.focus();
        }}
      >
        <DialogHeader className="flex-row items-start gap-3 space-y-0 border-b border-border bg-card p-3.5 text-left">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-background">
            <ProductImage
              src={data?.imageUrl ?? null}
              alt={product?.name ?? ""}
              name={product?.name ?? ""}
              brand={data?.brand ?? null}
              size="sm"
            />
          </div>
          <div className="min-w-0 flex-1">
            <DialogTitle className="line-clamp-2 text-[14.5px] font-semibold leading-tight">
              {product?.name}
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-[11.5px]">
              {[data?.brand, product?.unit ?? data?.unit].filter(Boolean).join(" · ") ||
                "Detalhes do produto"}
            </DialogDescription>
            {product?.minPrice != null && (
              <p className="mt-1.5 leading-none">
                <Price value={product.minPrice} size="lg" />
                {product.maxPrice != null && product.maxPrice > product.minPrice && (
                  <span className="ml-1.5 inline-flex items-baseline gap-1 text-[11px] text-muted-foreground">
                    até
                    <Price value={product.maxPrice} size="sm" tone="muted" />
                  </span>
                )}
              </p>
            )}
          </div>
        </DialogHeader>

        <div
          ref={bodyRef}
          className="max-h-[65svh] overflow-y-auto p-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-gold"
          tabIndex={0}
          role="region"
          aria-label="Detalhes e preços do produto"
        >
          {/* Price History Section */}
          {!isLoading && data?.history && data.history.length > 1 && (
            <div className="mb-4 rounded-xl border border-border bg-card/40 p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  <History className="h-3 w-3" /> Histórico de Preços
                </p>
                <div className="flex gap-2">
                  <button className="flex items-center gap-1 text-[10px] font-bold text-brand-gold hover:underline">
                    <BellPlus className="h-3 w-3" /> Monitorar
                  </button>
                </div>
              </div>
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.history}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="date" 
                      hide 
                    />
                    <YAxis 
                      hide 
                      domain={['dataMin - 1', 'dataMax + 1']}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0B0B14', border: '1px solid rgba(255,215,0,0.2)', borderRadius: '8px', fontSize: '10px' }}
                      labelStyle={{ color: '#94A3B8' }}
                      formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Menor Preço'] as [string, string]}
                      labelFormatter={(label: any) => new Date(label).toLocaleDateString('pt-BR')}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="min" 
                      stroke="#FFD700" 
                      strokeWidth={2} 
                      dot={false}
                      activeDot={{ r: 4, fill: '#FFD700' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {cheapest && (
            <div className="mb-3 flex items-center gap-2.5 rounded-lg border border-brand-gold/40 bg-brand-gold/10 p-2.5">
              <StoreBadge name={cheapest.marketName} logoUrl={cheapestLogo} size="xs" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold-ink">
                  Menor preço
                </p>
                <p className="truncate text-[12.5px] font-semibold">{cheapest.marketName}</p>
              </div>
              <Price value={cheapest.priceMin} size="md" tone="best" className="shrink-0" />
            </div>
          )}

          {bestValue && (
            <div className="mb-3 -mt-1.5">
              <BestValueBadge result={bestValue} />
            </div>
          )}




          <div className="mb-4 flex flex-col gap-2">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <Store className="h-3.5 w-3.5" aria-hidden /> Preço por estabelecimento
            </p>
            
            {/* Action buttons */}
            <div className="flex gap-2">
              <button className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card/60 py-2 text-[11px] font-bold text-foreground transition-colors hover:border-brand-gold hover:bg-brand-gold/5">
                <BellPlus className="h-3.5 w-3.5 text-brand-gold" /> Acompanhar Preço
              </button>
              <button className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card/60 py-2 text-[11px] font-bold text-foreground transition-colors hover:border-brand-gold hover:bg-brand-gold/5">
                <Scale className="h-3.5 w-3.5 text-brand-gold" /> Adicionar à Lista
              </button>
            </div>
          </div>

          {isLoading ? (
            <ul
              className="divide-y divide-border overflow-hidden rounded-lg border border-border"
              role="status"
              aria-live="polite"
              aria-busy="true"
              aria-label="Carregando preços"
            >
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="flex items-center gap-2 px-2.5 py-2.5">
                  <span className="h-3.5 flex-1 animate-pulse rounded bg-muted" />
                  <span className="h-3.5 w-14 animate-pulse rounded bg-muted" />
                </li>
              ))}
            </ul>
          ) : isError ? (
            <div
              role="alert"
              className="rounded-lg border border-dashed border-border bg-card/60 px-3 py-4 text-center"
            >
              <AlertTriangle className="mx-auto h-4 w-4 text-gold-ink" aria-hidden />
              <p className="mt-1.5 text-[12.5px] font-semibold text-foreground">
                Não foi possível carregar os preços
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-[11.5px] font-semibold text-foreground transition-colors hover:border-brand-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
              >
                <RotateCcw className="h-3 w-3" aria-hidden /> Tentar novamente
              </button>
            </div>
          ) : markets.length === 0 ? (
            <p
              role="status"
              aria-live="polite"
              className="rounded-lg border border-dashed border-border bg-card/60 px-3 py-3 text-center text-[12.5px] text-muted-foreground"
            >
              Ainda não há outros preços registrados para este produto.
            </p>
          ) : (
            (sizeGroups.length > 0
              ? sizeGroups
              : [{ key: "__all__", label: "", markets }]
            ).map((group) => (
              <div key={group.key} className="mt-2 first:mt-0">
                {group.label && (
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </p>
                )}
                <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                  {group.markets.map((m) => (
                    <li key={m.marketName} className="flex items-center gap-2 px-2.5 py-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-semibold">
                          {m.marketName}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {[m.neighborhood, m.city].filter(Boolean).join(" · ") || "Feijó/AC"} ·{" "}
                          {formatShortDate(m.lastSeen)}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <Price value={m.priceMin} size="md" className="block" />
                        {m.priceMax > m.priceMin && (
                          <Price
                            as="span"
                            value={m.priceMax}
                            size="sm"
                            tone="muted"
                            prefix="até R$"
                            className="mt-0.5 flex justify-end"
                          />
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}


          {data?.min != null && data?.avg != null && data.avg > data.min && (
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[11px] font-semibold text-foreground">
              <TrendingDown className="h-3 w-3 text-gold-ink" aria-hidden />
              Economia de até{" "}
              <Price value={data.avg - data.min} size="sm" tone="savings" />{" "}
              frente à média
            </p>
          )}
        </div>

        <div className="border-t border-border bg-card p-3">
          <Link
            to="/buscar"
            search={{ q: product?.name ?? "" } as never}
            onClick={onClose}
            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-brand-gold text-[12.5px] font-bold text-brand-navy transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            Comparar em todos os mercados
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
