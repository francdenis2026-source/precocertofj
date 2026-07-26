import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Loader2, Store, TrendingDown } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProductImage } from "@/components/ds/ProductImage";
import { StoreBadge } from "@/components/brand/StoreBadge";
import { getPublicProduct } from "@/lib/public-product.functions";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
  const { data, isLoading } = useQuery({
    queryKey: ["public-product-quickview", product?.name ?? ""],
    queryFn: () => fetchProduct({ data: { slug: product!.name } }),
    enabled: Boolean(product?.name),
    staleTime: 60_000,
  });

  const markets = (data?.markets ?? []).slice(0, 8);

  return (
    <Dialog open={Boolean(product)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
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
              <p className="mt-1.5 text-[17px] font-bold tabular-nums leading-none text-foreground">
                {brl(product.minPrice)}
                {product.maxPrice != null && product.maxPrice > product.minPrice && (
                  <span className="ml-1.5 text-[11px] font-medium text-muted-foreground">
                    até {brl(product.maxPrice)}
                  </span>
                )}
              </p>
            )}
          </div>
        </DialogHeader>

        <div
          className="max-h-[52svh] overflow-y-auto p-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-gold"
          tabIndex={0}
          role="region"
          aria-label="Detalhes e preços do produto"
        >
          {product?.cheapestStore && (
            <div className="mb-3 flex items-center gap-2.5 rounded-lg border border-brand-gold/40 bg-brand-gold/10 p-2.5">
              <StoreBadge
                name={product.cheapestStore}
                logoUrl={product.cheapestLogo ?? null}
                size="xs"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-gold">
                  Menor preço
                </p>
                <p className="truncate text-[12.5px] font-semibold">{product.cheapestStore}</p>
              </div>
              {product.minPrice != null && (
                <span className="shrink-0 text-[13.5px] font-bold tabular-nums">
                  {brl(product.minPrice)}
                </span>
              )}
            </div>
          )}

          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <Store className="h-3.5 w-3.5" aria-hidden /> Preço por estabelecimento
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
            </div>
          ) : markets.length === 0 ? (
            <p className="py-3 text-[12.5px] text-muted-foreground">
              Ainda não há outros preços registrados para este produto.
            </p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {markets.map((m) => (
                <li key={m.marketName} className="flex items-center gap-2 px-2.5 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-semibold">
                      {m.marketName}
                    </span>
                    <span className="block truncate text-[10.5px] text-muted-foreground">
                      {[m.neighborhood, m.city].filter(Boolean).join(" · ") || "Feijó/AC"} ·{" "}
                      {new Date(m.lastSeen).toLocaleDateString("pt-BR")}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[13px] font-bold tabular-nums">
                      {brl(m.priceMin)}
                    </span>
                    {m.priceMax > m.priceMin && (
                      <span className="block text-[10px] tabular-nums text-muted-foreground">
                        até {brl(m.priceMax)}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {data?.min != null && data?.avg != null && data.avg > data.min && (
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[11px] font-semibold text-foreground">
              <TrendingDown className="h-3 w-3 text-brand-gold" aria-hidden />
              Economia de até {brl(data.avg - data.min)} frente à média
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
