import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProductSuggestions } from "@/lib/products-suggest.functions";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import {
  RefreshCw,
  Search,
  ArrowRight,
  TrendingDown,
  ShieldCheck,
  Package,
  LineChart,
  Users,
  Sparkles,
} from "lucide-react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { BackToTop } from "@/components/layout/BackToTop";
import { getPlatformStats, listPublicStores } from "@/lib/stores-public.functions";
import { getEconomyStat } from "@/lib/products-public.functions";
import { listPopularQueries } from "@/lib/search-popular.functions";
import { RecentProducts } from "@/components/home/RecentProducts";
import { StartFreeDialog } from "@/components/home/StartFreeDialog";
import { MetricSpotlightDialog } from "@/components/home/MetricSpotlightDialog";
import { BenefitsSection } from "@/components/home/BenefitsSection";
import { HomeAnchorNav } from "@/components/home/HomeAnchorNav";
import { MobileAccordion } from "@/components/home/MobileAccordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSession } from "@/hooks/useSession";
import homeHeroImg from "@/assets/home-hero.jpg";

/* Below-the-fold: carregados sob demanda */
const SocialProofSection = lazy(() =>
  import("@/components/home/SocialProofSection").then((m) => ({ default: m.SocialProofSection })),
);
const FinalCTASection = lazy(() =>
  import("@/components/home/FinalCTASection").then((m) => ({ default: m.FinalCTASection })),
);




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


      {/* -------- STICKY ANCHOR NAV (scroll-spy + mini busca) -------- */}
      <HomeAnchorNav
        onSearch={(query) => navigate({ to: "/buscar", search: { q: query } as any })}
      />


      {/* ============== HERO — Foto editorial + scrim navy ============== */}
      <section
        id="hero"
        aria-labelledby="hero-title"
        className="relative w-full overflow-hidden scroll-mt-24"
        style={{ background: P.navy, color: "#F5F6FA" }}
      >
        {/* Foto de fundo */}
        <img
          src={homeHeroImg}
          alt=""
          aria-hidden
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
          style={{ opacity: 0.42 }}
        />
        {/* Scrim navy vertical para leitura */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(180deg, color-mix(in oklab, ${P.navy} 78%, transparent) 0%, color-mix(in oklab, ${P.navy} 62%, transparent) 45%, color-mix(in oklab, ${P.navy} 88%, transparent) 100%)`,
          }}
        />
        {/* Vinheta lateral p/ contraste em telas largas */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden sm:block"
          style={{
            background: `radial-gradient(120% 80% at 50% 40%, transparent 40%, color-mix(in oklab, ${P.navy} 55%, transparent) 100%)`,
          }}
        />
        {/* Glow dourado */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -right-32 h-[420px] w-[420px] rounded-full"
          style={{
            background: `radial-gradient(circle, color-mix(in oklab, ${P.gold} 55%, transparent) 0%, transparent 65%)`,
            filter: "blur(90px)",
            opacity: 0.32,
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-32 h-[360px] w-[360px] rounded-full"
          style={{
            background: `radial-gradient(circle, color-mix(in oklab, ${P.gold} 30%, transparent) 0%, transparent 70%)`,
            filter: "blur(100px)",
            opacity: 0.22,
          }}
        />


        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-3 pb-4 sm:px-6 sm:pt-5 sm:pb-6 lg:px-8 lg:pt-6 lg:pb-7">
          <div className="mx-auto max-w-4xl text-center">
            {/* Badges */}
            <div className="mb-2.5 flex flex-wrap items-center justify-center gap-2 sm:mb-3">
              <span
                className="inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em]"
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
                  className="hidden items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tabular-nums tracking-[0.2em] sm:inline-flex"
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
                fontSize: "clamp(1.5rem, 3.6vw, 2.75rem)",
              }}
            >
              Encontre o{" "}
              <span className="italic" style={{ color: "#F5C86A" }}>preço certo</span>{" "}
              sem sair de casa.
            </h1>

            <p
              className="mx-auto mt-2 max-w-2xl text-[12.5px] font-light leading-snug sm:text-[14px]"
              style={{ color: "rgba(255,255,255,0.72)" }}
            >
              Compare os principais mercados de Feijó e economize em cada compra.
            </p>


            {/* Search bar branca — herói da página */}
            <form
              onSubmit={submitSearch}
              className="relative mx-auto mt-3 max-w-2xl sm:mt-4"
              ref={searchBoxRef}
            >
              <div
                className="flex items-center gap-1 rounded-2xl p-1 shadow-2xl transition-all focus-within:ring-2 sm:p-1.5"
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
                  className="flex-1 bg-transparent px-2 py-2.5 text-[14.5px] font-medium outline-none placeholder:text-slate-400 sm:text-[15.5px]"
                  style={{ color: "#0f172a" }}
                />
                <button
                  type="submit"
                  aria-label="Buscar preço"
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-[13.5px] font-bold uppercase tracking-wide transition-all hover:brightness-95 active:scale-95 sm:px-6 sm:py-2.5 sm:text-[14px]"
                  style={{ background: P.gold, color: P.navy }}
                >
                  <span className="hidden sm:inline">Buscar</span>
                  <ArrowRight className="h-4.5 w-4.5 sm:hidden" strokeWidth={2.5} />
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

            {/* Chips compactos — populares + navegação consolidada */}
            <div className="mx-auto mt-3 flex max-w-3xl flex-wrap items-center justify-center gap-1.5 sm:mt-3.5">
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
                  className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium capitalize transition-all hover:-translate-y-px"
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
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors hover:brightness-110"
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

              <span aria-hidden className="mx-1 h-3 w-px" style={{ background: "rgba(255,255,255,0.14)" }} />

              {/* Nav chips consolidados (mesmo estilo dos populares, destaque dourado) */}
              {[
                { to: "/estabelecimentos", label: "Mercados" },
                { to: "/melhores-precos", label: "Ranking" },
                { to: "/colaborar", label: "Colaborar" },
                { to: "/planos", label: "Planos Plus" },
                { to: "/resgatar", label: "Resgatar código" },
              ].map((c) => (
                <Link
                  key={c.to}
                  to={c.to}
                  className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold transition-all hover:-translate-y-px"
                  style={{
                    background: "color-mix(in oklab, var(--pc-home-gold) 10%, transparent)",
                    borderColor: "color-mix(in oklab, var(--pc-home-gold) 32%, transparent)",
                    color: "#F5C86A",
                  }}
                >
                  {c.label}
                </Link>
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

          {/* ============ METRICS ROW (border-y sobre o navy) ============ */}
          <TooltipProvider delayDuration={150}>
            <div
              className="mx-auto mt-4 grid max-w-5xl grid-cols-3 gap-2 border-y py-2.5 sm:mt-5 sm:gap-8 sm:py-3.5"
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
                          fontSize: "clamp(1.25rem, 3vw, 2rem)",
                          lineHeight: 1,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {s.k}
                      </div>
                      <div
                        className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.16em] sm:text-[10px] sm:tracking-[0.2em]"
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


      {/* ============== MERCADOS PARCEIROS — faixa de logos ============== */}
      <section id="parceiros" className="scroll-mt-24">
        <PartnersStrip />
      </section>


      {/* ============== BENEFÍCIOS (accordion no mobile) ============== */}
      <section id="beneficios" className="scroll-mt-24">
        <MobileAccordion eyebrow="Benefícios" title="Por que usar o PreçoCerto" defaultOpen={false}>
          <BenefitsSection />
        </MobileAccordion>
      </section>


      {/* ============== 3 PILARES (cards) ============== */}
      <section id="pilares" className="pc-container pt-3 scroll-mt-24 sm:pt-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
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
      <section id="recentes" className="pt-3 scroll-mt-24 sm:pt-4">
        <RecentProducts P={P} serif={serif} />
      </section>


      {/* ============== PROVA SOCIAL (accordion no mobile, lazy) ============== */}
      <section id="prova-social" className="scroll-mt-24">
        <MobileAccordion eyebrow="Prova social" title="Depoimentos da comunidade" defaultOpen={false}>
          <Suspense fallback={<div className="pc-container pt-3" aria-hidden><div className="h-24 rounded-lg" style={{ background: "color-mix(in oklab, var(--pc-home-line) 40%, transparent)" }} /></div>}>
            <SocialProofSection />
          </Suspense>
        </MobileAccordion>
      </section>


      {/* ============== CTA FINAL (lazy) ============== */}
      <Suspense fallback={null}>
        <FinalCTASection />
      </Suspense>


      <BackToTop />
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
        className="group block overflow-hidden rounded-2xl p-4 transition-all hover:-translate-y-1 hover:shadow-2xl sm:p-5"
        style={{
          background: `linear-gradient(135deg, var(--pc-home-gold) 0%, color-mix(in oklab, var(--pc-home-gold) 82%, black) 100%)`,
          color: "var(--pc-home-navy)",
        }}
      >
        <div
          className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ background: "color-mix(in oklab, var(--pc-home-navy) 12%, transparent)" }}
        >
          {icon}
        </div>
        <h3 className={`${serif} mb-1.5 text-[18px] leading-tight sm:text-[20px]`}>{title}</h3>
        <p className="text-[12.5px] font-medium leading-snug opacity-80">{desc}</p>
        <div className="mt-3 inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.18em] opacity-90 transition-opacity group-hover:opacity-100">
          {cta}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2.6} />
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={to}
      className="group block overflow-hidden rounded-2xl border p-4 transition-all hover:-translate-y-1 sm:p-5"
      style={{
        background: "var(--pc-home-card)",
        borderColor: "var(--pc-home-line)",
      }}
    >
      <div
        className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg"
        style={{
          background: "color-mix(in oklab, var(--pc-home-gold) 14%, transparent)",
          color: "var(--pc-home-gold)",
          border: "1px solid color-mix(in oklab, var(--pc-home-gold) 32%, transparent)",
        }}
      >
        {icon}
      </div>
      <h3
        className={`${serif} mb-1.5 text-[18px] leading-tight sm:text-[20px]`}
        style={{ color: "var(--pc-home-heading)" }}
      >
        {title}
      </h3>
      <p className="text-[12.5px] font-medium leading-snug" style={{ color: "var(--pc-text-body)" }}>
        {desc}
      </p>
      <div
        className="mt-3 inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.18em] transition-colors group-hover:text-[color:var(--pc-home-gold)]"
        style={{ color: "var(--pc-home-heading)" }}
      >
        {cta}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2.6} />
      </div>
    </Link>
  );
}


/* -------- PartnersStrip — faixa de logos de mercados parceiros -------- */
function PartnersStrip() {
  const fetchStores = useServerFn(listPublicStores);
  const storesQ = useQuery({
    queryKey: ["home-partner-stores"],
    queryFn: () => fetchStores({} as any),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  const stores = (storesQ.data ?? []).filter((s: any) => s?.name).slice(0, 12);

  if (!stores.length) return null;

  return (
    <section className="pc-container pt-3 sm:pt-4">
      <div
        className="rounded-[var(--pc-radius-md)] border px-4 py-4 sm:px-5 sm:py-5"
        style={{ background: P.card, borderColor: P.line }}
      >
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.2em]"
              style={{ color: P.gold }}
            >
              Onde comparamos
            </p>
            <h2
              className={`${serif} mt-1 leading-tight`}
              style={{
                color: P.heading,
                fontSize: "clamp(1.35rem, 2.4vw, 1.75rem)",
                letterSpacing: "-0.01em",
              }}
            >
              Mercados parceiros de Feijó
            </h2>
          </div>
          <Link
            to="/estabelecimentos"
            className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.14em] transition-colors hover:brightness-110"
            style={{ color: P.gold }}
          >
            Ver todos
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.6} />
          </Link>
        </div>

        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-6">
          {stores.map((s: any) => (
            <li key={s.id}>
              <Link
                to="/estabelecimentos"
                className="group flex h-14 items-center justify-center rounded-xl border px-3 transition-all hover:-translate-y-0.5 hover:shadow-sm sm:h-16"
                style={{ background: P.paper, borderColor: P.line }}
                title={s.name}
              >
                {s.logoUrl || s.logo_url ? (
                  <img
                    src={s.logoUrl ?? s.logo_url}
                    alt={s.name}
                    loading="lazy"
                    decoding="async"
                    className="max-h-10 max-w-full object-contain opacity-85 grayscale transition-all group-hover:opacity-100 group-hover:grayscale-0 sm:max-h-12"
                  />
                ) : (
                  <span
                    className="truncate text-center text-[11px] font-bold uppercase tracking-[0.14em]"
                    style={{ color: P.heading }}
                  >
                    {s.name}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

