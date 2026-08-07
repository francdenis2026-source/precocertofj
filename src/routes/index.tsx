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
  Sparkles
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
      <SiteHeader variant="overlay" showThemeToggle />
      
      {/* Premium Hero Section */}
      <div className="relative min-h-[92vh] flex flex-col pt-20 pb-16 overflow-hidden">
        {/* Background Layer with Parallax-like effect (Dynamic Blur) */}
        <div className="absolute inset-0 z-0">
          <motion.div
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1.05, opacity: 1 }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: "url('https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=2000')",
              filter: isSearchFocused ? "brightness(0.3) blur(12px)" : "brightness(0.6) blur(4px)"
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--bg-base)]/40 to-[var(--bg-base)]" />
          <div className="absolute inset-0 bg-black/30" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-7xl mx-auto px-4 w-full text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl mb-8">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--brand-primary)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--brand-primary)]"></span>
              </span>
              <span className="text-[11px] font-black uppercase tracking-[0.25em] text-white/90">
                Atualizado em tempo real <span className="text-[var(--brand-primary)] mx-1">·</span> Feijó, AC
              </span>
            </div>

            <h1 className="text-5xl sm:text-8xl font-black tracking-tight text-white leading-[0.85] mb-10">
              A inteligência que seu <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-primary)] via-[#FFF5D1] to-[var(--brand-primary)] bg-[length:200%_auto] animate-[gradient-x_4s_linear_infinite] drop-shadow-2xl">
                dinheiro merece
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed mb-12 font-medium">
              Não aceite pagar mais caro. Nossa plataforma monitora todos os mercados da nossa Feijó para você economizar em cada item do carrinho.
            </p>

            {/* Centralized Search - The heart of the experience */}
            <div className="w-full max-w-3xl mx-auto mb-16 relative">
              <SmartSearchBar onFocusChange={setIsSearchFocused} />
              <AnimatePresence>
                {!isSearchFocused && (
                   <motion.div 
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     exit={{ opacity: 0 }}
                     className="absolute -bottom-8 left-0 right-0 flex justify-center gap-6 text-[11px] font-bold text-white/40 uppercase tracking-widest"
                   >
                     <span>Produtos Populares: Feijão, Arroz, Leite, Óleo</span>
                   </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Real-time Stats Section */}
          <section className="w-full max-w-5xl mx-auto pt-8 border-t border-white/10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <StatItem label="Produtos" value={loaderData.stats?.productsCount || 2450} suffix="+" />
              <StatItem label="Mercados" value={loaderData.stats?.storesCount || 12} />
              <StatItem label="Notas Recebidas" value={142} suffix="k" />
              <StatItem label="Economia Gerada" value={loaderData.economy?.totalSaved || 85} prefix="R$" suffix="k" />
            </div>
          </section>
        </div>

        {/* Floating Price Elements (Visual purely) */}
        <FloatingPrice 
          className="top-[20%] left-[5%] hidden lg:block" 
          name="Arroz 5kg" 
          price={24.90} 
          delay={0}
        />
        <FloatingPrice 
          className="bottom-[30%] right-[8%] hidden lg:block" 
          name="Leite 1L" 
          price={4.85} 
          delay={1.5}
        />
      </div>

      <main className="relative z-10 bg-[var(--bg-base)]">
        {/* Category Dashboard */}
        <section className="max-w-7xl mx-auto px-4 -mt-10 mb-20 relative z-20">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
            {CATEGORIES.map((cat, i) => (
              <CategoryCard key={cat.slug} {...cat} index={i} />
            ))}
          </div>
        </section>

        {/* Promo Showcase */}
        <section className="max-w-7xl mx-auto px-4 mb-24">
          <PromoBanner />
        </section>

        {/* Optimized Baskets - Smart Intelligence System */}
        <section className="max-w-7xl mx-auto px-4 mb-24">
          <OptimizedBasketSection />
        </section>

        {/* Live Market Insights (formerly Recent Products) */}
        <section className="max-w-7xl mx-auto px-4 mb-24">
          <RecentProductsCarousel />
        </section>





        {/* Dashboard Table Section */}
        <section className="max-w-7xl mx-auto px-4 mb-24">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="min-w-0">
              <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-[var(--brand-primary)] mb-1">
                Monitoramento ao vivo
              </h2>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-primary)]">
                Preços reais em toda a nossa Feijó
              </h3>
            </div>

            
            <div className="flex items-center gap-2 bg-[var(--bg-surface-elevated)] p-1 rounded-xl border border-[var(--border-subtle)]">
              <button 
                onClick={() => setSort("recent")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                  sort === "recent" ? "bg-[var(--brand-primary)] text-white dark:text-black shadow-lg" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                <Clock className="h-3.5 w-3.5" />
                Novos
              </button>
              <button 
                onClick={() => setSort("price")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                  sort === "price" ? "bg-[var(--brand-primary)] text-white dark:text-black shadow-lg" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                <TrendingDown className="h-3.5 w-3.5" />
                Baratos
              </button>
              <button 
                onClick={() => setSort("near")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                  sort === "near" ? "bg-[var(--brand-primary)] text-white dark:text-black shadow-lg" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                <MapPin className="h-3.5 w-3.5" />
                Perto
              </button>
            </div>
          </div>

          <div className="rounded-[32px] overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--pc-shadow-lg)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]/50">
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Produto</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Mercado</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)] text-right">Preço</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)] text-right">Atualização</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {filteredProducts.map((p, i) => (
                    <motion.tr
                      key={`${p.name}-${p.when}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => setSelectedProduct({ 
                        name: p.name, 
                        minPrice: p.price, 
                        cheapestStore: p.marketName,
                        updatedAt: p.when
                      })}
                      className="group cursor-pointer hover:bg-[var(--bg-surface-elevated)]/50 transition-colors"
                    >
                      <td className="px-6 py-5">
                         <div className="flex items-center gap-3">
                           <div className="h-12 w-12 shrink-0 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] overflow-hidden flex items-center justify-center">
                             <span className="text-xs font-black text-[var(--brand-primary)]">{(p.name || "?").charAt(0)}</span>
                           </div>
                           <div>
                             <p className="text-[14px] font-bold text-[var(--text-primary)] leading-tight group-hover:text-[var(--brand-primary)] transition-colors">{p.name}</p>
                             <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] mt-0.5">Catálogo</p>
                           </div>
                         </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <Store className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
                          <span className="text-[13px] font-bold text-[var(--text-secondary)]">{p.marketName ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <Price value={p.price} size="lg" className="font-black" />
                        {i === 0 && <span className="block text-[9px] font-black text-emerald-500 uppercase tracking-tighter">Melhor Oferta</span>}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-1.5 text-[11px] font-bold text-[var(--text-tertiary)]">
                          <Clock className="h-3 w-3" />
                          {formatDate(p.when)}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-6 bg-[var(--bg-surface-elevated)]/30 border-t border-[var(--border-subtle)] text-center">
              <Link to="/buscar" search={{ q: "" }} className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--brand-primary)] hover:underline flex items-center justify-center gap-2">
                Ver catálogo completo <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Partners Carousel */}
        <section className="max-w-7xl mx-auto px-4 pb-24 text-center">
           <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-tertiary)] mb-8">
             Nossa rede de colaboração
           </h2>
           <RegisteredStoresCarousel />
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