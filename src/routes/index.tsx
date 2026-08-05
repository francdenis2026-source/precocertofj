import { createFileRoute, useNavigate, useLoaderData } from "@tanstack/react-router";
import { lazy, Suspense, useRef, useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import {
  Search,
  ArrowRight,
  TrendingDown,
  ShieldCheck,
  Package,
  LayoutGrid,
  Zap,
  MousePointer2,
  ListChecks,
  ChevronRight,
  Plus
} from "lucide-react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/button";

import { buildLivePanel, type LivePanelMetric } from "@/lib/live-panel";
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
import { consumeGuest } from "@/lib/guest-quota";
import { AllCategoriesDialog } from "@/components/home/AllCategoriesDialog";
import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";
import homeHeroImg from "@/assets/home-hero.jpg";
import { categoryBySlug, hubCoverageLabel, type CategorySlug } from "@/lib/category-hub";
import { categoryIcon } from "@/lib/category-icons";

const ExplorePanel = lazy(() => import("@/components/home/ExplorePanel").then(m => ({ default: m.ExplorePanel })));
const RecentProductsCarousel = lazy(() => import("@/components/home/RecentProductsCarousel").then(m => ({ default: m.RecentProductsCarousel })));

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
      { title: "PreçoCerto — Inteligência Real para Economizar em Feijó/AC" },
      { name: "description", content: "A primeira plataforma de monitoramento de preços em tempo real de Feijó. Compare mercados e economize em cada item da sua lista." }
    ],
  }),
  component: HomePage,
});

const HOME_HUBS: CategorySlug[] = ["supermercados", "acougues", "hortifruti", "padarias", "bebidas", "limpeza", "higiene", "farmacias", "pet"];
const CATEGORIES = HOME_HUBS.map((slug) => {
  const def = categoryBySlug(slug)!;
  return { key: def.slug, label: def.short, Icon: categoryIcon(def.slug) };
});

const SECTION_TITLE = "text-xs font-black uppercase tracking-[0.2em] text-primary/70 mb-4";
const GLASS_CARD = "rounded-3xl border border-white/5 bg-white/[0.03] backdrop-blur-xl shadow-2xl transition-all duration-500";

function HomePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, loading: sessionLoading } = useSession();
  const isLoggedOut = !sessionLoading && !user;
  const [q, setQ] = useState("");
  const [allCatsOpen, setAllCatsOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const suggestRef = useRef<HomeSearchSuggestionsHandle | null>(null);
  const searchAnchorRef = useRef<HTMLDivElement | null>(null);

  const trendingFn = useServerFn(listTrendingSearches);
  const popularQ = useQuery({ 
    queryKey: ["home-trending-searches"], 
    queryFn: () => trendingFn({ data: { limit: 24 } } as any), 
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
  useSearchTrendsRealtime(["home-trending-searches"]);

  const trendRows = useMemo(() => (popularQ.data ?? []).map((p: any) => ({ query: String(p?.query ?? "").trim() })).filter((p: { query: string }) => p.query.length >= 2), [popularQ.data]);
  const popularAll = useMemo(() => trendRows.length >= 3 ? trendRows.map((p: any) => p.query) : ["arroz", "feijão", "leite", "óleo", "café", "açúcar"], [trendRows]);
  const heroPopular = useMemo(() => popularAll.slice(0, 4), [popularAll]);

  const loaderData = useLoaderData({ from: "/" }) as { stats: any; economy: any; };
  const stats = loaderData?.stats;
  const economy = loaderData?.economy;
  const livePanel = buildLivePanel({ stats, economy, statsLoading: false, economyLoading: false, statsError: stats == null, economyError: economy == null });
  const metrics = livePanel.metrics.map((m: LivePanelMetric) => ({ 
    ...m, 
    Icon: { markets: ShieldCheck, products: Package, savings: TrendingDown }[m.kind],
    description: { markets: "Mercados locais auditados", products: "Itens monitorados hoje", savings: "Diferença média de preço" }[m.kind]
  }));

  const submitSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const query = q.trim();
    if (!query) return;
    if (isLoggedOut && consumeGuest("search", query).blocked) { setGateOpen(true); return; }
    trackEvent("search_query", { q: query.toLowerCase(), region: getStoredRegionKey() });
    navigate({ to: "/buscar", search: { q: query } as any });
  };

  const goToPopular = (term: string) => {
    setQ(term);
    if (isLoggedOut && consumeGuest("search", term).blocked) { setGateOpen(true); return; }
    navigate({ to: "/buscar", search: { q: term, from: "alta" } as any });
  };

  return (
    <div className="pc-home relative flex min-h-screen flex-col bg-[#020617] text-white selection:bg-primary/30">
      {/* Background Layer */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <img 
          src={homeHeroImg} 
          alt="" 
          className="h-full w-full object-cover object-center scale-105 opacity-30 blur-[1px] saturate-[1.2]" 
          loading="eager"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/80 via-[#020617]/95 to-[#020617]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(79,70,229,0.15)_0%,transparent_50%)]" />
      </div>

      <div className="relative z-10 flex flex-col">
        <SiteHeader variant="overlay" showThemeToggle />
        
        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16 items-start">
            
            {/* Left Column: Hero Content */}
            <div className="lg:col-span-7 flex flex-col gap-8">
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="flex flex-col gap-6"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-500/90">Ao vivo · Feijó/AC</span>
                </div>
                
                <h1 className="text-5xl font-black tracking-tight sm:text-7xl lg:text-[80px] leading-[0.95]">
                  Inteligência <br />
                  real para <br />
                  <span className="italic font-extrabold text-white/90">economizar</span>
                </h1>
                
                <p className="max-w-lg text-lg font-medium text-white/50 leading-relaxed">
                  A primeira plataforma de monitoramento de preços em tempo real de Feijó. Compare mercados e economize em cada item da sua lista.
                </p>

                {/* Search Bar */}
                <div ref={searchAnchorRef} className="relative w-full max-w-xl group">
                  <form 
                    onSubmit={submitSearch} 
                    onKeyDown={(e) => {
                      if (suggestRef.current?.handleKeyDown(e as any)) return;
                    }}
                    className="relative flex items-center overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-1.5 shadow-2xl backdrop-blur-2xl transition-all duration-500 focus-within:border-primary/50 focus-within:ring-8 focus-within:ring-primary/10 group-hover:bg-white/[0.08]"
                  >
                    <div className="flex h-12 w-12 items-center justify-center text-primary"><Search className="h-6 w-6" /></div>
                    <input 
                      type="text" 
                      value={q} 
                      onChange={(e) => { setQ(e.target.value); setSuggestOpen(true); }} 
                      onFocus={() => setSuggestOpen(true)}
                      placeholder="O que você quer economizar hoje?" 
                      className="h-full flex-1 bg-transparent px-2 text-lg font-bold placeholder:text-white/20 focus:outline-none" 
                    />
                    <Button type="submit" className="hidden sm:flex h-12 rounded-xl px-8 bg-primary hover:bg-primary/90 font-black shadow-xl transition-transform hover:scale-[1.02] active:scale-[0.98]">
                      Buscar <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </form>
                  <HomeSearchSuggestions ref={suggestRef} query={q} isLoggedOut={isLoggedOut} onBlocked={() => setGateOpen(true)} open={suggestOpen} onClose={() => setSuggestOpen(false)} anchorRef={searchAnchorRef} />
                  
                  <div className="mt-4 flex flex-wrap gap-4 items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Mais buscados:</span>
                    {heroPopular.map((term) => (
                      <button key={term} onClick={() => goToPopular(term)} className="text-xs font-bold text-white/60 hover:text-primary transition-colors">
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right Column: Metrics & Quick Actions */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              {/* Metrics Grid */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className={cn(GLASS_CARD, "p-8 flex flex-col gap-8")}
              >
                {metrics.map((m, idx) => (
                  <div key={m.kind} className="flex items-center gap-6 group">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                      <m.Icon className="h-7 w-7" />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{m.label}</span>
                        {idx === 2 && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold text-amber-500">↑ 2.4%</span>}
                        {idx === 0 && <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[9px] font-bold text-primary">+2 novos</span>}
                      </div>
                      <span className="text-3xl font-black tabular-nums">{m.value}</span>
                      <p className="text-xs font-medium text-white/30">{m.description}</p>
                    </div>
                  </div>
                ))}

                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                   <div className="flex -space-x-3">
                      {[1,2,3,4,5,6].map(i => (
                        <div key={i} className="h-8 w-8 rounded-full border-2 border-[#020617] bg-white/10 overflow-hidden">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} alt="" />
                        </div>
                      ))}
                      <div className="h-8 w-8 rounded-full border-2 border-[#020617] bg-primary flex items-center justify-center text-[10px] font-bold">+10</div>
                   </div>
                   <Button variant="link" className="text-primary font-black text-xs uppercase tracking-widest p-0 h-auto">
                     Ver todos <ChevronRight className="ml-1 h-3 w-3" />
                   </Button>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Showcase Section */}
          <Suspense fallback={<div className="mt-16 h-40 w-full animate-pulse rounded-3xl bg-white/5" />}>
            <RecentProductsCarousel />
          </Suspense>

          {/* Bottom Grid: Categories & Steps */}
          <div className="mt-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Categories Panel */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-8"
            >
              <div className={cn(GLASS_CARD, "p-8")}>
                <h2 className={SECTION_TITLE}>Categorias</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {CATEGORIES.map(({ key, label, Icon }) => (
                    <button 
                      key={key} 
                      onClick={() => navigate({ to: "/categoria/$slug", params: { slug: key as any } })}
                      className="group flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-left transition-all hover:bg-white/[0.05] hover:border-primary/30"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-bold text-white/70 group-hover:text-white transition-colors">{label}</span>
                    </button>
                  ))}
                  <button onClick={() => setAllCatsOpen(true)} className="flex items-center gap-4 rounded-2xl border border-dashed border-white/10 p-4 text-left hover:border-white/30 transition-all">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/40"><Plus className="h-5 w-5" /></div>
                    <span className="text-sm font-bold text-white/40">Todas</span>
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Steps / Quick Actions */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-4"
            >
              <div className={cn(GLASS_CARD, "p-8")}>
                <h2 className={SECTION_TITLE}>Ações rápidas</h2>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Histórico", Icon: ListChecks },
                    { label: "Colaborar", Icon: MousePointer2 },
                    { label: "Acessar App", Icon: LayoutGrid, primary: true },
                    { label: "Planos", Icon: Zap }
                  ].map((item) => (
                    <button 
                      key={item.label}
                      onClick={() => navigate({ to: item.primary ? "/app" : "/buscar" })}
                      className={cn(
                        "flex flex-col gap-3 rounded-2xl p-5 transition-all text-left",
                        item.primary ? "bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105" : "bg-white/[0.03] border border-white/5 hover:bg-white/[0.06]"
                      )}
                    >
                      <item.Icon className={cn("h-6 w-6", item.primary ? "text-white" : "text-primary")} />
                      <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Simple Steps Section */}
          <section className="mt-24 text-center">
            <h2 className="text-3xl font-black mb-2">Economize em 3 passos simples</h2>
            <p className="text-white/40 font-medium mb-12">A tecnologia que você precisava para nunca mais pagar caro no mercado.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {[
                { icon: Search, title: "Busque o Produto", desc: "Digite o nome do que você precisa. Nosso sistema varre todos os mercados em segundos." },
                { icon: TrendingDown, title: "Compare e Escolha", desc: "Veja onde está mais barato hoje. Confira o histórico de preços e evite promoções falsas." },
                { icon: ListChecks, title: "Monte sua Lista", desc: "Adicione à sua lista e saiba o valor total antes de sair de casa. Economia garantida." }
              ].map((step, idx) => (
                <div key={idx} className="flex flex-col items-center gap-4 px-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                    <step.icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-black">{step.title}</h3>
                  <p className="text-sm text-white/30 leading-relaxed max-w-[280px]">{step.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Heavy Editorial Panel */}
          <Suspense fallback={<div className="mt-32 h-[500px] w-full animate-pulse rounded-3xl bg-white/5" />}>
            <section className="mt-32">
              <ExplorePanel />
            </section>
          </Suspense>
        </main>

        <footer className="mt-32 border-t border-white/5 bg-[#020617] px-4 py-12">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-8">
              <div className="flex flex-col items-center md:items-start gap-2">
                 <p className="text-xs font-black uppercase tracking-[0.2em] text-white/30">© {new Date().getFullYear()} PreçoCerto · Feijó/AC</p>
                 <p className="text-[10px] font-medium text-white/15 uppercase tracking-widest">A inteligência que faltava</p>
              </div>
              <div className="flex flex-wrap justify-center gap-8">
                {["Mercados", "Bairros", "Planos", "Fale Conosco", "Privacidade"].map(link => (
                  <button key={link} className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors">
                    {link}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </footer>
      </div>

      <AllCategoriesDialog open={allCatsOpen} onOpenChange={setAllCatsOpen} />
      <GuestGateDialog open={gateOpen} onOpenChange={setGateOpen} action="search" redirect="/buscar" />
    </div>
  );
}
