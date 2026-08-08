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

const historyQuery = (id: string) =>
  queryOptions({
    queryKey: ["public-store-history", id],
    queryFn: () => getPublicPriceHistory({ data: { storeId: id, limit: 100 } }),
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
    <div className="min-h-svh bg-background text-foreground">
      {/* Barra superior única: marca + navegação na mesma linha (sem espaço morto). */}
      <div className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-2 px-3 py-1.5 sm:px-6">
          <HomeBrandLink />
          <div className="ml-auto flex items-center gap-1.5">
            <ShareButton
              size="sm"
              label="Compartilhar"
              title={`${data.store.name} — PreçoCerto`}
              text={`Veja os preços de ${data.store.name} no PreçoCerto`}
              className="h-8 !text-[12.5px] font-bold uppercase tracking-[0.16em]"
            />

            <Link
              to="/estabelecimentos"
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[12.5px] font-bold uppercase leading-none tracking-[0.16em] text-foreground transition-colors hover:border-brand-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              <span className="hidden sm:inline">Estabelecimentos</span>
            </Link>
            <Link
              to="/catalogo/$slug"
              params={{ slug }}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-brand-gold bg-brand-gold/10 px-3 text-[12.5px] font-bold uppercase leading-none tracking-[0.16em] text-foreground transition-colors hover:bg-brand-gold/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            >
              <PackageSearch className="h-3.5 w-3.5 text-gold-ink" aria-hidden /> Catálogo completo
            </Link>
          </div>
        </div>
      </div>
      <main className="mx-auto max-w-5xl px-3 pb-14 pt-3 sm:px-6">

        {/* Hero compacto — escala: eyebrow 10 / título 19-22 / meta 12 / stat 15 */}
        <header className="overflow-hidden rounded-xl border border-border/70 bg-brand-navy text-white shadow-sm">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 px-3.5 py-3 sm:px-4">
            <StoreBadge
              name={data.store.name}
              logoUrl={data.store.logoUrl}
              size="md"
              className="rounded-xl"
            />
            <div className="min-w-0">
              <p className="text-[12.5px] font-bold uppercase leading-none tracking-[0.18em] text-gold-ink">
                Mercado parceiro
              </p>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                <h1 className="min-w-0 truncate font-serif text-[21px] font-semibold leading-[1.15] sm:text-[25px]">
                  {data.store.name}
                </h1>
                <div className="flex shrink-0 items-center gap-1.5">
                  <RatingBadge value={PLATFORM_RATING.value} count={PLATFORM_RATING.count} />
                  <FavoriteMarketButton marketName={data.store.name} variant="inline" />
                </div>
              </div>
              <p className="mt-0.5 truncate text-[13px] leading-snug text-white/85">
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
                  <span className="inline-flex h-6 items-center gap-1 rounded-full border border-brand-gold/45 bg-brand-gold/15 px-2.5 text-[12.5px] font-bold uppercase leading-none tracking-[0.14em] text-gold-ink">
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
              accent
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
            {(isButcherStore
              ? [
                  { id: "acougue" as const, label: "Açougue · Cortes", count: cuts.length },
                  { id: "catalogo" as const, label: "Outros produtos", count: general.length },
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
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSearch({ aba: t.id })}
                  className={
                    active
                      ? "inline-flex h-8 items-center gap-1.5 rounded-full border border-brand-gold bg-brand-gold px-3 text-[13px] font-semibold leading-none text-brand-navy"
                      : "inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[13px] font-semibold leading-none text-foreground transition-colors hover:border-brand-gold"
                  }
                >
                  {t.label}
                  <span className="text-[12.5px] font-bold tabular-nums opacity-70">{t.count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Últimas atualizações — faixa única com rolagem horizontal (sem nuvem de chips). */}
        <section className="mt-2.5 overflow-hidden rounded-xl border border-border bg-card/70">
          <div className="flex items-center gap-2 border-b border-border/70 px-2.5 py-1.5">
            <h2 className="inline-flex items-center gap-1.5 text-[12.5px] font-bold uppercase leading-none tracking-[0.16em] text-muted-foreground">
              <History className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              Últimas atualizações
            </h2>
            <Link
              to="/colaborar"
              className="ml-auto inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-2.5 text-[12.5px] font-bold uppercase leading-none tracking-[0.14em] text-foreground transition-colors hover:bg-brand-gold hover:text-brand-navy"
            >
              <Camera className="h-3.5 w-3.5" aria-hidden />
              Enviar fotos
            </Link>
          </div>
          {recentUpdates.length > 0 ? (
            <ul className="flex snap-x gap-1.5 overflow-x-auto px-2.5 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {recentUpdates.map((p) => (
                <li
                  key={p.slug}
                  className="flex w-[190px] shrink-0 snap-start flex-col gap-0.5 rounded-lg border border-border bg-background px-2.5 py-1.5"
                >
                  <span className="truncate text-[13px] font-medium leading-tight text-foreground">
                    {p.productName}
                  </span>
                  <span className="flex items-baseline justify-between gap-2">
                    <Price value={p.price} size="xs" tone="best" />
                    <span className="text-[12.5px] tabular-nums text-muted-foreground">
                      {new Date(p.lastDate).toLocaleDateString("pt-BR")}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-2.5 py-2 text-[13px] leading-snug text-muted-foreground">
              Ainda não há atualizações recentes. Envie fotos das etiquetas para começar.
            </p>
          )}
        </section>

        {tab === "catalogo" && (
          <>
            {/* Painel único de controles: categorias + busca + ordenação + visão. */}
            <div className="mt-2.5 rounded-xl border border-border bg-card/70 p-2.5">
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

              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
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
                    className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-[14px] outline-none focus-visible:border-brand-gold focus-visible:ring-2 focus-visible:ring-brand-gold/50"
                  />
                </div>
                <Select value={sort} onValueChange={(v) => setSearch({ sort: v })}>
                  <SelectTrigger
                    aria-label="Ordenar por"
                    className="h-9 w-full text-[13.5px] font-medium sm:w-[240px]"
                  >
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                      <SelectItem key={k} value={k} className="text-[13.5px]">
                        {SORT_LABEL[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ViewToggle value={view} onChange={(v) => setSearch({ view: v })} />
              </div>

              {/* Ponte entre a categoria da loja e o hub correspondente da cidade. */}
              {activeHub && (
                <Link
                  to="/categoria/$slug"
                  params={{ slug: activeHub.slug }}
                  className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-gold-ink underline-offset-2 hover:underline"
                >
                  Comparar {selectedCategory} em toda a cidade · {activeHub.label}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              )}
            </div>


            <div className="mt-2.5 flex items-baseline justify-between gap-3">
              <h2 className="text-[12.5px] font-bold uppercase tracking-[0.16em] text-foreground">
                Produtos publicados
              </h2>
              <span className="text-[12.5px] text-muted-foreground">
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
                          onOpen={() => openQuickView(p)}
                          onAlert={() => createAlert(p)}
                          onHistory={() => setHistoryFor(p)}
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-2 overflow-hidden rounded-lg border border-border bg-card">
                    <div className="grid grid-cols-[minmax(0,1fr)_96px] items-center gap-3 border-b border-border bg-muted/60 px-2.5 py-1.5 sm:grid-cols-[minmax(0,1fr)_120px_96px_200px]">
                      <span className="text-[12.5px] font-bold uppercase leading-none tracking-[0.14em] text-muted-foreground">
                        Produto
                      </span>
                      <span className="hidden text-[12.5px] font-bold uppercase leading-none tracking-[0.14em] text-muted-foreground sm:block">
                        Unidade
                      </span>
                      <span className="text-right text-[12.5px] font-bold uppercase leading-none tracking-[0.14em] text-muted-foreground">
                        Preço
                      </span>
                      <span className="hidden text-right text-[12.5px] font-bold uppercase leading-none tracking-[0.14em] text-muted-foreground sm:block">
                        Ações
                      </span>
                    </div>
                    <ul className="divide-y divide-border/70">
                      {filtered.slice(0, limit).map((p) => (
                        <li key={p.slug}>
                          <ProductRow
                            product={p}
                            onOpen={() => openQuickView(p)}
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
                    className="mt-2.5 h-9 w-full rounded-lg border border-border bg-card text-[13.5px] font-semibold text-foreground transition-colors hover:border-brand-gold"
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
                    <Price as="div" value={h.price} size="sm" />
                    <div className="text-[12.5px] text-muted-foreground">
                      {new Date(h.captured_at).toLocaleString("pt-BR")}
                    </div>
                    <div className="mt-1 text-[12.5px] text-muted-foreground">
                      {h.source === "edit"
                        ? `Editado por ${h.changed_by_email ?? "administrador"}`
                        : "Registro automático"}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {h.previous_price != null && (
                      <Price as="div" value={h.previous_price} size="xs" tone="strike" />
                    )}
                    {h.change_pct != null && (
                      <div
                        className={`mt-0.5 inline-flex items-center gap-1 text-[12.5px] font-medium ${
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
                ? "inline-flex h-7 items-center gap-1 rounded-md bg-brand-gold px-2 text-[13px] font-bold leading-none text-brand-navy"
                : "inline-flex h-7 items-center gap-1 rounded-md px-2 text-[13px] font-semibold leading-none text-muted-foreground transition-colors hover:text-foreground"
            }
          >
            <Icon className="h-3.5 w-3.5" aria-hidden /> {label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Sufixo de preço por unidade ("· R$ 12,90 /kg").
 * Renderiza via <Price /> para manter a mesma tipografia monetária do site.
 */
function UnitSuffix({ product }: { product: PublicStoreProduct }) {
  const unit = product.unitLabel
    ? product.unitLabel.replace("R$", "").trim() || product.unitLabel
    : null;
  if (product.pricePerUnit == null || !unit) return null;
  return (
    <>
      {" · "}
      <Price value={product.pricePerUnit} size="xs" tone="muted" suffix={` ${unit}`} />
    </>
  );
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
    <article className="flex h-full flex-col justify-between rounded-lg border border-border bg-card shadow-elev-1 transition-colors hover:border-brand-gold hover:bg-muted/30">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Ver detalhes de ${product.productName}`}
        className="w-full px-3 pb-1.5 pt-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-gold"
      >
        <div className="flex items-start gap-2">
          <h3 className="min-w-0 flex-1 text-[14px] font-semibold leading-snug text-foreground">
            {product.productName}
          </h3>
          <Price value={product.price} size="md" className="shrink-0" />
        </div>
        <p className="mt-1 truncate text-[12.5px] leading-none text-muted-foreground">
          {[product.brand, product.category].filter(Boolean).join(" · ") || "Sem categoria"}
          <UnitSuffix product={product} />
        </p>
      </button>
      <div className="mx-3 mb-2.5 flex items-center justify-between gap-2 border-t border-border/70 pt-1.5">
        <span className="truncate text-[12.5px] leading-none text-muted-foreground">
          {product.lastDate
            ? `Atualizado ${new Date(product.lastDate).toLocaleDateString("pt-BR")}`
            : ""}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onAlert}
            aria-label={`Criar alerta de preço para ${product.productName}`}
            className="inline-flex h-6 items-center gap-1 rounded-full border border-border px-2 text-[12.5px] font-semibold leading-none text-foreground transition-colors hover:border-brand-gold"
          >
            <Bell className="h-3 w-3 text-muted-foreground" aria-hidden /> Alerta
          </button>
          <button
            type="button"
            onClick={onHistory}
            aria-label={`Ver histórico de preço de ${product.productName}`}
            className="inline-flex h-6 items-center gap-1 rounded-full border border-border px-2 text-[12.5px] font-semibold leading-none text-foreground transition-colors hover:border-brand-gold"
          >
            <History className="h-3 w-3 text-muted-foreground" aria-hidden /> Histórico
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
        <span className="block truncate text-[13.5px] font-semibold leading-tight text-foreground">
          {product.productName}
        </span>
        <span className="block truncate text-[12.5px] leading-tight text-muted-foreground">
          {[product.brand, product.category].filter(Boolean).join(" · ") || "Sem categoria"}
        </span>
      </button>

      <span className="hidden min-w-0 truncate text-[13px] leading-tight text-muted-foreground sm:block">
        {unit ? (
          <>
            {unit}
            {product.pricePerUnit != null ? (
              <Price
                value={product.pricePerUnit}
                size="xs"
                tone="muted"
                suffix={`/${unit}`}
                className="flex truncate"
              />
            ) : null}
          </>
        ) : (
          "—"
        )}
      </span>

      <Price value={product.price} size="sm" className="justify-end whitespace-nowrap" />

      <div className="hidden items-center justify-end gap-1 sm:flex">
        <button
          type="button"
          onClick={onAlert}
          aria-label={`Criar alerta de preço para ${product.productName}`}
          className="inline-flex h-7 items-center gap-1 rounded-full border border-border bg-background px-2 text-[12.5px] font-semibold leading-none text-foreground transition-colors hover:border-brand-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
        >
          <Bell className="h-3 w-3 text-muted-foreground" aria-hidden /> Alerta
        </button>
        <button
          type="button"
          onClick={onHistory}
          aria-label={`Ver histórico de preço de ${product.productName}`}
          className="inline-flex h-7 items-center gap-1 rounded-full border border-border bg-background px-2 text-[12.5px] font-semibold leading-none text-foreground transition-colors hover:border-brand-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
        >
          <History className="h-3 w-3 text-muted-foreground" aria-hidden /> Histórico
        </button>
      </div>
    </div>
  );
}


