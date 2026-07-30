import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
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
} from "lucide-react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { PrecoCertoMark } from "@/components/typography/PrecoCertoMark";
import { StoreCaption } from "@/components/brand/StoreCaption";

import { buildLivePanel, type LivePanelMetric } from "@/lib/live-panel";
import { getPlatformStats, listPublicStores } from "@/lib/stores-public.functions";
import { getEconomyStat } from "@/lib/products-public.functions";
import { listPopularQueries } from "@/lib/search-popular.functions";
import { StartFreeDialog } from "@/components/home/StartFreeDialog";
import { GuestGateDialog } from "@/components/gate/GuestGateDialog";
import { HomeSearchSuggestions } from "@/components/home/HomeSearchSuggestions";
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
import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";
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
  loader: async ({ context }) => {
    await Promise.allSettled([
      context.queryClient.ensureQueryData({
        queryKey: ["home-stats"],
        queryFn: () => getPlatformStats({} as any),
        staleTime: 60_000,
      }),
      context.queryClient.ensureQueryData({
        queryKey: ["home-economy"],
        queryFn: () => getEconomyStat({} as any),
        staleTime: 5 * 60_000,
      }),
    ]);
    return null;
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
const serif = "font-['Instrument_Serif',ui-serif,Georgia,serif]";

/* Ladrilhos da faixa inferior.
   Altura em `clamp(px, vh, px)`: a célula acompanha a altura da janela sem
   nunca estourar a tela nem encolher a ponto de cortar o rótulo. Todas as
   células (categorias e atalhos) usam exatamente a mesma medida, de modo que
   as duas colunas fecham as mesmas 2 linhas e nada fica desproporcional. */
const TILE =
  "group flex h-[clamp(52px,7.4vh,78px)] flex-col items-center justify-center gap-1 rounded-2xl border px-2 text-center pc-tile pc-elite-frame focus-visible:outline-none focus-visible:ring-2 sm:gap-1.5";
const TILE_ICON = "h-[clamp(16px,2.2vh,22px)] w-[clamp(16px,2.2vh,22px)]";
const TILE_LABEL =
  "w-full truncate text-[clamp(11px,1.45vh,14px)] font-semibold leading-none tracking-[-0.005em]";

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
  const [suggestOpen, setSuggestOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add("no-page-bg", "pc-home-locked");
    return () => {
      document.body.classList.remove("no-page-bg", "pc-home-locked");
    };
  }, []);

  const platformStats = useServerFn(getPlatformStats);
  const statsQ = useQuery({
    queryKey: ["home-stats"],
    queryFn: () => platformStats({} as any),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const stats: any = statsQ.data ?? {};

  const economyFn = useServerFn(getEconomyStat);
  const economyQ = useQuery({
    queryKey: ["home-economy"],
    queryFn: () => economyFn({} as any),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  const economy = economyQ.data;

  const popularFn = useServerFn(listPopularQueries);
  const popularQ = useQuery({
    queryKey: ["home-popular-queries", 7, 24],
    queryFn: () => popularFn({ data: { days: 7, limit: 24 } } as any),
    staleTime: 45_000,
    refetchOnWindowFocus: false,
  });
  const POPULAR_FALLBACK = ["arroz", "feijão", "leite", "óleo", "café", "açúcar"];
  const popularAll: string[] = useMemo(() => {
    const real = (popularQ.data ?? []).map((p: any) => String(p?.query ?? "")).filter(Boolean);
    return real.length >= 3 ? real : POPULAR_FALLBACK;
  }, [popularQ.data]);

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
    navigate({ to: "/buscar", search: { q: query } as any });
  };

  const goToPopular = (term: string) => {
    if (isLoggedOut) {
      const { blocked } = consumeGuest("search", term);
      if (blocked) {
        setGateOpen(true);
        return;
      }
    }
    navigate({ to: "/buscar", search: { q: term } as any });
  };


  // Painel ao vivo: lógica pura e testada (src/lib/live-panel.ts) — placeholder
  // "—" + mensagem amigável quando a consulta falha, nunca números inventados.
  const livePanel = buildLivePanel({
    stats,
    economy,
    statsLoading: statsQ.isLoading,
    economyLoading: economyQ.isLoading,
    statsError: statsQ.isError,
    economyError: economyQ.isError,
  });
  const METRIC_ICONS = { markets: ShieldCheck, products: Package, savings: TrendingDown } as const;
  const metrics = livePanel.metrics.map((m: LivePanelMetric) => ({
    ...m,
    Icon: METRIC_ICONS[m.kind],
  }));

  return (
    <div
      /* O travamento em uma janela só vale a partir de `lg`: no mobile o
         conteúdo é empilhado e precisa rolar normalmente, senão as faixas se
         sobrepõem sob a barra inferior. */
      className="pc-home relative flex min-h-[100dvh] w-full flex-col antialiased lg:h-[100dvh] lg:max-h-[100dvh] lg:min-h-0 lg:overflow-hidden"
      style={{
        background: "var(--pc-home-hero-bg)",
        color: "var(--pc-home-onhero-fg)",
        fontFamily: "'Work Sans', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* ---------- Camadas de fundo editoriais ---------- */}
      <img
        src={homeHeroImg}
        alt=""
        aria-hidden
        loading="eager"
        fetchPriority="high"
        decoding="async"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
        style={{
          opacity: "var(--pc-home-hero-img-opacity)" as unknown as number,
          filter: "blur(3px) saturate(0.97)",
          transform: "scale(1.04)", // compensa a borda suavizada pelo blur
        }}
      />
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
        className="pointer-events-none absolute -left-40 bottom-[-160px] h-[420px] w-[420px] rounded-full"
        style={{
          background: `radial-gradient(circle, color-mix(in oklab, ${P.navy} 55%, transparent) 0%, transparent 70%)`,
          filter: "blur(130px)",
          opacity: 0.22,
        }}
      />


      {/* Coluna mestra: header / palco / rodapé em três faixas rígidas.
          `min-h-0` no palco é o que impede o conteúdo de empurrar o rodapé
          para fora da janela. */}
      <div className="relative z-10 flex min-h-0 flex-col lg:h-full">
        <SiteHeader variant="overlay" showThemeToggle />

        {/* ================= PALCO ÚNICO ================= */}
        <main
          id="hero"
          aria-labelledby="hero-title"
          className="mx-auto flex w-full min-h-0 max-w-7xl flex-1 flex-col justify-center gap-[clamp(0.5rem,1.6vh,1.25rem)] px-3 py-[clamp(0.5rem,1.4vh,1rem)] sm:px-6 lg:overflow-hidden lg:px-8"
        >
          {/* Sem `flex-1` aqui: o conjunto hero + divisor + faixa é centrado
              como um bloco só, distribuindo a folga igualmente acima e abaixo
              em vez de acumular um vazio antes das categorias. */}
          <div className="grid min-h-0 items-center gap-[clamp(0.75rem,2.2vh,1.5rem)] lg:grid-cols-12 lg:gap-10">
            {/* ---------- Coluna editorial ---------- */}
            <div className="order-1 flex min-w-0 flex-col gap-[clamp(0.5rem,1.5vh,1rem)] lg:col-span-7 lg:pr-4">
              <div
                className="inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 self-start rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] backdrop-blur-sm"
                style={{
                  background: `color-mix(in oklab, ${P.navy} 45%, transparent)`,
                  borderColor: `color-mix(in oklab, ${P.gold} 38%, transparent)`,
                  color: "var(--pc-home-onhero-gold)",
                }}
                role="status"
                aria-live="polite"
              >
                <span className="relative flex h-1.5 w-1.5" aria-hidden>
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                    style={{ background: P.gold }}
                  />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: P.gold }} />
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

              {/* Título e apoio escalam por largura E altura: em telas baixas
                  (ex.: 1366x768) o texto encolhe em vez de empurrar a página. */}
              <h1
                id="hero-title"
                className="font-editorial pc-hero-editorial text-[clamp(1.75rem,2.6vw+2.2vh,4rem)]"
                style={{ color: "var(--pc-home-onhero-fg)" }}
              >
                Onde cada real{" "}
                <PrecoCertoMark variant="hero">rende mais</PrecoCertoMark>.
              </h1>

              <p
                className="tc-flow max-w-xl text-[clamp(13px,0.4vw+1.4vh,17px)] font-light leading-relaxed"
                style={{ color: "var(--pc-home-onhero-fg-80)" }}
              >
                Os mercados de Feijó, lado a lado e em tempo real. Você escolhe onde
                vale mais a pena — sem sair de casa.
              </p>

              {/* ---------- Busca ---------- */}
              <form onSubmit={submitSearch} className="relative max-w-2xl">
                <div
                  className="pc-elite-frame flex items-center gap-1 rounded-2xl border p-1 shadow-2xl transition-all focus-within:ring-2 sm:p-1.5"
                  style={{
                    background: "#ffffff",
                    // @ts-expect-error css var
                    "--tw-ring-color": `color-mix(in oklab, ${P.gold} 65%, transparent)`,
                  }}
                >
                  <span className="pl-3 sm:pl-4">
                    <Search className="h-5 w-5" style={{ color: "#94a3b8" }} strokeWidth={2.2} />
                  </span>
                  <input
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setSuggestOpen(true);
                    }}
                    onFocus={() => setSuggestOpen(true)}
                    onBlur={() => window.setTimeout(() => setSuggestOpen(false), 180)}
                    type="search"
                    inputMode="search"
                    placeholder="O que você procura hoje? (ex.: Arroz, Feijão, Leite…)"
                    aria-label="Buscar produto"
                    autoComplete="off"
                    className="min-w-0 flex-1 bg-transparent px-2 py-[clamp(0.6rem,1.9vh,1.1rem)] text-[clamp(14px,1.5vh,16.5px)] font-medium outline-none placeholder:text-slate-400"
                    style={{ color: "#0f172a" }}
                  />
                  <button
                    type="submit"
                    aria-label="Buscar preço"
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-[13.5px] font-bold uppercase tracking-wide transition-all hover:brightness-95 active:scale-95 sm:px-6 sm:text-[14px]"
                    style={{ background: P.gold, color: P.navy }}
                  >
                    <span className="hidden sm:inline">Buscar</span>
                    <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                </div>
                <HomeSearchSuggestions
                  query={q}
                  isLoggedOut={isLoggedOut}
                  open={suggestOpen}
                  onClose={() => setSuggestOpen(false)}
                  onBlocked={() => setGateOpen(true)}
                />
                {/* Com a cota de visitante desativada, GUEST_DAILY_LIMIT vale
                    Number.MAX_SAFE_INTEGER — mostrar "restam 9007199254740991"
                    é ruído. Só exibe o contador quando o limite é real. */}
                {isLoggedOut && !GUEST_QUOTA_DISABLED ? (
                  <p
                    className="mt-1.5 pl-2 text-[11px] font-medium"
                    style={{ color: "var(--pc-home-onhero-fg-70)" }}
                  >
                    Modo visitante · restam{" "}
                    <strong className="pc-num">{guestRemaining()}</strong> de {GUEST_DAILY_LIMIT} usos grátis hoje
                  </p>
                ) : null}
              </form>


              {/* ---------- Populares + CTA ---------- */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className="text-[11px] font-bold uppercase tracking-[0.2em]"
                  style={{ color: "var(--pc-home-onhero-fg-60)" }}
                >
                  Populares:
                </span>
                {popularAll.slice(0, 4).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => goToPopular(t)}
                    className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium capitalize pc-tile"
                    style={{
                      background: "var(--pc-home-onhero-glass-soft)",
                      borderColor: "var(--pc-home-onhero-border-soft)",
                      color: "var(--pc-home-onhero-fg-85)",
                    }}
                  >
                    {t}
                  </button>
                ))}
                {isLoggedOut ? (
                  <StartFreeDialog>
                    <button
                      type="button"
                      aria-haspopup="dialog"
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-bold transition-all hover:brightness-95"
                      style={{ background: P.gold, color: P.navy }}
                    >
                      Começar grátis
                      <ArrowRight className="h-3 w-3" strokeWidth={2.6} />
                    </button>
                  </StartFreeDialog>
                ) : (
                  <Link
                    to="/app"
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-bold transition-all hover:brightness-95"
                    style={{ background: P.gold, color: P.navy }}
                  >
                    Ir para o painel
                    <ArrowRight className="h-3 w-3" strokeWidth={2.6} />
                  </Link>
                )}
              </div>
            </div>

            {/* ---------- Coluna de dados ---------- */}
            <aside className="order-2 min-w-0 lg:col-span-5" aria-label="Indicadores da plataforma">
              <div
                className="pc-elite-frame rounded-2xl border p-3.5 backdrop-blur-md sm:p-4.5"
                style={{
                  background: "var(--pc-home-onhero-glass)",
                  borderColor: "var(--pc-home-onhero-border)",
                }}
              >
                <header className="mb-3 flex items-center justify-between gap-2 border-b pb-2.5" style={{ borderColor: "var(--pc-home-onhero-border-soft)" }}>
                  <span
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em]"
                    style={{ color: "var(--pc-home-onhero-gold)" }}
                  >
                    <span className="relative inline-flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" style={{ background: P.gold }} />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: P.gold }} />
                    </span>
                    Painel ao vivo
                  </span>
                  <Link
                    to="/estabelecimentos"
                    className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors hover:brightness-125"
                    style={{ color: "var(--pc-home-onhero-fg-70)" }}
                  >
                    Mercados <ArrowRight className="h-3 w-3" strokeWidth={2.6} />
                  </Link>
                </header>

                <div className="grid grid-cols-3 gap-2" data-reading-dense>
                  {metrics.map(({ kind, value, label, short, Icon }) => (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => setSpotlight(kind)}
                      aria-label={`${value} — ${label}. Ver detalhes.`}
                      className="group flex min-w-0 flex-col items-center gap-1 rounded-xl border px-1.5 py-[clamp(0.5rem,1.9vh,1.15rem)] text-center pc-tile focus-visible:outline-none focus-visible:ring-2"
                      style={{
                        background: "var(--pc-home-onhero-glass-soft)",
                        borderColor: "var(--pc-home-onhero-border-soft)",
                        // @ts-expect-error css var
                        "--tw-ring-color": `color-mix(in oklab, ${P.gold} 70%, transparent)`,
                      }}
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color: P.goldSoft }} aria-hidden />
                      <span
                        className={`${serif} tabular-nums leading-none`}
                        style={{ color: "var(--pc-home-onhero-gold)", fontSize: "clamp(1.15rem, 2.6vw, 1.9rem)" }}
                      >
                        {value}
                      </span>
                      <span
                        className="w-full text-balance break-words text-[11px] font-bold uppercase leading-[1.15] tracking-[0.06em]"
                        style={{ color: "var(--pc-home-onhero-fg-70)" }}
                      >
                        {/* Rótulo completo em 2 linhas: nunca cortar palavras com reticências */}
                        <span className="sm:hidden">{short}</span>
                        <span className="hidden sm:inline">{label}</span>
                      </span>
                    </button>
                  ))}
                </div>

                {livePanel.failed && (
                  <p
                    role="status"
                    className="mt-2 rounded-lg border px-2 py-1.5 text-[11.5px] leading-snug"
                    style={{
                      color: "var(--pc-home-onhero-fg-80)",
                      borderColor: "var(--pc-home-onhero-border-soft)",
                      background: "var(--pc-home-onhero-glass-soft)",
                    }}
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
                  className="mt-3 hidden border-t pt-2.5 min-[360px]:block"
                  style={{ borderColor: "var(--pc-home-onhero-border-soft)" }}
                >
                  <div className="mb-2 flex items-baseline justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3" style={{ color: P.goldSoft }} aria-hidden />
                      <span
                        className="text-[11px] font-bold uppercase tracking-[0.18em]"
                        style={{ color: "var(--pc-home-onhero-fg-60)" }}
                      >
                        Onde comparamos
                      </span>
                      {partners.length > 0 && (
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums"
                          style={{
                            color: "var(--pc-home-onhero-fg-80)",
                            background: "var(--pc-home-onhero-glass-soft)",
                            border: "1px solid var(--pc-home-onhero-border-soft)",
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
                        color: "var(--pc-home-onhero-gold)",
                        ["--tw-ring-color" as string]: "var(--pc-home-onhero-gold)",
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
                            className="grid h-[clamp(56px,7.2vh,76px)] w-[clamp(56px,7.2vh,76px)] shrink-0 place-items-center overflow-hidden rounded-xl border bg-white p-1.5 shadow-[0_2px_10px_-4px_rgba(3,10,28,0.55)]"
                            style={{ borderColor: "color-mix(in oklab, #ffffff 78%, transparent)" }}
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

                                className="group relative flex h-[clamp(56px,7.2vh,76px)] w-[clamp(56px,7.2vh,76px)] flex-col items-stretch justify-between rounded-xl border bg-white p-1.5 shadow-[0_2px_10px_-4px_rgba(3,10,28,0.55)] transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-[color-mix(in_oklab,var(--pc-home-onhero-gold)_55%,white)] hover:shadow-[0_10px_22px_-8px_rgba(3,10,28,0.75)] focus-visible:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2"
                                style={{
                                  borderColor: "color-mix(in oklab, #ffffff 78%, transparent)",
                                  ["--tw-ring-color" as string]: "var(--pc-home-onhero-gold)",
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
          <hr className="pc-rule my-[clamp(0.35rem,1.2vh,0.9rem)]" aria-hidden />

          {/* ================= FAIXA INFERIOR =================
              Duas colunas, ambas com 2 linhas de células idênticas: 10 hubs à
              esquerda (5 por linha) e 4 atalhos à direita (2 por linha). Antes
              os atalhos ficavam em 1 linha dentro de um bloco de 2 linhas de
              altura, o que esticava as células e desalinhava a faixa. */}
          <div className="grid shrink-0 gap-2 sm:gap-2.5 lg:grid-cols-12">
            {/* Categorias */}
            <nav aria-label="Categorias" className="min-w-0 lg:col-span-8">
              <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
                {CATEGORIES.map(({ key, label, full, coverage, Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => navigate({ to: "/categoria/$slug", params: { slug: key } })}
                    aria-label={`Pesquisar em ${catLabel(key, full)}`}
                    title={coverage ? `${catLabel(key, full)} — ${coverage}` : catLabel(key, full)}
                    data-reading-card
                    className={TILE}
                    style={{
                      background: "var(--pc-home-onhero-glass)",
                      borderColor: "var(--pc-home-onhero-border)",
                      // @ts-expect-error css var
                      "--tw-ring-color": `color-mix(in oklab, ${P.gold} 70%, transparent)`,
                    }}
                  >
                    <Icon className={TILE_ICON} style={{ color: "var(--pc-home-onhero-gold)" }} strokeWidth={2.1} aria-hidden />
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
                  className={`${TILE} border-dashed`}
                  style={{
                    background: `color-mix(in oklab, ${P.gold} 16%, transparent)`,
                    borderColor: `color-mix(in oklab, ${P.gold} 55%, transparent)`,
                    // @ts-expect-error css var
                    "--tw-ring-color": `color-mix(in oklab, ${P.gold} 70%, transparent)`,
                  }}
                >
                  <Grid3x3 className={TILE_ICON} style={{ color: "var(--pc-home-onhero-gold)" }} strokeWidth={2.3} aria-hidden />
                  <span className={`${TILE_LABEL} font-bold`} style={{ color: "var(--pc-home-onhero-gold)" }}>
                    Todas
                  </span>
                </button>
              </div>
            </nav>

            {/* Pilares + Explorar */}
            <div className="grid min-w-0 grid-cols-4 gap-2 sm:gap-2.5 lg:col-span-4 lg:grid-cols-2">
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
                    style={{
                      background: "var(--pc-home-onhero-glass)",
                      borderColor: "var(--pc-home-onhero-border)",
                      // @ts-expect-error css var
                      "--tw-ring-color": `color-mix(in oklab, ${P.gold} 70%, transparent)`,
                    }}
                  >
                    <LayoutGrid className={TILE_ICON} style={{ color: "var(--pc-home-onhero-gold)" }} strokeWidth={2.1} aria-hidden />
                    <span
                      className={TILE_LABEL}
                      style={{ color: "var(--pc-home-onhero-fg-90)" }}
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

          </div>
        </main>

        {/* ================= RODAPÉ COMPACTO ================= */}
        <footer
          className="shrink-0 border-t px-4 py-[clamp(0.35rem,1.1vh,0.7rem)] sm:px-6 lg:px-8"
          style={{ borderColor: "var(--pc-home-onhero-border-soft)" }}
        >
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
            <p className="text-[12.5px] leading-snug sm:text-[13px]" style={{ color: "var(--pc-home-onhero-fg-70)" }}>
              © {new Date().getFullYear()} PreçoCerto · Feijó/AC ·{" "}
              <span className="font-semibold" style={{ color: "var(--pc-home-onhero-gold)" }}>
                &lt;dev&gt; Franc D&apos;nis
              </span>
            </p>
            <nav aria-label="Links institucionais" className="flex flex-wrap items-center gap-x-1 gap-y-1">
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
                  className="pc-nav-link cursor-pointer rounded-md border-0 bg-transparent px-2 py-1 text-[12.5px] font-semibold uppercase tracking-[0.1em] outline-none sm:text-[13px]"
                  style={{ color: "var(--pc-home-onhero-fg-85)" }}
                >
                  {l.label}
                </button>

              ))}

            </nav>

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
      className={TILE}
      style={{
        background: emphasis ? "var(--pc-home-gold)" : "var(--pc-home-onhero-glass)",
        borderColor: emphasis
          ? "var(--pc-home-gold)"
          : "var(--pc-home-onhero-border)",
        // @ts-expect-error css var
        "--tw-ring-color": "color-mix(in oklab, var(--pc-home-gold) 70%, transparent)",
      }}
    >
      <Icon
        className={TILE_ICON}
        style={{ color: emphasis ? "var(--pc-home-navy)" : "var(--pc-home-onhero-gold)" }}
        strokeWidth={2.1}
        aria-hidden
      />
      <span
        className={TILE_LABEL}
        style={{ color: emphasis ? "var(--pc-home-navy)" : "var(--pc-home-onhero-fg-90)" }}
      >
        {label}
      </span>
    </Link>
  );
}
