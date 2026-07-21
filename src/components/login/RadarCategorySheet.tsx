import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { getRadarCategoryTop, type RadarGroupKey } from "@/lib/login-panel.functions";
import { useSignedLogoUrls } from "@/hooks/use-signed-logo-urls";
import { ProductImage } from "@/components/ds/ProductImage";
import { Store, TrendingDown, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Math.max(0, v));

export type RadarCategoryTarget = {
  group: RadarGroupKey;
  label: string;
  pct: number;
};

export function RadarCategorySheet({
  open,
  onOpenChange,
  target,
  city,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  target: RadarCategoryTarget | null;
  city: string | null;
}) {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["radar-category-top", target?.group ?? null, city ?? null],
    queryFn: () =>
      getRadarCategoryTop({ data: { group: target!.group, city, limit: 8 } }),
    enabled: !!target && open,
    staleTime: 15 * 60 * 1000,
  });

  const logoUrls = useMemo(
    () => (data?.products ?? []).map((p) => p.cheapestLogoUrl),
    [data]
  );
  const signedMap = useSignedLogoUrls(logoUrls);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full border-l border-white/10 bg-neutral-950 p-0 text-white sm:max-w-md"
      >
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent px-6 py-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-300/90">
              Radar · Categoria em destaque
            </p>
            <SheetTitle className="font-display text-2xl font-bold text-white">
              {target?.label ?? "Categoria"}
            </SheetTitle>
            <SheetDescription className="text-white/60">
              {target ? (
                <>
                  Oscilação de{" "}
                  <span className="font-semibold text-emerald-300">
                    {target.pct.toFixed(1)}%
                  </span>{" "}
                  esta semana. Veja os itens com maior diferença de preço e onde
                  comprar mais barato.
                </>
              ) : null}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {isLoading ? (
              <ul className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <li
                    key={i}
                    className="h-20 animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]"
                  />
                ))}
              </ul>
            ) : isError ? (
              <div className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-100">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold">Não conseguimos carregar os produtos.</p>
                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="mt-1 text-xs font-semibold text-white underline underline-offset-2 hover:text-emerald-200"
                  >
                    Tentar novamente
                  </button>
                </div>
              </div>
            ) : !data || data.products.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/60">
                Sem produtos suficientes nesta categoria para exibir agora.
              </div>
            ) : (
              <ul className="space-y-2.5">
                {data.products.map((p, idx) => {
                  const logo = p.cheapestLogoUrl ? signedMap[p.cheapestLogoUrl] : null;
                  const savings = p.maxPrice - p.minPrice;
                  return (
                    <li
                      key={p.productKey}
                      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-sm transition hover:border-emerald-300/30 hover:bg-white/[0.06]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative shrink-0">
                          <div className="h-14 w-14 overflow-hidden rounded-xl bg-white/5">
                            <ProductImage
                              src={p.imageUrl}
                              alt={p.displayName}
                              name={p.displayName}
                              className="h-full w-full object-contain"
                            />
                          </div>
                          <span className="absolute -left-1 -top-1 rounded-full bg-emerald-400 px-1.5 py-0.5 text-[9px] font-bold text-neutral-950">
                            #{idx + 1}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-white">
                            {p.displayName}
                          </p>

                          <div className="mt-1.5 flex items-baseline gap-2">
                            <span className="font-display text-lg font-bold tabular-nums text-emerald-300">
                              {brl(p.minPrice)}
                            </span>
                            {p.maxPrice > p.minPrice && (
                              <span className="text-[11px] text-white/40 line-through tabular-nums">
                                {brl(p.maxPrice)}
                              </span>
                            )}
                          </div>

                          <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/5 bg-black/30 px-2 py-1.5">
                            {logo ? (
                              <img
                                src={logo}
                                alt=""
                                className="h-5 w-5 rounded object-contain"
                                loading="lazy"
                              />
                            ) : (
                              <Store className="h-4 w-4 text-white/50" />
                            )}
                            <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-white/80">
                                {p.cheapestStore ?? "Menor preço"}
                            </span>
                            {p.cheapestEstablishmentId && (
                              <Link
                                to="/loja/$id"
                                params={{ id: p.cheapestEstablishmentId }}
                                onClick={() => onOpenChange(false)}
                                className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300 hover:text-emerald-200"
                              >
                                Ver <ExternalLink className="h-3 w-3" />
                              </Link>
                            )}
                          </div>

                          <div className="mt-1.5 flex items-center gap-3 text-[10px] text-white/50">
                            <span className="inline-flex items-center gap-1">
                              <TrendingDown className="h-3 w-3 text-emerald-300" />
                              economia {brl(savings)}
                            </span>
                            <span>· {p.storeCount} lojas</span>
                            <span className="ml-auto font-semibold text-emerald-300/80">
                              -{p.savingsPct.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-white/10 bg-black/40 px-6 py-3 text-[11px] text-white/50">
            {isFetching && !isLoading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Atualizando…
              </span>
            ) : (
              <>Dados agregados de leituras recentes da comunidade{city ? ` em ${city}` : ""}.</>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
