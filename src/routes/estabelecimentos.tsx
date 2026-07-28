import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { slugifyEstablishment } from "@/lib/establishment-slug.functions";
import { useServerFn } from "@tanstack/react-start";
import {
  listPublicEstablishments,
  humanizeCategory,
  type EstablishmentsOverview,
} from "@/lib/establishments-public.functions";

import { FavoriteMarketButton } from "@/components/market/FavoriteMarketButton";
import { useSession } from "@/hooks/useSession";
import { listFavoriteMarkets } from "@/lib/favorites.functions";
import { useUserLocation } from "@/hooks/useUserLocation";
import { LocationControl } from "@/components/location/LocationControl";
import {
  formatDistance,
  haversineKm,
  resolveEstablishmentPosition,
} from "@/lib/geo";
import { normalizeNeighborhood } from "@/lib/geo-labels";
import { HighlightMatch } from "@/components/search/HighlightMatch";
import { tokenizeQuery } from "@/lib/search-tokens";

/** Grade tabular da visualização em Lista (colunas alinhadas). */
const LIST_GRID =
  "grid grid-cols-[28px_44px_minmax(0,1fr)_160px_80px_78px_120px_20px] items-center gap-3";

import { IsolatedPage } from "@/components/layout/IsolatedPage";
import { BackButton } from "@/components/layout/BackButton";
import { HomeBrandLink } from "@/components/layout/HomeBrandLink";
import {
  EmptyState,
  LoadingSkeleton,
} from "@/components/layout";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronRight, Package, Search, Store, TrendingUp, Pill, Croissant, Beef, ShoppingBasket, PiggyBank, Radio, ChevronLeft, LayoutGrid, Rows3 } from "lucide-react";
import {
  MarketEditorialCard,
  MarketEditorialCardSkeleton,
} from "@/components/estabelecimentos/MarketEditorialCard";

import { useRef } from "react";
import { StoreLogoThumb } from "@/components/brand/StoreLogoThumb";
import { tc } from "@/lib/typeclear";
import { cn } from "@/lib/utils";
import { StatCellDivider, StatCellGroup } from "@/components/ds/StatCell";


import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/estabelecimentos")({
  head: () => ({
    meta: [
      { title: "Estabelecimentos com preços atualizados — PreçoCerto" },
      {
        name: "description",
        content:
          "Veja quantos produtos cada mercado tem cadastrado, quais são as categorias mais comuns e onde encontrar os melhores preços em Feijó/AC.",
      },
      { property: "og:title", content: "Mercados parceiros — PreçoCerto" },
      {
        property: "og:description",
        content:
          "Rede de mercados com preços monitorados e categorias mais populares.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EstablishmentsPage,
});

// Persistência de filtros/scroll — sessionStorage sobrevive a navegações internas
type SortKey = "distance" | "name" | "neighborhood" | "products";
type PersistedFilters = {
  q: string;
  neighborhood: string;
  sort: SortKey;
  kindFilter: string;
};
const FILTERS_KEY = "pc:establishments:filters:v1";
const SCROLL_KEY = "pc:establishments:scroll:v1";
const PAGE_SIZE = 6;
const DEFAULT_FILTERS: PersistedFilters = {
  q: "",
  neighborhood: "__all",
  sort: "neighborhood",
  kindFilter: "__all",
};
function readPersistedFilters(): PersistedFilters {
  if (typeof window === "undefined") return DEFAULT_FILTERS;
  try {
    const raw = sessionStorage.getItem(FILTERS_KEY);
    if (!raw) return DEFAULT_FILTERS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_FILTERS, ...parsed };
  } catch {
    return DEFAULT_FILTERS;
  }
}
function writePersistedFilters(f: PersistedFilters) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(FILTERS_KEY, JSON.stringify(f));
  } catch {
    /* storage cheio ou bloqueado — ignorar */
  }
}

// Classificação por catálogo — sempre presente para consistência visual entre cards
function classifyTier(productsCount: number): { label: string; color: string } {
  if (productsCount >= 200) return { label: "+200 itens", color: "#c9a227" };
  if (productsCount >= 60) return { label: "+60 itens", color: "#5b6673" };
  if (productsCount >= 15) return { label: "+15 itens", color: "#a97142" };
  return { label: "Novo aqui", color: "#4b6cb7" };
}

// Freshness — proxy de "horários" (sinaliza atividade recente do estabelecimento)
function describeFreshness(iso: string | null): { label: string; live: boolean } {
  if (!iso) return { label: "Sem atualização recente", live: false };
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return { label: "Sem atualização recente", live: false };
  const diff = Date.now() - t;
  const hours = diff / (60 * 60 * 1000);
  if (hours < 24) return { label: "Atualizado hoje", live: true };
  const days = Math.floor(hours / 24);
  if (days === 1) return { label: "Atualizado ontem", live: true };
  if (days < 7) return { label: `Atualizado há ${days} dias`, live: true };
  if (days < 30) return { label: `Atualizado há ${Math.floor(days / 7)} sem.`, live: false };
  return { label: "Atualização antiga", live: false };
}



function EstablishmentsPage() {
  const fetchList = useServerFn(listPublicEstablishments);
  const { data, isLoading, error } = useQuery({
    queryKey: ["public-establishments"],
    queryFn: () => fetchList({}),
    staleTime: 60_000,
  });

  const { user } = useSession();
  const listFavFn = useServerFn(listFavoriteMarkets);
  const { data: favMarkets } = useQuery({
    queryKey: ["favorite-markets"],
    queryFn: () => listFavFn(),
    enabled: !!user,
    staleTime: 60_000,
  });
  const favSet = useMemo(
    () =>
      new Set(
        (favMarkets ?? []).map((f) => f.marketName.trim().toLowerCase()),
      ),
    [favMarkets],
  );
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  useEffect(() => {
    if (!user) setOnlyFavorites(false);
  }, [user]);

  // Filtros persistidos em sessionStorage — sobrevivem ao voltar de /estabelecimento/$slug
  const persisted = readPersistedFilters();
  const [q, setQ] = useState(persisted.q);
  const [neighborhood, setNeighborhood] = useState<string>(persisted.neighborhood);
  const [sort, setSort] = useState<SortKey>(persisted.sort);
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const loc = useUserLocation();
  const [kindFilter, setKindFilter] = useState<string>(persisted.kindFilter);
  const [metricDetail, setMetricDetail] = useState<null | "establishments" | "products" | "savings" | "live">(null);
  const [view, setView] = useState<"cards" | "list">(() => {
    if (typeof window === "undefined") return "cards";
    return window.localStorage.getItem("pc_estab_view") === "list" ? "list" : "cards";
  });
  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem("pc_estab_view", view);
  }, [view]);
  const searchTokens = useMemo(() => tokenizeQuery(q), [q]);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Carregamento incremental: revela mais itens quando o rodapé entra em tela.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((en) => en.isIntersecting)) {
          setVisibleCount((c) => c + PAGE_SIZE);
        }
      },
      { rootMargin: "240px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visibleCount, q, neighborhood, sort, kindFilter, view]);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  

  // Salva no sessionStorage sempre que qualquer filtro muda.
  useEffect(() => {
    writePersistedFilters({ q, neighborhood, sort, kindFilter });
  }, [q, neighborhood, sort, kindFilter]);

  // Restaura scroll ao voltar
  useEffect(() => {
    const y = Number(sessionStorage.getItem(SCROLL_KEY) ?? "0");
    if (y > 0) window.scrollTo({ top: y, behavior: "auto" });
    const onScroll = () => {
      sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-switch para "distância" quando o usuário fornece uma referência de localização
  useEffect(() => {
    if (loc.hasReference) setSort("distance");
  }, [loc.hasReference]);

  // Ponto de referência: coordenadas reais ou centróide do bairro escolhido manualmente
  const referencePoint = useMemo(() => {
    if (loc.status === "granted" && loc.coords) return loc.coords;
    if (loc.status === "manual" && loc.neighborhoodKey) {
      return resolveEstablishmentPosition({ neighborhood: loc.neighborhoodKey }).position;
    }
    return null;
  }, [loc.status, loc.coords, loc.neighborhoodKey]);

  const neighborhoods = useMemo(() => {
    if (!data) return [] as string[];
    const set = new Set<string>();
    for (const e of data.items) if (e.neighborhood) set.add(e.neighborhood);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [data]);

  // Mapa id → distância em km (quando houver referência)
  const distanceById = useMemo(() => {
    const m = new Map<string, { km: number; source: "exact" | "neighborhood" | "city" }>();
    if (!data || !referencePoint) return m;
    for (const e of data.items) {
      const { position, source } = resolveEstablishmentPosition({
        latitude: e.latitude,
        longitude: e.longitude,
        neighborhood: e.neighborhood,
      });
      m.set(e.id, { km: haversineKm(referencePoint, position), source });
    }
    return m;
  }, [data, referencePoint]);

  const allFilteredItems = useMemo(() => {
    if (!data) return [] as EstablishmentsOverview["items"];
    const term = q.trim().toLowerCase();
    let list = data.items.slice();
    if (onlyFavorites) {
      list = list.filter((e) => favSet.has(e.name.trim().toLowerCase()));
    }
    if (kindFilter !== "__all") {
      list = list.filter((e) => (e.kind ?? "outro") === kindFilter);
    }
    if (neighborhood !== "__all") {
      list = list.filter((e) => (e.neighborhood ?? "") === neighborhood);
    }
    if (term) {
      list = list.filter((e) =>
        [e.name, e.neighborhood ?? "", e.city ?? ""].some((v) =>
          v.toLowerCase().includes(term),
        ),
      );
    }
    switch (sort) {
      case "distance": {
        // Sem referência: cai para bairro-do-usuário quando ele escolheu manualmente,
        // senão comporta-se como "bairro (A→Z)" para não confundir.
        if (referencePoint) {
          list.sort((a, b) => {
            const da = distanceById.get(a.id)?.km ?? Number.POSITIVE_INFINITY;
            const db = distanceById.get(b.id)?.km ?? Number.POSITIVE_INFINITY;
            if (da !== db) return da - db;
            return a.name.localeCompare(b.name, "pt-BR");
          });
        } else if (loc.neighborhoodKey) {
          const target = loc.neighborhoodKey;
          list.sort((a, b) => {
            const sameA = normalizeNeighborhood(a.neighborhood) === target ? 0 : 1;
            const sameB = normalizeNeighborhood(b.neighborhood) === target ? 0 : 1;
            if (sameA !== sameB) return sameA - sameB;
            return a.name.localeCompare(b.name, "pt-BR");
          });
        } else {
          list.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
        }
        break;
      }
      case "neighborhood":
        list.sort((a, b) => {
          const an = a.neighborhood ?? "\uffff";
          const bn = b.neighborhood ?? "\uffff";
          const cmp = an.localeCompare(bn, "pt-BR");
          return cmp !== 0 ? cmp : a.name.localeCompare(b.name, "pt-BR");
        });
        break;
      case "products":
        list.sort((a, b) => b.productsCount - a.productsCount);
        break;
      case "name":
      default:
        list.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    }
    return list;
  }, [data, q, neighborhood, sort, kindFilter, onlyFavorites, favSet, referencePoint, distanceById, loc.neighborhoodKey]);

  // Reset da paginação quando o resultado muda
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [q, neighborhood, sort, kindFilter, onlyFavorites, referencePoint]);

  const visibleItems = useMemo(
    () => allFilteredItems.slice(0, visibleCount),
    [allFilteredItems, visibleCount],
  );

  const kindsPresent = useMemo(() => {
    if (!data) return new Set<string>();
    const s = new Set<string>();
    for (const it of data.items) s.add(it.kind ?? "outro");
    return s;
  }, [data]);

  const featured = useMemo(() => {
    if (!data) return [] as EstablishmentsOverview["items"];
    return data.items.slice().sort((a, b) => b.productsCount - a.productsCount).slice(0, 8);
  }, [data]);

  // Ids used to compute status badges (mais barato, atualizado, destaque)
  const badgeIds = useMemo(() => {
    if (!data) return { cheapestId: null as string | null, featuredIds: new Set<string>() };
    const cheapest = [...data.items]
      .filter((i) => i.maxSavings > 0)
      .sort((a, b) => b.maxSavings - a.maxSavings)[0];
    const featuredIds = new Set(
      [...data.items].sort((a, b) => b.productsCount - a.productsCount).slice(0, 3).map((i) => i.id),
    );
    return { cheapestId: cheapest?.id ?? null, featuredIds };
  }, [data]);

  const KIND_META: Record<string, { label: string; icon: typeof Store; tagline: string }> = {
    mercado: { label: "Supermercados", icon: ShoppingBasket, tagline: "Compare a cesta básica entre os supermercados de Feijó" },
    farmacia: { label: "Farmácias", icon: Pill, tagline: "Preços de medicamentos e cuidados no seu bairro" },
    padaria: { label: "Padarias", icon: Croissant, tagline: "Pães, bolos e insumos com preço monitorado" },
    acougue: { label: "Açougues", icon: Beef, tagline: "Cortes bovinos, suínos e aves comparados no dia" },
    outro: { label: "Outros comércios", icon: Store, tagline: "Comércios parceiros com preços validados" },
  };
  const currentKind = kindFilter === "__all" ? null : (KIND_META[kindFilter] ?? KIND_META.outro);

  const scrollCarousel = (dir: 1 | -1) => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.85), behavior: "smooth" });
  };

  // Drag-to-scroll + wheel horizontal para navegar com o mouse
  const dragState = useRef<{ active: boolean; startX: number; startScroll: number; moved: boolean }>({
    active: false, startX: 0, startScroll: 0, moved: false,
  });
  const onCarouselPointerDown = (ev: React.PointerEvent<HTMLDivElement>) => {
    const el = carouselRef.current;
    if (!el || ev.pointerType === "touch" || ev.button !== 0) return;
    dragState.current = { active: true, startX: ev.clientX, startScroll: el.scrollLeft, moved: false };
    // Não capturamos o pointer aqui — isso bloquearia o click nativo do <Link>.
    // O drag-to-scroll usa apenas o pointermove enquanto o botão está pressionado.
  };
  const onCarouselPointerMove = (ev: React.PointerEvent<HTMLDivElement>) => {
    const el = carouselRef.current;
    const st = dragState.current;
    if (!el || !st.active) return;
    const dx = ev.clientX - st.startX;
    if (Math.abs(dx) > 6) {
      st.moved = true;
      el.style.cursor = "grabbing";
      el.scrollLeft = st.startScroll - dx;
    }
  };
  const onCarouselPointerUp = (_ev: React.PointerEvent<HTMLDivElement>) => {
    const el = carouselRef.current;
    if (!el) return;
    dragState.current.active = false;
    el.style.cursor = "grab";
  };
  const onCarouselWheel = (ev: React.WheelEvent<HTMLDivElement>) => {
    const el = carouselRef.current;
    if (!el) return;
    if (Math.abs(ev.deltaY) > Math.abs(ev.deltaX)) {
      el.scrollLeft += ev.deltaY;
    }
  };
  const onCarouselLinkClickCapture = (ev: React.MouseEvent<HTMLDivElement>) => {
    if (dragState.current.moved) {
      ev.preventDefault();
      ev.stopPropagation();
    }
    // Reseta em qualquer click (arrastou ou não) para não bloquear o próximo.
    dragState.current.moved = false;
  };




  return (
    <IsolatedPage fit className="bg-background" contentClassName="!pb-0">

      {/* TOPO — mesma gramática editorial de /buscar: fio dourado, sem painéis pesados */}
      <header className="shrink-0 border-b border-border/60 bg-background/92 backdrop-blur supports-[backdrop-filter]:bg-background/75">

        <span
          aria-hidden
          className="block h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, color-mix(in oklab, var(--brand-gold) 75%, transparent) 50%, transparent)",
          }}
        />
        <div className="mx-auto grid w-full max-w-6xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2 md:gap-6 md:px-8 md:py-2.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <BackButton fallbackTo="/" variant="ghost" />
            <span aria-hidden className="h-5 w-px bg-border" />
            <HomeBrandLink />
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className={tc.eyebrow}>
              {currentKind ? currentKind.label : "Comércios parceiros"}
            </span>
            <h1 className={`min-w-0 truncate whitespace-nowrap ${tc.h1}`}>
              {currentKind ? currentKind.label : "Mercados"}
              <span className="hidden sm:inline"> de Feijó</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span aria-hidden className="hidden h-8 w-px bg-border md:block" />
            <Link
              to="/farmacias"
              title="Ver a escala de plantão das farmácias"
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-brand-gold hover:text-[var(--pc-gold-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            >
              <Pill className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Plantão das farmácias</span>
            </Link>
          </div>
        </div>
      </header>

      {/* IDENTIDADE — linha fina com tagline, tipos de comércio e números ao vivo */}
      <section className="border-b border-border/60">
        <div className="mx-auto w-full max-w-6xl px-4 py-2 md:px-8 md:py-2.5">
          <p className={`max-w-2xl line-clamp-2 text-pretty ${tc.lead}`}>
            {currentKind
              ? currentKind.tagline
              : "Cobertura de produtos, categorias e comparativo entre os estabelecimentos monitorados pela comunidade."}
          </p>

          <div
            className="mt-2 flex flex-wrap gap-1.5"
            role="radiogroup"
            aria-label="Filtrar por tipo de estabelecimento"
          >
            {(["__all", ...Object.keys(KIND_META)] as const).map((k) => {
              if (k !== "__all" && !kindsPresent.has(k)) return null;
              const meta = k === "__all" ? { label: "Todos", icon: Store } : KIND_META[k];
              const active = kindFilter === k;
              const Icon = meta.icon;
              return (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setKindFilter(k)}
                  className={[
                    `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors duration-150 ${tc.chip}`,
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold",
                    active
                      ? "border-brand-gold bg-brand-gold text-brand-navy"
                      : "border-border bg-background text-muted-foreground hover:border-brand-gold hover:text-[var(--pc-gold-ink)]",
                  ].join(" ")}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {meta.label}
                </button>
              );
            })}
            {user && favSet.size > 0 && (
              <button
                type="button"
                role="switch"
                aria-checked={onlyFavorites}
                onClick={() => setOnlyFavorites((v) => !v)}
                className={[
                  `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors duration-150 ${tc.chip}`,
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold",
                  onlyFavorites
                    ? "border-brand-gold bg-brand-gold text-brand-navy"
                    : "border-border bg-background text-muted-foreground hover:border-brand-gold hover:text-[var(--pc-gold-ink)]",
                ].join(" ")}
                title="Mostrar apenas mercados que você salvou"
              >
                ★ Favoritos ({favSet.size})
              </button>
            )}
          </div>

          {data && (
            <div className="mt-2.5 border-t border-border/60 pt-2">
              <StatCellGroup
                label={`Resumo: ${data.totalEstablishments} comércios e ${data.totalProducts.toLocaleString("pt-BR")} produtos comparados`}
                className="w-full flex-wrap sm:w-auto"
              >
                <HeroMetric
                  icon={Store}
                  label="Comércios"
                  value={String(data.totalEstablishments)}
                  accent
                  hint="Ver rede"
                  onClick={() => setMetricDetail("establishments")}
                />
                <StatCellDivider />
                <HeroMetric
                  icon={Package}
                  label="Produtos comparados"
                  value={data.totalProducts.toLocaleString("pt-BR")}
                  hint="Ver categorias"
                  onClick={() => setMetricDetail("products")}
                />

                <StatCellDivider />
                <HeroMetric
                  icon={PiggyBank}
                  label="Maior economia"
                  value={
                    data.totalMaxSavings > 0
                      ? `R$ ${data.totalMaxSavings.toFixed(2).replace(".", ",")}`
                      : "—"
                  }
                  hint="Onde economizar"
                  onClick={() => setMetricDetail("savings")}
                />
                <StatCellDivider />
                <HeroMetric
                  icon={Radio}
                  label="Atualização"
                  value="ao vivo"
                  live
                  hint="Como funciona"
                  onClick={() => setMetricDetail("live")}
                />
              </StatCellGroup>
            </div>
          )}

        </div>
      </section>


      {/* Faixa de mercados em destaque — fora do hero, mais compacta e legível */}
      {featured.length > 0 && (
        <section className="border-b border-border/60">
          <div className="mx-auto w-full max-w-6xl px-4 md:px-8 py-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={tc.eyebrow}>Em destaque</span>
                <span className={`font-medium ${tc.body}`}>Mercados com mais produtos</span>
              </div>
              <div className="hidden gap-1.5 md:flex">
                <button
                  type="button"
                  aria-label="Rolar para a esquerda"
                  onClick={() => scrollCarousel(-1)}
                  className="grid h-8 w-8 place-items-center rounded-full border border-border bg-background text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label="Rolar para a direita"
                  onClick={() => scrollCarousel(1)}
                  className="grid h-8 w-8 place-items-center rounded-full border border-border bg-background text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
            <div
              ref={carouselRef}
              onPointerDown={onCarouselPointerDown}
              onPointerMove={onCarouselPointerMove}
              onPointerUp={onCarouselPointerUp}
              onPointerCancel={onCarouselPointerUp}
              onPointerLeave={onCarouselPointerUp}
              onWheel={onCarouselWheel}
              onClickCapture={onCarouselLinkClickCapture}
              className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 cursor-grab select-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {featured.map((e, idx) => (
                <Link
                  key={e.id}
                  to="/estabelecimento/$slug"
                  params={{ slug: slugifyEstablishment(e.name) }}
                  className={cn(
                    "group relative flex w-[236px] shrink-0 snap-start items-center gap-3 overflow-hidden p-2 pl-3",
                    idx === 0 ? "pc-surface-3-interactive" : "pc-surface-2-interactive",
                  )}
                >
                  {idx === 0 && (
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 w-[3px] bg-[var(--pc-gold-ink)]"
                    />
                  )}
                  <StoreLogoThumb
                    src={e.logoUrl}
                    name={e.name}
                    eager={idx < 3}
                    className="h-[52px] w-[52px] border-border/60"
                    initialsClassName="text-[14px]"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`truncate ${tc.itemTitle}`}>{e.name}</span>
                      {idx === 0 && (
                        <span className={`shrink-0 rounded-sm bg-brand-gold px-1 py-[1px] text-brand-navy ${tc.tag}`}>
                          Top
                        </span>
                      )}
                    </div>
                    <div className={`truncate ${tc.meta}`}>
                      <span className="font-semibold text-[var(--pc-gold-ink)] tabular-nums">{e.productsCount}</span> produtos
                      {e.neighborhood ? ` · ${e.neighborhood}` : ""}
                    </div>
                  </div>

                </Link>
              ))}

            </div>
          </div>
        </section>
      )}

      <main className="pc-rail mx-auto min-h-0 w-full max-w-6xl flex-1 overflow-y-auto px-4 pb-6 pt-4 md:px-6 md:pt-5">


        {isLoading && view === "list" && (
          <div className="overflow-hidden rounded-xl border border-border/70">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`${LIST_GRID} border-b border-border/50 px-3 py-2.5 md:px-4`}>
                <span className="h-3 w-4 animate-pulse rounded bg-muted" />
                <span className="h-9 w-11 animate-pulse rounded-md bg-muted" />
                <span className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
                <span className="h-3 w-24 animate-pulse rounded bg-muted" />
                <span className="ml-auto h-3 w-10 animate-pulse rounded bg-muted" />
                <span className="ml-auto h-3 w-8 animate-pulse rounded bg-muted" />
                <span className="ml-auto h-3 w-16 animate-pulse rounded bg-muted" />
                <span />
              </div>
            ))}
          </div>
        )}

        {isLoading && view === "cards" && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MarketEditorialCardSkeleton />
            <MarketEditorialCardSkeleton />
            <MarketEditorialCardSkeleton />
            <MarketEditorialCardSkeleton />
            <MarketEditorialCardSkeleton />
            <MarketEditorialCardSkeleton />
          </div>
        )}


        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-[14.5px] text-destructive">
            Erro: {(error as Error).message}
          </div>
        )}

        {data && (
          <div className="space-y-4">
            {/* StatGrid removida: métricas duplicavam o hero */}

            {data.topGlobalCategories.length > 0 && (
              <section aria-labelledby="cats-heading" className="border-t border-border/60 pt-3">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <h2
                    id="cats-heading"
                    className={`inline-flex items-center gap-2 ${tc.h2}`}
                  >
                    <TrendingUp className="h-4 w-4 text-[var(--pc-gold-ink)]" aria-hidden />
                    Categorias mais populares
                  </h2>
                  <span className={tc.sectionNote}>
                    Por número de produtos cadastrados na rede
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {data.topGlobalCategories.map((c) => (
                    <span
                      key={c.category}
                      className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-foreground/85 ${tc.chip}`}
                    >
                      {humanizeCategory(c.category)}
                      <span className={`tabular-nums text-[var(--pc-gold-ink)] ${tc.chip}`}>
                        {c.count}
                      </span>
                    </span>
                  ))}
                </div>
              </section>

            )}

            {data.items.length === 0 ? (
              <EmptyState
                icon={Store}
                title="Ainda não há estabelecimentos cadastrados"
                description="Assim que houver mercados na sua região, eles aparecerão aqui."
              />
            ) : (
              <section aria-labelledby="rede-heading">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-border/60 pt-3">
                  <h2
                    id="rede-heading"
                    className={tc.h2}
                  >
                    Rede de mercados
                  </h2>
                  <span className={tc.sectionNote}>
                    {allFilteredItems.length}{" "}
                    {allFilteredItems.length === 1 ? "estabelecimento" : "estabelecimentos"} monitorados
                  </span>
                </div>
                {/* Barra de comando — busca protagonista + filtros, fixa ao rolar */}
                <div className="sticky top-[52px] z-20 border-y border-border/60 bg-background/95 backdrop-blur md:top-[60px] supports-[backdrop-filter]:bg-background/80">
                  <div className="flex flex-col gap-2 py-2.5 md:flex-row md:items-center md:gap-2.5">

                    <div className="relative min-w-0 flex-1">
                      <Search
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--pc-gold-ink)]"
                        aria-hidden
                      />
                      <Input
                        value={q}
                        onChange={(ev) => setQ(ev.target.value)}
                        placeholder="Buscar mercado, bairro ou cidade"
                        className="h-10 rounded-xl border-border/70 pl-9 text-[13.5px] shadow-sm focus-visible:ring-brand-gold"
                        inputMode="search"
                        aria-label="Buscar mercado, bairro ou cidade"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 md:flex md:shrink-0 md:items-center">
                      <Select value={neighborhood} onValueChange={setNeighborhood}>
                        <SelectTrigger
                          aria-label="Filtrar por bairro"
                          className="h-10 w-full min-w-0 rounded-xl text-[13px] md:w-[192px] md:text-[13.5px] [&>span]:truncate"
                        >
                          <SelectValue placeholder="Bairro" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all">Todos os bairros</SelectItem>
                          {neighborhoods.map((n) => (
                            <SelectItem key={n} value={n}>
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
                        <SelectTrigger
                          aria-label="Ordenar por"
                          className="h-10 w-full min-w-0 rounded-xl text-[13px] md:w-[186px] md:text-[13.5px] [&>span]:truncate"
                        >
                          <SelectValue placeholder="Ordenar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="distance" disabled={!loc.hasReference}>
                            Mais próximos {loc.hasReference ? "" : "(ative a localização)"}
                          </SelectItem>
                          <SelectItem value="neighborhood">Bairro (A→Z)</SelectItem>
                          <SelectItem value="name">Nome (A→Z)</SelectItem>
                          <SelectItem value="products">Mais produtos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 py-2">
                    <LocationControl loc={loc} variant="surface" />
                    <div className="flex items-center gap-2">
                      <div
                        role="group"
                        aria-label="Modo de exibição"
                        className="inline-flex overflow-hidden rounded-full border border-border/70 bg-background"
                      >
                        {([
                          { key: "cards" as const, icon: LayoutGrid, label: "Cards" },
                          { key: "list" as const, icon: Rows3, label: "Lista" },
                        ]).map((opt) => {
                          const active = view === opt.key;
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => setView(opt.key)}
                              aria-pressed={active}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${tc.control} transition ${
                                active
                                  ? "bg-brand-gold text-brand-navy"
                                  : "text-foreground/70 hover:text-foreground"
                              }`}
                            >
                              <opt.icon className="h-3.5 w-3.5" aria-hidden />
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                      <span className={`text-foreground/70 ${tc.control}`}>
                        {referencePoint ? (
                          <>Referência ativa</>
                        ) : (
                          <>
                            <span className="tabular-nums text-foreground">
                              {allFilteredItems.length}
                            </span>{" "}
                            {allFilteredItems.length === 1 ? "resultado" : "resultados"}
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>



                {visibleItems.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 p-8 text-center">
                    <div className="grid h-11 w-11 place-items-center rounded-full border border-border bg-background text-muted-foreground">
                      <Store className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[15px] font-semibold text-foreground">
                        Nenhum estabelecimento encontrado
                      </p>
                      <p className={tc.lead}>
                        Ajuste ou limpe os filtros para ver toda a rede.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setQ("");
                        setNeighborhood("__all");
                        setKindFilter("__all");
                        setSort("neighborhood");
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-md border border-brand-gold bg-brand-gold px-3 py-1.5 text-brand-navy transition-colors hover:brightness-105 ${tc.control}`}
                    >
                      Limpar filtros
                    </button>
                  </div>
                ) : view === "list" ? (
                <div className="pc-surface-1 overflow-x-auto">
                  <div className="min-w-[680px]">
                    {/* Cabeçalho tabular — colunas clicáveis para ordenar */}
                    <div className={`${LIST_GRID} border-b border-border/60 bg-muted/40 px-3 py-2 md:px-4 ${tc.tableHead} [&>*]:truncate`}>
                      <span className="text-right">#</span>
                      <span aria-hidden />
                      <button
                        type="button"
                        onClick={() => setSort("name")}
                        className={`text-left uppercase tracking-[0.14em] transition-colors hover:text-foreground ${sort === "name" ? "text-[var(--pc-gold-ink)]" : ""}`}
                      >
                        Estabelecimento
                      </button>
                      <button
                        type="button"
                        onClick={() => setSort("neighborhood")}
                        className={`text-left uppercase tracking-[0.14em] transition-colors hover:text-foreground ${sort === "neighborhood" ? "text-[var(--pc-gold-ink)]" : ""}`}
                      >
                        Bairro / Cidade
                      </button>
                      <button
                        type="button"
                        disabled={!loc.hasReference}
                        onClick={() => setSort("distance")}
                        className={`text-right uppercase tracking-[0.14em] transition-colors hover:text-foreground disabled:opacity-50 ${sort === "distance" ? "text-[var(--pc-gold-ink)]" : ""}`}
                      >
                        Distância
                      </button>
                      <button
                        type="button"
                        onClick={() => setSort("products")}
                        className={`text-right uppercase tracking-[0.14em] transition-colors hover:text-foreground ${sort === "products" ? "text-[var(--pc-gold-ink)]" : ""}`}
                      >
                        Produtos
                      </button>
                      <span className="text-right">Atualização</span>
                      <span aria-hidden />
                    </div>

                    <ul className="divide-y divide-border/60" aria-label="Lista de estabelecimentos">
                      {visibleItems.map((e, idx) => {
                        const tier = classifyTier(e.productsCount);
                        const freshness = describeFreshness(e.lastUpdate);
                        const dist = distanceById.get(e.id);
                        const slug = slugifyEstablishment(e.name);
                        const locality =
                          [e.neighborhood, e.city].filter(Boolean).join(" · ") ||
                          "Localização não informada";
                        return (
                          <li
                            key={e.id}
                            className={cn(
                              LIST_GRID,
                              "group px-3 py-2 transition-colors md:px-4",
                              idx === 0
                                ? "bg-[color-mix(in_oklab,var(--pc-gold-ink)_10%,transparent)] border-l-2 border-l-[var(--pc-gold-ink)]"
                                : "hover:bg-muted/50",
                            )}
                          >
                            <span className={`text-right font-bold text-foreground/60 ${tc.num}`}>
                              {String(idx + 1).padStart(2, "0")}
                            </span>

                            <Link
                              to="/estabelecimento/$slug"
                              params={{ slug }}
                              title={`Abrir ${e.name}`}
                              aria-label={`Abrir página de ${e.name}`}
                              className="block shadow-sm transition group-hover:shadow"
                            >
                              <StoreLogoThumb
                                src={e.logoUrl}
                                name={e.name}
                                eager={idx < 6}
                                className="h-9 w-11 transition group-hover:border-brand-gold/70"
                              />
                            </Link>


                            <span className="flex min-w-0 items-center gap-1.5">
                              <Link
                                to="/estabelecimento/$slug"
                                params={{ slug }}
                                title={e.name}
                                className={`truncate hover:text-[var(--pc-gold-ink)] hover:underline ${tc.itemTitle}`}
                              >
                                <HighlightMatch text={e.name} tokens={searchTokens} mode="loose" />
                              </Link>
                              <span
                                title={`Quantidade de preços cadastrados: ${tier.label}`}
                                className={`shrink-0 rounded-sm px-1 py-[1px] ${tc.tag}`}
                                style={{
                                  background: `color-mix(in oklab, ${tier.color} 16%, white)`,
                                  color: `color-mix(in oklab, ${tier.color} 62%, black)`,
                                }}
                              >
                                {tier.label}
                              </span>
                            </span>

                            <span className={`min-w-0 truncate ${tc.cell}`} title={locality}>
                              <HighlightMatch text={locality} tokens={searchTokens} mode="loose" />
                            </span>

                            <span
                              className={`text-right text-foreground/80 ${tc.num}`}
                              title={dist ? `Distância estimada: ${formatDistance(dist.km)}` : undefined}
                            >
                              {dist ? formatDistance(dist.km) : "—"}
                            </span>

                            <span className={`text-right font-bold text-foreground ${tc.num}`}>
                              {e.productsCount}
                            </span>

                            <span className={`text-right ${tc.meta}`} title={freshness.label}>
                              {freshness.label}
                            </span>

                            <Link
                              to="/estabelecimento/$slug"
                              params={{ slug }}
                              aria-label={`Ver detalhes de ${e.name}`}
                              className="grid place-items-center text-foreground/50 transition-colors hover:text-[var(--pc-gold-ink)]"
                            >
                              <ChevronRight className="h-4 w-4" aria-hidden />
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
                ) : (
                <>
                {/* Mobile: linhas densas — mantém a lista em uma tela */}
                <ul className="divide-y divide-border/60 py-1 md:hidden" aria-label="Lista de estabelecimentos">
                  {visibleItems.map((e, idx) => {
                    const slug = slugifyEstablishment(e.name);
                    const locality = [e.neighborhood, e.city].filter(Boolean).join(" · ");
                    return (
                      <li key={e.id}>
                        <Link
                          to="/estabelecimento/$slug"
                          params={{ slug }}
                          className="flex items-center gap-2.5 px-2 py-2 transition-colors hover:bg-muted/50"
                        >
                          <StoreLogoThumb src={e.logoUrl} name={e.name} eager={idx < 4} className="h-9 w-11 shrink-0" />
                          <span className="min-w-0 flex-1">
                            <span className={`block truncate ${tc.itemTitle}`}>{e.name}</span>
                            {locality && (
                              <span className={`block truncate ${tc.meta}`}>{locality}</span>
                            )}
                          </span>
                          <span className={`shrink-0 font-bold text-foreground ${tc.num}`}>{e.productsCount}</span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-foreground/40" aria-hidden />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                <ul
                  className="hidden grid-cols-1 gap-3 py-4 md:grid sm:grid-cols-2 lg:grid-cols-3"
                  aria-label="Lista de estabelecimentos"
                >
                  {visibleItems.map((e, idx) => {
                    const tier = classifyTier(e.productsCount);
                    const freshness = describeFreshness(e.lastUpdate);
                    const dist = distanceById.get(e.id);
                    return (
                      <li key={e.id} className="h-full">
                        <MarketEditorialCard
                          slug={slugifyEstablishment(e.name)}
                          name={e.name}
                          logoUrl={e.logoUrl}
                          neighborhood={e.neighborhood}
                          city={e.city}
                          productsCount={e.productsCount}
                          freshnessLabel={freshness.label}
                          freshnessLive={freshness.live}
                          tierLabel={tier.label}
                          tierColor={tier.color}
                          rank={idx + 1}
                          priority={idx < 6}

                          distanceLabel={dist ? formatDistance(dist.km) : null}
                          distanceQualifier={
                            dist
                              ? dist.source === "exact"
                                ? "de você"
                                : dist.source === "neighborhood"
                                  ? "aprox. (bairro)"
                                  : "aprox. (cidade)"
                              : null
                          }
                          topCategory={
                            e.topCategories[0]
                              ? humanizeCategory(e.topCategories[0].category)
                              : null
                          }
                          maxSavings={e.maxSavings}
                          isCheapest={badgeIds.cheapestId === e.id}
                          isFeatured={badgeIds.featuredIds.has(e.id)}
                          highlightTokens={searchTokens}
                          favoriteSlot={<FavoriteMarketButton marketName={e.name} />}
                        />
                      </li>
                    );
                  })}
                </ul>
                </>
                )}
                {allFilteredItems.length > visibleItems.length && (
                  <div
                    ref={sentinelRef}
                    className="flex flex-wrap items-center justify-center gap-2 border-t border-border/60 px-2.5 py-2 md:px-4 md:py-3"
                  >
                    <span className="text-[12.5px] text-muted-foreground md:text-[13px]">
                      {visibleItems.length} de {allFilteredItems.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-brand-gold bg-brand-gold px-3.5 py-1.5 text-[12.5px] font-bold uppercase tracking-[0.1em] text-brand-navy transition hover:brightness-105 md:px-4 md:py-1.5 md:text-[13px]"
                    >
                      Mostrar mais
                    </button>
                  </div>
                )}


              </section>

            )}

          </div>
        )}
      </main>

      <MetricDetailDialog
        open={metricDetail !== null}
        which={metricDetail}
        onClose={() => setMetricDetail(null)}
        data={data ?? null}
      />
      {/* silence unused import */}
      <LoadingSkeleton className="hidden" rows={0} />
    </IsolatedPage>

  );
}

function HeroMetric({
  icon: Icon,
  label,
  value,
  live,
  hint,
  accent,
  onClick,
}: {
  icon: typeof Store;
  label: string;
  value: string;
  live?: boolean;
  hint?: string;
  accent?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}: ${value}. ${hint ?? "Abrir detalhes"}`}
      className="group flex min-w-[6.25rem] flex-col items-center justify-center gap-1 px-3 py-1.5 text-center transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold sm:min-w-[7rem] sm:px-4 sm:py-2"
    >
      <span
        aria-hidden
        className={cn(
          "flex items-baseline gap-1.5 font-serif font-semibold leading-none tabular-nums tracking-tight",
          "text-[1.5rem] sm:text-[1.85rem]",
          accent ? "text-[var(--pc-gold-ink)]" : "text-foreground",
        )}
      >
        {live && (
          <span className="relative inline-flex h-1.5 w-1.5 shrink-0 translate-y-[-4px]">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-gold/70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-gold" />
          </span>
        )}
        <span className="truncate">{value}</span>
      </span>
      <span
        aria-hidden
        className={cn(
          "flex items-center gap-1 text-[0.65rem] font-semibold uppercase leading-none tracking-[0.18em] sm:text-[0.72rem]",
          accent ? "text-[var(--pc-gold-ink)]/85" : "text-muted-foreground",
        )}
      >
        <Icon className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden />
        {label}
      </span>
    </button>
  );
}





function MetricDetailDialog({
  open,
  which,
  onClose,
  data,
}: {
  open: boolean;
  which: null | "establishments" | "products" | "savings" | "live";
  onClose: () => void;
  data: EstablishmentsOverview | null;
}) {
  const cfg = which ? METRIC_DETAIL_META[which] : null;
  const Icon = cfg?.icon ?? Store;

  const savingsRanked = useMemo(() => {
    if (!data) return [];
    return [...data.items]
      .filter((i) => i.maxSavings > 0)
      .sort((a, b) => b.maxSavings - a.maxSavings)
      .slice(0, 6);
  }, [data]);

  const topByProducts = useMemo(() => {
    if (!data) return [];
    return [...data.items].sort((a, b) => b.productsCount - a.productsCount).slice(0, 6);
  }, [data]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg overflow-hidden p-0">
        <div
          className="relative px-5 py-4 text-white"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in oklab, var(--brand-navy) 96%, black), color-mix(in oklab, var(--brand-navy) 78%, black))",
          }}
        >
          <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-gold/70 to-transparent" />
          <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-brand-gold" />
          <DialogHeader className="space-y-1 text-left">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-brand-gold text-brand-navy shadow-inner">
                <Icon className="h-4 w-4" strokeWidth={2.5} aria-hidden />
              </div>
              <DialogTitle className="text-[15px] font-extrabold uppercase tracking-[0.14em] text-[var(--pc-gold-ink)]">
                {cfg?.title}
              </DialogTitle>
            </div>
            <DialogDescription className="text-[13px] leading-snug text-white/85">
              {cfg?.description}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {which === "establishments" && data && (
            <ul className="space-y-2" aria-label="Estabelecimentos monitorados">
              {topByProducts.map((e) => (
                <li key={e.id} className="flex items-center gap-3 rounded-md border border-border/60 bg-card p-2.5">
                  <StoreLogoThumb
                    src={e.logoUrl}
                    name={e.name}
                    className="h-9 w-9 border-transparent bg-transparent p-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className={`truncate ${tc.itemTitle}`}>{e.name}</div>
                    <div className={`truncate ${tc.meta}`}>
                      <span className="font-semibold text-[var(--pc-gold-ink)]">{e.productsCount}</span> produtos
                      {e.neighborhood ? ` · ${e.neighborhood}` : ""}
                    </div>
                  </div>

                </li>
              ))}
              <li className="pt-1 text-center text-[12px] text-muted-foreground">
                Total: <strong className="text-foreground">{data.totalEstablishments}</strong> estabelecimentos
              </li>
            </ul>
          )}

          {which === "products" && data && (
            <div className="space-y-3">
              <div className="rounded-md border border-border/60 bg-muted/40 p-3 text-center">
                <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--pc-gold-ink)]">Total monitorado</div>
                <div className="mt-1 text-[24px] font-extrabold tabular-nums text-foreground">
                  {data.totalProducts.toLocaleString("pt-BR")}
                </div>
                <div className={tc.sectionNote}>produtos em {data.totalCategories} categorias</div>
              </div>
              {data.topGlobalCategories.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Categorias mais populares
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {data.topGlobalCategories.slice(0, 10).map((c) => (
                      <span
                        key={c.category}
                        className="inline-flex items-center gap-1.5 rounded-full border border-brand-gold/40 bg-brand-gold/15 px-2.5 py-1 text-[12px] font-medium text-[var(--pc-gold-ink)]"
                      >
                        {humanizeCategory(c.category)}
                        <span className="rounded-full bg-brand-gold/25 px-1.5 text-[11.5px] font-bold text-[var(--pc-gold-ink)]">{c.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {which === "savings" && data && (
            <div className="space-y-2.5">
              <div className="rounded-md border border-brand-gold/50 bg-brand-gold/10 p-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--pc-gold-ink)]">
                  Diferença máxima na rede
                </div>
                <div className="mt-0.5 text-[22px] font-extrabold tabular-nums text-[var(--pc-gold-ink)]">
                  R$ {data.totalMaxSavings.toFixed(2).replace(".", ",")}
                </div>
                <div className={tc.sectionNote}>
                  entre o mesmo produto no mercado mais caro vs. o mais barato
                </div>
              </div>
              {savingsRanked.length > 0 ? (
                <ul className="space-y-1.5">
                  {savingsRanked.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-card p-2.5">
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-semibold text-foreground">{e.name}</div>
                        <div className="truncate text-[11px] text-muted-foreground">{e.neighborhood || e.city || "—"}</div>
                      </div>
                      <div className="shrink-0 rounded bg-brand-gold/15 px-2 py-0.5 text-[12.5px] font-bold tabular-nums text-[var(--pc-gold-ink)]">
                        até R$ {e.maxSavings.toFixed(2).replace(".", ",")}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-[12.5px] text-muted-foreground">Sem comparativos disponíveis ainda.</p>
              )}
            </div>
          )}

          {which === "live" && (
            <div className="space-y-3 text-[13px] leading-relaxed text-foreground">
              <p>
                Os preços aqui exibidos são atualizados <strong>continuamente</strong> pela comunidade e por integrações com os mercados parceiros — sem intervalo fixo.
              </p>
              <ul className="space-y-1.5 text-[12.5px]">
                <li className="flex items-start gap-2">
                  <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gold" />
                  Novos preços entram no ar em segundos após a leitura.
                </li>
                <li className="flex items-start gap-2">
                  <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gold" />
                  Cada card do mercado mostra o carimbo da última atualização.
                </li>
                <li className="flex items-start gap-2">
                  <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gold" />
                  Você pode ativar alertas para acompanhar variações do seu bairro.
                </li>
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const METRIC_DETAIL_META: Record<
  "establishments" | "products" | "savings" | "live",
  { title: string; description: string; icon: typeof Store }
> = {
  establishments: {
    title: "Estabelecimentos",
    description: "Mercados monitorados na região — ordenados pelos que têm mais produtos publicados.",
    icon: Store,
  },
  products: {
    title: "Produtos monitorados",
    description: "Total de itens catalogados e as categorias mais presentes na rede.",
    icon: Package,
  },
  savings: {
    title: "Maior economia possível",
    description: "Quanto você pode poupar comprando o mesmo produto no mercado mais barato.",
    icon: PiggyBank,
  },
  live: {
    title: "Atualização ao vivo",
    description: "Como e quando os preços são renovados nesta plataforma.",
    icon: Radio,
  },
};
