import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Crown, MapPin, Store } from "lucide-react";
import { useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Price } from "@/components/ds/Price";
import { getProductComparison } from "@/lib/where-to-buy.functions";
import { MiniTrend, formatUpdatedAt } from "@/components/app/PriceTrend";
import { ProductPriceHistory } from "@/components/app/ProductPriceHistory";
import { PriceDropAlertToggle } from "@/components/app/PriceDropAlertToggle";
import { cn } from "@/lib/utils";
import { tc } from "@/lib/typeclear";

/**
 * Painel lateral de comparação de um produto entre estabelecimentos.
 * Usado nas páginas dedicadas do painel (/app/produtos e /app/loja/:id).
 */
export function ProductCompareSheet({
  productKey,
  onClose,
}: {
  productKey: string | null;
  onClose: () => void;
}) {
  const compare = useServerFn(getProductComparison);

  const q = useQuery({
    queryKey: ["app-product-compare", productKey],
    queryFn: () => compare({ data: { productKey: productKey! } }),
    enabled: !!productKey,
    staleTime: 60_000,
  });

  const detail = q.data ?? null;
  const [openStore, setOpenStore] = useState<string | null>(null);

  return (
    <Sheet open={!!productKey} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="text-left">
          <SheetTitle className={cn(tc.h2, "pr-6")}>{productKey ?? "Produto"}</SheetTitle>
          <SheetDescription className={tc.meta}>
            Preços registrados por estabelecimento, do menor para o maior.
          </SheetDescription>
        </SheetHeader>

        {q.isLoading && (
          <ul className="mt-4 space-y-2" aria-label="Carregando comparação">
            {Array.from({ length: 5 }).map((_, i) => (
              <li
                key={i}
                className="h-14 animate-pulse rounded-lg border border-border/60 bg-muted/50"
                style={{ opacity: 1 - i * 0.12 }}
              />
            ))}
          </ul>
        )}

        {!q.isLoading && q.isError && (
          <p
            className={cn(
              tc.meta,
              "mt-6 rounded-lg border border-destructive/40 bg-destructive/5 p-3",
            )}
          >
            Não foi possível carregar a comparação. Tente novamente em instantes.
          </p>
        )}

        {!q.isLoading && !q.isError && (!detail || detail.ranking.length === 0) && (
          <p
            className={cn(
              tc.meta,
              "mt-6 rounded-lg border border-border/70 bg-muted/30 p-4 text-center",
            )}
          >
            Ainda não há preços suficientes deste produto para comparar.
          </p>
        )}

        {!q.isLoading && detail && detail.ranking.length > 0 && (
          <>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Stat label="Menor" value={detail.minPrice} tone="best" />
              <Stat label="Médio" value={detail.avgPrice} />
              <Stat label="Maior" value={detail.maxPrice} tone="muted" />
            </div>

            <section
              aria-label="Histórico e tendência do produto"
              className="mt-3 rounded-lg border border-border/70 bg-card p-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className={tc.tableHead}>Tendência de preço</h3>
                <div className="flex items-center gap-2">
                  <span className={tc.metaMuted}>
                    atualizado {formatUpdatedAt(detail.lastSeenAt)}
                  </span>
                  <PriceDropAlertToggle
                    variant="chip"
                    productName={detail.productName}
                    targetPrice={detail.minPrice}
                  />
                </div>
              </div>
              <MiniTrend
                className="mt-1.5"
                points={detail.history.map((h) => ({ date: h.day, price: h.minPrice }))}
                changePct={detail.variationPct}
                width={150}
                height={36}
              />
              {detail.history.length >= 2 && (
                <p className={cn(tc.metaMuted, "mt-1")}>
                  {detail.history.length} dias com registros · menor preço do período{" "}
                  <Price
                    as="span"
                    value={Math.min(...detail.history.map((h) => h.minPrice))}
                    size="xs"
                    tone="best"
                  />
                </p>
              )}
            </section>

            <ol className="mt-3 space-y-1.5">
              {detail.ranking.map((r) => (
                <li
                  key={`${r.establishmentId ?? r.storeName}-${r.position}`}
                  className={cn(
                    "rounded-lg border px-2.5 py-2",
                    r.position === 1
                      ? "border-savings/40 bg-savings/[0.07]"
                      : "border-border/70 bg-card",
                  )}
                >
                  <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5">
                    <span className="grid h-7 w-7 place-items-center rounded-md bg-muted text-[12px] font-bold">
                      {r.position === 1 ? (
                        <Crown className="h-3.5 w-3.5 text-savings" aria-hidden />
                      ) : (
                        r.position
                      )}
                    </span>
                    <span className="min-w-0">
                      {r.establishmentId ? (
                        <Link
                          to="/app/loja/$id"
                          params={{ id: r.establishmentId }}
                          className={cn(tc.storeName, "block truncate hover:underline")}
                        >
                          {r.storeName}
                        </Link>
                      ) : (
                        <span className={cn(tc.storeName, "block truncate")}>{r.storeName}</span>
                      )}
                      <span className={cn(tc.metaMuted, "flex items-center gap-1 truncate")}>
                        {r.neighborhood ? (
                          <>
                            <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                            {r.neighborhood}
                          </>
                        ) : (
                          <>
                            <Store className="h-3 w-3 shrink-0" aria-hidden />
                            {r.city ?? "Feijó"}
                          </>
                        )}
                        <span aria-hidden>·</span>
                        <span className="truncate">{formatUpdatedAt(r.lastSeenAt)}</span>
                      </span>
                    </span>
                    <span className="text-right">
                      <Price
                        value={r.price}
                        size="sm"
                        tone={r.position === 1 ? "best" : "default"}
                      />
                      {r.diffPct > 0 && (
                        <span className={cn(tc.metaMuted, "block")}>+{r.diffPct.toFixed(0)}%</span>
                      )}
                    </span>
                  </div>

                  {r.establishmentId && (
                    <>
                      <button
                        type="button"
                        aria-expanded={openStore === r.establishmentId}
                        onClick={() =>
                          setOpenStore(openStore === r.establishmentId ? null : r.establishmentId)
                        }
                        className={cn(
                          tc.metaMuted,
                          "mt-1.5 inline-flex items-center gap-1 rounded-md px-1 py-0.5 hover:text-foreground",
                        )}
                      >
                        <ChevronDown
                          className={cn(
                            "h-3 w-3 transition-transform",
                            openStore === r.establishmentId && "rotate-180",
                          )}
                          aria-hidden
                        />
                        Histórico neste mercado
                      </button>
                      {openStore === r.establishmentId && (
                        <ProductPriceHistory
                          className="mt-1.5"
                          establishmentId={r.establishmentId}
                          productName={detail.productName}
                        />
                      )}
                    </>
                  )}
                </li>
              ))}
            </ol>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "best" | "muted" }) {
  return (
    <div className="rounded-lg border border-border/70 bg-card px-2 py-1.5 text-center">
      <p className={tc.tableHead}>{label}</p>
      <Price value={value} size="sm" tone={tone} className="mt-0.5" />
    </div>
  );
}
