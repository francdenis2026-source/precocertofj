import { createFileRoute, Link, useNavigate, useLoaderData } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useRef, useState, memo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Search,
  ArrowRight,
  TrendingDown,
  ShieldCheck,
  Package,
  LineChart,
  Users,
  Sparkles,
  Grid3x3,
  LayoutGrid,
  MapPin,
  ShoppingCart,
  Store,
} from "lucide-react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { PrecoCertoMark } from "@/components/typography/PrecoCertoMark";
import { Button } from "@/components/ui/button";
import { StoreCaption } from "@/components/brand/StoreCaption";

import { buildLivePanel, type LivePanelMetric, type LivePanelKind } from "@/lib/live-panel";
import { getPlatformStats, listPublicStores } from "@/lib/stores-public.functions";
import { getEconomyStat } from "@/lib/products-public.functions";
import { listTrendingSearches } from "@/lib/search-trends.functions";
import { useSearchTrendsRealtime } from "@/hooks/useSearchTrendsRealtime";
import { trackEvent } from "@/lib/analytics-events";
import { getStoredRegionKey } from "@/lib/search-region";
import { StartFreeDialog } from "@/components/home/StartFreeDialog";
import { GuestGateDialog } from "@/components/gate/GuestGateDialog";
import {
  HomeSearchSuggestions,
  type HomeSearchSuggestionsHandle,
} from "@/components/home/HomeSearchSuggestions";
import {
  consumeGuest,
  guestRemaining,
  GUEST_DAILY_LIMIT,
  GUEST_QUOTA_DISABLED,
  onGuestQuotaChange,
} from "@/lib/guest-quota";
import { MetricSpotlightDialog } from "@/components/home/MetricSpotlightDialog";
import { AllCategoriesDialog } from "@/components/home/AllCategoriesDialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";
import { normalizeSearchText } from "@/lib/text-normalize";
import { slugifyEstablishment } from "@/lib/establishment-slug.functions";
import homeHeroImg from "@/assets/home-hero.jpg";

/* Conteúdo secundário: só carrega quando o painel "Explorar" abre */
const importExplorePanel = () => import("@/components/home/ExplorePanel");
const ExplorePanel = lazy(() =>
  importExplorePanel().then((m) => ({ default: m.ExplorePanel })),
);
/* Pré-carrega o chunk no hover/foco para o painel já abrir pronto (sem flash). */
const preloadExplorePanel = () => {
  void importExplorePanel();
};


export const Route = createFileRoute("/")({
  loader: async () => {
    const [statsResult, economyResult] = await Promise.allSettled([
      getPlatformStats({} as any),
      getEconomyStat({} as any),
    ]);
    return {
      stats: statsResult.status === "fulfilled" ? statsResult.value : undefined,
      economy: economyResult.status === "fulfilled" ? economyResult.value : undefined,
    };
  },

  head: () => ({
    meta: [
      { title: "PreçoCerto — Comparador inteligente de mercados em Feijó/AC" },
      {
        name: "description",
        content:
          "Compare preços de supermercados em Feijó em tempo real. Cesta básica, quedas do dia e economia real por família — direto no seu celular.",
      },
      { property: "og:title", content: "PreçoCerto — Comparador inteligente de mercados" },
      {
        property: "og:description",
        content:
          "Compare preços de supermercados em Feijó em tempo real e economize em cada compra.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "PreçoCerto — Comparador inteligente de mercados" },
      {
        name: "twitter:description",
        content: "Compare preços de supermercados em Feijó em tempo real e economize em cada compra.",
      },
    ],
  }),
  component: HomePage,
});

import { useCategoryLabelWithFallback } from "@/hooks/use-category-labels";
import { categoryBySlug, hubCoverageLabel, type CategorySlug } from "@/lib/category-hub";
import { categoryIcon } from "@/lib/category-icons";
import {
  ProductCategoryIcon,
  detectFoodCategory,
} from "@/components/ds/ProductCategoryIcon";


const P = {
  paper: "var(--pc-home-paper)",
  ink: "var(--pc-home-ink)",
  card: "var(--pc-home-card)",
  navy: "var(--pc-home-navy)",
  gold: "var(--pc-home-gold)",
  goldSoft: "var(--pc-home-gold-soft)",
  line: "var(--pc-home-line)",
  heading: "var(--pc-home-heading)",
};
const serif = "font-sans";

const TILE = "group flex h-14 w-full min-w-0 items-center gap-3.5 rounded-2xl border border-border/50 bg-card/50 pl-4 pr-5 text-left transition-all duration-500 ease-out hover:bg-card hover:border-primary/40 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20";
const TILE_ICONWRAP = "grid shrink-0 place-items-center rounded-xl h-10 w-10 bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors";
const TILE_ICON = "h-5 w-5";
const TILE_LABEL = "min-w-0 flex-1 truncate text-[15px] font-bold tracking-tight text-foreground/80 group-hover:text-foreground";
/* Tokens tipográficos compartilhados da home: um único "eyebrow" (rótulo de
   seção) e um único estilo de chip. */
const EYEBROW = "text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60";
const CHIP =
  "inline-flex items-center justify-center rounded-full border border-border bg-card px-2.5 py-1 text-[11.5px] font-semibold text-foreground/70 transition-colors hover:bg-primary/5 hover:text-primary";


/**
 * Ladrilhos da home — derivados de `CATEGORY_DEFS`, a mesma fonte usada em
 * `/categoria/:slug` e no mapeamento de categorias de produto das lojas.
 * Nada de lista paralela: o que muda aqui é só quantos hubs cabem na faixa.
 */
const HOME_HUBS: CategorySlug[] = [
  "supermercados",
  "acougues",
  "hortifruti",
  "padarias",
  "bebidas",
  "limpeza",
  "higiene",
  "farmacias",
  "pet",
];

const CATEGORIES = HOME_HUBS.map((slug) => {
  const def = categoryBySlug(slug)!;
  return {
    key: def.slug,
    label: def.short,
    full: def.label,
    coverage: hubCoverageLabel(def.slug),
    Icon: categoryIcon(def.slug),
  };
});


function HomePage() {
  const catLabel = useCategoryLabelWithFallback();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: sessionLoading } = useSession();
  const isLoggedOut = !sessionLoading && !user;

  // Reagrupa contador de cota (sincroniza entre abas via BroadcastChannel/storage).
  const [, setQuotaTick] = useState(0);
  useEffect(() => onGuestQuotaChange(() => setQuotaTick((t) => t + 1)), []);

  const [q, setQ] = useState("");
  const [spotlight, setSpotlight] =
    useState<import("@/components/home/MetricSpotlightDialog").MetricKind | null>(null);
  const [allCatsOpen, setAllCatsOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  /* Termo de "Buscas em alta" em navegação — evita cliques duplicados que
     disparavam a mesma busca duas vezes. */
  const [pendingTerm, setPendingTerm] = useState<string | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const suggestRef = useRef<HomeSearchSuggestionsHandle | null>(null);
  const searchAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // No body classes needed anymore, layout is standard and expansive.
    return () => {};
  }, []);

  const { stats, economy } = useLoaderData({ from: "/" }) as {
    stats: any;
    economy: any;
  };

  /* Buscas reais dos clientes, agregadas em tempo real (`search_trends`). */


  /* Buscas reais dos clientes, agregadas em tempo real (`search_trends`). */
  const trendingFn = useServerFn(listTrendingSearches);
  const TRENDING_KEY = ["home-trending-searches"] as const;
  const popularQ = useQuery({
    queryKey: TRENDING_KEY,
    queryFn: () => trendingFn({ data: { limit: 24 } } as any),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
  useSearchTrendsRealtime([...TRENDING_KEY]);

  const POPULAR_FALLBACK = ["arroz", "feijão", "leite", "óleo", "café", "açúcar"];
  const trendRows = useMemo(
    () =>
      (popularQ.data ?? [])
        .map((p: any) => ({
          query: String(p?.query ?? "").trim(),
          count: Number(p?.count ?? 0),
          dayCount: Number(p?.dayCount ?? 0),
          hot: Boolean(p?.hot),
        }))
        .filter((p: { query: string }) => p.query.length >= 2),
    [popularQ.data],
  );
  const popularAll: string[] = useMemo(() => {
    const real = trendRows.map((p: { query: string }) => p.query);
    return real.length >= 3 ? real : POPULAR_FALLBACK;
  }, [trendRows]);
  const trendMeta = useMemo(() => {
    const m = new Map<string, { count: number; dayCount: number; hot: boolean }>();
    for (const r of trendRows) m.set(r.query, r);
    return m;
  }, [trendRows]);

  /* Hero e faixa "Buscas em alta" consomem a mesma fonte, mas nunca repetem
     termos: o hero fica com os 4 primeiros e a faixa com os seguintes. */
  const heroPopular = useMemo(() => popularAll.slice(0, 4), [popularAll]);
  /* Em janelas baixas mostramos apenas uma linha de chips: a home precisa
     caber inteira na viewport, sem rolagem nem corte. */
  const trendingPopular = useMemo(() => {
    const rest = popularAll.slice(4);
    return (rest.length >= 4 ? rest : popularAll).slice(0, 10);
  }, [popularAll]);



  const storesFn = useServerFn(listPublicStores);
  const storesQ = useQuery({
    queryKey: ["home-partner-stores"],
    queryFn: () => storesFn({} as any),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  const partners = useMemo(
    () =>
      (storesQ.data ?? [])
        .filter((s: any) => s?.name)
        .slice(0, 6)
        .map((s: any) => ({
          id: s.id,
          name: s.name,
          logoUrl: s.logoUrl ?? s.logo_url ?? null,
        })),
    [storesQ.data],
  );

  useEffect(() => {
    if (!exploreOpen) return;
    void queryClient.prefetchQuery({
      queryKey: ["home", "recent-products", 6],
      queryFn: () => Promise.resolve(undefined),
    });
  }, [exploreOpen, queryClient]);

  const submitSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const query = q.trim();
    if (!query) return;
    if (isLoggedOut) {
      const { blocked } = consumeGuest("search", query);
      if (blocked) {
        setGateOpen(true);
        return;
      }
    }
    // Registra a busca real do cliente — alimenta "Buscas em alta" em tempo real.
    trackEvent("search_query", { q: query.toLowerCase().slice(0, 60), region: getStoredRegionKey() });
    navigate({ to: "/buscar", search: { q: query } as any });
  };

  /* Clique em termo popular: preenche o campo de busca (feedback visual e
     estado coerente ao voltar) e navega direto para os resultados. */
  const goToPopular = (term: string) => {
    const query = term.trim();
    if (!query || pendingTerm) return;
    setPendingTerm(query);
    setQ(query);
    setSuggestOpen(false);
    if (isLoggedOut) {
      const { blocked } = consumeGuest("search", query);
      if (blocked) {
        setPendingTerm(null);
        setGateOpen(true);
        return;
      }
    }
    trackEvent("search_query", {
      q: query.toLowerCase().slice(0, 60),
      from: "alta",
      region: getStoredRegionKey(),
    });
    void navigate({ to: "/buscar", search: { q: query, from: "alta" } as any }).finally(() =>
      setPendingTerm(null),
    );
  };


  // Painel ao vivo: lógica pura e testada (src/lib/live-panel.ts) — placeholder
  // "—" + mensagem amigável quando a consulta falha, nunca números inventados.
  const livePanel = buildLivePanel({
    stats,
    economy,
    statsLoading: false,
    economyLoading: false,
    statsError: stats == null,
    economyError: economy == null,
  });
  const METRIC_ICONS = { markets: ShieldCheck, products: Package, savings: TrendingDown } as const;
  const METRIC_DETAILS: Record<LivePanelKind, { trend: string; sublabel: string }> = {
    markets: { trend: "+2 novos", sublabel: "Mercados locais com preços auditados em Feijó." },
    products: { trend: "Hoje", sublabel: "Cesta básica e limpeza monitorados diariamente." },
    savings: { trend: "↑ 2.4% var.", sublabel: "Diferença média entre o maior e o menor preço hoje." },
  };

  const metrics = livePanel.metrics.map((m: LivePanelMetric) => ({
    ...m,
    Icon: METRIC_ICONS[m.kind],
    ...METRIC_DETAILS[m.kind],
  }));

  return (
    <div
      className="pc-home relative flex min-h-screen w-full flex-col overflow-x-hidden scroll-smooth contain-layout bg-background text-foreground font-sans"
    >
      {/* ---------- Camadas de fundo editoriais ---------- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <img
          src={homeHeroImg}
          alt=""
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="h-full w-full object-cover object-center scale-[1.04] blur-[3px] saturate-[0.97]"
          style={{
            opacity: "var(--pc-home-hero-img-opacity)" as unknown as number,
          }}
        />
      </div>
      {/* Véu editorial: usa o gradiente do design system — sutil, mantém a foto viva */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "var(--pc-home-hero-overlay)" }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full"
        style={{
          background: `radial-gradient(circle, color-mix(in oklab, ${P.gold} 70%, transparent) 0%, transparent 65%)`,
          filter: "blur(120px)",
          opacity: 0.42,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-1/2 h-[420px] w-[420px] -translate-y-1/2 rounded-full"
        style={{
          background: `radial-gradient(circle, color-mix(in oklab, ${P.navy} 55%, transparent) 0%, transparent 70%)`,
          filter: "blur(130px)",
          opacity: 0.22,
        }}
      />


      {/* Coluna mestra: header / palco / rodapé em três faixas rígidas.
          Usa flex-1 para preencher a viewport se o conteúdo for pequeno. */}
      <div className="relative z-10 flex min-h-screen flex-col">
        <SiteHeader variant="overlay" showThemeToggle />

        {/* ================= PALCO ÚNICO ================= */}
        <main
          id="hero"
          aria-labelledby="hero-title"
          className="mx-auto flex w-full max-w-7xl flex-col justify-center gap-4 md:gap-8 px-4 py-4 md:py-10 sm:px-6 lg:px-8"
        >
          {/* Sem `flex-1` aqui: o conjunto hero + divisor + faixa é centrado
              como um bloco só, distribuindo a folga igualmente acima e abaixo
              em vez de acumular um vazio antes das categorias. */}
          <div className="grid min-h-0 shrink-0 items-center gap-4 md:gap-8 lg:grid-cols-12 lg:gap-10">

            {/* ---------- Coluna editorial ---------- */}
            <div className="order-1 flex min-w-0 flex-col gap-2 md:gap-4 lg:col-span-7 lg:pr-4">
              <div
                className="inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 self-start rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] backdrop-blur-sm"
                style={{
                  background: `var(--primary)`,
                  borderColor: `var(--primary)`,
                  color: "var(--primary-foreground)",
                }}
                role="status"
                aria-live="polite"
              >
                <span className="relative flex h-1.5 w-1.5" aria-hidden>
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                    style={{ background: "white" }}
                  />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: "white" }} />
                </span>
                <span>Ao vivo · Feijó/AC</span>
                <span aria-hidden style={{ color: `color-mix(in oklab, ${P.gold} 50%, transparent)` }}>·</span>
                <span className="inline-flex items-center gap-1 normal-case tracking-normal" style={{ color: "var(--pc-home-onhero-fg)" }}>
                  <ShieldCheck className="h-3 w-3" aria-hidden />
                  <strong className="pc-num font-semibold">{stats?.markets ?? "—"}</strong>
                  <span className="text-[11px] opacity-80">mercados</span>
                </span>
                <span aria-hidden style={{ color: `color-mix(in oklab, ${P.gold} 50%, transparent)` }}>·</span>
                <span className="inline-flex items-center gap-1 normal-case tracking-normal" style={{ color: "var(--pc-home-onhero-fg)" }}>
                  <Package className="h-3 w-3" aria-hidden />
                  <strong className="pc-num font-semibold">{stats?.products ?? "—"}</strong>
                  <span className="text-[11px] opacity-80">produtos</span>
                </span>
                {Number(economy?.avgSavingsPct ?? 0) > 0 ? (
                  <>
                    <span aria-hidden style={{ color: `color-mix(in oklab, ${P.gold} 50%, transparent)` }}>·</span>
                    <span
                      className="inline-flex items-center gap-1 normal-case tracking-normal"
                      style={{ color: "var(--pc-home-onhero-fg)" }}
                      title="Diferença média entre o menor e o maior preço do mesmo produto, considerando itens com diferença relevante entre mercados."
                    >
                      <TrendingDown className="h-3 w-3" aria-hidden />
                      <strong className="pc-num font-semibold">
                        {Number(economy!.avgSavingsPct).toLocaleString("pt-BR", {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}
                        %
                      </strong>
                      <span className="text-[11px] opacity-80">de economia média</span>
                    </span>
                  </>
                ) : null}

              </div>

              <h1
                id="hero-title"
                className="max-w-[14ch] text-[clamp(2.8rem,9vw,5.5rem)] font-extrabold leading-[1] tracking-[-0.05em] sm:text-[clamp(3.5rem,10vw,6.5rem)]"
                style={{ color: "var(--foreground)" }}
              >
                Inteligência real para <span className="text-primary italic">economizar</span>
              </h1>

              <p
                className="max-w-[48ch] text-[clamp(1rem,2vw,1.2rem)] font-medium leading-relaxed tracking-tight text-muted-foreground sm:text-[clamp(1.1rem,2.2vw,1.4rem)]"
              >
                A primeira plataforma de monitoramento de preços em tempo real de Feijó. Compare mercados e economize em cada item da sua lista.
              </p>

              {/* ---------- Busca centralizada ---------- */}
              <div className="relative mt-2 w-full max-w-2xl lg:mt-4" ref={searchAnchorRef}>
                <form
                  onSubmit={submitSearch}
                  className="group relative flex items-center transition-transform duration-300 focus-within:scale-[1.01]"
                >
                  <div
                    className="absolute inset-y-0 left-0 flex items-center pl-5 text-muted-foreground transition-colors group-focus-within:text-brand"
                    aria-hidden
                  >
                    <Search className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
                  </div>
                  <input
                    type="search"
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setSuggestOpen(true);
                    }}
                    onFocus={() => setSuggestOpen(true)}
                    placeholder="Buscar produto ou mercado…"
                    className="h-14 w-full rounded-2xl border border-border bg-white/50 dark:bg-slate-900/50 pl-14 pr-32 text-[17px] font-semibold text-foreground placeholder:text-muted-foreground/60 backdrop-blur-2xl transition-all hover:bg-white dark:hover:bg-slate-900 focus:border-primary/50 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-8 focus:ring-primary/5 sm:h-16 sm:pl-16 sm:text-[19px]"
                  />
                  <div className="absolute right-2 top-2 h-10 sm:right-2.5 sm:top-2.5 sm:h-11">
                    <Button
                      type="submit"
                      disabled={!q.trim()}
                      className="h-full rounded-xl bg-primary px-6 text-[15px] font-bold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:shadow-xl active:scale-95 disabled:opacity-0 sm:px-8 sm:text-[16px]"
                    >
                      Buscar
                    </Button>
                  </div>
                </form>

                {/* Sugestões de busca flutuantes */}
                <HomeSearchSuggestions
                  ref={suggestRef}
                  open={suggestOpen}
                  onClose={() => setSuggestOpen(false)}
                  query={q}
                  isLoggedOut={isLoggedOut}
                  onBlocked={() => setGateOpen(true)}
                  anchorRef={searchAnchorRef}
                />
              </div>

              {/* Buscas em alta no Hero */}
              <div className="flex flex-wrap items-center gap-2 pt-2 sm:gap-3">
                <span className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground/60">Destaques:</span>
                {heroPopular.map((term) => (
                  <button
                    key={term}
                    onClick={() => goToPopular(term)}
                    className="rounded-full border border-border bg-card px-3.5 py-1.5 text-[13px] font-semibold text-foreground/80 shadow-sm transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary active:scale-95"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>


            {/* ---------- Coluna de dados ---------- */}
            <aside className="order-2 min-w-0 lg:col-span-5" aria-label="Indicadores da plataforma">
              <div
                className="rounded-3xl border border-border/50 p-6 backdrop-blur-xl shadow-2xl bg-card/60"
              >
                <div
                  className="grid grid-cols-1 gap-1 sm:grid-cols-3 lg:grid-cols-1"
                  role="region"
                  aria-label="Painel de economia em tempo real"
                >
                  {metrics.map((m) => (
                    <div
                      key={m.kind}
                      className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card p-5 transition-all hover:bg-card hover:border-primary/40 cursor-pointer shadow-sm active:scale-[0.98]"
                      onClick={() => setSpotlight(m.kind as any)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                            {m.label}
                          </span>
                          <div className="flex items-baseline gap-1">
                            <span className="pc-num text-2xl font-extrabold text-foreground sm:text-3xl tracking-tighter">
                              {m.value}
                            </span>
                             <span className="text-[11.5px] font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-lg border border-brand/20">
                              {m.trend}
                            </span>
                          </div>
                        </div>
                        <div className="rounded-xl bg-primary/5 p-2 text-primary/60 transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                          <m.Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" strokeWidth={2.2} />
                        </div>
                      </div>
                      <p className="mt-3 text-[13px] leading-relaxed font-medium text-muted-foreground">
                        {m.sublabel}
                      </p>
                      
                      {/* Efeito de brilho no hover */}
                      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  ))}
                </div>

                {livePanel.failed && (
                  <p
                    role="status"
                    className="mt-3 rounded-xl border border-destructive/20 px-3 py-2 text-[11.5px] leading-snug bg-destructive/5 text-destructive/80"
                  >
                    {livePanel.errorMessage}
                  </p>
                )}

                {/* ============ Parceiros ============
                    Muro de plaquetas claras: hierarquia = eyebrow + contagem,
                    depois cards com logo em alta densidade, nome do mercado
                    em cápsula inferior (revela em hover para não competir
                    com os preços) e um CTA "Ver todos" sempre visível. */}
                <div
                  className="mx-1 mb-1 mt-1 rounded-2xl bg-muted/30 border border-border/40 p-4 hidden min-[360px]:block"
                >
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-primary/60" aria-hidden />
                      <span
                        className={EYEBROW}
                      >
                        Onde comparamos
                      </span>
                      {partners.length > 0 && (
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums"
                          style={{
                            color: "var(--foreground)",
                            background: "var(--muted)",
                            border: "1px solid var(--border)",
                          }}
                          aria-label={`${partners.length} mercados parceiros`}
                        >
                          {partners.length}
                        </span>
                      )}
                    </div>
                    <Link
                      to="/estabelecimentos"
                      aria-label="Ver todos os mercados parceiros"
                      className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2"
                      style={{
                        color: "var(--primary)",
                      }}
                    >
                      Ver todos →
                    </Link>
                  </div>

                  <ul
                    role="list"
                    className="flex items-stretch gap-2 overflow-x-auto no-scrollbar py-0.5"
                  >
                    {storesQ.isLoading
                      ? Array.from({ length: 5 }).map((_, i) => (
                          <li
                            key={`sk-${i}`}
                            aria-hidden
                            className="grid shrink-0 place-items-center overflow-hidden rounded-xl border bg-white p-1.5 shadow-[0_2px_10px_-4px_rgba(3,10,28,0.55)]"
                            style={{ borderColor: "color-mix(in oklab, #ffffff 78%, transparent)", height: "clamp(42px, 4.6vh, 52px)", width: "clamp(42px, 4.6vh, 52px)" }}
                          >
                            <span
                              className="h-full w-full animate-pulse rounded-lg"
                              style={{ background: "color-mix(in oklab, #0b1b3a 8%, #ffffff)" }}
                            />
                          </li>
                        ))
                      : partners.map((s: any, i: number) => {
                          const label = s?.name ?? "Mercado parceiro";
                          // Slug determinístico (mesma regra do resolver de estabelecimentos)
                          const storeSlug = s?.name ? slugifyEstablishment(s.name) : null;
                          return (
                            <li key={s?.id ?? i} className="shrink-0">
                              <Link
                                {...(storeSlug
                                  ? ({ to: "/estabelecimento/$slug", params: { slug: storeSlug } } as const)
                                  : ({ to: "/estabelecimentos" } as const))}
                                aria-label={`Ver produtos e preços de ${label}`}

                                className="group relative flex flex-col items-stretch justify-between rounded-xl border bg-white p-1.5 shadow-[0_2px_12px_-4px_rgba(3,10,28,0.25)] transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_8px_16px_-6px_rgba(3,10,28,0.35)] focus-visible:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2"
                                style={{
                                  borderColor: "rgba(15, 27, 61, 0.12)",
                                  ["--tw-ring-color" as string]: "var(--pc-home-onhero-gold)",
                                  height: "clamp(44px, 4.8vh, 54px)",
                                  width: "clamp(44px, 4.8vh, 54px)",
                                }}
                              >
                                <span className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-lg">
                                {s?.logoUrl ? (
                                  <img
                                    src={s.logoUrl}
                                    alt=""
                                    width={128}
                                    height={128}
                                    loading="eager"
                                    decoding="async"
                                    className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.06]"
                                  />
                                ) : (
                                  <span
                                    className="grid h-full w-full place-items-center rounded-lg text-[16px] font-extrabold"
                                    style={{
                                      background: "color-mix(in oklab, #0b1b3a 6%, #ffffff)",
                                      color: "#0b1b3a",
                                    }}
                                    aria-hidden
                                  >
                                    {label.trim().charAt(0).toUpperCase()}
                                  </span>
                                )}
                                </span>
                                {/* Caption profissional padrão do sistema */}
                                <StoreCaption name={label} placement="top" />
                              </Link>
                            </li>
                          );
                        })}

                  </ul>

                </div>
              </div>

            </aside>
          </div>


          {/* Divisor editorial entre hero e faixa de categorias */}
          <hr className="my-4 border-border/10" aria-hidden />

          {/* ================= FAIXA INFERIOR =================
              Dois blocos com molduras próprias para não misturar conceitos:
              à esquerda as CATEGORIAS (navegação por seção da loja), à direita
              as AÇÕES do produto (Histórico, Colaborar, Plus, Explorar). Cada
              bloco tem rótulo e contorno próprios; as células são horizontais
              (ícone à esquerda do rótulo) e mais baixas, ganhando densidade. */}
          <div className="grid shrink-0 gap-3 lg:grid-cols-12">
            {/* Categorias */}
            <nav
              aria-label="Categorias"
              className="min-w-0 rounded-3xl border border-border/50 p-4 lg:col-span-8 shadow-2xl bg-card/40 backdrop-blur-sm"
            >
              <p
                className={`${EYEBROW} mb-1.5 px-0.5`}
                style={{ color: "var(--muted-foreground)" }}
              >
                Categorias
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
                {CATEGORIES.map(({ key, label, full, coverage, Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => navigate({ to: "/categoria/$slug", params: { slug: key } })}
                    aria-label={`Pesquisar em ${catLabel(key, full)}`}
                    title={coverage ? `${catLabel(key, full)} — ${coverage}` : catLabel(key, full)}
                    data-reading-card
                    className={TILE}
                  >
                    {/* Chip atrás do ícone: separa o dourado do fundo fotográfico
                        e garante contraste legível sobre o glass. */}
                    <span
                      className={TILE_ICONWRAP}
                      style={{
                        background: `color-mix(in oklab, ${P.gold} 14%, transparent)`,
                        border: `1px solid color-mix(in oklab, ${P.gold} 28%, transparent)`,
                      }}
                      aria-hidden
                    >
                      <Icon className={TILE_ICON} style={{ color: "var(--primary)" }} strokeWidth={2.2} aria-hidden />
                    </span>
                    <span
                      className={TILE_LABEL}
                      style={{ color: "var(--pc-home-onhero-fg-90)" }}
                    >
                      {catLabel(key, label)}
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAllCatsOpen(true)}
                  aria-haspopup="dialog"
                  aria-label="Ver todas as categorias"
                  data-reading-card
                  className={`${TILE} border-dashed bg-primary/5 border-primary/20 hover:bg-primary/10`}
                >
                  <span
                    className={TILE_ICONWRAP}
                    aria-hidden
                  >
                    <Grid3x3 className={TILE_ICON} strokeWidth={2.4} aria-hidden />
                  </span>
                  <span className={`${TILE_LABEL} font-bold`}>
                    Todas
                  </span>
                </button>
              </div>
            </nav>

            {/* Ações — moldura própria, separada das categorias */}
            <nav
              aria-label="Ações"
              className="min-w-0 rounded-3xl border border-border/50 p-4 lg:col-span-4 shadow-2xl bg-card/40 backdrop-blur-sm"
            >
              <p className={`${EYEBROW} mb-1.5 px-0.5`}>
                Ações
              </p>
              <div className="grid min-w-0 grid-cols-4 gap-2 sm:gap-2.5 lg:grid-cols-2">
                <PillarLink to="/melhores-precos" Icon={LineChart} label="Histórico" />
                <PillarLink to="/colaborar" Icon={Users} label="Colaborar" />
                <PillarLink to="/planos" Icon={Sparkles} label="Plus" emphasis />
                <Sheet open={exploreOpen} onOpenChange={setExploreOpen}>
                  <SheetTrigger asChild>
                    <button
                      type="button"
                      data-reading-card
                      className={TILE}
                      onPointerEnter={preloadExplorePanel}
                      onFocus={preloadExplorePanel}
                    >
                      <span
                        className={TILE_ICONWRAP}
                      >
                        <LayoutGrid className={TILE_ICON} strokeWidth={2.2} aria-hidden />
                      </span>
                      <span
                        className={TILE_LABEL}
                      >
                        Explorar
                      </span>
                    </button>
                  </SheetTrigger>


                <SheetContent
                  side="bottom"
                  hideOverlay
                  className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden border-t-0 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-4 sm:px-6"
                  style={{
                    background: "var(--pc-home-explore-bg)",
                    color: "var(--pc-home-onhero-fg)",
                  }}
                >
                  <SheetHeader
                    className="mx-auto w-full max-w-6xl shrink-0 space-y-0 border-b pb-2 text-left"
                    style={{ borderColor: "var(--pc-home-onhero-border-soft)" }}
                  >
                    <p
                      className="text-[11px] font-semibold uppercase tracking-[0.22em]"
                      style={{ color: "var(--pc-home-onhero-gold)" }}
                    >
                      Guia rápido
                    </p>
                    <SheetTitle
                      className="font-editorial pc-hero-editorial text-[clamp(19px,1.1vw+1.8vh,30px)] font-normal leading-tight"
                      style={{ color: "var(--pc-home-onhero-fg)" }}
                    >
                      Explorar o PreçoCerto
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mx-auto flex w-full min-h-0 max-w-6xl flex-1 flex-col overflow-y-auto py-3 lg:overflow-hidden">
                    <Suspense fallback={<div aria-hidden className="h-40" />}>
                      <ExplorePanel onNavigate={() => setExploreOpen(false)} />
                    </Suspense>
                  </div>

                </SheetContent>
              </Sheet>
              </div>
            </nav>


          </div>

          {/* Faixa "Em alta": ocupa a folga entre os ladrilhos e o rodapé com
              dado real (termos mais buscados nos últimos 7 dias). Clicar em um
              termo preenche a busca do hero e abre os resultados.
              Destaque sutil em dourado para diferenciá-la do painel ao vivo. */}
          <section
            aria-label="Buscas em alta nos últimos 7 dias"
            className="hidden shrink-0 items-center gap-4 overflow-hidden rounded-2xl border px-6 py-4 backdrop-blur-xl lg:flex shadow-lg"
            style={{
              background: `color-mix(in oklab, ${P.gold} 18%, var(--pc-home-onhero-glass))`,
              borderColor: `color-mix(in oklab, ${P.gold} 65%, transparent)`,
              boxShadow: `inset 0 1px 0 0 color-mix(in oklab, ${P.gold} 35%, transparent), 0 6px 18px -10px color-mix(in oklab, ${P.gold} 45%, transparent)`,
            }}
          >
            <span
              className={`inline-flex shrink-0 items-center gap-1.5 ${EYEBROW}`}
              style={{ color: "var(--pc-home-onhero-gold)" }}
            >
              <TrendingDown className="h-3.5 w-3.5" aria-hidden />
              Buscas em alta
              <span
                aria-hidden
                className="ml-0.5 inline-flex h-1.5 w-1.5 shrink-0 animate-pulse rounded-full motion-reduce:animate-none"
                style={{ background: "var(--pc-home-onhero-gold)" }}
              />
              <span className="sr-only">atualizando em tempo real</span>
            </span>
            <Link
              to="/tendencias"
              className="shrink-0 rounded-full border px-2 py-0.5 text-[11.5px] font-semibold transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pc-home-onhero-gold)]"
              style={{
                borderColor: "color-mix(in oklab, var(--pc-home-onhero-gold) 55%, transparent)",
                color: "var(--pc-home-onhero-gold)",
              }}
            >
              Ver tendências
            </Link>
            <ul
              role="list"
              className="grid min-w-0 flex-1 auto-rows-fr gap-2 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))] short-h:[grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]"
            >
              {trendingPopular.map((t) => {
                const isActive = normalizeSearchText(t) === normalizeSearchText(q);
                const meta = trendMeta.get(t);
                const isHot = Boolean(meta?.hot);
                return (
                <li key={t} className="min-w-0">

                  <button
                    type="button"
                    onClick={() => goToPopular(t)}
                    disabled={pendingTerm !== null}
                    aria-pressed={isActive}
                    aria-current={isActive ? "true" : undefined}
                    title={`Buscar por ${t}`}
                    aria-label={
                      isActive ? `Termo selecionado: ${t}` : `Buscar por ${t}`
                    }
                    data-active={isActive ? "true" : undefined}
                    className="pc-trend-chip group relative flex h-full min-h-[40px] short-h:min-h-[32px] w-full items-center gap-1.5 overflow-hidden rounded-xl border px-2.5 py-1.5 short-h:py-1 text-left text-[12px] short-h:text-[11.5px] leading-[1.2] font-semibold capitalize transition-all duration-200 hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                    style={{
                      background: isActive
                        ? "color-mix(in oklab, var(--pc-home-onhero-gold) 26%, var(--pc-home-onhero-glass-soft))"
                        : "var(--pc-home-onhero-glass-soft)",
                      borderColor: isActive
                        ? "var(--pc-home-onhero-gold)"
                        : "color-mix(in oklab, var(--pc-home-onhero-gold) 45%, transparent)",
                      color: isActive
                        ? "var(--pc-home-onhero-fg)"
                        : "var(--pc-home-onhero-fg-90)",
                      ["--tw-ring-color" as string]: "var(--pc-home-onhero-gold)",
                      ["--tw-ring-offset-color" as string]: "var(--pc-home-hero-bg)",
                    }}
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-disabled:opacity-0"
                      style={{
                        background:
                          "linear-gradient(100deg, color-mix(in oklab, var(--pc-home-onhero-gold) 30%, transparent), transparent 70%)",
                      }}
                    />
                    <ProductCategoryIcon
                      category={detectFoodCategory(t)}
                      aria-hidden
                      className={
                        "relative h-4 w-4 shrink-0 transition-all duration-200 group-hover:scale-110 group-hover:opacity-100 " +
                        (isActive ? "opacity-100" : "opacity-80")
                      }
                      style={{ color: "var(--pc-home-onhero-gold)" }}
                    />
                    <span className="relative min-w-0 flex-1 text-left line-clamp-2 break-words">{t}</span>
                    {meta && meta.count > 0 ? (
                      <span
                        className="relative shrink-0 rounded-full px-1.5 py-[1px] text-[11px] font-bold tabular-nums"
                        title={
                          isHot
                            ? `${meta.dayCount} buscas hoje · ${meta.count} no total`
                            : `${meta.count} buscas`
                        }
                        style={{
                          background: isHot
                            ? "color-mix(in oklab, var(--pc-home-onhero-gold) 34%, transparent)"
                            : "color-mix(in oklab, var(--pc-home-onhero-gold) 16%, transparent)",
                          color: "var(--pc-home-onhero-fg)",
                        }}
                      >
                        {isHot ? `+${meta.dayCount}` : meta.count}
                      </span>
                    ) : null}
                    <ArrowRight
                      aria-hidden
                      className={
                        "relative h-3.5 w-3.5 shrink-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 " +
                        (isActive ? "translate-x-0 opacity-100" : "-translate-x-1 opacity-0")
                      }
                      style={{ color: "var(--pc-home-onhero-gold)" }}
                    />
                  </button>
                </li>
                );
              })}
            </ul>

          </section>
        </main>


        <section className="py-8 md:py-10 bg-card/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-6 md:mb-8">
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">Economize em 3 passos simples</h2>
              <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto">A tecnologia que você precisava para nunca mais pagar caro no mercado.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              <div className="flex flex-col items-center text-center group">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform">
                  <Search className="w-6 h-6 md:w-8 md:h-8" />
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-2">Busque o Produto</h3>
                <p className="text-sm text-muted-foreground">Digite o nome do que você precisa. Nosso sistema varre todos os mercados de Feijó em segundos.</p>
              </div>
              <div className="flex flex-col items-center text-center group">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform">
                  <LineChart className="w-6 h-6 md:w-8 md:h-8" />
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-2">Compare e Escolha</h3>
                <p className="text-sm text-muted-foreground">Veja onde está mais barato hoje. Confira o histórico de preços e evite promoções falsas.</p>
              </div>
              <div className="flex flex-col items-center text-center group">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform">
                  <ShoppingCart className="w-6 h-6 md:w-8 md:h-8" />
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-2">Monte sua Lista</h3>
                <p className="text-sm text-muted-foreground">Adicione à sua lista e saiba o valor total antes de sair de casa. Economia garantida.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-6 md:py-8 border-t border-border/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 md:mb-12">
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-1">Oportunidades do dia</h2>
                <p className="text-sm text-muted-foreground">Melhores variações de preço hoje.</p>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => navigate({ to: '/buscar' })}>
                Ver todos os preços <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {[
                { name: "Arroz agulha T1 5kg", savings: "R$ 8,40", price: "R$ 24,90", store: "Mercado Central" },
                { name: "Leite Integral 1L", savings: "R$ 1,20", price: "R$ 4,75", store: "Super Econômico" },
                { name: "Feijão Carioca 1kg", savings: "R$ 2,15", price: "R$ 7,90", store: "Açougue & Cia" },
                { name: "Óleo de Soja 900ml", savings: "R$ 0,95", price: "R$ 6,30", store: "Varejão do Povo" },
              ].map((p, i) => (
                <div key={i} className="group bg-card border border-border/50 rounded-2xl p-3 md:p-4 hover:border-primary/50 transition-all hover:shadow-xl min-h-[180px] md:min-h-[200px]">
                  <div className="flex justify-between items-start mb-2 md:mb-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-muted flex items-center justify-center">
                      <Package className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
                    </div>
                    <span className="bg-green-500/10 text-green-600 dark:text-green-400 text-[11px] font-bold px-2 py-1 rounded-lg border border-green-500/20">
                      -{p.savings}
                    </span>
                  </div>
                  <h4 className="font-bold text-base md:text-lg mb-0.5 md:mb-1 truncate">{p.name}</h4>
                  <p className="text-[11px] md:text-[12px] text-muted-foreground mb-2 md:mb-3">Melhor: <span className="text-foreground font-semibold">{p.price}</span></p>
                  <div className="flex items-center gap-2 text-[10px] md:text-[11px] text-muted-foreground pb-2 md:pb-3 border-b border-border/50 mb-2 md:mb-3 truncate">
                    <Store className="w-3.5 h-3.5" />
                    {p.store}
                  </div>
                  <Button variant="ghost" className="w-full justify-between h-8 text-primary hover:bg-primary/5 font-bold text-[12px] rounded-lg p-0 px-2">
                    Ver detalhes <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>
        <footer
          className="shrink-0 border-t px-4 py-6 sm:px-6 lg:px-8 mt-4 md:mt-8 bg-card/60 backdrop-blur-md pb-[calc(1.5rem+76px+env(safe-area-inset-bottom,0px))] md:pb-6 overflow-hidden"
        >
          <div className="mx-auto w-full max-w-7xl">
            {/* Mobile: Accordion links */}
            <div className="block md:hidden mb-6">
              <Accordion type="single" collapsible className="w-full space-y-2">
                <AccordionItem value="institucional" className="border-border/40">
                  <AccordionTrigger className="py-3 text-[14px] font-bold text-foreground hover:no-underline">
                    Institucional
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-4">
                    <nav className="flex flex-col gap-3">
                      {[
                        { to: "/estabelecimentos", label: "Mercados" },
                        { to: "/mapa", label: "Bairros" },
                        { to: "/planos", label: "Planos" },
                      ].map((l) => (
                        <button
                          key={l.to}
                          type="button"
                          onClick={() => navigate({ to: l.to })}
                          className="text-left text-[13.5px] font-semibold text-foreground/80 hover:text-primary transition-colors py-1"
                        >
                          {l.label}
                        </button>
                      ))}
                    </nav>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="suporte" className="border-border/40">
                  <AccordionTrigger className="py-3 text-[14px] font-bold text-foreground hover:no-underline">
                    Suporte & Legal
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-4">
                    <nav className="flex flex-col gap-3">
                      {[
                        { to: "/fale-conosco", label: "Fale conosco" },
                        { to: "/privacidade", label: "Privacidade" },
                      ].map((l) => (
                        <button
                          key={l.to}
                          type="button"
                          onClick={() => navigate({ to: l.to })}
                          className="text-left text-[13.5px] font-semibold text-foreground/80 hover:text-primary transition-colors py-1"
                        >
                          {l.label}
                        </button>
                      ))}
                    </nav>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-x-4 gap-y-4">
              <div className="flex flex-col items-center md:items-start gap-1">
                <p className="text-[12.5px] leading-snug sm:text-[13px] text-foreground font-semibold">
                  © {new Date().getFullYear()} PreçoCerto · Feijó/AC
                </p>
                <span className="text-[11px] font-bold text-primary uppercase tracking-widest opacity-80">
                  &lt;dev&gt; Franc D&apos;nis
                </span>
              </div>
              
              {/* Desktop: Horizontal links */}
              <nav aria-label="Links institucionais" className="hidden md:flex items-center gap-x-2">
                {[
                  { to: "/estabelecimentos", label: "Mercados" },
                  { to: "/mapa", label: "Bairros" },
                  { to: "/planos", label: "Planos" },
                  { to: "/fale-conosco", label: "Fale conosco" },
                  { to: "/privacidade", label: "Privacidade" },
                ].map((l) => (
                  <button
                    key={l.to}
                    type="button"
                    onClick={() => navigate({ to: l.to })}
                    className="pc-nav-link cursor-pointer rounded-md border-0 bg-transparent px-2 py-1 text-[12.5px] font-extrabold uppercase tracking-[0.14em] outline-none text-foreground hover:text-primary transition-colors"
                  >
                    {l.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </footer>
      </div>
      <AllCategoriesDialog open={allCatsOpen} onOpenChange={setAllCatsOpen} />
      <MetricSpotlightDialog
        open={spotlight !== null}
        onOpenChange={(v) => {
          if (!v) setSpotlight(null);
        }}
        kind={spotlight}
      />
      <GuestGateDialog
        open={gateOpen}
        onOpenChange={setGateOpen}
        action="search"
        redirect="/buscar"
      />
    </div>
  );
}

function PillarLink({
  to,
  Icon,
  label,
  emphasis,
}: {
  to: string;
  Icon: typeof LineChart;
  label: string;
  emphasis?: boolean;
}) {
  return (
    <Link
      to={to}
      data-reading-card
      className={cn(TILE, emphasis && "bg-primary border-primary hover:bg-primary/90")}
    >
      <span
        className={cn(TILE_ICONWRAP, emphasis && "bg-white/20 text-white")}
      >
        <Icon
          className={TILE_ICON}
          strokeWidth={2.2}
          aria-hidden
        />
      </span>
      <span
        className={cn(TILE_LABEL, emphasis && "text-white")}
      >
        {label}
      </span>
    </Link>
  );

}
