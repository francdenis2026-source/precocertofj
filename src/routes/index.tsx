import { createFileRoute, useNavigate, useLoaderData, Link } from "@tanstack/react-router";
import { lazy, Suspense, useRef, useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import {
  Search,
  ArrowRight,
  Package,
  LayoutGrid,
  Zap,
  MousePointer2,
  ListChecks,
  ChevronRight,
  Plus,
  ShieldCheck,
  TrendingDown
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
const RegisteredStoresCarousel = lazy(() => import("@/components/home/RegisteredStoresCarousel").then(m => ({ default: m.RegisteredStoresCarousel })));

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

const SECTION_TITLE = "text-[12px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)] mb-4 flex items-center gap-2";
const GLASS_CARD = "rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xl transition-all duration-300 hover:border-[var(--brand-primary)]/40 hover:translate-y-[-2px] overflow-hidden";

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
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
  useSearchTrendsRealtime(["home-trending-searches"]);

  const trendRows = useMemo(() => (popularQ.data ?? []).map((p: any) => ({ query: String(p?.query ?? "").trim() })).filter((p: { query: string }) => p.query.length >= 2), [popularQ.data]);
  const popularAll = useMemo(() => trendRows.length >= 3 ? trendRows.map((p: any) => p.query) : ["arroz", "feijão", "leite", "óleo", "café", "açúcar"], [trendRows]);
  const heroPopular = useMemo(() => popularAll.slice(0, 4), [popularAll]);

  const loaderData = useLoaderData({ from: "/" }) as { stats: any; economy: any; };
  const stats = loaderData?.stats;
  const economy = loaderData?.economy;
  const livePanel = buildLivePanel({ stats, economy, statsLoading: false, economyLoading: false, statsError: stats == null, economyError: economy == null });
  const metrics = livePanel.metrics.map((m: LivePanelMetric) => {
    const icons: Record<string, any> = {
      markets: (props: any) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>,
      products: Package,
      savings: (props: any) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m3 18 6-6 4 4 8-8"/><path d="M17 6h4v4"/></svg>
    };
    return { 
      ...m, 
      Icon: icons[m.kind],
      description: { markets: "Mercados locais auditados", products: "Itens monitorados hoje", savings: "Diferença média de preço" }[m.kind]
    };
  });

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
    <div className="pc-home relative flex min-h-screen flex-col bg-[var(--bg-base)] text-[var(--text-primary)] selection:bg-[var(--brand-primary)]/30 overflow-x-hidden">
      {/* Background Layer - Radial Gradient Glow */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[var(--bg-base)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,var(--brand-glow)_0%,transparent_60%)]" />
      </div>

      <div className="relative z-10 flex flex-col">
        <SiteHeader variant="overlay" showThemeToggle />
        
        <main className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12 items-start">
            
            {/* Left Column: Hero Content */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="flex flex-col gap-4"
              >
                <div className="flex items-center gap-3">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/90">Ao vivo em Feijó/AC</span>
                </div>
                
                <h1 className="font-['Space_Grotesk'] text-[56px] font-bold tracking-[-0.02em] leading-[1.05] text-white">
                  Inteligência real para <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-[var(--brand-primary)]">economizar</span>
                </h1>
                
                <p className="max-w-md text-[15px] font-medium text-white/40 leading-relaxed">
                  A ferramenta definitiva para quem domina a economia. Analise mercados, identifique oportunidades e economize com precisão cirúrgica.
                </p>

                {/* Search Bar */}
                <div ref={searchAnchorRef} className="relative w-full max-w-xl group">
                  <form 
                    onSubmit={submitSearch} 
                    onKeyDown={(e) => {
                      if (suggestRef.current?.handleKeyDown(e as any)) return;
                    }}
                    className="relative flex items-center min-h-[56px] overflow-hidden rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1 transition-all duration-300 focus-within:border-[var(--brand-primary)] focus-within:ring-[3px] focus-within:ring-[var(--brand-primary)]/25 group-hover:bg-[var(--bg-surface-elevated)]"
                  >
                    <div className="flex h-12 w-12 items-center justify-center text-[var(--text-tertiary)]"><Search className="h-5 w-5" /></div>
                    <input 
                      type="text" 
                      value={q} 
                      onChange={(e) => { setQ(e.target.value); setSuggestOpen(true); }} 
                      onFocus={() => setSuggestOpen(true)}
                      placeholder="Buscar arroz, leite, detergente..." 
                      className="h-full flex-1 bg-transparent px-2 text-base font-medium placeholder:text-[var(--text-tertiary)] focus:outline-none" 
                    />
                    <Button type="submit" className="h-11 rounded-full px-8 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white font-semibold transition-all">
                      Buscar
                    </Button>
                  </form>
                  <HomeSearchSuggestions ref={suggestRef} query={q} isLoggedOut={isLoggedOut} onBlocked={() => setGateOpen(true)} open={suggestOpen} onClose={() => setSuggestOpen(false)} anchorRef={searchAnchorRef} />
                  
                  <div className="mt-4 flex flex-wrap gap-2 items-center">
                    <span className="text-[12px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Sugestões:</span>
                    {heroPopular.map((term) => (
                      <button key={term} onClick={() => goToPopular(term)} className="rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] px-3 py-1 text-[12px] font-medium text-[var(--text-secondary)] hover:border-[var(--brand-primary)]/40 hover:text-[var(--text-primary)] transition-all">
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
                className={cn(GLASS_CARD, "p-1 backdrop-blur-[20px] bg-[var(--bg-surface)]/60 border-[var(--border-subtle)]")}
              >
                <div className="flex flex-col">
                  {metrics.map((m, idx) => (
                    <div 
                      key={m.kind} 
                      className={cn(
                        "flex items-center gap-4 p-5 transition-all duration-300",
                        idx !== metrics.length - 1 && "border-b border-[var(--border-subtle)]"
                      )}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--bg-surface-elevated)] text-[var(--brand-primary)]">
                        <m.Icon className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)]">{m.label}</span>
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                        </div>
                        <span className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">{m.value}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                   <div className="flex -space-x-2">
                      {[1,2,3,4,5,6].map(i => (
                        <div key={i} className="h-6 w-6 rounded-full border-2 border-[#0f172a] bg-slate-700 overflow-hidden">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} alt="" />
                        </div>
                      ))}
                      <div className="h-6 w-6 rounded-full border-2 border-[#0f172a] bg-primary flex items-center justify-center text-[8px] font-bold">+10</div>
                   </div>
                   <Button variant="link" className="text-primary font-black text-[10px] uppercase tracking-widest p-0 h-auto">
                     Ver todos <ChevronRight className="ml-1 h-2 w-2" />
                   </Button>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Showcase Section */}
          <Suspense fallback={<div className="mt-12 h-40 w-full animate-pulse rounded-3xl bg-white/5" />}>
            <RecentProductsCarousel />
          </Suspense>

          {/* Bottom Grid: Categories & Steps */}
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Categories Panel */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-8"
            >
              <div className={cn(GLASS_CARD, "p-6")}>
                <h2 className={SECTION_TITLE}>Categorias</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {CATEGORIES.map(({ key, label, Icon }) => (
                    <button 
                      key={key} 
                      onClick={() => navigate({ to: "/categoria/$slug", params: { slug: key as any } })}
                      className="group flex items-center gap-3 rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-left transition-all hover:bg-[var(--bg-surface-elevated)] hover:border-[var(--brand-primary)]/40 hover:translate-y-[-2px]"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] group-hover:text-[var(--brand-primary)] transition-all">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-[12px] font-medium uppercase tracking-[0.06em] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">{label}</span>
                    </button>
                  ))}
                  <button onClick={() => setAllCatsOpen(true)} className="flex items-center gap-3 rounded-[12px] border border-dashed border-[var(--border-subtle)] p-4 text-left hover:border-[var(--text-tertiary)] transition-all group">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--bg-surface-elevated)] text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors"><Plus className="h-5 w-5" /></div>
                    <span className="text-[12px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors">Todas</span>
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
              <div className={cn(GLASS_CARD, "p-6")}>
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
                        "flex flex-col gap-2 rounded-[20px] p-5 transition-all text-left group-step",
                        item.primary ? "bg-indigo-600 text-white shadow-[0_16px_32px_-8px_rgba(79,70,229,0.4)] hover:scale-105 active:scale-[0.98]" : "bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-white/20 active:scale-[0.98]"
                      )}
                    >
                      <item.Icon className={cn("h-6 w-6", item.primary ? "text-white" : "text-primary")} />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Registered Stores Section */}
          <section className="mt-20">
            <div className="flex items-center justify-between mb-6">
              <h2 className={SECTION_TITLE}>
                <ShieldCheck className="h-3 w-3" />
                Mercados Cadastrados
              </h2>
              <Link to="/estabelecimentos" className="text-[12px] font-medium uppercase tracking-[0.06em] text-[var(--brand-primary)] hover:text-[var(--brand-primary)]/80 transition-colors">
                Ver todos os parceiros →
              </Link>
            </div>
            
            <div className={cn(GLASS_CARD, "p-8 relative group bg-[var(--bg-surface)] border-[var(--border-subtle)]")}>
              <div className="flex flex-col gap-10 relative z-10">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex-1 space-y-4 text-center md:text-left">
                    <h3 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Transparência e Confiança</h3>
                    <p className="max-w-xl text-[15px] font-normal text-[var(--text-secondary)] leading-relaxed">
                      Trabalhamos diretamente com os principais estabelecimentos de Feijó para garantir acesso a informações precisas. Nossa missão é de utilidade pública: fortalecer o comércio local e o poder de compra do cidadão.
                    </p>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-bold text-[var(--text-primary)]">{stats?.establishments ?? "0"}</span>
                      <span className="text-[12px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Parceiros</span>
                    </div>
                    <div className="h-8 w-px bg-[var(--border-subtle)]" />
                    <div className="flex flex-col items-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                        <ShieldCheck className="h-6 w-6" />
                      </div>
                      <span className="mt-1 text-[12px] font-medium uppercase tracking-[0.06em] text-emerald-400">Auditado</span>
                    </div>
                  </div>
                </div>

                <Suspense fallback={<div className="h-20 w-full animate-pulse bg-[var(--bg-surface-elevated)] rounded-xl" />}>
                  <RegisteredStoresCarousel />
                </Suspense>
              </div>
            </div>
          </section>

          {/* Simple Steps Section */}
          <section className="mt-24 text-center relative overflow-hidden py-10">
            <h2 className="font-['Space_Grotesk'] text-[32px] font-bold mb-4 tracking-tight">Economize em 3 passos</h2>
            <p className="text-[var(--text-secondary)] font-normal mb-16 tracking-wide">A tecnologia definitiva para você dominar sua economia diária.</p>
            
            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12">
              {/* Connecting Dotted Line for Desktop */}
              <div className="hidden md:block absolute top-10 left-[15%] right-[15%] h-px border-t border-dashed border-[var(--border-subtle)] -z-10" />
              
              {[
                { icon: Search, title: "Busque o Produto", desc: "Digite o nome do que você precisa. Nosso sistema varre todos os mercados em segundos." },
                { icon: TrendingDown, title: "Compare e Escolha", desc: "Veja onde está mais barato hoje. Confira o histórico de preços e evite promoções falsas." },
                { icon: ListChecks, title: "Monte sua Lista", desc: "Adicione à sua lista e saiba o valor total antes de sair de casa. Economia garantida." }
              ].map((step, idx) => (
                <div key={idx} className="relative flex flex-col items-center gap-4 px-4 group">
                  <span className="absolute -top-6 text-6xl font-bold text-[var(--text-tertiary)] opacity-5 -z-10 select-none">0{idx + 1}</span>
                  <div className="h-20 w-20 rounded-[12px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] mb-6 group-hover:bg-[var(--brand-primary)] group-hover:text-white group-hover:border-[var(--brand-primary)] transition-all duration-300">
                    <step.icon className="h-10 w-10" />
                  </div>
                  <h3 className="text-[18px] font-bold mb-2 tracking-tight text-[var(--text-primary)]">{step.title}</h3>
                  <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed max-w-[280px] font-normal">{step.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Heavy Editorial Panel */}
          <Suspense fallback={<div className="mt-32 h-[500px] w-full animate-pulse rounded-3xl bg-slate-800" />}>
            <section className="mt-32">
              <ExplorePanel />
            </section>
          </Suspense>
        </main>

        <footer className="mt-32 border-t border-slate-700 bg-[#0f172a] px-4 py-12">
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
