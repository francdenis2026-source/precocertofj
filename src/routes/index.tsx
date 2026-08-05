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

const SECTION_TITLE = "text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400/80 mb-4";
const GLASS_CARD = "rounded-[24px] border border-slate-700 bg-slate-800 shadow-xl transition-all duration-300 hover:border-indigo-500/50 hover:shadow-indigo-500/10";

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
    <div className="pc-home relative flex min-h-screen flex-col bg-[#0f172a] text-white selection:bg-indigo-500/30 overflow-x-hidden">
      {/* Background Layer - More solid, less transparent */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[#0f172a]" />
        <div className="absolute inset-0 opacity-20" 
             style={{ backgroundImage: `url(${homeHeroImg})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'grayscale(0.5) brightness(0.5)' }} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a]/80 via-[#0f172a]/95 to-[#0f172a]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(99,102,241,0.1)_0%,transparent_60%)]" />
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
                
                <h1 className="text-5xl font-black tracking-tighter sm:text-7xl lg:text-[84px] leading-[0.9] text-white">
                  Inteligência <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-indigo-400">Preditiva</span> <br />
                  <span className="italic font-extrabold text-indigo-400 drop-shadow-[0_0_30px_rgba(99,102,241,0.3)]">de Preços</span>
                </h1>
                
                <p className="max-w-md text-base font-medium text-white/40 leading-relaxed">
                  A ferramenta definitiva para quem domina a economia. Analise mercados, identifique oportunidades e economize com precisão cirúrgica.
                </p>

                {/* Search Bar */}
                <div ref={searchAnchorRef} className="relative w-full max-w-xl group">
                  <form 
                    onSubmit={submitSearch} 
                    onKeyDown={(e) => {
                      if (suggestRef.current?.handleKeyDown(e as any)) return;
                    }}
                    className="relative flex items-center overflow-hidden rounded-[24px] border border-slate-700 bg-slate-900/80 p-1.5 shadow-2xl transition-all duration-300 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/20 group-hover:bg-slate-900 group-hover:border-slate-600"
                  >
                    <div className="flex h-14 w-14 items-center justify-center text-indigo-400"><Search className="h-7 w-7" /></div>
                    <input 
                      type="text" 
                      value={q} 
                      onChange={(e) => { setQ(e.target.value); setSuggestOpen(true); }} 
                      onFocus={() => setSuggestOpen(true)}
                      placeholder="Qual item você busca hoje?" 
                      className="h-full flex-1 bg-transparent px-2 text-xl font-bold placeholder:text-white/10 focus:outline-none" 
                    />
                    <Button type="submit" className="hidden sm:flex h-14 rounded-[18px] px-10 bg-indigo-600 hover:bg-indigo-500 text-white font-black shadow-[0_20px_40px_-10px_rgba(79,70,229,0.4)] transition-all hover:scale-[1.03] active:scale-[0.97]">
                      Buscar <ArrowRight className="ml-2 h-6 w-6" />
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
                className={cn(GLASS_CARD, "p-6 flex flex-col gap-6")}
              >
                {metrics.map((m, idx) => (
                  <motion.div 
                    key={m.kind} 
                    whileHover={{ x: 6 }}
                    className="flex items-center gap-4 group cursor-default"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-slate-700/50 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white group-hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all duration-500">
                      <m.Icon className="h-6 w-6" />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30">{m.label}</span>
                        {idx === 2 && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[8px] font-black text-emerald-400 border border-emerald-500/20">↓ 2.4%</span>}
                        {idx === 0 && <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[8px] font-black text-indigo-400 border border-emerald-500/20">+2 novos</span>}
                      </div>
                      <span className="text-3xl font-black tabular-nums tracking-tighter">{m.value}</span>
                      <p className="text-[10px] font-medium text-white/20 tracking-wide">{m.description}</p>
                    </div>
                  </motion.div>
                ))}

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
                      className="group flex items-center gap-3 rounded-[18px] border border-slate-700 bg-slate-800/50 p-4 text-left transition-all hover:bg-slate-800 hover:border-indigo-500/30 hover:shadow-lg"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-slate-700/50 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-500 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.4)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-[12px] font-black uppercase tracking-widest text-white/50 group-hover:text-white transition-colors">{label}</span>
                    </button>
                  ))}
                  <button onClick={() => setAllCatsOpen(true)} className="flex items-center gap-3 rounded-[18px] border border-dashed border-white/10 p-4 text-left hover:border-white/30 transition-all group">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-slate-700/50 text-white/20 group-hover:text-white transition-colors"><Plus className="h-5 w-5" /></div>
                    <span className="text-[12px] font-black uppercase tracking-widest text-white/20 group-hover:text-white">Todas</span>
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
            <h2 className={SECTION_TITLE}>Mercados Cadastrados</h2>
            <div className={cn(GLASS_CARD, "p-8")}>
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex-1 space-y-4">
                  <h3 className="text-3xl font-black text-white tracking-tighter">Transparência e Confiança</h3>
                  <p className="text-white/40 leading-relaxed max-w-xl text-[15px] font-medium">
                    Trabalhamos diretamente com os principais estabelecimentos de Feijó para garantir que você tenha acesso a informações precisas e atualizadas. Nossa missão é de utilidade pública: fortalecer o comércio local e o poder de compra do cidadão.
                  </p>
                  <div className="flex flex-wrap gap-4 pt-4">
                    <Button 
                      onClick={() => navigate({ to: "/estabelecimentos" })}
                      className="bg-indigo-600 text-white font-black hover:bg-indigo-500 transition-all rounded-xl px-6"
                    >
                      Ver Mercados
                    </Button>
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <ShieldCheck className="h-5 w-5" />
                      <span>Dados Auditados</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                   {[
                     { name: "Supermercados", count: stats?.markets || 12 },
                     { name: "Farmácias", count: 8 },
                     { name: "Açougues", count: 6 },
                     { name: "Padarias", count: 5 }
                   ].map(cat => (
                     <div key={cat.name} className="bg-slate-700/30 border border-slate-700 p-4 rounded-xl text-center min-w-[120px]">
                        <div className="text-2xl font-black text-white">{cat.count}</div>
                        <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest">{cat.name}</div>
                     </div>
                   ))}
                </div>
              </div>
            </div>
          </section>

          {/* Simple Steps Section */}
          <section className="mt-24 text-center">
            <h2 className="text-4xl font-black mb-4 tracking-tighter">Economize em 3 passos</h2>
            <p className="text-white/30 font-medium mb-16 tracking-wide">A tecnologia definitiva para você dominar sua economia diária.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {[
                { icon: Search, title: "Busque o Produto", desc: "Digite o nome do que você precisa. Nosso sistema varre todos os mercados em segundos." },
                { icon: TrendingDown, title: "Compare e Escolha", desc: "Veja onde está mais barato hoje. Confira o histórico de preços e evite promoções falsas." },
                { icon: ListChecks, title: "Monte sua Lista", desc: "Adicione à sua lista e saiba o valor total antes de sair de casa. Economia garantida." }
              ].map((step, idx) => (
                <div key={idx} className="flex flex-col items-center gap-4 px-4">
                  <div className="h-20 w-20 rounded-[24px] bg-white/5 flex items-center justify-center text-indigo-400 mb-6 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-500">
                    <step.icon className="h-10 w-10" />
                  </div>
                  <h3 className="text-xl font-black mb-2 tracking-tight">{step.title}</h3>
                  <p className="text-[13px] text-white/20 leading-relaxed max-w-[280px] font-medium">{step.desc}</p>
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
