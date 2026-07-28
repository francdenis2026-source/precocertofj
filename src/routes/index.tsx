import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
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
  ShoppingCart,
  Pill,
  Beef,
  Fuel,
  Grid3x3,
  LayoutGrid,
  MapPin,
} from "lucide-react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { PrecoCertoMark } from "@/components/typography/PrecoCertoMark";
import { buildLivePanel, type LivePanelMetric } from "@/lib/live-panel";
import { getProductSuggestions } from "@/lib/products-suggest.functions";
import { getPlatformStats, listPublicStores } from "@/lib/stores-public.functions";
import { getEconomyStat } from "@/lib/products-public.functions";
import { listPopularQueries } from "@/lib/search-popular.functions";
import { StartFreeDialog } from "@/components/home/StartFreeDialog";
import { MetricSpotlightDialog } from "@/components/home/MetricSpotlightDialog";
import { AllCategoriesDialog } from "@/components/home/AllCategoriesDialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useSession } from "@/hooks/useSession";
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

/* Ladrilhos da faixa inferior — maior presença sem alterar a altura da página
   (a área já reserva espaço livre acima do dock). */
const TILE =
  "group flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-2.5 text-center pc-tile pc-elite-frame focus-visible:outline-none focus-visible:ring-2 sm:min-h-[72px] sm:gap-2 lg:min-h-[80px]";
const TILE_ICON = "h-[19px] w-[19px] sm:h-[21px] sm:w-[21px] lg:h-6 lg:w-6";
const TILE_LABEL =
  "w-full truncate text-[12.5px] font-semibold leading-none tracking-[-0.005em] sm:text-[13.5px] lg:text-[14.5px]";

function useDebounced<T>(value: T, delay: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const CATEGORIES = [
  { key: "supermercados", label: "Mercado", full: "Supermercados", Icon: ShoppingCart },
  { key: "farmacias", label: "Farmácia", full: "Farmácias", Icon: Pill },
  { key: "acougues", label: "Açougue", full: "Açougues", Icon: Beef },
  { key: "postos", label: "Postos", full: "Postos", Icon: Fuel },
] as const;

function HomePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: sessionLoading } = useSession();
  const isLoggedOut = !sessionLoading && !user;

  const [q, setQ] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [spotlight, setSpotlight] =
    useState<import("@/components/home/MetricSpotlightDialog").MetricKind | null>(null);
  const [allCatsOpen, setAllCatsOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const searchBoxRef = useRef<HTMLFormElement | null>(null);

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

  const suggestFn = useServerFn(getProductSuggestions);
  const debouncedQ = useDebounced(q.trim(), 180);
  const suggestQ = useQuery({
    queryKey: ["home", "suggest", debouncedQ],
    queryFn: () => suggestFn({ data: { q: debouncedQ, limit: 5 } }),
    enabled: debouncedQ.length >= 2,
    staleTime: 30_000,
  });
  const suggestions = suggestQ.data ?? [];

  useEffect(() => {
    if (!showSuggest) return;
    const onDoc = (e: MouseEvent) => {
      if (!searchBoxRef.current) return;
      if (!searchBoxRef.current.contains(e.target as Node)) setShowSuggest(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [showSuggest]);

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
    setShowSuggest(false);
    navigate({ to: "/buscar", search: { q: query } as any });
  };

  const pickSuggestion = (name: string) => {
    setQ(name);
    setShowSuggest(false);
    navigate({ to: "/buscar", search: { q: name } as any });
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
      className="pc-home relative flex min-h-[100dvh] w-full flex-col overflow-hidden antialiased"
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
        style={{ opacity: "var(--pc-home-hero-img-opacity)" as unknown as number }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(180deg, color-mix(in oklab, var(--pc-home-hero-bg) 82%, transparent) 0%, color-mix(in oklab, var(--pc-home-hero-bg) 66%, transparent) 42%, color-mix(in oklab, var(--pc-home-hero-bg) 94%, transparent) 100%)`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(115% 78% at 50% 38%, transparent 38%, color-mix(in oklab, var(--pc-home-hero-bg) 62%, transparent) 100%)`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-40 h-[460px] w-[460px] rounded-full"
        style={{
          background: `radial-gradient(circle, color-mix(in oklab, ${P.gold} 55%, transparent) 0%, transparent 65%)`,
          filter: "blur(110px)",
          opacity: 0.28,
        }}
      />

      <div className="relative z-10 flex min-h-[100dvh] flex-col">
        <SiteHeader variant="overlay" showThemeToggle />

        {/* ================= PALCO ÚNICO ================= */}
        <main
          id="hero"
          aria-labelledby="hero-title"
          className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center gap-2.5 px-3 py-2.5 sm:gap-4 sm:px-6 sm:py-4 lg:px-8"
        >
          <div className="grid flex-1 items-center gap-4 lg:grid-cols-12 lg:gap-8">
            {/* ---------- Coluna editorial ---------- */}
            <div className="min-w-0 lg:col-span-7">
              <span
                className="inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.2em]"
                style={{
                  background: `color-mix(in oklab, ${P.gold} 12%, transparent)`,
                  borderColor: `color-mix(in oklab, ${P.gold} 40%, transparent)`,
                  color: "var(--pc-home-onhero-gold)",
                }}
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                    style={{ background: P.gold }}
                  />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: P.gold }} />
                </span>
                Economia colaborativa · Feijó/AC
              </span>

              <h1
                id="hero-title"
                className="font-editorial pc-hero-editorial mt-2 font-normal"
                style={{
                  color: "var(--pc-home-onhero-fg)",
                  fontSize: "clamp(1.75rem, 4.8vw, 3.75rem)",
                  fontVariationSettings: '"opsz" 144, "SOFT" 20',
                }}
              >
                Encontre o{" "}
                <PrecoCertoMark variant="hero">preço certo</PrecoCertoMark>{" "}
                sem sair de casa.
              </h1>

              <p
                className="tc-flow mt-2 hidden max-w-xl text-[13px] min-[360px]:block font-light leading-snug sm:text-[15px]"
                style={{ color: "var(--pc-home-onhero-fg-80)" }}
              >
                Compare os principais mercados de Feijó em tempo real e leve para casa a
                melhor compra de cada semana.
              </p>

              {/* ---------- Busca ---------- */}
              <form onSubmit={submitSearch} className="relative mt-3 max-w-2xl sm:mt-4" ref={searchBoxRef}>
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
                      setShowSuggest(true);
                      setActiveIdx(-1);
                    }}
                    onFocus={() => setShowSuggest(true)}
                    onKeyDown={(e) => {
                      if (!suggestions.length) return;
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setActiveIdx((i) => Math.min(suggestions.length - 1, i + 1));
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setActiveIdx((i) => Math.max(-1, i - 1));
                      } else if (e.key === "Enter" && activeIdx >= 0) {
                        e.preventDefault();
                        pickSuggestion(suggestions[activeIdx].name);
                      } else if (e.key === "Escape") {
                        setShowSuggest(false);
                      }
                    }}
                    type="search"
                    inputMode="search"
                    placeholder="O que você procura hoje? (ex.: Arroz, Feijão, Leite…)"
                    aria-label="Buscar produto"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={showSuggest && suggestions.length > 0}
                    aria-controls="home-suggest-list"
                    className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-[14.5px] font-medium outline-none placeholder:text-slate-400 sm:text-[15.5px]"
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

                {showSuggest && debouncedQ.length >= 2 && (suggestQ.isLoading || suggestions.length > 0) && (
                  <ul
                    id="home-suggest-list"
                    role="listbox"
                    className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 max-h-[280px] overflow-auto rounded-2xl border text-left shadow-2xl animate-fade-in"
                    style={{ background: "#ffffff", borderColor: "rgba(15,23,42,0.08)" }}
                  >
                    {suggestQ.isLoading && suggestions.length === 0 ? (
                      <li className="px-4 py-3 text-[13px] text-slate-500">Buscando…</li>
                    ) : (
                      suggestions.map((s, i) => (
                        <li key={s.slug} role="option" aria-selected={i === activeIdx}>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              pickSuggestion(s.name);
                            }}
                            onMouseEnter={() => setActiveIdx(i)}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
                            style={{
                              background:
                                i === activeIdx ? `color-mix(in oklab, ${P.gold} 12%, transparent)` : "transparent",
                              color: "#0f172a",
                            }}
                          >
                            <Search className="h-3.5 w-3.5 shrink-0" style={{ color: P.navy }} strokeWidth={2.4} />
                            <span className="flex-1 truncate text-[14px] font-semibold">{s.name}</span>
                            {s.price != null && (
                              <span
                                className={`${serif} shrink-0 tabular-nums text-[15px] font-semibold`}
                                style={{ color: "#8a6410" }}
                              >
                                {new Intl.NumberFormat("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                }).format(s.price)}
                              </span>
                            )}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </form>

              {/* ---------- Populares + CTA ---------- */}
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 sm:mt-3">
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
                    onClick={() => navigate({ to: "/buscar", search: { q: t } as any })}
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
            <aside className="min-w-0 lg:col-span-5" aria-label="Indicadores da plataforma">
              <div
                className="pc-elite-frame rounded-2xl border p-3 backdrop-blur-md sm:p-4"
                style={{
                  background: "var(--pc-home-onhero-glass)",
                  borderColor: "var(--pc-home-onhero-border)",
                }}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span
                    className="text-[11px] font-bold uppercase tracking-[0.2em]"
                    style={{ color: "var(--pc-home-onhero-gold)" }}
                  >
                    Painel ao vivo
                  </span>
                  <Link
                    to="/estabelecimentos"
                    className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors hover:brightness-125"
                    style={{ color: "var(--pc-home-onhero-fg-70)" }}
                  >
                    Mercados <ArrowRight className="h-3 w-3" strokeWidth={2.6} />
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-2" data-reading-dense>
                  {metrics.map(({ kind, value, label, short, Icon }) => (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => setSpotlight(kind)}
                      aria-label={`${value} — ${label}. Ver detalhes.`}
                      className="group flex min-w-0 flex-col items-center gap-1 rounded-xl border px-1.5 py-2 text-center pc-tile focus-visible:outline-none focus-visible:ring-2"
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
                        className="w-full truncate text-[11px] font-bold uppercase tracking-[0.12em]"
                        style={{ color: "var(--pc-home-onhero-fg-70)" }}
                      >
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

                {/* Faixa de parceiros — logos compactos */}
                <div
                  className="mt-3 hidden border-t pt-2.5 min-[360px]:block"
                  style={{ borderColor: "var(--pc-home-onhero-border-soft)" }}
                >
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <MapPin className="h-3 w-3" style={{ color: P.goldSoft }} aria-hidden />
                    <span
                      className="text-[11px] font-bold uppercase tracking-[0.18em]"
                      style={{ color: "var(--pc-home-onhero-fg-60)" }}
                    >
                      Onde comparamos
                    </span>
                  </div>
                  {/* Muro de logos: plaquetas claras (contraste garantido sobre o
                      navy) com as marcas em alta definição e recorte generoso. */}
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                    {storesQ.isLoading
                      ? Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={`sk-${i}`}
                            aria-hidden
                            className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border bg-white p-1.5 shadow-[0_2px_10px_-4px_rgba(3,10,28,0.55)]"
                            style={{ borderColor: "color-mix(in oklab, #ffffff 78%, transparent)" }}
                          >
                            <span
                              className="h-full w-full animate-pulse rounded-lg"
                              style={{ background: "color-mix(in oklab, #0b1b3a 8%, #ffffff)" }}
                            />
                          </div>
                        ))
                      : partners.map((s: any, i: number) => (
                          <Link
                            key={s?.id ?? i}
                            to="/estabelecimentos"
                            title={s?.name ?? undefined}
                            aria-label={s?.name ? `Ver ${s.name}` : "Ver mercados parceiros"}
                            className="group grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border bg-white p-1.5 shadow-[0_2px_10px_-4px_rgba(3,10,28,0.55)] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_18px_-6px_rgba(3,10,28,0.7)]"
                            style={{ borderColor: "color-mix(in oklab, #ffffff 78%, transparent)" }}
                          >
                            {s?.logoUrl ? (
                              <img
                                src={s.logoUrl}
                                alt={s?.name ?? ""}
                                width={112}
                                height={112}
                                loading="eager"
                                decoding="async"
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <span
                                className="grid h-full w-full place-items-center rounded-lg text-[15px] font-extrabold"
                                style={{
                                  background: "color-mix(in oklab, #0b1b3a 6%, #ffffff)",
                                  color: "#0b1b3a",
                                }}
                                aria-hidden
                              >
                                {(s?.name ?? "?").trim().charAt(0).toUpperCase()}
                              </span>
                            )}
                          </Link>
                        ))}


                  </div>

                </div>
              </div>
            </aside>
          </div>

          {/* Divisor editorial entre hero e faixa de categorias */}
          <hr className="pc-rule my-3 sm:my-4" aria-hidden />

          {/* ================= FAIXA INFERIOR ================= */}
          <div className="grid gap-2.5 sm:gap-3 lg:grid-cols-12">
            {/* Categorias */}
            <nav aria-label="Categorias" className="min-w-0 lg:col-span-8">
              <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
                {CATEGORIES.map(({ key, label, full, Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => navigate({ to: "/categoria/$slug", params: { slug: key } })}
                    aria-label={`Pesquisar em ${full}`}
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
                      {label}
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
            <div className="grid min-w-0 grid-cols-4 gap-2 sm:gap-2.5 lg:col-span-4">
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
                      className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                      style={{ color: "var(--pc-home-onhero-gold)" }}
                    >
                      Guia rápido
                    </p>
                    <SheetTitle
                      className="font-serif text-[clamp(18px,2.2vw,24px)] font-normal leading-tight"
                      style={{ color: "var(--pc-home-onhero-fg)" }}
                    >
                      Explorar o PreçoCerto
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col overflow-y-auto py-3">
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
          className="border-t px-4 py-2.5 sm:px-6 lg:px-8"
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
