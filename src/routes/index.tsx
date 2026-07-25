import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProductSuggestions } from "@/lib/products-suggest.functions";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import {
  ChevronRight,
  RefreshCw,
  Search,
  ArrowRight,
  TrendingDown,
  ShieldCheck,
  Package,
  Ticket,
  LineChart,
  Users,
  Sparkles,
} from "lucide-react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { getPlatformStats, listPublicStores } from "@/lib/stores-public.functions";
import { getEconomyStat } from "@/lib/products-public.functions";
import { listPopularQueries } from "@/lib/search-popular.functions";
import { RecentProducts } from "@/components/home/RecentProducts";
import { StartFreeDialog } from "@/components/home/StartFreeDialog";
import { MetricSpotlightDialog } from "@/components/home/MetricSpotlightDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSession } from "@/hooks/useSession";
import homeHeroImg from "@/assets/home-hero.jpg";



export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    void Promise.allSettled([
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
          "Compare mercados de Feijó/AC. Economize a cada compra com dados atualizados pela comunidade.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});


/* ------- Tokens ------- */
const P = {
  paper: "var(--pc-home-paper)",
  ink: "var(--pc-home-ink)",
  card: "var(--pc-home-card)",
  navy: "var(--pc-home-navy)",
  gold: "var(--pc-home-gold)",
  goldSoft: "var(--pc-home-gold-soft)",
  line: "var(--pc-home-line)",
  heading: "var(--pc-home-heading)",
  onNavy: "var(--pc-home-on-navy)",
};
const serif = "font-['Instrument_Serif',ui-serif,Georgia,serif]";

function useDebounced<T>(value: T, delay: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}


function HomePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: sessionLoading } = useSession();
  const isLoggedOut = !sessionLoading && !user;
  const [q, setQ] = useState("");
  const [today, setToday] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [spotlight, setSpotlight] = useState<import("@/components/home/MetricSpotlightDialog").MetricKind | null>(null);
  const searchBoxRef = useRef<HTMLFormElement | null>(null);


  useEffect(() => {
    setToday(
      new Date().toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      }),
    );
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
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });
  const POPULAR_FALLBACK = ["arroz", "feijão", "leite", "óleo", "café", "açúcar"];
  const popularAll: string[] = useMemo(() => {
    const real = (popularQ.data ?? []).map((p: any) => String(p?.query ?? "")).filter(Boolean);
    return real.length >= 3 ? real : POPULAR_FALLBACK;
  }, [popularQ.data]);
  const [popularPage, setPopularPage] = useState(0);
  const POPULAR_PAGE_SIZE = 6;
  const popularPageCount = Math.max(1, Math.ceil(popularAll.length / POPULAR_PAGE_SIZE));
  const currentPopular = useMemo(() => {
    const start = (popularPage % popularPageCount) * POPULAR_PAGE_SIZE;
    return popularAll.slice(start, start + POPULAR_PAGE_SIZE);
  }, [popularAll, popularPage, popularPageCount]);


  const suggestFn = useServerFn(getProductSuggestions);
  const debouncedQ = useDebounced(q.trim(), 180);
  const suggestQ = useQuery({
    queryKey: ["home", "suggest", debouncedQ],
    queryFn: () => suggestFn({ data: { q: debouncedQ, limit: 5 } }),
    enabled: debouncedQ.length >= 2,
    staleTime: 30_000,
  });
  const suggestions = suggestQ.data ?? [];

  const { pull, refreshing, progress } = usePullToRefresh({
    onRefresh: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["home-stats"] }),
        queryClient.invalidateQueries({ queryKey: ["home-economy"] }),
        queryClient.invalidateQueries({ queryKey: ["home", "recent-products", 6] }),
      ]);
    },
  });

  useEffect(() => {
    if (!showSuggest) return;
    const onDoc = (e: MouseEvent) => {
      if (!searchBoxRef.current) return;
      if (!searchBoxRef.current.contains(e.target as Node)) setShowSuggest(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [showSuggest]);

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


  return (
    <div
      className="w-full antialiased pc-home"
      style={{
        background: P.paper,
        color: P.ink,
        fontFamily: "'Work Sans', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* -------- Pull-to-refresh (mobile) -------- */}
      <div
        aria-hidden={!pull && !refreshing}
        className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center sm:hidden"
        style={{
          transform: `translateY(${Math.max(0, pull - 24)}px)`,
          opacity: pull > 8 || refreshing ? 1 : 0,
          transition: refreshing ? "transform 200ms ease" : pull === 0 ? "transform 240ms ease, opacity 240ms ease" : "none",
        }}
      >
        <div
          className="mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] shadow-lg"
          style={{ background: P.card, color: P.heading, border: `1px solid ${P.line}` }}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${refreshing ? "ptr-spin" : ""}`}
            style={{
              color: P.gold,
              transform: refreshing ? undefined : `rotate(${progress * 270}deg)`,
              transition: refreshing ? undefined : "transform 60ms linear",
            }}
          />
          {refreshing ? "Atualizando" : progress >= 1 ? "Solte para atualizar" : "Puxe para atualizar"}
        </div>
      </div>

      <SiteHeader variant="solid" showThemeToggle />


      {/* -------- MOBILE QUICK-NAV -------- */}
      <nav
        aria-label="Atalhos rápidos"
        className="sticky top-[56px] z-30 border-b sm:hidden"
        style={{
          background: `color-mix(in oklab, ${P.paper} 92%, transparent)`,
          borderColor: P.line,
          backdropFilter: "saturate(140%) blur(8px)",
          WebkitBackdropFilter: "saturate(140%) blur(8px)",
        }}
      >
        <div className="mx-auto w-full max-w-6xl px-3 sm:px-6 lg:px-8">
          <div className="relative">
            <div className="chips-scroller flex gap-2.5 overflow-x-auto py-2.5 pr-8 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {[
                { to: "/melhores-precos", label: "Ranking" },
                { to: "/estabelecimentos", label: "Mercados" },
                { to: "/buscar", label: "Buscar" },
                { to: "/planos", label: "Alertas" },
                { to: "/cesta-basica", label: "Cesta básica" },
                { to: "/economia", label: "Economia" },
              ].map((c) => (
                <Link
                  key={c.to}
                  to={c.to}
                  className="inline-flex shrink-0 items-center rounded-full border px-4 py-2 text-[14px] font-semibold leading-none tracking-[-0.005em] shadow-sm transition-all active:scale-[0.97] hover:border-[color:var(--pc-home-gold)]"
                  style={{ borderColor: P.line, background: P.card, color: P.heading }}
                  activeProps={{
                    style: { background: P.heading, color: P.paper, borderColor: P.heading },
                  }}
                >
                  {c.label}
                </Link>
              ))}
            </div>
            <div
              aria-hidden
              className="chips-hint pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 grid h-6 w-6 place-items-center rounded-full"
              style={{ background: `color-mix(in oklab, ${P.gold} 18%, transparent)`, color: P.gold }}
            >
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.6} />
            </div>
          </div>
        </div>
      </nav>


      {/* ============== HERO — SaaS premium (navy solid, search central) ============== */}
      <section
        aria-labelledby="hero-title"
        className="relative w-full overflow-hidden"
        style={{ background: P.navy, color: "#F5F6FA" }}
      >
        {/* Fundo: mesh gold discreto + grid tênue — cara de dashboard, sem foto stock */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -right-32 h-[520px] w-[520px] rounded-full"
          style={{
            background: `radial-gradient(circle, color-mix(in oklab, ${P.gold} 55%, transparent) 0%, transparent 65%)`,
            filter: "blur(90px)",
            opacity: 0.35,
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-32 h-[420px] w-[420px] rounded-full"
          style={{
            background: `radial-gradient(circle, color-mix(in oklab, ${P.gold} 30%, transparent) 0%, transparent 70%)`,
            filter: "blur(100px)",
            opacity: 0.25,
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(circle at 50% 40%, black 30%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(circle at 50% 40%, black 30%, transparent 75%)",
          }}
        />

        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-8 pb-10 sm:px-6 sm:pt-12 sm:pb-14 lg:px-8 lg:pt-16 lg:pb-16">
          <div className="mx-auto max-w-4xl text-center">
            {/* Badges */}
            <div className="mb-4 flex flex-wrap items-center justify-center gap-2 sm:mb-5">
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.2em]"
                style={{
                  background: `color-mix(in oklab, ${P.gold} 12%, transparent)`,
                  borderColor: `color-mix(in oklab, ${P.gold} 40%, transparent)`,
                  color: "#F5C86A",
                }}
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: P.gold }} />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: P.gold }} />
                </span>
                Economia colaborativa · Feijó/AC
              </span>
              {today && (
                <span
                  className="hidden items-center gap-1.5 rounded-full px-3 py-1 text-[10.5px] font-bold uppercase tabular-nums tracking-[0.2em] sm:inline-flex"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    color: "#F5C86A",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  <span aria-hidden className="inline-block h-1 w-1 rounded-full" style={{ background: P.gold }} />
                  {today}
                </span>
              )}
            </div>

            {/* H1 */}
            <h1
              id="hero-title"
              className={`${serif} font-normal leading-[1.02] tracking-[-0.01em]`}
              style={{
                color: "#F8FAFC",
                fontSize: "clamp(2.25rem, 5.4vw, 4.5rem)",
              }}
            >
              Encontre o{" "}
              <span className="italic" style={{ color: "#F5C86A" }}>preço certo</span>
              <br className="hidden sm:block" />
              <span className="sm:hidden"> </span>
              sem sair de casa.
            </h1>

            <p
              className="mx-auto mt-4 max-w-2xl text-[15px] font-light leading-relaxed sm:text-[17px]"
              style={{ color: "rgba(255,255,255,0.72)" }}
            >
              Compare preços entre os principais mercados de Feijó e economize em cada compra
              com dados atualizados pela comunidade.
            </p>

            {/* Search bar branca — herói da página */}
            <form
              onSubmit={submitSearch}
              className="relative mx-auto mt-7 max-w-2xl sm:mt-9"
              ref={searchBoxRef}
            >
              <div
                className="flex items-center gap-1 rounded-2xl p-1.5 shadow-2xl transition-all focus-within:ring-2 sm:p-2"
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
                  aria-autocomplete="list"
                  aria-expanded={showSuggest && suggestions.length > 0}
                  aria-controls="home-suggest-list"
                  className="flex-1 bg-transparent px-2 py-3 text-[15px] font-medium outline-none placeholder:text-slate-400 sm:text-[16px]"
                  style={{ color: "#0f172a" }}
                />
                <button
                  type="submit"
                  aria-label="Buscar preço"
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-[14px] font-bold uppercase tracking-wide transition-all hover:brightness-95 active:scale-95 sm:px-7 sm:py-3 sm:text-[14.5px]"
                  style={{ background: P.gold, color: P.navy }}
                >
                  <span className="hidden sm:inline">Buscar</span>
                  <ArrowRight className="h-5 w-5 sm:hidden" strokeWidth={2.5} />
                  <ArrowRight className="hidden h-4 w-4 sm:inline" strokeWidth={2.5} />
                </button>
              </div>

              {/* Popup sugestões */}
              {showSuggest && debouncedQ.length >= 2 && (suggestQ.isLoading || suggestions.length > 0) && (
                <ul
                  id="home-suggest-list"
                  role="listbox"
                  className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 max-h-[320px] overflow-auto rounded-2xl border text-left shadow-2xl animate-fade-in"
                  style={{ background: "#ffffff", borderColor: "rgba(15,23,42,0.08)" }}
                >
                  {suggestQ.isLoading && suggestions.length === 0 ? (
                    <li className="px-4 py-3 text-[13px] text-slate-500">Buscando…</li>
                  ) : (
                    suggestions.map((s, i) => (
                      <li key={s.slug} role="option" aria-selected={i === activeIdx}>
                        <button
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); pickSuggestion(s.name); }}
                          onMouseEnter={() => setActiveIdx(i)}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
                          style={{
                            background: i === activeIdx ? `color-mix(in oklab, ${P.gold} 12%, transparent)` : "transparent",
                            color: "#0f172a",
                          }}
                        >
                          <Search className="h-3.5 w-3.5 shrink-0" style={{ color: P.goldSoft }} strokeWidth={2.4} />
                          <span className="flex-1 truncate text-[14px] font-semibold">{s.name}</span>
                          {s.price != null && (
                            <span
                              className={`${serif} shrink-0 tabular-nums text-[15px] font-semibold`}
                              style={{ color: "#8a6410", letterSpacing: "-0.01em" }}
                            >
                              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(s.price)}
                            </span>
                          )}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </form>

            {/* Chips populares */}
            <div className="mx-auto mt-4 flex max-w-2xl flex-wrap items-center justify-center gap-1.5 sm:gap-2">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.2em]"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                Populares:
              </span>
              {currentPopular.slice(0, 5).map((t) => (
                <button
                  key={t}
                  onClick={() => navigate({ to: "/buscar", search: { q: t } as any })}
                  className="inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-medium capitalize transition-all hover:-translate-y-px"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    borderColor: "rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.85)",
                  }}
                >
                  {t}
                </button>
              ))}
              {popularPageCount > 1 && (
                <button
                  type="button"
                  onClick={() => setPopularPage((p) => (p + 1) % popularPageCount)}
                  className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em] transition-colors hover:brightness-110"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    borderColor: "rgba(255,255,255,0.12)",
                    color: "#F5C86A",
                  }}
                  aria-label="Mais buscas populares"
                >
                  Mais
                </button>
              )}
            </div>

            {/* CTAs — secundários abaixo do search */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:mt-8">
              {isLoggedOut ? (
                <StartFreeDialog>
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    className="group inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-[13.5px] font-semibold transition-all hover:-translate-y-px"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      borderColor: "rgba(255,255,255,0.16)",
                      color: "#ffffff",
                    }}
                  >
                    Começar grátis
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.4} />
                  </button>
                </StartFreeDialog>
              ) : (
                <Link
                  to="/app"
                  className="group inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-[13.5px] font-semibold transition-all hover:-translate-y-px"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    borderColor: "rgba(255,255,255,0.16)",
                    color: "#ffffff",
                  }}
                >
                  Ir para o painel
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.4} />
                </Link>
              )}
              <Link
                to="/melhores-precos"
                className="inline-flex items-center gap-2 text-[13px] font-semibold transition-colors hover:brightness-125"
                style={{ color: "#F5C86A" }}
              >
                <TrendingDown className="h-4 w-4" />
                Ver rankings do dia
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.4} />
              </Link>
            </div>
          </div>

          {/* ============ METRICS ROW (border-y sobre o navy) ============ */}
          <TooltipProvider delayDuration={150}>
            <div
              className="mx-auto mt-12 grid max-w-5xl grid-cols-3 gap-2 border-y py-6 sm:mt-16 sm:gap-8 sm:py-9"
              style={{ borderColor: "rgba(255,255,255,0.08)" }}
            >
              {[
                {
                  kind: "markets" as const,
                  k: String(stats.establishments ?? 8),
                  l: "Mercados parceiros",
                  icon: <ShieldCheck className="h-4 w-4" />,
                  tip: "Ver a lista completa de mercados parceiros e suas atualizações.",
                },
                {
                  kind: "products" as const,
                  k: stats.products != null ? stats.products.toLocaleString("pt-BR") : "1.500",
                  l: "Produtos mapeados",
                  icon: <Package className="h-4 w-4" />,
                  tip: "Ver categorias e últimas atualizações do catálogo.",
                },
                {
                  kind: "savings" as const,
                  k: economy?.avgSavingsPct ? `${economy.avgSavingsPct}%` : "38%",
                  l: "Economia média",
                  icon: <TrendingDown className="h-4 w-4" />,
                  tip: "Ver as maiores economias identificadas agora.",
                },
              ].map((s, i, arr) => (
                <Tooltip key={s.l}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setSpotlight(s.kind)}
                      aria-label={`${s.k} — ${s.l}. Ver detalhes.`}
                      className={`group flex flex-col items-center gap-1.5 rounded-xl px-2 py-2 text-center transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pc-home-gold)] ${
                        i > 0 ? "border-l border-white/[0.06] sm:border-l" : ""
                      }`}
                    >
                      <div
                        className={`${serif} tabular-nums`}
                        style={{
                          color: "#F5C86A",
                          fontSize: "clamp(1.5rem, 3.8vw, 2.5rem)",
                          lineHeight: 1,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {s.k}
                      </div>
                      <div
                        className="flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-[0.18em] sm:text-[10.5px] sm:tracking-[0.22em]"
                        style={{ color: "rgba(255,255,255,0.6)" }}
                      >
                        <span className="hidden sm:inline-flex" aria-hidden style={{ color: P.goldSoft }}>
                          {s.icon}
                        </span>
                        <span className="truncate">{s.l}</span>
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[240px] text-[12px] leading-snug">
                    {s.tip}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        </div>
      </section>


      {/* ============== 3 PILARES (cards) ============== */}
      <section className="pc-container pt-8 sm:pt-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
          <PillarCard
            to="/melhores-precos"
            icon={<LineChart className="h-5 w-5" strokeWidth={2} />}
            title="Histórico de preços"
            desc="Veja a variação nos últimos meses e saiba quando é o melhor momento para comprar."
            cta="Ver ranking"
          />
          <PillarCard
            to="/colaborar"
            icon={<Users className="h-5 w-5" strokeWidth={2} />}
            title="Comunidade ativa"
            desc="Contribua enviando fotos de encartes e notas fiscais para ajudar outros moradores."
            cta="Colaborar"
          />
          <PillarCard
            to="/planos"
            icon={<Sparkles className="h-5 w-5" strokeWidth={2} />}
            title="PreçoCerto Plus"
            desc="Alertas em tempo real de promoções exclusivas e listas inteligentes de compra."
            cta="Ver planos"
            emphasis
          />
        </div>
      </section>


      {/* ============== RECENTES ============== */}
      <div className="pt-8 sm:pt-10">
        <RecentProducts P={P} serif={serif} />
      </div>


      {/* ============== CTA — Resgatar código ============== */}
      <section className="pc-container pt-8 sm:pt-10">
        <div
          className="relative overflow-hidden rounded-[var(--pc-radius-md)] p-[1.5px]"
          style={{
            background: `linear-gradient(120deg, ${P.gold} 0%, color-mix(in oklab, ${P.gold} 35%, transparent) 55%, color-mix(in oklab, ${P.gold} 70%, transparent) 100%)`,
            boxShadow: "var(--pc-shadow-3)",
          }}
        >
          <div
            className="relative overflow-hidden rounded-[calc(var(--pc-radius-md)-2px)] px-4 py-3.5 sm:px-5 sm:py-4"
            style={{
              background: `linear-gradient(115deg, ${P.navy} 0%, color-mix(in oklab, ${P.navy} 82%, black) 100%)`,
              color: "#F5F6FA",
            }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.06]"
              style={{ backgroundImage: `repeating-linear-gradient(-45deg, ${P.gold} 0 1px, transparent 1px 14px)` }}
            />

            <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex items-center gap-3 sm:flex-1">
                <span
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: "color-mix(in oklab, #F5C86A 22%, transparent)",
                    color: P.gold,
                    border: "1px solid color-mix(in oklab, #F5C86A 45%, transparent)",
                  }}
                  aria-hidden
                >
                  <Ticket className="h-5 w-5" strokeWidth={2.2} />
                </span>

                <div className="min-w-0 flex-1">
                  <p
                    className="text-[10.5px] font-bold uppercase tracking-[0.2em]"
                    style={{ color: "color-mix(in oklab, #F5C86A 88%, white)" }}
                  >
                    Já tem um código?
                  </p>
                  <p
                    className="mt-0.5 font-bold leading-tight text-white"
                    style={{ fontSize: "clamp(0.95rem, 1.4vw, 1.05rem)", letterSpacing: "-0.01em" }}
                  >
                    Ative sua licença em 30 segundos.
                  </p>
                </div>
              </div>

              <Link
                to="/resgatar"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13.5px] font-bold shadow-sm transition-all hover:scale-[1.02] hover:shadow-md active:scale-[0.98] sm:w-auto sm:shrink-0 sm:px-5"
                style={{ background: P.gold, color: P.navy }}
              >
                Resgatar código
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.6} />
              </Link>
            </div>
          </div>
        </div>
      </section>


      <MetricSpotlightDialog
        open={spotlight !== null}
        onOpenChange={(v) => { if (!v) setSpotlight(null); }}
        kind={spotlight}
      />
      <SiteFooter />
    </div>
  );
}


/* -------- PillarCard -------- */
function PillarCard({
  to,
  icon,
  title,
  desc,
  cta,
  emphasis,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  cta: string;
  emphasis?: boolean;
}) {
  if (emphasis) {
    return (
      <Link
        to={to}
        className="group block overflow-hidden rounded-3xl p-6 transition-all hover:-translate-y-1 hover:shadow-2xl sm:p-7"
        style={{
          background: `linear-gradient(135deg, var(--pc-home-gold) 0%, color-mix(in oklab, var(--pc-home-gold) 82%, black) 100%)`,
          color: "var(--pc-home-navy)",
        }}
      >
        <div
          className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl"
          style={{ background: "color-mix(in oklab, var(--pc-home-navy) 12%, transparent)" }}
        >
          {icon}
        </div>
        <h3 className={`${serif} mb-2 text-[22px] leading-tight sm:text-[24px]`}>{title}</h3>
        <p className="text-[13.5px] font-medium leading-relaxed opacity-80">{desc}</p>
        <div className="mt-5 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] opacity-90 transition-opacity group-hover:opacity-100">
          {cta}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2.6} />
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={to}
      className="group block overflow-hidden rounded-3xl border p-6 transition-all hover:-translate-y-1 sm:p-7"
      style={{
        background: "var(--pc-home-card)",
        borderColor: "var(--pc-home-line)",
      }}
    >
      <div
        className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl"
        style={{
          background: "color-mix(in oklab, var(--pc-home-gold) 14%, transparent)",
          color: "var(--pc-home-gold)",
          border: "1px solid color-mix(in oklab, var(--pc-home-gold) 32%, transparent)",
        }}
      >
        {icon}
      </div>
      <h3
        className={`${serif} mb-2 text-[22px] leading-tight sm:text-[24px]`}
        style={{ color: "var(--pc-home-heading)" }}
      >
        {title}
      </h3>
      <p className="text-[13.5px] font-medium leading-relaxed" style={{ color: "var(--pc-text-body)" }}>
        {desc}
      </p>
      <div
        className="mt-5 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] transition-colors group-hover:text-[color:var(--pc-home-gold)]"
        style={{ color: "var(--pc-home-heading)" }}
      >
        {cta}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2.6} />
      </div>
    </Link>
  );
}
