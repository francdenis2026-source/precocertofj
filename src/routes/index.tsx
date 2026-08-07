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
  { slug: "supermercados", label: "Mercados", Icon: Store, color: "#D4AF37" },
  { slug: "padarias", label: "Padarias", Icon: Coffee, color: "#0B1E3A" },
  { slug: "acougues", label: "Açougues", Icon: Utensils, color: "#1E293B" },
  { slug: "hortifruti", label: "Hortifruti", Icon: Apple, color: "#D4AF37" },
  { slug: "bebidas", label: "Bebidas", Icon: Milk, color: "#0B1E3A" },
  { slug: "limpeza", label: "Limpeza", Icon: Droplets, color: "#1E293B" },
  { slug: "higiene", label: "Higiene", Icon: Smile, color: "#D4AF37" },
];

function formatDate(iso: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function HomePage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [sort, setSort] = useState<"recent" | "price" | "near">("recent");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (sort === "near" && !userLocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
          console.error("Erro ao obter localização:", err);
          setSort("recent");
        }
      );
    }
  }, [sort, userLocation]);

  useEffect(() => {
    const handler = (e: any) => setSelectedProduct(e.detail);
    window.addEventListener('open-quick-view', handler);
    window.addEventListener('internal-open-quick-view', handler);
    return () => {
      window.removeEventListener('open-quick-view', handler);
      window.removeEventListener('internal-open-quick-view', handler);
    };
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
    
    if (sort === "price") {
      list.sort((a, b) => a.price - b.price);
    } else if (sort === "near" && userLocation) {
      const getDist = (p: any) => {
        if (!p.lat || !p.lng) return 999999;
        return Math.sqrt(
          Math.pow(p.lat - userLocation.lat, 2) + 
          Math.pow(p.lng - userLocation.lng, 2)
        );
      };
      list.sort((a, b) => getDist(a) - getDist(b));
    } else if (sort === "recent") {
      list.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());
    }
    
    return list.slice(0, 6);
  }, [rawRecentProducts, sort]);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] selection:bg-[var(--brand-primary)]/30 overflow-x-hidden">
      <SiteHeader variant="overlay" />
      
      {/* Hero Section */}
      <div className="relative min-h-[85vh] flex flex-col pt-20 pb-16 overflow-hidden">
        {/* Visual Background */}
        <div className="absolute inset-0 z-0">
          <motion.div
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1.05, opacity: 1 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: "url('https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=2000')",
              filter: isSearchFocused ? "brightness(0.3) blur(8px)" : "brightness(0.5) blur(2px)"
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-[var(--bg-base)]" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-7xl mx-auto px-4 w-full text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl w-full"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-8">
              <Sparkles className="h-4 w-4 text-[var(--brand-primary)]" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
                Inteligência para economizar em Feijó
              </span>
            </div>

            <h1 className="text-4xl sm:text-7xl font-black tracking-tight text-white leading-[0.9] mb-8">
              Sua economia começa <br />
              <span className="text-[var(--brand-primary)]">com inteligência</span>
            </h1>

            <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-12 font-medium">
              Monitoramos os mercados de Feijó em tempo real para você pagar sempre o menor preço em cada item da sua lista.
            </p>

            <div className="w-full max-w-2xl mx-auto mb-10">
              <SmartSearchBar onFocusChange={setIsSearchFocused} />
            </div>

            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <Button 
                onClick={() => navigate({ to: "/comparador" })}
                onMouseEnter={() => {
                   import("@/lib/prefetch.functions").then(m => m.prefetchComparisonData({ data: {} }));
                }}
                onFocus={() => {
                   import("@/lib/prefetch.functions").then(m => m.prefetchComparisonData({ data: {} }));
                }}
                className="h-12 px-8 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md font-black uppercase tracking-wider text-[11px]"
                aria-label="Ir para ferramenta de comparação de produtos"
              >
                <Scale className="mr-2 h-4 w-4 text-[var(--brand-primary)]" />
                Comparar Produtos
              </Button>
              <Button 
                onClick={() => {
                  const el = document.getElementById('baskets-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                variant="ghost"
                className="h-12 px-8 rounded-xl text-white/70 hover:text-white hover:bg-white/5 font-black uppercase tracking-wider text-[11px]"
                aria-label="Ver melhores cestas de produtos"
              >
                Melhores Cestas
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {[
                { label: "Produtos", val: loaderData.stats?.productsCount || "2.4k+" },
                { label: "Mercados", val: loaderData.stats?.storesCount || "12" },
                { label: "Atualizações", val: "Diárias" },
                { label: "Economia", val: "Até 30%" },
              ].map((s) => (
                <div key={s.label} className="flex flex-col">
                  <span className="text-2xl font-black text-white">{s.val}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/50">{s.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <main className="relative z-10 -mt-12">
        {/* Categories Section */}
        <section className="max-w-7xl mx-auto px-4 mb-20">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
            {CATEGORIES.map((cat, i) => (
              <Link
                key={cat.slug}
                to="/buscar"
                search={{ q: cat.label }}
                className="pc-card group flex flex-col items-center justify-center gap-4 p-6 text-center"
              >
                <div className="h-12 w-12 rounded-2xl bg-[var(--bg-surface-elevated)] flex items-center justify-center transition-colors group-hover:bg-[var(--brand-primary)]">
                  <cat.Icon className="h-6 w-6 text-[var(--text-secondary)] group-hover:text-black" />
                </div>
                <span className="text-[13px] font-bold">{cat.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Promotional Banner */}
        <section className="max-w-7xl mx-auto px-4 mb-24">
          <PromoBanner />
        </section>

        {/* Shopping Optimization */}
        <section id="baskets-section" className="max-w-7xl mx-auto px-4 mb-24">
          <OptimizedBasketSection />
        </section>

        {/* Live Prices / Recent Products */}
        <section className="max-w-7xl mx-auto px-4 mb-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--brand-primary)] mb-2">Monitoramento Ativo</h2>
              <h3 className="text-3xl font-black tracking-tight">Preços Reais em Feijó</h3>
            </div>
            
            <div className="flex bg-[var(--bg-surface-elevated)] p-1 rounded-2xl border border-[var(--border-subtle)]">
              {[
                { id: "recent", label: "Novos", icon: Clock },
                { id: "price", label: "Baratos", icon: TrendingDown },
                { id: "near", label: "Perto", icon: MapPin },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSort(s.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold uppercase transition-all",
                    sort === s.id ? "bg-[var(--brand-primary)] text-black" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <s.icon className="h-3.5 w-3.5" />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((p, i) => {
              const { addItem } = useComparisonList();
              return (
                <motion.div
                  key={`${p.name}-${p.when}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => setSelectedProduct({ 
                    name: p.name, 
                    minPrice: p.price, 
                    cheapestStore: p.marketName,
                    updatedAt: p.when
                  })}
                  className="pc-card group cursor-pointer flex gap-4 items-center relative"
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
                  <div className="h-16 w-16 shrink-0 rounded-2xl bg-[var(--bg-surface-elevated)] flex items-center justify-center">
                    <span className="text-xl font-black text-[var(--brand-primary)]">{(p.name || "?").charAt(0)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[var(--brand-primary)]">{p.marketName}</span>
                      <span className="text-[10px] font-bold text-[var(--text-tertiary)]">{formatDate(p.when)}</span>
                    </div>
                    <h4 className="font-bold text-[15px] truncate group-hover:text-[var(--brand-primary)] transition-colors">{p.name}</h4>
                    <div className="mt-1">
                      <Price value={p.price} size="lg" className="font-black" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
          
          <div className="mt-20">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--brand-primary)] mb-8 text-center">Monitoramento Inteligente (Real-time)</h2>
            <RealtimeMonitoringDashboard />
          </div>

          <div className="mt-20 text-center">
            <Link to="/buscar" search={{ q: "" }} className="pc-button-secondary">
              Ver Catálogo Completo <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Registered Stores */}
        <section className="max-w-7xl mx-auto px-4 pb-24">
           <div className="flex items-center justify-between mb-8">
             <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-tertiary)]">
               Nossa rede de colaboração
             </h2>
             <Link to="/estabelecimentos" className="text-[10px] font-black uppercase tracking-wider text-[var(--brand-primary)] hover:underline">
               Ver todos os mercados
             </Link>
           </div>
           <RegisteredStoresCarousel />
        </section>

        {/* CTA Section */}
        <section className="max-w-7xl mx-auto px-4 pb-32">
          <div className="pc-card p-12 bg-gradient-to-br from-[var(--bg-surface-elevated)] to-[var(--bg-surface)] border-[var(--brand-primary)]/20 relative overflow-hidden text-center">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Scale className="h-40 w-40 rotate-12" />
            </div>
            
            <h2 className="text-3xl font-black mb-4">Economia Profissional</h2>
            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto mb-8 font-medium">
              Use nossa ferramenta avançada de comparação para analisar preços em tempo real, identificar indisponibilidades e encontrar o melhor custo total para sua compra.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <Button 
                onClick={() => navigate({ to: "/comparador" })}
                className="h-14 px-10 rounded-2xl bg-[var(--brand-primary)] text-black font-black uppercase tracking-widest text-[12px] hover:brightness-110 shadow-xl shadow-[var(--brand-primary)]/20"
              >
                Acessar Comparador de Preços
              </Button>
            </div>
          </div>
        </section>
        
        <ComparisonStickyBar />
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
        to="/categoria/$slug" 
        params={{ slug: slug as any }}
        className="group relative flex flex-col items-center justify-center gap-3 p-6 rounded-[var(--pc-radius-lg)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-[var(--pc-shadow-md)] transition-all duration-300 hover:shadow-[var(--pc-shadow-lg)] hover:-translate-y-2 hover:border-[var(--brand-primary)]/40 overflow-hidden"
      >
        {/* Glow Hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-primary)]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-surface-elevated)] text-[var(--brand-primary)] group-hover:bg-[var(--brand-primary)] group-hover:text-[var(--pc-brand-navy)] transition-all duration-300 shadow-inner">
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