import { Link } from "@tanstack/react-router";
import { Price } from "@/components/ds/Price";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  ArrowRight,
  MapPin,
  Store as StoreIcon,
  Trophy,
  TrendingDown,
  Clock,
  Package,
} from "lucide-react";
import {
  getPublicStoreCatalog,
  getCheapestStoresRanking,
  getStoreTopProductsHistory,
  type PublicStore,
} from "@/lib/stores-public.functions";
import { useSignedLogoUrl } from "@/hooks/use-signed-logo-urls";
import { Sparkline } from "@/components/charts/Sparkline";
import { FairPriceBadge } from "@/components/product/FairPriceBadge";
import { cn } from "@/lib/utils";


type Props = {
  store: PublicStore | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return "—";
  }
};

export function StoreDetailsDrawer({ store, open, onOpenChange }: Props) {
  const fetchCatalog = useServerFn(getPublicStoreCatalog);
  const fetchRanking = useServerFn(getCheapestStoresRanking);
  const fetchTopHistory = useServerFn(getStoreTopProductsHistory);

  const storeId = store?.id ?? "";
  const resolvedLogo = useSignedLogoUrl(store?.logoUrl);

  const catalogQuery = useQuery({
    queryKey: ["public-store-catalog", storeId],
    queryFn: () => fetchCatalog({ data: { id: storeId } }),
    enabled: open && !!storeId,
    staleTime: 60_000,
  });

  const topHistoryQuery = useQuery({
    queryKey: ["store-top-history", storeId],
    queryFn: () =>
      fetchTopHistory({ data: { id: storeId, limit: 5, days: 30 } }),
    enabled: open && !!storeId,
    staleTime: 60_000,
  });

  const rankingQuery = useQuery({
    queryKey: ["cheapest-stores-7d"],
    queryFn: () => fetchRanking(),
    enabled: open,
    staleTime: 5 * 60_000,
  });


  const catalog = catalogQuery.data;
  const products = catalog?.products ?? [];
  const cheapest = [...products]
    .filter((p) => Number.isFinite(p.price) && p.price > 0)
    .sort((a, b) => a.price - b.price)
    .slice(0, 5);
  const lowest = cheapest[0];

  const rankRows = rankingQuery.data?.rows ?? [];
  const rankIdx = storeId ? rankRows.findIndex((r) => r.establishmentId === storeId) : -1;
  const rank = rankIdx >= 0 ? rankIdx + 1 : null;
  const wins = rankIdx >= 0 ? rankRows[rankIdx]?.wins ?? 0 : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md"
      >
        {/* Cover */}
        <div className="relative h-32 shrink-0 overflow-hidden bg-gradient-to-br from-primary/25 via-primary/10 to-accent/30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(0.72_0.18_45_/_0.35),transparent_60%)]" />
          {rank && rank <= 3 && (
            <span
              className={cn(
                "absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-widest shadow-md",
                rank === 1 && "bg-accent text-accent-foreground",
                rank === 2 && "bg-savings text-savings-foreground",
                rank === 3 && "bg-primary text-primary-foreground",
              )}
            >
              <Trophy className="h-3 w-3" strokeWidth={3} />
              {rank}º lugar
            </span>
          )}
          <div className="absolute -bottom-8 left-6">
            {resolvedLogo ? (
              <img
                src={resolvedLogo ?? undefined}
                alt={store?.name ?? ""}
                className="h-20 w-20 rounded-2xl border-4 border-background bg-background object-contain shadow-lg"
                loading="lazy"
                decoding="async"
                width={80}
                height={80}
                draggable={false}
              />
            ) : (
              <span className="grid h-20 w-20 place-items-center rounded-2xl border-4 border-background bg-primary/15 text-primary shadow-lg">
                <StoreIcon className="h-9 w-9" strokeWidth={1.75} />
              </span>
            )}
          </div>
        </div>

        <SheetHeader className="px-6 pb-2 pt-12 text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <SheetTitle className="font-display text-[22px] font-extrabold leading-tight text-foreground">
                {store?.name ?? "Mercado"}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-accent" />
                {store ? `${store.city}/${store.state}` : ""}
                {store?.neighborhood ? ` · ${store.neighborhood}` : ""}
              </SheetDescription>
            </div>
            {store && (
              <Link
                to="/loja/$id"
                params={{ id: store.id }}
                onClick={() => onOpenChange(false)}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-primary transition hover:bg-primary hover:text-primary-foreground"
                aria-label="Abrir página da mercado"
              >
                Abrir mercado
                <ArrowRight className="h-3 w-3" strokeWidth={2.6} />
              </Link>
            )}
          </div>
        </SheetHeader>


        <div className="flex flex-1 flex-col gap-4 px-6 pb-6 pt-4">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            <StatBox
              icon={<Package className="h-3.5 w-3.5" />}
              value={String(store?.productCount ?? "—")}
              label="produtos"
            />
            <StatBox
              icon={<Trophy className="h-3.5 w-3.5" />}
              value={rank ? `${rank}º` : "—"}
              label={wins ? `${wins} vitórias` : "no ranking"}
              highlight={!!rank && rank <= 3}
            />
            <StatBox
              icon={<Clock className="h-3.5 w-3.5" />}
              value={fmtDate(store?.lastUpdate ?? null)}
              label="última atualização"
            />
          </div>

          {/* Menor preço destaque */}
          <div className="rounded-3xl border border-savings/30 bg-gradient-to-br from-savings/12 via-background to-primary/8 p-4">
            <div className="flex items-center justify-between">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-savings">
                <TrendingDown className="h-3 w-3" strokeWidth={3} />
                Menor preço da mercado
              </p>
              {lowest?.category && (
                <span className="rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  {lowest.category}
                </span>
              )}
            </div>

            {catalogQuery.isLoading && (
              <p className="mt-3 text-[13px] text-muted-foreground">
                Buscando ofertas…
              </p>
            )}

            {!catalogQuery.isLoading && !lowest && (
              <p className="mt-3 text-[13px] text-muted-foreground">
                Sem preços cadastrados ainda.
              </p>
            )}

            {lowest && store && (
              <Link
                to="/loja/$id/produto/$slug"
                params={{ id: store.id, slug: lowest.slug }}
                onClick={() => onOpenChange(false)}
                className="mt-2 flex items-center gap-3"
              >
                {lowest.imageUrl ? (
                  <img
                    src={lowest.imageUrl}
                    alt={lowest.productName}
                    className="h-14 w-14 rounded-xl border border-border bg-surface object-contain"
                    loading="lazy"
                    width={56}
                    height={56}
                  />
                ) : (
                  <span className="grid h-14 w-14 place-items-center rounded-xl border border-border bg-surface text-muted-foreground">
                    <Package className="h-6 w-6" strokeWidth={1.5} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[13px] font-bold text-foreground">
                    {lowest.productName}
                  </p>
                  <p className="num mt-0.5 font-display text-[20px] font-black text-savings">
                    <Price value={lowest.price} size="sm" tone="best" />
                  </p>
                </div>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-savings"
                  strokeWidth={2.4}
                />
              </Link>
            )}
          </div>

          {/* Top 5 com sparkline 30d */}
          {store && (topHistoryQuery.data?.length ?? 0) > 0 && (
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                  Top 5 · tendência 30 dias
                </p>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  ↘ baixando · ↗ subindo
                </span>
              </div>
              <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
                {topHistoryQuery.data!.map((p) => {
                  const first = p.points[0]?.price;
                  const last = p.points[p.points.length - 1]?.price;
                  const hasTrend =
                    typeof first === "number" &&
                    typeof last === "number" &&
                    p.points.length >= 2;
                  const dropped = hasTrend && last < first;
                  const raised = hasTrend && last > first;
                  return (
                    <li
                      key={p.slug}
                      className="border-b border-border last:border-0"
                    >
                      <Link
                        to="/loja/$id/produto/$slug"
                        params={{ id: store.id, slug: p.slug }}
                        onClick={() => onOpenChange(false)}
                        className="flex items-center gap-3 px-3 py-3 transition hover:bg-primary/5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-[12.5px] font-semibold text-foreground">
                            {p.productName}
                          </p>
                          <div className="mt-1 flex items-center gap-1.5">
                            <FairPriceBadge
                              price={p.price}
                              min={p.minPrice}
                              avg={p.avgPrice}
                              max={p.maxPrice}
                              size="sm"
                            />
                            {p.points.length >= 2 && (
                              <span
                                className={cn(
                                  "text-[11px] font-bold uppercase tracking-wider",
                                  dropped && "text-savings",
                                  raised && "text-destructive",
                                  !dropped && !raised && "text-muted-foreground",
                                )}
                              >
                                {p.points.length} pts
                              </span>
                            )}
                          </div>
                        </div>
                        <Sparkline
                          points={p.points}
                          width={72}
                          height={28}
                          tone="savings"
                          ariaLabel={`Tendência de preço de ${p.productName} nos últimos 30 dias`}
                        />
                        <span className="num shrink-0 font-display text-[13.5px] font-black text-foreground">
                          <Price value={p.price} size="sm" />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Fallback quando o histórico ainda está carregando mas já temos top do catálogo */}
          {store &&
            !topHistoryQuery.isLoading &&
            (topHistoryQuery.data?.length ?? 0) === 0 &&
            cheapest.length > 1 && (
              <div>
                <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                  Outros preços baixos
                </p>
                <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
                  {cheapest.slice(1).map((p) => (
                    <li
                      key={p.slug}
                      className="border-b border-border last:border-0"
                    >
                      <Link
                        to="/loja/$id/produto/$slug"
                        params={{ id: store.id, slug: p.slug }}
                        onClick={() => onOpenChange(false)}
                        className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-primary/5"
                      >
                        <span className="line-clamp-1 flex-1 text-[12.5px] font-semibold text-foreground">
                          {p.productName}
                        </span>
                        <span className="num shrink-0 font-display text-[13.5px] font-black text-foreground">
                          <Price value={p.price} size="sm" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}


          {/* CTA */}
          {store && (
            <Link
              to="/loja/$id"
              params={{ id: store.id }}
              onClick={() => onOpenChange(false)}
              className="mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-3.5 text-[13.5px] font-black text-primary-foreground shadow-[0_10px_24px_-10px_oklch(0.36_0.11_155_/_0.65)] transition hover:bg-accent hover:text-accent-foreground"
            >
              Ver catálogo completo
              <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
            </Link>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StatBox({
  icon,
  value,
  label,
  highlight,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-2.5",
        highlight
          ? "border-accent/40 bg-accent/10"
          : "border-border bg-surface",
      )}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider",
          highlight ? "text-accent" : "text-muted-foreground",
        )}
      >
        {icon}
        {label}
      </span>
      <p
        className={cn(
          "num mt-0.5 font-display text-[15px] font-black",
          highlight ? "text-accent" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}
