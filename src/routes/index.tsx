import { createFileRoute, Link, useNavigate, useLoaderData } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/button";

import { buildLivePanel, type LivePanelMetric, type LivePanelKind } from "@/lib/live-panel";
import { getPlatformStats } from "@/lib/stores-public.functions";
import { getEconomyStat } from "@/lib/products-public.functions";
import { listTrendingSearches } from "@/lib/search-trends.functions";
import { useSearchTrendsRealtime } from "@/hooks/useSearchTrendsRealtime";
import { trackEvent } from "@/lib/analytics-events";
import { getStoredRegionKey } from "@/lib/search-region";
import { GuestGateDialog } from "@/components/gate/GuestGateDialog";
import {
  HomeSearchSuggestions,
  type HomeSearchSuggestionsHandle,
} from "@/components/home/HomeSearchSuggestions";
import {
  consumeGuest,
} from "@/lib/guest-quota";
import { MetricSpotlightDialog } from "@/components/home/MetricSpotlightDialog";
import { AllCategoriesDialog } from "@/components/home/AllCategoriesDialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";
import { normalizeSearchText } from "@/lib/text-normalize";
import homeHeroImg from "@/assets/home-hero.jpg";

const importExplorePanel = () => import("@/components/home/ExplorePanel");
const ExplorePanel = lazy(() =>
  importExplorePanel().then((m) => ({ default: m.ExplorePanel })),
);
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

const P = { gold: "var(--pc-home-gold)" };
const TILE = "group flex h-14 w-full min-w-0 items-center gap-3.5 rounded-2xl border border-border/50 bg-card/50 pl-4 pr-5 text-left transition-all duration-500 ease-out hover:bg-card hover:border-primary/40 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20";
const TILE_ICONWRAP = "grid shrink-0 place-items-center rounded-xl h-10 w-10 bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors";
const TILE_ICON = "h-5 w-5";
const TILE_LABEL = "min-w-0 flex-1 truncate text-[15px] font-bold tracking-tight text-foreground/80 group-hover:text-foreground";
const EYEBROW = "text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60";

const HOME_HUBS: CategorySlug[] = ["supermercados", "acougues", "hortifruti", "padarias", "bebidas", "limpeza", "higiene", "farmacias", "pet"];
const CATEGORIES = HOME_HUBS.map((slug) => {
  const def = categoryBySlug(slug)!;
  return { key: def.slug, label: def.short, full: def.label, coverage: hubCoverageLabel(def.slug), Icon: categoryIcon(def.slug) };
});

function HomePage() {
  const catLabel = useCategoryLabelWithFallback();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: sessionLoading } = useSession();
  const isLoggedOut = !sessionLoading && !user;
  const [q, setQ] = useState("");
  const [spotlight, setSpotlight] = useState<any | null>(null);
  const [allCatsOpen, setAllCatsOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [pendingTerm, setPendingTerm] = useState<string | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const suggestRef = useRef<HomeSearchSuggestionsHandle | null>(null);
  const searchAnchorRef = useRef<HTMLDivElement | null>(null);

  const trendingFn = useServerFn(listTrendingSearches);
  const popularQ = useQuery({ queryKey: ["home-trending-searches"], queryFn: () => trendingFn({ data: { limit: 24 } } as any), staleTime: 15_000 });
  useSearchTrendsRealtime(["home-trending-searches"]);

  const trendRows = useMemo(() => (popularQ.data ?? []).map((p: any) => ({ query: String(p?.query ?? "").trim(), count: Number(p?.count ?? 0), dayCount: Number(p?.dayCount ?? 0), hot: Boolean(p?.hot) })).filter((p: { query: string }) => p.query.length >= 2), [popularQ.data]);
  const popularAll: string[] = useMemo(() => {
    const real = trendRows.map((p: { query: string }) => p.query);
    return real.length >= 3 ? real : ["arroz", "feijão", "leite", "óleo", "café", "açúcar"];
  }, [trendRows]);
  const heroPopular = useMemo(() => popularAll.slice(0, 4), [popularAll]);
  const trendingPopular = useMemo(() => {
    const rest = popularAll.slice(4);
    return (rest.length >= 4 ? rest : popularAll).slice(0, 10);
  }, [popularAll]);

  const { stats, economy } = useLoaderData({ from: "/" }) as { stats: any; economy: any; };
  const livePanel = buildLivePanel({ stats, economy, statsLoading: false, economyLoading: false, statsError: stats == null, economyError: economy == null });
  const metrics = livePanel.metrics.map((m: LivePanelMetric) => ({ ...m, Icon: { markets: ShieldCheck, products: Package, savings: TrendingDown }[m.kind], trend: { markets: "+2 novos", products: "Hoje", savings: "↑ 2.4% var." }[m.kind], sublabel: { markets: "Mercados locais com preços auditados em Feijó.", products: "Cesta básica e limpeza monitorados diariamente.", savings: "Diferença média entre o maior e o menor preço hoje." }[m.kind] }));

  const submitSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const query = q.trim();
    if (!query) return;
    if (isLoggedOut && consumeGuest("search", query).blocked) { setGateOpen(true); return; }
    trackEvent("search_query", { q: query.toLowerCase().slice(0, 60), region: getStoredRegionKey() });
    navigate({ to: "/buscar", search: { q: query } as any });
  };
  const goToPopular = (term: string) => {
    const query = term.trim();
    if (!query || pendingTerm) return;
    setPendingTerm(query); setQ(query); setSuggestOpen(false);
    if (isLoggedOut && consumeGuest("search", query).blocked) { setPendingTerm(null); setGateOpen(true); return; }
    trackEvent("search_query", { q: query.toLowerCase().slice(0, 60), from: "alta", region: getStoredRegionKey() });
    void navigate({ to: "/buscar", search: { q: query, from: "alta" } as any }).finally(() => setPendingTerm(null));
  };

  return (
    <div className="pc-home relative flex min-h-screen w-full flex-col overflow-x-hidden scroll-smooth contain-layout bg-background text-foreground font-sans">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <img src={homeHeroImg} alt="" loading="eager" fetchPriority="high" className="h-full w-full object-cover object-center scale-[1.04] blur-[2px] saturate-[1.1]" style={{ opacity: 0.55 }} />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 20% 30%, rgba(3, 7, 18, 0.6) 0%, rgba(3, 7, 18, 0.85) 100%)" }} />
      
      <div className="relative z-10 flex min-h-screen flex-col">
        <SiteHeader variant="overlay" showThemeToggle />
        <main id="hero" className="relative z-10 mx-auto flex min-h-[85vh] w-full max-w-7xl flex-col justify-center px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="order-1 flex flex-col gap-6 lg:col-span-7 lg:pr-8">
              <div className="flex flex-col gap-3">
                <div className="inline-flex max-w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary backdrop-blur-sm"><span>Ao vivo · Feijó/AC</span></div>
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-7xl">O melhor preço <br /><span className="text-primary">antes</span> de comprar</h1>
                <p className="max-w-xl text-lg text-muted-foreground">Economize comparando preços em Feijó em tempo real.</p>
              </div>
              <motion.div ref={searchAnchorRef} className="relative group w-full max-w-2xl">
                <form onSubmit={submitSearch} className="relative flex items-center overflow-hidden rounded-2xl border border-primary/20 bg-card/60 p-1.5 shadow-2xl backdrop-blur-xl transition-all duration-300 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 group-hover:bg-card/80">
                  <div className="flex h-12 w-12 items-center justify-center text-primary/70"><Search className="h-6 w-6" /></div>
                  <input type="text" value={q} onChange={(e) => { setQ(e.target.value); setSuggestOpen(true); }} onFocus={() => setSuggestOpen(true)} placeholder="O que você quer economizar hoje?" className="h-full flex-1 bg-transparent px-2 text-lg font-bold placeholder:text-muted-foreground/40 focus:outline-none" />
                  <Button type="submit" size="lg" className="hidden sm:flex h-12 rounded-xl px-8 bg-primary font-bold shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]">Buscar <ArrowRight className="ml-2 h-5 w-5" /></Button>
                </form>
                <HomeSearchSuggestions ref={suggestRef} query={q} isLoggedOut={isLoggedOut} onBlocked={() => setGateOpen(true)} open={suggestOpen} onClose={() => setSuggestOpen(false)} anchorRef={searchAnchorRef} />
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="flex flex-wrap items-center gap-6"
              >
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    size="lg"
                    onClick={() => navigate({ to: "/app" })}
                    className="h-16 rounded-2xl bg-primary px-10 text-xl font-black text-primary-foreground shadow-[0_20px_40px_-10px_rgba(var(--pc-primary-rgb),0.5)] transition-all hover:shadow-[0_25px_50px_-10px_rgba(var(--pc-primary-rgb),0.6)]"
                  >
                    Acessar Aplicativo
                    <LayoutGrid className="ml-3 h-6 w-6" />
                  </Button>
                </motion.div>

                <div className="flex flex-col gap-1.5 px-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">
                    Sugestões em alta
                  </span>
                  <div className="flex flex-wrap gap-4">
                    {heroPopular.map((term) => (
                      <button
                        key={term}
                        onClick={() => goToPopular(term)}
                        className="text-sm font-bold text-foreground/80 transition-all hover:text-primary hover:translate-x-1"
                      >
                        #{term}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="order-2 grid grid-cols-1 gap-4 lg:col-span-5">
              {metrics.map((m: any) => (
                <motion.button key={m.kind} whileHover={{ scale: 1.02 }} className="group relative flex items-center gap-4 rounded-3xl border border-border/50 bg-card/40 p-5 text-left backdrop-blur-md">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><m.Icon className="h-7 w-7" /></div>
                  <div className="flex flex-1 flex-col"><span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">{m.label}</span><span className="text-3xl font-extrabold">{m.value}</span></div>
                </motion.button>
              ))}
            </motion.div>
          </div>
        </main>
        <div className="flex-1" />
        <section className="relative z-10 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="grid shrink-0 gap-3 lg:grid-cols-12">
                <nav className="min-w-0 rounded-3xl border border-border/50 p-4 lg:col-span-12 shadow-2xl bg-card/40 backdrop-blur-sm">
                    <p className={EYEBROW}>Categorias</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                        {CATEGORIES.map(({ key, label, Icon }) => (
                          <button key={key} type="button" onClick={() => navigate({ to: "/categoria/$slug", params: { slug: key as any } })} className={TILE}>
                            <span className={TILE_ICONWRAP}><Icon className={TILE_ICON} /></span>
                            <span className={TILE_LABEL}>{label}</span>
                          </button>
                        ))}
                    </div>
                </nav>
            </div>
        </section>
        <footer className="shrink-0 border-t px-4 py-6 mt-4 bg-card/60 backdrop-blur-md">
          <div className="mx-auto w-full max-w-7xl text-center">
             <p className="text-sm font-semibold">© {new Date().getFullYear()} PreçoCerto · Feijó/AC</p>
          </div>
        </footer>
      </div>
      <AllCategoriesDialog open={allCatsOpen} onOpenChange={setAllCatsOpen} />
      <GuestGateDialog open={gateOpen} onOpenChange={setGateOpen} action="search" redirect="/buscar" />
    </div>
  );
}

function PillarLink({ to, Icon, label, emphasis }: { to: string; Icon: any; label: string; emphasis?: boolean; }) {
  return (
    <Link to={to} className={cn(TILE, emphasis && "bg-primary border-primary hover:bg-primary/90")}>
      <span className={cn(TILE_ICONWRAP, emphasis && "bg-white/20 text-white")}><Icon className={TILE_ICON} /></span>
      <span className={cn(TILE_LABEL, emphasis && "text-white")}>{label}</span>
    </Link>
  );
}
