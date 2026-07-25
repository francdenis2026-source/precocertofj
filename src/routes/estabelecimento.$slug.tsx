import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  History,
  MapPin,
  Search,
  Minus,
  Loader2,
  Store,
  Bell,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { getPublicStoreCatalog, type PublicStoreProduct } from "@/lib/stores-public.functions";
import { getPublicPriceHistory } from "@/lib/store-public-history.functions";
import { resolveEstablishmentBySlug } from "@/lib/establishment-slug.functions";
import { normalize } from "@/lib/search-tokens";
import { useUserLocation } from "@/hooks/useUserLocation";
import { LocationControl } from "@/components/location/LocationControl";
import { formatDistance, haversineKm, resolveEstablishmentPosition } from "@/lib/geo";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ProductListCard } from "@/components/product/ProductListCard";
import { FavoriteMarketButton } from "@/components/market/FavoriteMarketButton";
import { EmptyState, LoadingGrid, RouteError } from "@/components/feedback";

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

type SortKey = "price-asc" | "price-desc" | "ppu-asc" | "name" | "recent";
const SORT_LABEL: Record<SortKey, string> = {
  "price-asc": "Menor preço",
  "price-desc": "Maior preço",
  "ppu-asc": "Menor preço por unidade (kg/L)",
  name: "Nome (A → Z)",
  recent: "Atualização recente",
};

const storeQuery = (id: string) =>
  queryOptions({
    queryKey: ["public-store", id],
    queryFn: () => getPublicStoreCatalog({ data: { id } }),
    staleTime: 60_000,
  });

export const Route = createFileRoute("/estabelecimento/$slug")({
  loader: async ({ params, context }) => {
    const match = await resolveEstablishmentBySlug({ data: { slug: params.slug } });
    if (!match) throw notFound();
    await context.queryClient.ensureQueryData(storeQuery(match.id));
    return { storeId: match.id, slug: match.slug };
  },
  head: ({ params }) => {
    const pretty = params.slug
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
    return {
      meta: [
        { title: `${pretty} — Catálogo público | PreçoCerto Feijó` },
        {
          name: "description",
          content: `Produtos e preços atualizados de ${pretty} em Feijó/AC. Busque por item e ordene pelo menor preço.`,
        },
        { property: "og:title", content: `${pretty} — Catálogo público` },
        {
          property: "og:description",
          content: `Preços atualizados de ${pretty} em Feijó/AC.`,
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  errorComponent: ({ error, reset }) => (
    <RouteError
      title="Não foi possível carregar"
      message={error instanceof Error ? error.message : "Tente novamente em instantes."}
      onRetry={() => reset()}
    />
  ),
  notFoundComponent: () => (
    <div className="mx-auto flex min-h-[50dvh] max-w-md flex-col items-center justify-center px-4 text-center">
      <Store className="mb-2 h-8 w-8 text-muted-foreground" />
      <h2 className="text-lg font-semibold">Estabelecimento não encontrado</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Verifique o link ou volte para a lista.
      </p>
      <Link
        to="/estabelecimentos"
        className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar para os mercados
      </Link>
    </div>
  ),
  pendingComponent: () => (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <LoadingGrid count={6} columns={3} />
    </div>
  ),
  component: EstablishmentPage,
});

function EstablishmentPage() {
  const { storeId } = Route.useLoaderData();
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(storeQuery(storeId));
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("price-asc");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [historyFor, setHistoryFor] = useState<PublicStoreProduct | null>(null);

  const filtered = useMemo(() => {
    const term = normalize(q);
    let list = data.products.slice();
    if (selectedCategory) list = list.filter((p) => p.category === selectedCategory);
    if (term) {
      list = list.filter((p) => {
        const hay = normalize(`${p.productName} ${p.brand ?? ""} ${p.category}`);
        return hay.includes(term);
      });
    }
    switch (sort) {
      case "price-asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "ppu-asc":
        list.sort((a, b) => (a.pricePerUnit ?? Infinity) - (b.pricePerUnit ?? Infinity));
        break;
      case "recent":
        list.sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());
        break;
      case "name":
      default:
        list.sort((a, b) => a.productName.localeCompare(b.productName, "pt-BR"));
    }
    return list;
  }, [data.products, q, sort, selectedCategory]);

  const cheapest = useMemo(() => {
    if (!data.products.length) return null;
    return data.products.reduce((min, p) => (p.price < min.price ? p : min), data.products[0]);
  }, [data.products]);

  const hasLocation = Boolean(
    data.store.address || data.store.neighborhood || data.store.city,
  );

  const loc = useUserLocation();
  const referencePoint = useMemo(() => {
    if (loc.status === "granted" && loc.coords) return loc.coords;
    if (loc.status === "manual" && loc.neighborhoodKey) {
      return resolveEstablishmentPosition({ neighborhood: loc.neighborhoodKey }).position;
    }
    return null;
  }, [loc.status, loc.coords, loc.neighborhoodKey]);
  const distance = useMemo(() => {
    if (!referencePoint) return null;
    const { position, source } = resolveEstablishmentPosition({
      latitude: data.store.latitude,
      longitude: data.store.longitude,
      neighborhood: data.store.neighborhood,
    });
    return { km: haversineKm(referencePoint, position), source };
  }, [referencePoint, data.store.latitude, data.store.longitude, data.store.neighborhood]);

  const createAlert = (_p: PublicStoreProduct) => {
    navigate({ to: "/alertas" });
  };



  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-6">
        <Link
          to="/estabelecimentos"
          className="mb-4 inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3.5 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-foreground transition-colors hover:border-brand-gold hover:bg-[var(--pc-hover-tint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Todos os estabelecimentos
        </Link>


        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-start gap-4">
            {data.store.logoUrl ? (
              <img
                src={data.store.logoUrl}
                alt={data.store.name}
                className="h-20 w-20 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="grid h-20 w-20 place-items-center rounded-full border border-border bg-muted text-lg font-bold text-muted-foreground">
                {data.store.name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <CardTitle className="text-2xl">{data.store.name}</CardTitle>
                <FavoriteMarketButton marketName={data.store.name} variant="inline" />
              </div>
              <CardDescription className="mt-1">
                {data.products.length} produto{data.products.length === 1 ? "" : "s"} publicados
                {data.categories.length > 0 && ` · ${data.categories.length} categorias`}
              </CardDescription>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {data.store.neighborhood && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand-gold bg-brand-gold px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-navy">
                    <MapPin className="h-3 w-3" aria-hidden />
                    Bairro {data.store.neighborhood}
                  </span>
                )}
                {(data.store.city || data.store.state) && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
                    {[data.store.city, data.store.state].filter(Boolean).join(" · ")}
                  </span>
                )}
                {distance && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full border border-brand-navy/30 bg-brand-navy/5 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-navy dark:border-brand-gold/40 dark:bg-brand-gold/10 dark:text-brand-gold"
                    title={
                      distance.source === "exact"
                        ? "Distância linear a partir da sua localização"
                        : distance.source === "neighborhood"
                          ? "Distância aproximada — baseada no bairro"
                          : "Distância aproximada — baseada na cidade"
                    }
                  >
                    <MapPin className="h-3 w-3" aria-hidden />
                    {formatDistance(distance.km)} {distance.source === "exact" ? "de você" : "aprox."}
                  </span>
                )}
              </div>
              <div className="mt-3">
                <LocationControl loc={loc} variant="surface" />
              </div>

              {data.store.address && (
                <p className="mt-2 flex items-start gap-1.5 text-sm font-medium text-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span>{data.store.address}</span>
                </p>
              )}
            </div>
          </CardHeader>
          {cheapest && (
            <CardContent className="border-t border-border/60 bg-muted/30 py-3">
              <div className="text-xs text-muted-foreground">Menor preço no momento</div>
              <div className="mt-1 flex flex-wrap items-baseline gap-2">
                <span className="text-base font-semibold">{cheapest.productName}</span>
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {brl(cheapest.price)}
                </span>
              </div>
            </CardContent>
          )}
        </Card>

        {data.categories.length > 0 && (
          <div className="mt-6" aria-label="Filtrar por categoria">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Categorias
            </div>
            <div role="radiogroup" aria-label="Categorias" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={selectedCategory === null}
                onClick={() => setSelectedCategory(null)}
                className={
                  selectedCategory === null
                    ? "inline-flex h-9 items-center gap-1.5 rounded-full border border-brand-gold bg-brand-gold px-3.5 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-brand-navy shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    : "inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3.5 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-foreground transition-colors hover:border-brand-gold hover:bg-[var(--pc-hover-tint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                }
              >
                Todas
                <span className={selectedCategory === null ? "rounded-full bg-brand-navy/15 px-1.5 py-0.5 text-[10px] font-bold text-brand-navy tabular-nums" : "rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-foreground/80 tabular-nums"}>
                  {data.products.length}
                </span>
              </button>
              {data.categories.map((c) => {
                const active = selectedCategory === c.label;
                return (
                  <button
                    key={c.key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setSelectedCategory(active ? null : c.label)}
                    className={
                      active
                        ? "inline-flex h-9 items-center gap-1.5 rounded-full border border-brand-gold bg-brand-gold px-3.5 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-brand-navy shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        : "inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3.5 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-foreground transition-colors hover:border-brand-gold hover:bg-[var(--pc-hover-tint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    }
                  >
                    {c.label}
                    <span className={active ? "rounded-full bg-brand-navy/15 px-1.5 py-0.5 text-[10px] font-bold text-brand-navy tabular-nums" : "rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-foreground/80 tabular-nums"}>
                      {c.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}


        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar produto (ignora acentos e ç/c)"
              className="pl-9"
              inputMode="search"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground transition-colors hover:border-brand-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Ordenar por"
          >
            {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
              <option key={k} value={k}>
                {SORT_LABEL[k]}
              </option>
            ))}
          </select>

        </div>

        <div className="mt-4 text-xs text-muted-foreground">
          {filtered.length} de {data.products.length} produtos
          {selectedCategory && <> · categoria <strong>{selectedCategory}</strong></>}
        </div>


        <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <li key={p.slug}>
              <ProductListCard
                name={p.productName}
                category={p.category}
                brand={p.brand}
                price={p.price}
                pricePerUnit={p.pricePerUnit}
                unitLabel={p.unitLabel}
                lastDate={p.lastDate}
                onAlert={() => createAlert(p)}
                onHistory={() => setHistoryFor(p)}
              />
            </li>
          ))}
        </ul>

        {filtered.length === 0 && (
          <EmptyState
            className="mt-8"
            icon={Search}
            title="Nenhum produto encontrado"
            message={
              selectedCategory
                ? `Nenhum item${q ? ` para "${q}"` : ""} nessa categoria.`
                : q
                  ? `Nenhum item para "${q}".`
                  : "Ainda não há produtos disponíveis."
            }
            action={
              selectedCategory ? (
                <Button variant="outline" size="sm" onClick={() => setSelectedCategory(null)}>
                  Limpar categoria
                </Button>
              ) : undefined
            }
          />
        )}




        {hasLocation && (
          <div className="mt-10 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Endereço do estabelecimento
            </div>
            <div className="mt-2 flex flex-wrap items-start gap-x-3 gap-y-1.5 text-sm">
              {data.store.address && (
                <span className="inline-flex items-start gap-1.5 font-medium text-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" aria-hidden />
                  {data.store.address}
                </span>
              )}
              {data.store.neighborhood && (
                <span className="inline-flex items-center gap-1 rounded-full border border-brand-gold bg-brand-gold px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-navy">
                  Bairro {data.store.neighborhood}
                </span>
              )}
              {(data.store.city || data.store.state) && (
                <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
                  {[data.store.city, data.store.state].filter(Boolean).join(" · ")}
                </span>
              )}
            </div>
          </div>
        )}


        <p className="mt-6 text-[11px] leading-relaxed text-muted-foreground">
          Preços e informações exibidos pertencem ao estabelecimento{" "}
          <strong className="text-foreground">{data.store.name}</strong> e são
          publicados na plataforma PreçoCerto para consulta da comunidade.
        </p>

      </main>

      <PriceHistorySheet
        storeId={storeId}
        product={historyFor}
        onClose={() => setHistoryFor(null)}
      />

      <SiteFooter />
    </div>
  );
}

function PriceHistorySheet({
  storeId,
  product,
  onClose,
}: {
  storeId: string;
  product: PublicStoreProduct | null;
  onClose: () => void;
}) {
  const fetchHistory = useServerFn(getPublicPriceHistory);
  const { data: history, isLoading } = useQuery({
    queryKey: ["public-history", storeId, product?.productName ?? ""],
    queryFn: () =>
      fetchHistory({
        data: {
          establishmentId: storeId,
          productName: product!.productName,
          limit: 50,
        },
      }),
    enabled: !!product,
    staleTime: 30_000,
  });

  return (
    <Sheet open={!!product} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{product?.productName ?? "Histórico"}</SheetTitle>
          <SheetDescription>
            Alterações de preço registradas neste estabelecimento.
          </SheetDescription>
        </SheetHeader>

        {isLoading && (
          <div className="mt-6 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && (!history || history.length === 0) && (
          <p className="mt-6 text-sm text-muted-foreground">
            Nenhuma alteração registrada ainda.
          </p>
        )}

        {!isLoading && history && history.length > 0 && (
          <ol className="mt-6 space-y-3">
            {history.map((h) => {
              const trend =
                h.change_pct == null
                  ? "flat"
                  : h.change_pct > 0.01
                    ? "up"
                    : h.change_pct < -0.01
                      ? "down"
                      : "flat";
              return (
                <li
                  key={h.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold tabular-nums">{brl(h.price)}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(h.captured_at).toLocaleString("pt-BR")}
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {h.source === "edit"
                        ? `Editado por ${h.changed_by_email ?? "administrador"}`
                        : "Registro automático"}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {h.previous_price != null && (
                      <div className="text-[11px] text-muted-foreground line-through tabular-nums">
                        {brl(h.previous_price)}
                      </div>
                    )}
                    {h.change_pct != null && (
                      <div
                        className={`mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium ${
                          trend === "down"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : trend === "up"
                              ? "text-red-600 dark:text-red-400"
                              : "text-muted-foreground"
                        }`}
                      >
                        {trend === "down" ? (
                          <ArrowDown className="h-3 w-3" />
                        ) : trend === "up" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <Minus className="h-3 w-3" />
                        )}
                        {h.change_pct > 0 ? "+" : ""}
                        {h.change_pct.toFixed(1)}%
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </SheetContent>
    </Sheet>
  );
}
