import { createFileRoute, useNavigate, useLoaderData, Link } from "@tanstack/react-router";
import { Suspense, useState, useMemo, useEffect, useRef } from "react";
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
  Clock,
  MapPin,
  Sparkles,
  Scale
} from "lucide-react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/button";
import { getPlatformStats } from "@/lib/stores-public.functions";
import { getEconomyStat, getRecentProducts } from "@/lib/products-public.functions";
import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";
import { Price } from "@/components/ds/Price";
import { RegisteredStoresCarousel } from "@/components/home/RegisteredStoresCarousel";
import { RecentProductsCarousel } from "@/components/home/RecentProductsCarousel";
import { ProductQuickView } from "@/components/product/ProductQuickView";
import { SmartSearchBar } from "@/components/home/SmartSearchBar";
import { PromoBanner } from "@/components/promo/PromoBanner";
import { OptimizedBasketSection } from "@/components/home/OptimizedBasketSection";
import { ComparisonStickyBar } from "@/components/home/ComparisonStickyBar";
import { useComparisonList } from "@/hooks/use-comparison-list";
import { RealtimeMonitoringDashboard } from "@/components/monitoring/RealtimeMonitoringDashboard";
import { Skeleton } from "@/components/ui/skeleton";


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
  { slug: "mercearia", label: "Mercearia", Icon: ShoppingCart },
  { slug: "acougue", label: "Açougue", Icon: Utensils },
  { slug: "hortifruti", label: "Hortifruti", Icon: Apple },
  { slug: "bebidas", label: "Bebidas", Icon: Milk },
  { slug: "limpeza", label: "Limpeza", Icon: Droplets },
  { slug: "higiene", label: "Higiene", Icon: Smile },
  { slug: "padaria", label: "Padaria", Icon: Coffee },
  { slug: "laticinios", label: "Laticínios", Icon: Scale },
];

function formatDate(iso: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function ProductCardItem({ p, i, onSelect }: { p: any; i: number; onSelect: (p: any) => void }) {
  const { addItem } = useComparisonList();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.1 }}
      onClick={() => onSelect({ 
        name: p.name, 
        minPrice: p.price, 
        cheapestStore: p.marketName,
        updatedAt: p.when
      })}
      className="pc-card group cursor-pointer flex gap-3 p-3 items-center relative overflow-hidden"
    >
      <button 
        onClick={(e) => {
          e.stopPropagation();
          addItem({ id: p.name, name: p.name, price: p.price, marketName: p.marketName || "" });
        }}
        className="absolute top-3 right-3 p-2 rounded-xl bg-primary/10 text-primary opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary hover:text-black z-10"
        aria-label={`Adicionar ${p.name} à comparação`}
      >
        <PlusCircle className="h-4 w-4" />
      </button>
      <div className="h-20 w-20 shrink-0 rounded-[var(--radius-lg)] bg-[var(--bg-surface-elevated)] flex items-center justify-center overflow-hidden border border-[var(--border-subtle)]">
        <img 
          src={`https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&q=80&w=200&h=200&market=${p.marketName}&product=${p.name}`} 
          alt={p.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          onError={(e) => {
             (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=F1F5F9&color=C5A02D&bold=true`;
          }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[9px] font-black uppercase tracking-wider text-[var(--brand-primary)]">{p.marketName}</span>
          <span className="text-[8px] font-bold text-[var(--text-tertiary)]">{formatDate(p.when)}</span>
        </div>
        <h4 className="font-bold text-[14px] leading-tight truncate group-hover:text-[var(--brand-primary)] transition-colors">{p.name}</h4>
        <div className="mt-0.5">
          <Price value={p.price} size="md" className="font-black" />
        </div>
      </div>
    </motion.div>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [sort, setSort] = useState<"recent" | "price">("recent");

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
    
    if (sort === "price") {
      list.sort((a, b) => a.price - b.price);
    } else {
      list.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());
    }
    
    return list.slice(0, 4);
  }, [rawRecentProducts, sort]);

  const categories = CATEGORIES; // Alias for mapping in JSX

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] selection:bg-[var(--brand-primary)]/30 overflow-x-hidden">
      <SiteHeader variant="overlay" />
      
      {/* Refactored Hero Section */}
      <section className="relative flex flex-col items-center justify-center pt-20 pb-16 px-4 min-h-[50vh]">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-transparent opacity-95 dark:from-slate-950 dark:via-slate-950" />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center blur-[2px]"
          />
        </div>

        <div className="relative z-10 w-full max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 mb-6">
            <Sparkles className="h-3 w-3 text-[var(--brand-primary)]" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--brand-primary)]">
              Inteligência em Feijó
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-[var(--text-primary)]">
            Economia para <span className="text-[var(--brand-primary)]">nossa Feijó.</span>
          </h1>
          <p className="text-base text-[var(--text-secondary)] mb-8 max-w-lg mx-auto font-medium">
            Preços atualizados nos mercados da cidade para você economizar de verdade.
          </p>
          <div className="max-w-2xl mx-auto">
            <SmartSearchBar onFocusChange={setIsSearchFocused} />
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {CATEGORIES.slice(0, 4).map((cat) => (
                <Link
                  key={cat.slug}
                  to="/buscar"
                  search={{ q: cat.label } as any}
                  className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-white/60 hover:bg-[var(--brand-primary)]/10 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/20 transition-all backdrop-blur-md"
                >
                  {cat.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content: Baskets & Recent Products in one compact grid */}
      <main className="max-w-7xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 space-y-12">
              <section id="baskets-section">
                <OptimizedBasketSection />
              </section>
              <section>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--brand-primary)]">Monitoramento Ativo</h2>
                    <h3 className="text-xl font-black text-[var(--text-primary)]">Preços em Feijó</h3>
                  </div>
                  <div className="flex bg-[var(--bg-surface-elevated)] p-1 rounded-xl border border-[var(--border-subtle)] w-fit">
                    {[
                      { id: "recent", label: "Novos" },
                      { id: "price", label: "Baratos" },
                    ].map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSort(s.id as any)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
                          sort === s.id ? "bg-[var(--brand-primary)] text-white shadow-sm" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredProducts.map((p, i) => (
                    <ProductCardItem key={`${p.name}-${p.when}`} p={p} i={i} onSelect={setSelectedProduct} />
                  ))}
                </div>
              </section>
           </div>
           
           <aside className="space-y-12">
              <section>
                 <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)] mb-6">Nossos Parceiros</h2>
                 <div className="grid grid-cols-2 gap-3">
                   <RegisteredStoresCarousel />
                 </div>
              </section>
              <section>
                <PromoBanner />
              </section>
            </aside>
        </div>

        {/* Categories Section Added for Compact Navigation */}
        <div className="mt-20">
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)] mb-8 text-center">Categorias Populares</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
            {CATEGORIES.map((cat, idx) => (
              <CategoryCard key={cat.slug} {...cat} index={idx} />
            ))}
          </div>
        </div>

        <div className="mt-20 pt-12 border-t border-[var(--border-subtle)]">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--brand-primary)] mb-8 text-center">Monitoramento em Tempo Real</h2>
          <div className="max-w-4xl mx-auto">
            <RealtimeMonitoringDashboard />
          </div>
        </div>

        <ComparisonStickyBar />

        {/* Footer Hero Section */}
        <section className="mt-32 relative h-[400px] w-full rounded-[var(--radius-xl)] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent z-10" />
          <img 
            src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=2000" 
            alt="Interior do Supermercado" 
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="relative z-20 h-full flex flex-col items-center justify-center text-center px-4">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Economia inteligente, de verdade.</h2>
            <p className="text-lg text-white/80 max-w-xl mx-auto font-medium mb-8">
              Trazemos a transparência que Feijó precisava para o seu bolso.
            </p>
            <Button asChild size="lg" className="pc-button-primary">
              <Link to="/buscar">Começar a Economizar</Link>
            </Button>
          </div>
        </section>
      </main>

      {selectedProduct && (
        <ProductQuickView 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
        />
      )}
    </div>
  );
}

function StatItem({ label, value, prefix = "", suffix = "" }: { label: string; value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  
  useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 2000;
    const increment = end / (duration / 16);
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplay(end);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <div className="flex flex-col items-center">
      <span className="text-3xl sm:text-4xl font-black text-white mb-1">
        {prefix}{display.toLocaleString()}{suffix}
      </span>
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
        {label}
      </span>
    </div>
  );
}

function FloatingPrice({ className, name, price, delay }: { className: string; name: string; price: number; delay: number }) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: [0, -15, 0], opacity: 1 }}
      transition={{ 
        y: { duration: 4, repeat: Infinity, ease: "easeInOut", delay },
        opacity: { duration: 0.8, delay: 0.5 }
      }}
      className={cn("absolute z-10 px-4 py-3 rounded-2xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl flex flex-col gap-0.5 min-w-[120px]", className)}
    >
      <span className="text-[9px] font-black uppercase tracking-wider text-white/50">{name}</span>
      <span className="text-xl font-black text-[var(--brand-primary)]">R$ {price.toFixed(2)}</span>
      <div className="mt-1 h-1 w-full bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 w-[70%]" />
      </div>
    </motion.div>
  );
}

function CategoryCard({ slug, label, Icon, index }: { slug: string; label: string; Icon: any; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + (index * 0.05), duration: 0.5 }}
    >
      <Link 
        to="/buscar" 
        search={{ c: label } as any}
        className="group relative flex flex-col items-center justify-center gap-2 p-4 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-[var(--brand-primary)]/40 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-primary)]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--bg-surface-elevated)] text-[var(--brand-primary)] group-hover:bg-[var(--brand-primary)] group-hover:text-white transition-all duration-300 shadow-inner">
          <Icon className="h-7 w-7" />
        </div>
        
        <div className="relative z-10 text-center">
          <h3 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors">
            {label}
          </h3>
          <p className="text-[9px] font-black uppercase tracking-wider text-[var(--text-tertiary)] mt-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
            Ver Ofertas
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
