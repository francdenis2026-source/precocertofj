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
import { hubForCanonical } from "@/lib/category-hub";
import { categoryIcon } from "@/lib/category-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { brl } from "@/lib/format";
import {
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  Camera,
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
  PackageSearch,
  TrendingDown,
  TrendingUp,
  Clock,
  X,
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
import { SiteHeader } from "@/components/layout/SiteHeader";
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
import { HomeBrandLink } from "@/components/layout/HomeBrandLink";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { StoreBadge } from "@/components/brand/StoreBadge";
import {
  ButcherCounter,
  splitButcherCuts,
  parseButcherState,
  type ButcherViewState,
} from "@/components/estabelecimento/ButcherCounter";
import { PreparoDicas } from "@/components/estabelecimento/PreparoDicas";
import { FavoriteMarketButton } from "@/components/market/FavoriteMarketButton";
import { RatingBadge, PLATFORM_RATING } from "@/components/ds/RatingStars";
import { ProductQuickView, type QuickViewProduct } from "@/components/product/ProductQuickView";
import { useButcherIds } from "@/hooks/useButcherIds";

import { EmptyState, LoadingGrid, RouteError } from "@/components/feedback";
import { Price } from "@/components/ds/Price";
import { ShareButton } from "@/components/ds/ShareButton";



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

const historyQuery = (id: string, productName?: string) =>
  queryOptions({
    queryKey: ["public-store-history", id, productName],
    queryFn: () =>
      getPublicPriceHistory({
        data: { establishmentId: id, productName: productName || "", limit: 100 },
      }),
    enabled: !!productName,
    staleTime: 5 * 60_000,
  });
const SEARCH_DEFAULTS = {
  q: "",
  cat: "",
  view: "grid",
  sort: "price-asc",
  aba: "catalogo",
  bq: "",
  prot: "",
  bsort: "kg-asc",
  bview: "grid",
  p: "",
};

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  cat: fallback(z.string(), "").default(""),
  view: fallback(z.string(), "grid").default("grid"),
  sort: fallback(z.string(), "price-asc").default("price-asc"),
  aba: fallback(z.string(), "catalogo").default("catalogo"),
  bq: fallback(z.string(), "").default(""),
  prot: fallback(z.string(), "").default(""),
  bsort: fallback(z.string(), "kg-asc").default("kg-asc"),
  bview: fallback(z.string(), "grid").default("grid"),
  /** Slug do produto/corte aberto no modal — link compartilhável. */
  p: fallback(z.string(), "").default(""),
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
  const butcherIds = useButcherIds();
  // Estabelecimento classificado como açougue (tabela establishments.kind='acougue'):
  // o balcão de cortes vira a área principal e o "catálogo" fica como secundário.
  const isButcherStore = butcherIds.has(storeId);
  const tab: "catalogo" | "acougue" =
    search.aba === "acougue"
      ? "acougue"
      : search.aba === "catalogo"
        ? "catalogo"
        : isButcherStore
          ? "acougue"
          : "catalogo";
  const selectedCategory = search.cat ? search.cat : null;
  /** Hub da homepage correspondente à categoria de produto selecionada. */
  const activeHub = useMemo(
    () => (selectedCategory ? hubForCanonical(selectedCategory) : null),
    [selectedCategory],
  );

  const [q, setQ] = useState(search.q);
  const [historyFor, setHistoryFor] = useState<PublicStoreProduct | null>(null);
  // Produto do modal vem da URL: recarregar ou compartilhar reabre o mesmo item.
  const quickView = useMemo<PublicStoreProduct | null>(
    () => (search.p ? (data.products.find((p) => p.slug === search.p) ?? null) : null),
    [data.products, search.p],
  );
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




  const { cuts, general } = useMemo(
    () => splitButcherCuts(data.products, { isButcherStore }),
    [data.products, isButcherStore],
  );
  // Se a loja é açougue oficial, sempre exibimos a aba de cortes — mesmo com poucos
  // itens registrados; para as demais lojas mantemos o gatilho por volume (≥5).
  const hasButcher = isButcherStore ? cuts.length > 0 : cuts.length >= 5;
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

  /** Últimos produtos atualizados, para dar sinal de frescor do catálogo. */
  const recentUpdates = useMemo(
    () =>
      [...data.products]
        .filter((p) => Boolean(p.lastDate))
        .sort((a, b) => (a.lastDate < b.lastDate ? 1 : -1))
        .slice(0, 6),
    [data.products],
  );



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

  // Estado do açougue espelhado na URL (compartilhável e com voltar/avançar).
  const butcherState = useMemo(
    () => parseButcherState({ q: search.bq, prot: search.prot, bsort: search.bsort, bview: search.bview }),
    [search.bq, search.prot, search.bsort, search.bview],
  );
  const butcherQueryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const butcherStateRef = useRef(butcherState);
  butcherStateRef.current = butcherState;
  const setSearchRef = useRef(setSearch);
  setSearchRef.current = setSearch;
  // Callback estável: evita re-renderizar o balcão a cada mudança de estado.
  const patchButcher = useCallback((patch: Partial<ButcherViewState>) => {
    const next = { ...butcherStateRef.current, ...patch };
    const apply = () =>
      setSearchRef.current(
        {
          bq: next.q,
          prot: next.protein ?? "",
          bsort: next.sort,
          bview: next.view,
        },
        { replace: patch.q !== undefined },
      );
    if (butcherQueryRef.current) clearTimeout(butcherQueryRef.current);
    if (patch.q !== undefined) butcherQueryRef.current = setTimeout(apply, 350);
    else apply();
  }, []);

  const createAlert = useCallback(
    (_p: PublicStoreProduct) => {
      navigate({ to: "/alertas" });
    },
    [navigate],
  );
  const openQuickView = useCallback((p: PublicStoreProduct) => {
    setSearchRef.current({ p: p.slug });
  }, []);
  const closeQuickView = useCallback(() => {
    setSearchRef.current({ p: "" }, { replace: true });
  }, []);
  const openHistory = useCallback((p: PublicStoreProduct) => setHistoryFor(p), []);




  return (
    <div className="min-h-svh bg-[#F7F9FC]">
      <SiteHeader variant="solid" />

      <main className="mx-auto max-w-5xl px-3 pb-14 pt-3 sm:px-6">
        <header className="overflow-hidden rounded-[24px] border border-[#E5EAF1] bg-white text-[#0F172A] shadow-sm mb-8">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 px-3.5 py-3 sm:px-6 sm:py-6">
            <StoreBadge
              name={data.store.name}
              logoUrl={data.store.logoUrl}
              size="lg"
              className="rounded-2xl"
            />
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase leading-none tracking-[0.2em] text-[#2563EB]">
                Mercado parceiro
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <h1 className="min-w-0 truncate text-2xl font-black leading-[1.15] sm:text-3xl text-[#0F172A]">
                  {data.store.name}
                </h1>
                <div className="flex shrink-0 items-center gap-2">
                  <RatingBadge value={PLATFORM_RATING.value} count={PLATFORM_RATING.count} />
                  <FavoriteMarketButton marketName={data.store.name} variant="inline" />
                </div>
              </div>
              <p className="mt-2 truncate text-[14px] leading-snug text-[#64748B] font-medium">
                {[
                  data.store.address,
                  data.store.neighborhood ? `Bairro ${data.store.neighborhood}` : null,
                  [data.store.city, data.store.state].filter(Boolean).join("/") || null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {distance && (
                  <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#E5EAF1] bg-[#F8FAFC] px-3 text-[12px] font-black uppercase leading-none tracking-[0.16em] text-[#2563EB]">
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                    {formatDistance(distance.km)}{" "}
                    {distance.source === "exact" ? "de você" : "aprox."}
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>
        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E5EAF1] mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 divide-x divide-[#E5EAF1]">
              <MetricItem label="Produtos" value={data.products.length} icon={PackageSearch} />
              <MetricItem label="Categorias" value={data.categories.length} icon={LayoutGrid} className="pl-8" />
              <MetricItem label="Melhor oferta" value={cheapest ? brl(cheapest.price) : "—"} icon={TrendingDown} className="pl-8 hidden md:flex" />
            </div>
            <div className="h-full border-l border-[#E5EAF1] pl-6 hidden md:block">
              <LocationControl loc={loc} variant="surface" />
            </div>
          </div>
        </div>
        <div className="space-y-8">
          {hasButcher && (
            <div className="flex items-center gap-2 p-1 bg-[#F1F5F9] rounded-2xl w-fit">
              {(isButcherStore
                ? [
                    { id: "acougue" as const, label: "Açougue", count: cuts.length },
                    { id: "catalogo" as const, label: "Produtos", count: general.length },
                  ]
                : [
                    { id: "catalogo" as const, label: "Catálogo", count: general.length },
                    { id: "acougue" as const, label: "Açougue", count: cuts.length },
                  ]
              ).map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSearch({ aba: t.id })}
                    className={cn(
                      "px-6 py-2 rounded-xl text-sm font-black transition-all",
                      active 
                        ? "bg-white text-[#0F172A] shadow-sm" 
                        : "text-[#64748B] hover:text-[#0F172A]"
                    )}
                  >
                    {t.label}
                    <span className="ml-2 opacity-50 tabular-nums">{t.count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {tab === "catalogo" && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                  <input
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setLimit(30);
                    }}
                    placeholder="O que você procura?"
                    className="w-full pl-11 pr-4 py-3 bg-white border border-[#E5EAF1] rounded-2xl text-sm font-medium focus:ring-2 focus:ring-[#2563EB]/10 focus:border-[#2563EB] outline-none transition-all"
                  />
                </div>
                
                <div className="flex items-center gap-3">
                  <Select value={sort} onValueChange={(v) => setSearch({ sort: v })}>
                    <SelectTrigger className="h-12 w-[200px] rounded-2xl border-[#E5EAF1] bg-white font-bold text-[#0F172A]">
                      <SelectValue placeholder="Ordenar" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-[#E5EAF1]">
                      {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                        <SelectItem key={k} value={k} className="font-medium">{SORT_LABEL[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <ViewToggle value={view} onChange={(v) => setSearch({ view: v })} />
                </div>
              </div>

              {data.categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSearch({ cat: "" })}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                      !selectedCategory 
                        ? "bg-[#0F172A] text-white" 
                        : "bg-white border border-[#E5EAF1] text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB]"
                    )}
                  >
                    Tudo
                  </button>
                  {data.categories.map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => setSearch({ cat: cat.label })}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                        selectedCategory === cat.label 
                          ? "bg-[#0F172A] text-white" 
                          : "bg-white border border-[#E5EAF1] text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB]"
                      )}
                    >
                      {cat.label}
                      <span className="ml-2 opacity-50">{cat.count}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-8">
                <div className="flex items-baseline justify-between mb-4">
                  <h2 className="text-sm font-black text-[#0F172A] uppercase tracking-widest">
                    Produtos ({filtered.length})
                  </h2>
                </div>

                {filtered.length > 0 ? (
                  <>
                    {view === "grid" ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.slice(0, limit).map((p) => (
                          <ProductTile
                            key={p.slug}
                            product={p}
                            onOpen={() => openQuickView(p)}
                            onAlert={() => createAlert(p)}
                            onHistory={() => setHistoryFor(p)}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white rounded-3xl border border-[#E5EAF1] overflow-hidden">
                        <div className="grid grid-cols-[1fr_100px_100px] gap-4 px-6 py-4 bg-[#F8FAFC] border-b border-[#E5EAF1] text-[10px] font-black uppercase tracking-widest text-[#64748B]">
                          <span>Produto</span>
                          <span className="text-center">Unidade</span>
                          <span className="text-right">Preço</span>
                        </div>
                        <div className="divide-y divide-[#E5EAF1]">
                          {filtered.slice(0, limit).map((p) => (
                            <ProductRow
                              key={p.slug}
                              product={p}
                              onOpen={() => openQuickView(p)}
                              onAlert={() => createAlert(p)}
                              onHistory={() => setHistoryFor(p)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {filtered.length > limit && (
                      <Button
                        onClick={() => setLimit((l) => l + 30)}
                        variant="outline"
                        className="w-full mt-8 h-12 rounded-2xl border-[#E5EAF1] text-[#0F172A] font-bold"
                      >
                        Ver mais {filtered.length - limit} produtos
                      </Button>
                    )}
                  </>
                ) : (
                  <EmptyState
                    icon={Search}
                    title="Nada encontrado"
                    message="Tente ajustar sua busca ou categoria."
                  />
                )}
              </div>
            </div>
          )}
        </div>
        {tab === "catalogo" && (
          <div className="mt-8">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-sm font-black text-[#0F172A] uppercase tracking-widest">
                Produtos ({filtered.length})
              </h2>
            </div>

            {filtered.length > 0 ? (
              <>
                {view === "grid" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.slice(0, limit).map((p) => (
                      <ProductTile
                        key={p.slug}
                        product={p}
                        onOpen={() => openQuickView(p)}
                        onAlert={() => createAlert(p)}
                        onHistory={() => setHistoryFor(p)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl border border-[#E5EAF1] overflow-hidden">
                    <div className="grid grid-cols-[1fr_100px_100px] gap-4 px-6 py-4 bg-[#F8FAFC] border-b border-[#E5EAF1] text-[10px] font-black uppercase tracking-widest text-[#64748B]">
                      <span>Produto</span>
                      <span className="text-center">Unidade</span>
                      <span className="text-right">Preço</span>
                    </div>
                    <div className="divide-y divide-[#E5EAF1]">
                      {filtered.slice(0, limit).map((p) => (
                        <ProductRow
                          key={p.slug}
                          product={p}
                          onOpen={() => openQuickView(p)}
                          onAlert={() => createAlert(p)}
                          onHistory={() => setHistoryFor(p)}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {filtered.length > limit && (
                  <Button
                    onClick={() => setLimit((l) => l + 30)}
                    variant="outline"
                    className="w-full mt-8 h-12 rounded-2xl border-[#E5EAF1] text-[#0F172A] font-bold"
                  >
                    Ver mais {filtered.length - limit} produtos
                  </Button>
                )}
              </>
            ) : (
              <EmptyState
                icon={Search}
                title="Nada encontrado"
                message="Tente ajustar sua busca ou categoria."
              />
            )}
          </div>
        )}



        {hasButcher && tab === "acougue" && (
          <>
            <ButcherCounter
              storeName={data.store.name}
              cuts={cuts}
              state={butcherState}
              onStateChange={patchButcher}
              onHistory={openHistory}
              onAlert={createAlert}
              onOpen={openQuickView}
            />
            <div className="mt-5">
              <PreparoDicas />
            </div>


          </>
        )}





        {hasLocation && (
          <div className="mt-10 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
            <div className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Endereço do estabelecimento
            </div>
            <div className="mt-2 flex flex-wrap items-start gap-x-3 gap-y-1.5 text-sm">
              {data.store.address && (
                <span className="inline-flex items-start gap-1.5 font-medium text-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  {data.store.address}
                </span>
              )}
              {data.store.neighborhood && (
                <span className="inline-flex items-center gap-1 rounded-full border border-brand-gold bg-brand-gold px-2.5 py-0.5 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-brand-navy">
                  Bairro {data.store.neighborhood}
                </span>
              )}
              {(data.store.city || data.store.state) && (
                <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-foreground">
                  {[data.store.city, data.store.state].filter(Boolean).join(" · ")}
                </span>
              )}
            </div>
          </div>
        )}


        <p className="mt-6 text-[12.5px] leading-relaxed text-muted-foreground">
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
        onClose={closeQuickView}
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
          <div className="mt-6 flex flex-col items-center justify-center gap-3 py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--brand-primary)]" />
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Consultando registros...</p>
          </div>
        )}

        {!isLoading && (!history || history.length === 0) && (
          <div className="mt-6 text-center py-12">
            <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
               <History className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">
              Ainda não temos registros de alteração de preço para este produto nesta loja.
            </p>
          </div>
        )}

        {!isLoading && history && history.length > 0 && (
          <div className="mt-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
               <div className="p-4 rounded-3xl bg-emerald-500/5 border border-emerald-500/10">
                 <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 mb-1">Menor Valor</p>
                 <Price value={Math.min(...history.map(h => h.price))} size="md" className="font-black text-emerald-700 dark:text-emerald-400" />
               </div>
               <div className="p-4 rounded-3xl bg-rose-500/5 border border-rose-500/10">
                 <p className="text-[10px] font-black uppercase tracking-wider text-rose-600 mb-1">Maior Valor</p>
                 <Price value={Math.max(...history.map(h => h.price))} size="md" className="font-black text-rose-700 dark:text-rose-400" />
               </div>
            </div>

            <ol className="relative space-y-0 after:absolute after:left-[17px] after:top-2 after:h-[calc(100%-16px)] after:w-0.5 after:bg-border/40">
              {history.map((h, idx) => {
                const trend =
                  h.change_pct == null
                    ? "flat"
                    : h.change_pct > 0.001
                      ? "up"
                      : h.change_pct < -0.001
                        ? "down"
                        : "flat";
                return (
                  <li
                    key={h.id}
                    className="group relative pl-12 pb-8 last:pb-0"
                  >
                    <div className={cn(
                      "absolute left-0 top-1 z-10 grid h-9 w-9 place-items-center rounded-full border-2 bg-background transition-colors",
                      idx === 0 ? "border-[var(--brand-primary)]" : "border-border"
                    )}>
                      {trend === "down" ? (
                        <TrendingDown className="h-4 w-4 text-emerald-500" />
                      ) : trend === "up" ? (
                        <TrendingUp className="h-4 w-4 text-rose-500" />
                      ) : (
                        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <Price value={h.price} size="md" className="font-black" />
                        {h.change_pct != null && h.change_pct !== 0 && (
                          <div className={cn(
                            "flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider",
                            trend === "down" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                          )}>
                            {h.change_pct > 0 ? "+" : ""}{h.change_pct.toFixed(1)}%
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(h.captured_at).toLocaleString("pt-BR", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tight italic mt-1">
                        {h.source === "edit" ? "Atualizado via sistema" : "Captura automatizada"}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Estatística do hero — escala 10/15, contraste sobre navy. */
function StoreStat({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: string;
  hint?: string | null;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0 px-3 py-1.5">
      <dt className="text-[12.5px] font-semibold uppercase leading-none tracking-[0.14em] text-white/85">
        {label}
      </dt>
      <dd
        className={
          "mt-1 truncate text-[17px] font-bold leading-none tabular-nums " +
          (accent ? "text-gold-ink" : "text-white")
        }
      >
        {value}
      </dd>
      {hint ? (
        <p className="mt-1 truncate text-[12.5px] leading-none text-white/85">{hint}</p>
      ) : null}
    </div>
  );
}

/** Chip de categoria — 32px, contraste navy/gold e foco visível. */
function CategoryChip({
  label,
  count,
  active,
  hubSlug,
  hubLabel,
  tabIndex,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  /** Hub da homepage ao qual esta categoria de produto pertence. */
  hubSlug?: string | null;
  hubLabel?: string | null;
  tabIndex: number;
  onClick: () => void;
}) {
  const HubIcon = hubSlug ? categoryIcon(hubSlug) : null;
  return (
    <button
      type="button"
      role="radio"
      data-rail-item
      aria-checked={active}
      aria-current={active ? "page" : undefined}
      tabIndex={tabIndex}
      onClick={onClick}
      title={hubLabel ? `${label} — faz parte de ${hubLabel}` : label}
      className={
        "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[13px] font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-1 focus-visible:ring-offset-background " +
        (active
          ? "border-brand-gold bg-brand-gold text-brand-navy"
          : "border-border bg-card text-foreground hover:border-brand-gold hover:bg-muted/60")
      }
    >
      {HubIcon && (
        <HubIcon
          className={"h-3.5 w-3.5 shrink-0 " + (active ? "text-brand-navy/80" : "text-gold-ink")}
          strokeWidth={2.1}
          aria-hidden
        />
      )}
      {label}
      <span
        className={
          "text-[12.5px] font-bold tabular-nums " +
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
  categories: {
    key: string;
    label: string;
    count: number;
    hubSlug?: string | null;
    hubLabel?: string | null;
  }[];
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
                  hubSlug={c.hubSlug}
                  hubLabel={c.hubLabel}
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
      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
    </button>
  );
}


function MetricItem({ label, value, icon: Icon, className }: { label: string; value: string | number; icon: any; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-2 text-[#64748B]">
        <Icon className="w-4 h-4" />
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <span className="text-xl font-black text-[#0F172A]">{value}</span>
    </div>
  );
}

function ProductRow({ product, onOpen, onAlert, onHistory }: { product: PublicStoreProduct; onOpen: () => void; onAlert: () => void; onHistory: () => void }) {
  return (
    <div className="grid grid-cols-[1fr_100px_100px] gap-4 px-6 py-4 hover:bg-[#F8FAFC] transition-colors items-center group cursor-pointer" onClick={onOpen}>
      <div className="min-w-0">
        <h4 className="text-sm font-bold text-[#0F172A] truncate group-hover:text-[#2563EB] transition-colors">{product.productName}</h4>
        {product.brand && <p className="text-[10px] font-medium text-[#94A3B8] uppercase tracking-wider">{product.brand}</p>}
      </div>
      <div className="text-center text-xs font-bold text-[#64748B]">
        {product.unitLabel}
      </div>
      <div className="text-right">
        <span className="text-sm font-black text-[#0F172A]">{brl(product.price)}</span>
      </div>
    </div>
  );
}

function ProductTile({ product, onOpen, onAlert, onHistory }: { product: PublicStoreProduct; onOpen: () => void; onAlert: () => void; onHistory: () => void }) {
  return (
    <div 
      className="group bg-white rounded-3xl border border-[#E5EAF1] p-5 shadow-sm hover:border-[#2563EB]/30 hover:shadow-xl hover:shadow-[#2563EB]/5 transition-all duration-300 cursor-pointer"
      onClick={onOpen}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-[#F8FAFC] rounded-xl text-[#2563EB]">
          <PackageSearch className="w-5 h-5" />
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onHistory(); }}
          className="p-2 text-[#94A3B8] hover:text-[#2563EB] transition-colors"
        >
          <History className="w-4 h-4" />
        </button>
      </div>
      
      <div className="mb-4">
        <h4 className="text-sm font-black text-[#0F172A] leading-tight mb-1 group-hover:text-[#2563EB] transition-colors line-clamp-2">
          {product.productName}
        </h4>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">{product.unitLabel}</span>
          {product.brand && (
            <>
              <span className="text-[#E5EAF1]">·</span>
              <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">{product.brand}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-0.5">Preço atual</span>
          <span className="text-lg font-black text-[#0F172A]">{brl(product.price)}</span>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onAlert(); }}
          className="w-10 h-10 rounded-xl bg-[#F8FAFC] flex items-center justify-center text-[#64748B] hover:bg-[#2563EB] hover:text-white transition-all"
        >
          <Bell className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ViewToggle({ value, onChange }: { value: "grid" | "list"; onChange: (v: "grid" | "list") => void }) {
  return (
    <div className="flex p-1 bg-[#F1F5F9] rounded-2xl">
      <button
        onClick={() => onChange("grid")}
        className={cn(
          "p-2 rounded-xl transition-all",
          value === "grid" ? "bg-white text-[#0F172A] shadow-sm" : "text-[#64748B] hover:text-[#0F172A]"
        )}
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        onClick={() => onChange("list")}
        className={cn(
          "p-2 rounded-xl transition-all",
          value === "list" ? "bg-white text-[#0F172A] shadow-sm" : "text-[#64748B] hover:text-[#0F172A]"
        )}
      >
        <ListIcon className="w-4 h-4" />
      </button>
    </div>
  );
}



