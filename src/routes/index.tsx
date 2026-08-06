import { createFileRoute, useNavigate, useLoaderData, Link } from "@tanstack/react-router";
import { Suspense, useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  ChevronRight, 
  Store, 
  Utensils, 
  Apple, 
  Coffee, 
  Milk, 
  Droplets, 
  Smile, 
  PlusCircle, 
  ArrowRight,
  TrendingDown,
  ShoppingCart,
  Filter,
  ArrowDownWideNarrow,
  Clock
} from "lucide-react";
import { 
  GroceryIcon, 
  BakeryIcon, 
  MeatIcon, 
  FruitIcon, 
  DrinkIcon, 
  CleaningIcon, 
  HygieneIcon 
} from "@/components/icons/CategoryIcons";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/button";
import { getPlatformStats } from "@/lib/stores-public.functions";
import { getEconomyStat, getRecentProducts } from "@/lib/products-public.functions";
import { listTrendingSearches } from "@/lib/search-trends.functions";
import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";
import { Price } from "@/components/ds/Price";
import { RegisteredStoresCarousel } from "@/components/home/RegisteredStoresCarousel";
import { RecentProductsCarousel } from "@/components/home/RecentProductsCarousel";
import { ProductQuickView } from "@/components/product/ProductQuickView";

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
      { title: "PreçoCerto — Inteligência Real para Economizar" },
      { name: "description", content: "Compare preços em tempo real nos mercados de Feijó." }
    ],
  }),
  component: HomePage,
});

const CATEGORIES = [
  { slug: "supermercados", label: "Mercados", Icon: Store, SVG: GroceryIcon, color: "#FFD700" },
  { slug: "padarias", label: "Padarias", Icon: Coffee, SVG: BakeryIcon, color: "#FD79A8" },
  { slug: "acougues", label: "Açougues", Icon: Utensils, SVG: MeatIcon, color: "#E17055" },
  { slug: "hortifruti", label: "Hortifruti", Icon: Apple, SVG: FruitIcon, color: "#00B894" },
  { slug: "bebidas", label: "Bebidas", Icon: Milk, SVG: DrinkIcon, color: "#0984E3" },
  { slug: "limpeza", label: "Limpeza", Icon: Droplets, SVG: CleaningIcon, color: "#00CEC9" },
  { slug: "higiene", label: "Higiene", Icon: Smile, SVG: HygieneIcon, color: "#FDCB6E" },
];

function HomePage() {
  const navigate = useNavigate();
  const { user, loading: sessionLoading } = useSession();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"recent" | "price">("recent");

  useEffect(() => {
    const handleOpenQuickView = (e: any) => {
      setSelectedProduct(e.detail);
    };
    window.addEventListener('open-quick-view', handleOpenQuickView);
    return () => window.removeEventListener('open-quick-view', handleOpenQuickView);
  }, []);
  const [sort, setSort] = useState<"price" | "recent">("recent");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => setSelectedProduct(e.detail);
    window.addEventListener('internal-open-quick-view', handler);
    return () => window.removeEventListener('internal-open-quick-view', handler);
  }, []);
  
  const loaderData = useLoaderData({ from: "/" }) as { stats: any; economy: any; };
  
  const recentProductsFn = useServerFn(getRecentProducts);
  const { data: rawRecentProducts } = useQuery({
    queryKey: ["home-live-prices"],
    queryFn: () => recentProductsFn({ data: { limit: 12 } }),
    staleTime: 60_000,
  });

  const filteredProducts = useMemo(() => {
    if (!rawRecentProducts) return [];
    let list = [...rawRecentProducts];
    
    if (q.trim()) {
      const term = q.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(term));
    }

    if (sort === "price") {
      list.sort((a, b) => a.price - b.price);
    } else {
      list.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());
    }
    
    return list.slice(0, 6);
  }, [rawRecentProducts, q, sort]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    navigate({ to: "/buscar", search: { q: q.trim() } as any });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-white selection:bg-[var(--brand-primary)]/30">
      <SiteHeader variant="overlay" showThemeToggle />
      
      {/* Professional Realism Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[var(--bg-base)]" />
        <motion.div 
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 0.1, scale: 1 }}
          transition={{ duration: 2 }}
          className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center mix-blend-luminosity" 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-base)] via-[var(--bg-base)]/90 to-[var(--bg-base)]" />
        <div 
          className="absolute top-[-10%] right-[10%] w-[60%] h-[50%] rounded-full opacity-[0.08] blur-[120px]" 
          style={{ background: 'radial-gradient(circle, var(--brand-primary) 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative z-10 flex flex-col">
        <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <script dangerouslySetInnerHTML={{ __html: `
            window.addEventListener('open-quick-view', (e) => {
              window.dispatchEvent(new CustomEvent('internal-open-quick-view', { detail: e.detail }));
            });
          `}} />
          
          {/* Hero Section */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col items-center text-center mb-16"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 mb-6 backdrop-blur-md"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--brand-primary)]"></span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--brand-primary)]">Ao vivo em Feijó <span className="text-white/40 mx-1">·</span> Acre</span>
            </motion.div>
            
            <h1 className="font-display text-[40px] sm:text-[56px] font-bold tracking-[-0.04em] leading-[1.05] mb-6 max-w-4xl text-white">
              Inteligência real para <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-primary)] to-[#FFA500]">economizar</span> em cada compra
            </h1>

            <form onSubmit={submitSearch} className="group relative w-full max-w-2xl flex items-center h-[64px] sm:h-[72px] rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 shadow-2xl transition-all duration-300 focus-within:border-[var(--brand-primary)] focus-within:ring-4 focus-within:ring-[var(--brand-primary)]/10">
              <Search className="ml-5 h-6 w-6 text-[var(--text-tertiary)] group-focus-within:text-[var(--brand-primary)] transition-colors" />
              <input 
                value={q} 
                onChange={(e) => setQ(e.target.value)}
                placeholder="Busque por arroz, feijão, leite..." 
                className="flex-1 bg-transparent px-5 text-lg font-medium outline-none placeholder:text-[var(--text-tertiary)]" 
              />
              <Button type="submit" className="hidden sm:flex rounded-full px-10 bg-[var(--brand-primary)] h-[52px] sm:h-[56px] font-bold text-black hover:scale-[1.02] active:scale-95 transition-all shadow-[0_12px_24px_-8px_var(--brand-glow)]">
                Buscar
              </Button>
            </form>
          </motion.section>

          {/* Categories Grid */}
          <section className="mb-16">
            <h2 className="section-title">Navegar por Categoria</h2>
            <div className="flex overflow-x-auto pb-4 gap-4 no-scrollbar scroll-smooth snap-x cursor-grab active:cursor-grabbing select-none"
                 onMouseDown={(e) => {
                   const el = e.currentTarget;
                   const startX = e.pageX - el.offsetLeft;
                   const scrollLeft = el.scrollLeft;
                   const onMouseMove = (e: MouseEvent) => {
                     const x = e.pageX - el.offsetLeft;
                     const walk = (x - startX) * 2;
                     el.scrollLeft = scrollLeft - walk;
                   };
                   const onMouseUp = () => {
                     document.removeEventListener('mousemove', onMouseMove);
                     document.removeEventListener('mouseup', onMouseUp);
                   };
                   document.addEventListener('mousemove', onMouseMove);
                   document.addEventListener('mouseup', onMouseUp);
                 }}>
              {CATEGORIES.map(({ slug, label, Icon, SVG, color }) => (
                <Link 
                  key={slug} 
                  to="/categoria/$slug" 
                  params={{ slug: slug as any }}
                  className="group relative flex flex-col items-center justify-end min-w-[140px] h-[160px] rounded-[20px] overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)] transition-all hover:border-[var(--brand-primary)]/40 snap-start"
                >
                  <div className="absolute inset-0 z-0">
                    <div 
                      className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500" 
                      style={{ 
                        background: `radial-gradient(circle at center, ${color} 0%, transparent 70%)`,
                      }}
                    />
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] mix-blend-overlay" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-surface)] via-transparent to-transparent" />
                  </div>
                  <div className="relative z-10 w-full p-4 flex flex-col items-center">
                    <div className="relative mb-3">
                      <div 
                        className="absolute inset-0 blur-xl opacity-10 group-hover:opacity-30 transition-opacity duration-500"
                        style={{ backgroundColor: color }}
                      />
                      <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl text-white group-hover:scale-110 group-hover:bg-[var(--brand-primary)] group-hover:border-[var(--brand-primary)] transition-all duration-500 shadow-2xl">
                        <Icon className="h-6 w-6 transition-transform duration-500 group-hover:rotate-3" />
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/90 group-hover:text-white transition-colors">{label}</span>
                      <div className="h-0.5 w-0 bg-[var(--brand-primary)] group-hover:w-full transition-all duration-500 rounded-full" />
                    </div>
                  </div>
                </Link>
              ))}
              <Link 
                to="/buscar" 
                className="group relative flex flex-col items-center justify-center min-w-[140px] h-[160px] rounded-[20px] border border-dashed border-[var(--border-subtle)] transition-all hover:border-[var(--text-tertiary)] snap-start overflow-hidden"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-surface-elevated)] text-[var(--text-tertiary)] group-hover:text-white transition-all mb-2">
                  <PlusCircle className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-tertiary)] group-hover:text-white transition-colors">Todas</span>
              </Link>
            </div>
          </section>

          {/* New Sections for Recent and Trending Products */}
          <div className="mb-16">
            <RecentProductsCarousel />
          </div>

          {/* Live Prices Table */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
            <div className="lg:col-span-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h2 className="section-title font-display font-bold text-white mb-0">Preços ao Vivo</h2>
                
                <div className="flex items-center gap-2">
                  <div className="flex bg-[var(--bg-surface)] p-1 rounded-lg border border-[var(--border-subtle)]">
                    <button 
                      onClick={() => setSort("recent")}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold uppercase transition-all",
                        sort === "recent" ? "bg-[var(--brand-primary)] text-black" : "text-[var(--text-tertiary)] hover:text-white"
                      )}
                    >
                      <Clock className="h-3 w-3" /> Recentes
                    </button>
                    <button 
                      onClick={() => setSort("price")}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold uppercase transition-all",
                        sort === "price" ? "bg-[var(--brand-primary)] text-black" : "text-[var(--text-tertiary)] hover:text-white"
                      )}
                    >
                      <ArrowDownWideNarrow className="h-3 w-3" /> Menor Preço
                    </button>
                  </div>
                  <Link to="/buscar" className="hidden sm:flex text-[12px] font-bold text-[var(--brand-primary)] hover:underline items-center gap-1 ml-2">
                    Ver tudo <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              <div className="glass-card overflow-hidden">
                <div className="divide-y divide-[var(--border-subtle)]">
                  <AnimatePresence mode="popLayout">
                    {filteredProducts.map((p, idx) => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        key={`${p.slug}-${idx}`}
                        onClick={() => setSelectedProduct({
                          name: p.name,
                          unit: null,
                          minPrice: p.price,
                          maxPrice: null,
                          cheapestStore: p.marketName,
                          storeCount: p.stores,
                          updatedAt: p.when
                        })}
                        className="flex items-center justify-between p-5 hover:bg-[var(--bg-surface-elevated)] transition-colors group cursor-pointer"
                      >
                        <div className="flex flex-col min-w-0 pr-4">
                          <h3 className="text-sm sm:text-base font-medium text-white truncate group-hover:text-[var(--brand-primary)] transition-colors">{p.name}</h3>
                          <p className="text-[12px] text-[var(--text-secondary)] mt-0.5 truncate">
                            {p.marketName || "Mercado parceiro"} • {new Date(p.when).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <Price 
                            value={p.price} 
                            size="xl" 
                            className="font-bold tracking-tight"
                          />
                          {p.dropPct && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-[var(--success)] mt-0.5">
                              <TrendingDown className="h-2.5 w-2.5" />
                              -{p.dropPct}%
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {(!rawRecentProducts || rawRecentProducts.length === 0) && (
                    <div className="p-8 text-center text-[var(--text-tertiary)] italic">
                      Carregando ofertas recentes...
                    </div>
                  )}
                  {rawRecentProducts && filteredProducts.length === 0 && (
                    <div className="p-8 text-center text-[var(--text-tertiary)]">
                      Nenhum produto encontrado para sua busca.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar / Stats */}
            <div className="lg:col-span-4 space-y-6">
              <h2 className="section-title font-display font-bold text-white">Transparência</h2>
              <div className="glass-card p-6 flex flex-col gap-6">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-tertiary)] mb-1">Mercados Auditados</div>
                  <div className="text-3xl font-bold tracking-tight">{loaderData.stats?.totalStores || "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-tertiary)] mb-1">Produtos em Monitoramento</div>
                  <div className="text-3xl font-bold tracking-tight">{loaderData.stats?.totalProducts || "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-tertiary)] mb-1">Economia Média Local</div>
                  <div className="text-3xl font-bold tracking-tight text-[var(--success)]">
                    {loaderData.economy?.avgSavingsPct ? `${loaderData.economy.avgSavingsPct}%` : "—"}
                  </div>
                </div>
                <Button onClick={() => navigate({ to: "/app" })} className="w-full bg-[var(--brand-primary)] text-black hover:scale-[1.02] active:scale-95 font-bold rounded-xl h-12 transition-all shadow-[0_12px_24px_-8px_var(--brand-glow)]">
                  Acessar Aplicativo
                </Button>
              </div>
            </div>
          </section>

          {/* Registered Stores */}
          <section className="relative overflow-hidden rounded-[24px] border border-[var(--border-subtle)]">
            <div className="absolute inset-0 z-0">
              <img 
                src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=2000" 
                alt="" 
                className="h-full w-full object-cover opacity-20 transition-transform duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-base)] via-[var(--bg-base)]/80 to-[var(--bg-base)]" />
            </div>
            
            <div className="relative z-10 p-8 sm:p-12">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div className="max-w-xl">
                  <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--brand-primary)] mb-3">Rede de Parcerias</h2>
                  <h3 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
                    Comércios Parceiros
                  </h3>
                  <p className="text-[var(--text-secondary)] text-sm sm:text-base leading-relaxed">
                    Trabalhamos em conjunto com os principais estabelecimentos locais para garantir 
                    transparência e os melhores preços para a população de Feijó.
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-3">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full border-2 border-[var(--bg-base)] bg-[var(--brand-primary)] text-black">
                      <Store className="h-5 w-5" />
                    </div>
                    <div className="flex items-center justify-center h-10 w-10 rounded-full border-2 border-[var(--bg-base)] bg-[var(--bg-surface-elevated)] text-[var(--brand-primary)]">
                      <TrendingDown className="h-5 w-5" />
                    </div>
                    <div className="flex items-center justify-center h-10 w-10 rounded-full border-2 border-[var(--bg-base)] bg-[var(--pc-navy-surface)] text-white">
                      <ShoppingCart className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                    Rede Certificada
                  </div>
                </div>
              </div>
              
              <div className="rounded-2xl bg-white/[0.02] border border-white/[0.05] p-6 backdrop-blur-sm">
      <ProductQuickView
        product={selectedProduct}
        open={!!selectedProduct}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
      />
      <RegisteredStoresCarousel />
              </div>
            </div>
          </section>

        </main>
      </div>

      <ProductQuickView 
        product={selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
      />
    </div>
  );
}
