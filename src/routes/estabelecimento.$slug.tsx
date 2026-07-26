import {
  createFileRoute,
  Link,
  notFound,
  useNavigate,
  stripSearchParams,
} from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  History,
  LayoutGrid,
  List as ListIcon,
  MapPin,
  Search,
  Minus,
  Loader2,
  Store,
  Bell,
} from "lucide-react";
import { getPublicStoreCatalog, type PublicStoreProduct } from "@/lib/stores-public.functions";
import { getPublicPriceHistory } from "@/lib/store-public-history.functions";
import { resolveEstablishmentBySlug } from "@/lib/establishment-slug.functions";
import { normalize } from "@/lib/search-tokens";
import { createRailController, type RailState } from "@/lib/rail-scroll";
import { useUserLocation } from "@/hooks/useUserLocation";
import { LocationControl } from "@/components/location/LocationControl";
import { formatDistance, haversineKm, resolveEstablishmentPosition } from "@/lib/geo";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { StoreBadge } from "@/components/brand/StoreBadge";
import { ButcherCounter, splitButcherCuts } from "@/components/estabelecimento/ButcherCounter";
import { PreparoDicas } from "@/components/estabelecimento/PreparoDicas";
import { FavoriteMarketButton } from "@/components/market/FavoriteMarketButton";
import { RatingBadge, PLATFORM_RATING } from "@/components/ds/RatingStars";
import { ProductQuickView, type QuickViewProduct } from "@/components/product/ProductQuickView";

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
const SEARCH_DEFAULTS = { q: "", cat: "", view: "grid", sort: "price-asc", aba: "catalogo" };

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  cat: fallback(z.string(), "").default(""),
  view: fallback(z.string(), "grid").default("grid"),
  sort: fallback(z.string(), "price-asc").default("price-asc"),
  aba: fallback(z.string(), "catalogo").default("catalogo"),
});

export const Route = createFileRoute("/estabelecimento/$slug")({
  validateSearch: zodValidator(searchSchema),
  search: { middlewares: [stripSearchParams(SEARCH_DEFAULTS)] },
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
  const search = Route.useSearch();

  const setSearch = (patch: Partial<typeof search>, opts?: { replace?: boolean }) => {
    navigate({
      to: "/estabelecimento/$slug",
      params: { slug },
      search: { ...search, ...patch },
      replace: opts?.replace ?? false,
    });
  };


  const sort: SortKey = (Object.keys(SORT_LABEL) as SortKey[]).includes(search.sort as SortKey)
    ? (search.sort as SortKey)
    : "price-asc";
  const view: "grid" | "list" = search.view === "list" ? "list" : "grid";
  const tab: "catalogo" | "acougue" = search.aba === "acougue" ? "acougue" : "catalogo";
  const selectedCategory = search.cat ? search.cat : null;

  const [q, setQ] = useState(search.q);
  const [historyFor, setHistoryFor] = useState<PublicStoreProduct | null>(null);
  const [quickView, setQuickView] = useState<PublicStoreProduct | null>(null);
  const [limit, setLimit] = useState(30);

  // Sincroniza o termo digitado com a URL (debounce) para compartilhar/voltar.
  useEffect(() => {
    if (q === search.q) return;
    const t = setTimeout(() => setSearch({ q }, { replace: true }), 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setQ(search.q);
  }, [search.q]);

  useEffect(() => {
    setLimit(30);
  }, [search.cat, search.q, search.sort, search.view]);




  const { cuts, general } = useMemo(() => splitButcherCuts(data.products), [data.products]);
  const hasButcher = cuts.length >= 5;
  const catalogProducts = hasButcher ? general : data.products;

  const filtered = useMemo(() => {
    const term = normalize(q);
    let list = catalogProducts.slice();
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
    <div className="min-h-svh bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-3 pb-14 pt-3 sm:px-6">
        <Link
          to="/estabelecimentos"
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[10px] font-bold uppercase leading-none tracking-[0.16em] text-foreground transition-colors hover:border-brand-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-brand-gold" aria-hidden /> Estabelecimentos
        </Link>

        {/* Hero compacto — escala: eyebrow 10 / título 19-22 / meta 12 / stat 15 */}
        <header className="mt-2.5 overflow-hidden rounded-xl border border-border/70 bg-[var(--pc-navy,#0b1e3f)] text-white shadow-sm">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 px-3.5 py-3 sm:px-4">
            <StoreBadge
              name={data.store.name}
              logoUrl={data.store.logoUrl}
              size="md"
              className="rounded-xl"
            />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase leading-none tracking-[0.18em] text-brand-gold">
                Mercado parceiro
              </p>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                <h1 className="min-w-0 truncate font-serif text-[19px] font-semibold leading-[1.15] sm:text-[22px]">
                  {data.store.name}
                </h1>
                <div className="flex shrink-0 items-center gap-1.5">
                  <RatingBadge value={PLATFORM_RATING.value} count={PLATFORM_RATING.count} />
                  <FavoriteMarketButton marketName={data.store.name} variant="inline" />
                </div>
              </div>
              <p className="mt-0.5 truncate text-[12px] leading-snug text-white/70">
                {[
                  data.store.address,
                  data.store.neighborhood ? `Bairro ${data.store.neighborhood}` : null,
                  [data.store.city, data.store.state].filter(Boolean).join("/") || null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {distance && (
                  <span className="inline-flex h-6 items-center gap-1 rounded-full border border-brand-gold/45 bg-brand-gold/15 px-2.5 text-[10px] font-bold uppercase leading-none tracking-[0.14em] text-brand-gold">
                    <MapPin className="h-3 w-3" aria-hidden />
                    {formatDistance(distance.km)}{" "}
                    {distance.source === "exact" ? "de você" : "aprox."}
                  </span>
                )}
                <LocationControl loc={loc} variant="surface" />
              </div>
            </div>
          </div>
          <dl className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10">
            <StoreStat label="Produtos" value={data.products.length.toLocaleString("pt-BR")} />
            <StoreStat label="Categorias" value={String(data.categories.length)} />
            <StoreStat
              label="Menor preço"
              value={cheapest ? brl(cheapest.price) : "—"}
              hint={cheapest?.productName}
            />
          </dl>
        </header>

        {hasButcher && (
          <div
            role="tablist"
            aria-label="Áreas do estabelecimento"
            className="mt-2.5 flex flex-wrap gap-1.5"
          >
            {([
              { id: "catalogo" as const, label: "Catálogo", count: general.length },
              { id: "acougue" as const, label: "Açougue", count: cuts.length },
            ]).map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSearch({ aba: t.id })}
                  className={
                    active
                      ? "inline-flex h-8 items-center gap-1.5 rounded-full border border-brand-gold bg-brand-gold px-3 text-[12px] font-semibold leading-none text-brand-navy"
                      : "inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[12px] font-semibold leading-none text-foreground transition-colors hover:border-brand-gold"
                  }
                >
                  {t.label}
                  <span className="text-[10px] font-bold tabular-nums opacity-70">{t.count}</span>
                </button>
              );
            })}
            <Link
              to="/estabelecimento/$slug_/acougue"
              params={{ slug }}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[12px] font-semibold leading-none text-foreground transition-colors hover:border-brand-gold"
            >
              Página do açougue
            </Link>
          </div>
        )}

        {tab === "catalogo" && (
          <>
            {data.categories.length > 0 && (
              <CategoryRail
                categories={[
                  { key: "__all", label: "Todas", count: catalogProducts.length },
                  ...data.categories,
                ]}
                activeLabel={selectedCategory}
                onSelect={(label) => {
                  setSearch({ cat: label === "Todas" ? "" : label });
                }}
              />
            )}

            <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setLimit(30);
                  }}
                  placeholder="Buscar produto (ignora acentos e ç/c)"
                  aria-label="Buscar produto"
                  inputMode="search"
                  className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-[13px] outline-none focus-visible:border-brand-gold focus-visible:ring-2 focus-visible:ring-brand-gold/50"
                />
              </div>
              <Select value={sort} onValueChange={(v) => setSearch({ sort: v })}>
                <SelectTrigger
                  aria-label="Ordenar por"
                  className="h-9 w-full text-[12.5px] font-medium sm:w-[240px]"
                >
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                    <SelectItem key={k} value={k} className="text-[12.5px]">
                      {SORT_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ViewToggle value={view} onChange={(v) => setSearch({ view: v })} />
            </div>

            <div className="mt-2.5 flex items-baseline justify-between gap-3">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-foreground">
                Produtos publicados
              </h2>
              <span className="text-[11px] text-muted-foreground">
                {filtered.length} de {catalogProducts.length}
                {selectedCategory ? ` · ${selectedCategory}` : ""}
              </span>
            </div>

            {filtered.length > 0 ? (
              <>
                {view === "grid" ? (
                  <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.slice(0, limit).map((p) => (
                      <li key={p.slug}>
                        <ProductTile
                          product={p}
                          onOpen={() => setQuickView(p)}
                          onAlert={() => createAlert(p)}
                          onHistory={() => setHistoryFor(p)}
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-2 overflow-hidden rounded-lg border border-border bg-card">
                    <div className="grid grid-cols-[minmax(0,1fr)_96px] items-center gap-3 border-b border-border bg-muted/60 px-2.5 py-1.5 sm:grid-cols-[minmax(0,1fr)_120px_96px_200px]">
                      <span className="text-[10px] font-bold uppercase leading-none tracking-[0.14em] text-muted-foreground">
                        Produto
                      </span>
                      <span className="hidden text-[10px] font-bold uppercase leading-none tracking-[0.14em] text-muted-foreground sm:block">
                        Unidade
                      </span>
                      <span className="text-right text-[10px] font-bold uppercase leading-none tracking-[0.14em] text-muted-foreground">
                        Preço
                      </span>
                      <span className="hidden text-right text-[10px] font-bold uppercase leading-none tracking-[0.14em] text-muted-foreground sm:block">
                        Ações
                      </span>
                    </div>
                    <ul className="divide-y divide-border/70">
                      {filtered.slice(0, limit).map((p) => (
                        <li key={p.slug}>
                          <ProductRow
                            product={p}
                            onOpen={() => setQuickView(p)}
                            onAlert={() => createAlert(p)}
                            onHistory={() => setHistoryFor(p)}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {filtered.length > limit && (
                  <button
                    type="button"
                    onClick={() => setLimit((l) => l + 30)}
                    className="mt-2.5 h-9 w-full rounded-lg border border-border bg-card text-[12.5px] font-semibold text-foreground transition-colors hover:border-brand-gold"
                  >
                    Mostrar mais ({filtered.length - limit} restantes)
                  </button>
                )}
              </>

            ) : (
              <EmptyState
                className="mt-6"
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
                    <Button variant="outline" size="sm" onClick={() => setSearch({ cat: "" })}>
                      Limpar categoria
                    </Button>
                  ) : undefined
                }
              />
            )}
          </>
        )}


        {hasButcher && tab === "acougue" && (
          <>
            <ButcherCounter
              storeName={data.store.name}
              cuts={cuts}
              onHistory={(p) => setHistoryFor(p)}
              onAlert={(p) => createAlert(p)}
              onOpen={(p) => setQuickView(p)}
            />
            <div className="mt-8">
              <PreparoDicas />
            </div>

          </>
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

      <ProductQuickView
        product={
          quickView
            ? ({
                name: quickView.productName,
                unit: quickView.unitLabel,
                minPrice: quickView.price,
                maxPrice: quickView.price,
                cheapestStore: data.store.name,
                cheapestLogo: data.store.logoUrl,
                updatedAt: quickView.lastDate,
              } satisfies QuickViewProduct)
            : null
        }
        onClose={() => setQuickView(null)}
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

/** Estatística do hero — escala 10/15, contraste sobre navy. */
function StoreStat({ label, value, hint }: { label: string; value: string; hint?: string | null }) {
  return (
    <div className="min-w-0 px-3 py-1.5">
      <dt className="text-[9.5px] font-semibold uppercase leading-none tracking-[0.14em] text-white/70">
        {label}
      </dt>
      <dd className="mt-1 truncate text-[15px] font-bold leading-none tabular-nums text-brand-gold">
        {value}
      </dd>
      {hint ? (
        <p className="mt-1 truncate text-[10.5px] leading-none text-white/75">{hint}</p>
      ) : null}
    </div>
  );
}

/** Chip de categoria — 32px, contraste navy/gold e foco visível. */
function CategoryChip({
  label,
  count,
  active,
  tabIndex,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  tabIndex: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      data-rail-item
      aria-checked={active}
      aria-current={active ? "page" : undefined}
      tabIndex={tabIndex}
      onClick={onClick}
      className={
        "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[12px] font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-1 focus-visible:ring-offset-background " +
        (active
          ? "border-brand-gold bg-brand-gold text-brand-navy"
          : "border-border bg-card text-foreground hover:border-brand-gold hover:bg-muted/60")
      }
    >
      {label}
      <span
        className={
          "text-[10px] font-bold tabular-nums " +
          (active ? "text-brand-navy/70" : "text-muted-foreground")
        }
      >
        {count}
      </span>
    </button>
  );
}


/** Trilho de categorias com setas, arraste, roda e teclado (sem recortes). */
function CategoryRail({
  categories,
  activeLabel,
  onSelect,
}: {
  categories: { key: string; label: string; count: number }[];
  activeLabel: string | null;
  onSelect: (label: string) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<RailState>({ canPrev: false, canNext: false });
  const ctrlRef = useRef<ReturnType<typeof createRailController> | null>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const ctrl = createRailController(el, setState);
    ctrlRef.current = ctrl;
    ctrl.sync();
    const onResize = () => ctrl.sync();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      ctrl.destroy();
      ctrlRef.current = null;
    };
  }, [categories.length]);

  const activeIndex = Math.max(
    0,
    categories.findIndex((c) =>
      c.label === "Todas" ? activeLabel === null : activeLabel === c.label,
    ),
  );

  useEffect(() => {
    ctrlRef.current?.centerActive("smooth");
  }, [activeLabel]);

  return (
    <nav aria-label="Filtrar por categoria" className="relative mt-2.5">
      <div className="flex items-center gap-1.5">
        <RailArrow
          dir={-1}
          disabled={!state.canPrev}
          onClick={() => ctrlRef.current?.scrollByPage(-1)}
        />
        <div
          ref={scrollerRef}
          onScroll={() => ctrlRef.current?.sync()}
          onKeyDown={(e) => {
            if (ctrlRef.current?.handleKey(e.key)) e.preventDefault();
          }}
          className="no-scrollbar min-w-0 flex-1 overflow-x-auto scroll-smooth"
        >
          <div
            role="radiogroup"
            aria-label="Categorias do estabelecimento"
            className="flex w-max gap-1.5 px-0.5 py-0.5"
          >
            {categories.map((c, i) => {
              const active = c.label === "Todas" ? activeLabel === null : activeLabel === c.label;
              return (
                <CategoryChip
                  key={c.key}
                  label={c.label}
                  count={c.count}
                  active={active}
                  tabIndex={i === activeIndex ? 0 : -1}
                  onClick={() => onSelect(c.label)}
                />
              );
            })}
          </div>
        </div>
        <RailArrow
          dir={1}
          disabled={!state.canNext}
          onClick={() => ctrlRef.current?.scrollByPage(1)}
        />
      </div>
      <p className="sr-only" aria-live="polite">
        {activeLabel ? `Categoria ${activeLabel} selecionada` : "Todas as categorias"}
      </p>
    </nav>
  );

}

function RailArrow({
  dir,
  disabled,
  onClick,
}: {
  dir: -1 | 1;
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = dir === -1 ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === -1 ? "Categorias anteriores" : "Próximas categorias"}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-brand-gold disabled:opacity-35 disabled:hover:border-border"
    >
      <Icon className="h-4 w-4 text-brand-gold" aria-hidden />
    </button>
  );
}

/** Alternância Lista/Grade — radiogroup acessível. */
function ViewToggle({
  value,
  onChange,
}: {
  value: "grid" | "list";
  onChange: (v: "grid" | "list") => void;
}) {
  const items = [
    { id: "grid" as const, label: "Grade", Icon: LayoutGrid },
    { id: "list" as const, label: "Lista", Icon: ListIcon },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Modo de exibição"
      className="flex h-9 shrink-0 items-center gap-1 rounded-lg border border-border bg-card p-1"
    >
      {items.map(({ id, label, Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`Exibir em ${label.toLowerCase()}`}
            onClick={() => onChange(id)}
            className={
              active
                ? "inline-flex h-7 items-center gap-1 rounded-md bg-brand-gold px-2 text-[11.5px] font-bold leading-none text-brand-navy"
                : "inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11.5px] font-semibold leading-none text-muted-foreground transition-colors hover:text-foreground"
            }
          >
            <Icon className="h-3.5 w-3.5" aria-hidden /> {label}
          </button>
        );
      })}
    </div>
  );
}

function unitSuffix(product: PublicStoreProduct) {
  const unit = product.unitLabel
    ? product.unitLabel.replace("R$", "").trim() || product.unitLabel
    : null;
  return product.pricePerUnit != null && unit ? ` · ${brl(product.pricePerUnit)} ${unit}` : "";
}

/** Cartão compacto de produto — clique abre o modal de detalhes. */
function ProductTile({
  product,
  onOpen,
  onAlert,
  onHistory,
}: {
  product: PublicStoreProduct;
  onOpen: () => void;
  onAlert: () => void;
  onHistory: () => void;
}) {
  return (
    <article className="flex h-full flex-col justify-between rounded-lg border border-border bg-card shadow-[0_1px_2px_rgba(11,30,63,0.04)] transition-colors hover:border-brand-gold hover:bg-muted/30">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Ver detalhes de ${product.productName}`}
        className="w-full px-3 pb-1.5 pt-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-gold"
      >
        <div className="flex items-start gap-2">
          <h3 className="min-w-0 flex-1 text-[13px] font-semibold leading-snug text-foreground">
            {product.productName}
          </h3>
          <span className="shrink-0 text-[13.5px] font-bold leading-tight tabular-nums text-foreground">
            {brl(product.price)}
          </span>
        </div>
        <p className="mt-1 truncate text-[11px] leading-none text-muted-foreground">
          {[product.brand, product.category].filter(Boolean).join(" · ") || "Sem categoria"}
          {unitSuffix(product)}
        </p>
      </button>
      <div className="mx-3 mb-2.5 flex items-center justify-between gap-2 border-t border-border/70 pt-1.5">
        <span className="truncate text-[10.5px] leading-none text-muted-foreground">
          {product.lastDate
            ? `Atualizado ${new Date(product.lastDate).toLocaleDateString("pt-BR")}`
            : ""}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onAlert}
            aria-label={`Criar alerta de preço para ${product.productName}`}
            className="inline-flex h-6 items-center gap-1 rounded-full border border-border px-2 text-[10.5px] font-semibold leading-none text-foreground transition-colors hover:border-brand-gold"
          >
            <Bell className="h-3 w-3 text-brand-gold" aria-hidden /> Alerta
          </button>
          <button
            type="button"
            onClick={onHistory}
            aria-label={`Ver histórico de preço de ${product.productName}`}
            className="inline-flex h-6 items-center gap-1 rounded-full border border-border px-2 text-[10.5px] font-semibold leading-none text-foreground transition-colors hover:border-brand-gold"
          >
            <History className="h-3 w-3 text-brand-gold" aria-hidden /> Histórico
          </button>
        </div>
      </div>
    </article>
  );
}

/** Linha densa em colunas (produto · unidade · preço · ações) para o modo Lista. */
function ProductRow({
  product,
  onOpen,
  onAlert,
  onHistory,
}: {
  product: PublicStoreProduct;
  onOpen: () => void;
  onAlert: () => void;
  onHistory: () => void;
}) {
  const unit =
    product.unitLabel?.replace("R$", "").replace(/^\s*\/\s*/, "").trim() ||
    (product.pricePerUnit != null ? "un" : null);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_96px] items-center gap-3 px-2.5 py-1.5 transition-colors hover:bg-muted/50 sm:grid-cols-[minmax(0,1fr)_120px_96px_200px]">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Ver detalhes de ${product.productName}`}
        className="min-w-0 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-gold"
      >
        <span className="block truncate text-[12.5px] font-semibold leading-tight text-foreground">
          {product.productName}
        </span>
        <span className="block truncate text-[10.5px] leading-tight text-muted-foreground">
          {[product.brand, product.category].filter(Boolean).join(" · ") || "Sem categoria"}
        </span>
      </button>

      <span className="hidden min-w-0 truncate text-[11.5px] leading-tight text-muted-foreground sm:block">
        {unit ? (
          <>
            {unit}
            {product.pricePerUnit != null ? (
              <span className="block truncate text-[10.5px] tabular-nums text-muted-foreground">
                {brl(product.pricePerUnit)} / {unit}
              </span>
            ) : null}
          </>
        ) : (
          "—"
        )}
      </span>

      <span className="whitespace-nowrap text-right text-[13px] font-bold tabular-nums leading-tight text-foreground">
        {brl(product.price)}
      </span>

      <div className="hidden items-center justify-end gap-1 sm:flex">
        <button
          type="button"
          onClick={onAlert}
          aria-label={`Criar alerta de preço para ${product.productName}`}
          className="inline-flex h-7 items-center gap-1 rounded-full border border-border bg-background px-2 text-[10.5px] font-semibold leading-none text-foreground transition-colors hover:border-brand-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
        >
          <Bell className="h-3 w-3 text-brand-gold" aria-hidden /> Alerta
        </button>
        <button
          type="button"
          onClick={onHistory}
          aria-label={`Ver histórico de preço de ${product.productName}`}
          className="inline-flex h-7 items-center gap-1 rounded-full border border-border bg-background px-2 text-[10.5px] font-semibold leading-none text-foreground transition-colors hover:border-brand-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
        >
          <History className="h-3 w-3 text-brand-gold" aria-hidden /> Histórico
        </button>
      </div>
    </div>
  );
}


