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
  MapPin
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
import { ContamigosLogo } from "@/components/brand/ContamigosLogo";
import { ProductQuickView } from "@/components/product/ProductQuickView";
import { HomeSearchSuggestions } from "@/components/home/HomeSearchSuggestions";
import { LogoPreviewList } from "@/components/admin/LogoPreviewList";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

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
  { slug: "supermercados", label: "Mercados", Icon: Store, SVG: GroceryIcon, color: "#D4AF37" }, // Dourado
  { slug: "padarias", label: "Padarias", Icon: Coffee, SVG: BakeryIcon, color: "#0B1E3A" },    // Marinho
  { slug: "acougues", label: "Açougues", Icon: Utensils, SVG: MeatIcon, color: "#1E293B" },    // Slate
  { slug: "hortifruti", label: "Hortifruti", Icon: Apple, SVG: FruitIcon, color: "#D4AF37" },  // Dourado
  { slug: "bebidas", label: "Bebidas", Icon: Milk, SVG: DrinkIcon, color: "#0B1E3A" },       // Marinho
  { slug: "limpeza", label: "Limpeza", Icon: Droplets, SVG: CleaningIcon, color: "#1E293B" },   // Slate
  { slug: "higiene", label: "Higiene", Icon: Smile, SVG: HygieneIcon, color: "#D4AF37" },     // Dourado
];

function HomePage() {
  const navigate = useNavigate();
  const { user, loading: sessionLoading } = useSession();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [q, setQ] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const searchSuggestionsRef = useRef<any>(null);
  const searchAnchorRef = useRef<HTMLFormElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const [sort, setSort] = useState<"recent" | "price" | "near">("recent");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showLogoPreview, setShowLogoPreview] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const availableLogos = [
    { name: "Central Super Color (Dark)", path: "/logos/central-super-color-dark.svg" },
    { name: "Central Super Color", path: "/logos/central-super-color.svg" },
    { name: "Central Super Mono", path: "/logos/central-super-mono.svg" },
    { name: "Claudia v5", path: "/logos/claudia-v5.png" },
    { name: "Comercial Claudia", path: "/logos/comercial-claudia.png" },
    { name: "Doce Dia Color", path: "/logos/doce-dia-color.svg" },
    { name: "Doce Dia Mono", path: "/logos/doce-dia-mono.svg" },
    { name: "Facem Color", path: "/logos/facem-color.svg" },
    { name: "Facem Mono", path: "/logos/facem-mono.svg" },
    { name: "Feijoense Color", path: "/logos/feijoense-color.svg" },
    { name: "Feijoense Mono", path: "/logos/feijoense-mono.svg" },
    { name: "Pague Pouco", path: "/logos/pague-pouco-v6.webp" },
    { name: "Parceirão Color", path: "/logos/parceirao-color.svg" },
    { name: "Parceirão Mono", path: "/logos/parceirao-mono.svg" },
    { name: "Rebouças Color", path: "/logos/reboucas-color.svg" },
    { name: "Rebouças Mono", path: "/logos/reboucas-mono.svg" },
    { name: "Recanto Color", path: "/logos/recanto-color.svg" },
    { name: "Recanto Mono", path: "/logos/recanto-mono.svg" },
    { name: "Ultra Color", path: "/logos/ultra-color.svg" },
    { name: "Ultra Mono", path: "/logos/ultra-mono.svg" },
    { name: "Vanderley Color", path: "/logos/vanderley-color.svg" },
    { name: "Vanderley Mono", path: "/logos/vanderley-mono.svg" },
    { name: "Logo Lockup", path: "/logo-lockup.png" },
    { name: "Logo Mark", path: "/logo-mark.svg" }
  ];


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
    // Removido scroll automático ao focar para evitar travamentos e manter posição
    if (isSearchFocused && searchAnchorRef.current) {
      // Logic for fixed position could be handled via CSS or state if needed
    }
  }, [isSearchFocused]);

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
    
    if (q.trim()) {
      const term = q.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(term));
    }

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
  }, [rawRecentProducts, q, sort]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    navigate({ to: "/buscar", search: { q: q.trim() } as any });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] selection:bg-[var(--brand-primary)]/30">
      <SiteHeader variant="overlay" showThemeToggle />
      
      {/* Backdrop for focused search */}
      <AnimatePresence>
        {isSearchFocused && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm"
            onClick={() => setIsSearchFocused(false)}
          />
        )}
      </AnimatePresence>
      
      {/* Realistic Supermarket Background Hero */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[var(--bg-base)]" />
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.35 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat" 
          style={{ 
            backgroundImage: "url('https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=2000')",
            filter: "brightness(0.6) contrast(1.2) saturate(0.9)"
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--bg-base)]/30 to-[var(--bg-base)]" />
      </div>

      <div className="relative z-10 flex flex-col">
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <script dangerouslySetInnerHTML={{ __html: `
            window.addEventListener('open-quick-view', (e) => {
              window.dispatchEvent(new CustomEvent('internal-open-quick-view', { detail: e.detail }));
            });
          `}} />
          
          {/* Hero Section - Compact & Professional */}
          <motion.section 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center text-center mb-12 pt-2 sm:pt-4"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--bg-surface)]/80 border border-[var(--border-subtle)] mb-6 shadow-sm backdrop-blur-md hover:scale-105 transition-all duration-300 cursor-default"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--brand-primary)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--brand-primary)]"></span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">Economia em Tempo Real <span className="text-[var(--brand-primary)] mx-1" aria-hidden="true">·</span> Feijó, AC</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="font-display text-[32px] sm:text-[64px] font-black tracking-tight leading-[0.95] mb-6 max-w-4xl text-[var(--text-primary)]"
            >
              Clareza e Conexão para sua <span className="text-[var(--brand-primary)]">Economia Real</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-base sm:text-xl text-[var(--text-secondary)] mb-10 max-w-2xl leading-relaxed font-body"
            >
              Compare preços em tempo real com a inteligência do PreçoCerto. A melhor tecnologia para o seu bolso.
            </motion.p>

            <div className={cn(
              "w-full max-w-xl transition-all duration-300",
              isScrolled 
                ? "fixed top-0 left-0 right-0 z-[100] px-4 py-3 bg-[var(--bg-base)]/95 backdrop-blur-md border-b border-[var(--border-subtle)] shadow-lg" 
                : "relative mb-12"
            )}>
              <form 
                ref={searchAnchorRef}
                onSubmit={submitSearch} 
                className={cn(
                  "group relative w-full flex items-center h-[52px] sm:h-[64px] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-1 shadow-md transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] focus-within:border-[var(--brand-primary)] focus-within:ring-8 focus-within:ring-[var(--brand-primary)]/5 mx-auto hover:shadow-xl hover:border-[var(--brand-secondary)]/20",
                  isScrolled && "h-[46px] sm:h-[50px] rounded-lg shadow-sm border-[var(--brand-primary)]/20 max-w-lg scale-[0.98] bg-[var(--bg-surface-elevated)]"
                )}
              >
                <Search className={cn(
                  "ml-4 h-4.5 w-4.5 text-[var(--text-tertiary)] group-focus-within:text-[var(--brand-primary)] group-focus-within:scale-110 transition-all duration-300",
                  isScrolled && "h-4 w-4 ml-3"
                )} />
                <input 
                  value={q} 
                  onChange={(e) => setQ(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  placeholder="O que você deseja economizar hoje?" 
                  className={cn(
                    "flex-1 bg-transparent px-4 text-sm font-medium outline-none text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]",
                    isScrolled && "text-[13px] px-3"
                  )} 
                />
                <Button 
                  type="submit" 
                  className={cn(
                    "hidden sm:flex rounded-lg bg-[var(--brand-secondary)] font-black uppercase tracking-wider text-white hover:brightness-110 active:scale-95 transition-all h-[42px] sm:h-[54px] px-8 text-[11px] shadow-sm hover:shadow-md",
                    isScrolled && "h-[36px] sm:h-[42px] px-6 text-[10px]"
                  )}
                >
                  Buscar
                </Button>
              </form>

              <HomeSearchSuggestions 
                ref={searchSuggestionsRef}
                query={q}
                open={isSearchFocused}
                onClose={() => setIsSearchFocused(false)}
                anchorRef={searchAnchorRef as any}
                isLoggedOut={!user}
                onBlocked={() => {}}
                className={cn(
                  (isSearchFocused || isScrolled) && "fixed top-[54px] sm:top-[60px] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg z-[101]"
                )}
              />
            </div>

            <div className="flex flex-wrap justify-center gap-3 mb-2">
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => navigate({ to: "/registrar" })}
                className="text-[var(--text-primary)] hover:text-[var(--brand-primary)] font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 h-8"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Registrar
              </Button>
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => navigate({ to: "/app" })}
                className="text-[var(--text-primary)] hover:text-[var(--brand-primary)] font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 h-8"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                Painel
              </Button>
            </div>
          </motion.section>


          {/* How It Works Section - More Compact */}
          <Suspense fallback={<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12"><Skeleton className="h-20 w-full rounded-2xl" /><Skeleton className="h-20 w-full rounded-2xl" /><Skeleton className="h-20 w-full rounded-2xl" /></div>}>
          <section className="mb-12 grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
            <motion.div 
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3 sm:gap-4 p-4 sm:p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm hover:shadow-md transition-all"
            >
              <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-lg bg-[var(--brand-primary)]/10 flex items-center justify-center text-[var(--brand-primary)]">
                <Search className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[13px] sm:text-sm font-bold text-[var(--brand-secondary)]">Pesquise</h3>
                <p className="text-[11px] sm:text-[12px] text-[var(--text-secondary)]">Tempo real.</p>
              </div>
            </motion.div>
            
            <motion.div 
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3 sm:gap-4 p-4 sm:p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm hover:shadow-md transition-all"
            >
              <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-lg bg-[var(--brand-secondary)]/10 flex items-center justify-center text-[var(--brand-secondary)]">
                <TrendingDown className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[13px] sm:text-sm font-bold text-[var(--brand-secondary)]">Compare</h3>
                <p className="text-[11px] sm:text-[12px] text-[var(--text-secondary)]">Economize 40%.</p>
              </div>
            </motion.div>
            
            <motion.div 
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="col-span-2 md:col-span-1 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3 sm:gap-4 p-4 sm:p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm hover:shadow-md transition-all"
            >
              <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-lg bg-[var(--brand-accent)]/10 flex items-center justify-center text-[var(--brand-accent)]">
                <PlusCircle className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[13px] sm:text-sm font-bold text-[var(--brand-secondary)]">Colabore</h3>
                <p className="text-[11px] sm:text-[12px] text-[var(--text-secondary)]">Com a rede.</p>
              </div>
            </motion.div>
          </section>
          </Suspense>

          {/* Grid Category Navigation */}
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Categorias Principais</h2>
              <Link to="/buscar" className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--brand-primary)] hover:underline">Ver catálogo completo</Link>
            </div>
            
            <Suspense fallback={<div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">{Array.from({length: 7}).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-[32px]" />)}</div>}>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
              {CATEGORIES.map(({ slug, label, Icon, color }) => (
                <Link 
                  key={slug} 
                  to="/categoria/$slug" 
                  params={{ slug: slug as any }}
                  className="group relative flex flex-col items-center justify-center gap-4 p-6 rounded-[32px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] transition-all duration-300 hover:border-[var(--brand-primary)] hover:-translate-y-1 shadow-sm hover:shadow-xl overflow-hidden"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.03] transition-opacity pointer-events-none" style={{ backgroundColor: color }} />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--bg-base)] border border-[var(--border-subtle)] group-hover:border-[var(--brand-primary)]/30 transition-all">
                    <Icon className="h-8 w-8 text-[var(--brand-primary)]" />
                  </div>
                  <span className="text-sm font-black text-[var(--text-secondary)] group-hover:text-[var(--brand-primary)] transition-colors">
                    {label}
                  </span>
                </Link>
              ))}
            </div>
            </Suspense>
          </section>

          {/* CTA Banner */}
          <section className="mb-16">
            <div className="relative rounded-[32px] sm:rounded-[40px] bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] p-6 sm:p-12 overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 h-full w-1/2 bg-[url('https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=1000')] bg-cover bg-center opacity-10 mix-blend-overlay pointer-events-none" />
              <div className="relative z-10 max-w-xl">
                <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight">Viu um preço novo?</h2>
                <p className="text-lg text-white/80 mb-8 leading-relaxed">Ajude outros moradores de Feijó a economizar registrando o preço que você acabou de encontrar no mercado.</p>
                <Button 
                  onClick={() => navigate({ to: "/registrar" })}
                  className="bg-white text-[var(--brand-primary)] hover:bg-white/90 font-black h-14 px-8 rounded-2xl shadow-xl transition-all active:scale-95 text-lg"
                >
                  Registrar Preço Agora
                </Button>
              </div>
            </div>
          </section>


          {/* New Sections for Recent and Trending Products */}
          <div className="mb-12">
            <Suspense fallback={<Skeleton className="h-[200px] w-full rounded-3xl" />}>
              <RecentProductsCarousel />
            </Suspense>
          </div>

          {/* Live Prices Table */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
            <div className="lg:col-span-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h2 className="section-title font-display font-bold text-[var(--text-primary)] mb-0">Preços ao Vivo</h2>
                
                <div className="flex items-center gap-2">
                  <div className="flex bg-[var(--bg-surface)] p-1 rounded-lg border border-[var(--border-subtle)]">
                    <button 
                      onClick={() => setSort("recent")}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
                        sort === "recent" ? "bg-[var(--brand-primary)] text-white dark:text-black shadow-lg" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      <Clock className="h-3 w-3" />
                      Recentes
                    </button>
                    <button 
                      onClick={() => setSort("price")}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
                        sort === "price" ? "bg-[var(--brand-primary)] text-white dark:text-black shadow-lg" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      <TrendingDown className="h-3 w-3" />
                      Menor Preço
                    </button>
                    <button 
                      onClick={() => setSort("near")}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
                        sort === "near" ? "bg-[var(--brand-primary)] text-white dark:text-black shadow-lg" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      <MapPin className="h-3 w-3" />
                      Perto
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)]/50 backdrop-blur-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)] bg-white/[0.02]">
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Produto</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Mercado</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Preço</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Variação</th>
                        <th className="px-6 py-5" aria-hidden="true"><span className="sr-only">Ações</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {filteredProducts.map((product) => (
                        <tr 
                          key={product.slug} 
                          className="group hover:bg-white/[0.03] transition-colors cursor-pointer"
                          onClick={() => setSelectedProduct(product)}
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] flex items-center justify-center overflow-hidden">
                                <ShoppingCart className="h-5 w-5 text-[var(--text-tertiary)]" />
                              </div>
                              <div>
                                <div className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors">{product.name}</div>
                                <div className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1 mt-0.5">
                                  <Clock className="h-3 w-3" />
                                  {new Date(product.when).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-md bg-[var(--brand-primary)]/10 flex items-center justify-center">
                                <Store className="h-3 w-3 text-[var(--brand-primary)]" />
                              </div>
                              <span className="text-xs font-semibold text-[var(--text-secondary)]">{product.marketName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="text-sm font-black text-[var(--brand-primary)]">
                              <Price value={product.price} />
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            {product.dropPct !== null && (
                              <div className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                                product.dropPct > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                              )}>
                                {product.dropPct > 0 ? <TrendingDown className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5 rotate-180" />}
                                {Math.abs(product.dropPct)}%
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-5 text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" aria-label={`Ver detalhes de ${product.name}`}>
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="p-6 bg-white/[0.01] border-t border-[var(--border-subtle)] text-center">
                  <Button variant="link" className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--brand-primary)] hover:no-underline group">
                    Ver todos os preços 
                    <ArrowRight className="ml-2 h-3 w-3 transition-transform group-hover:translate-x-1" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Platform Stats Column */}
            <div className="lg:col-span-4 space-y-6">
              <div className="p-6 rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-white/20 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-1000"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="h-10 w-10 rounded-xl bg-[var(--brand-primary)]/10 flex items-center justify-center border border-[var(--brand-primary)]/20">
                      <TrendingDown className="h-5 w-5 text-[var(--brand-primary)]" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Economia Estimada</span>
                  </div>
                  
                  <div className="mb-2">
                    <div className="text-4xl font-black tracking-tight mb-1 text-[var(--brand-primary)]">
                      <Price value={loaderData.economy?.total || 0} />
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">Poupados pelos usuários</div>
                  </div>
                  
                  <div className="mt-8 pt-8 border-t border-[var(--border-subtle)]">
                    <div className="flex items-center justify-between">
                      <div className="flex -space-x-3">
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} className="h-8 w-8 rounded-full border-2 border-[var(--bg-surface)] bg-[var(--bg-base)] flex items-center justify-center">
                            <Store className="h-4 w-4 text-[var(--brand-primary)] opacity-40" />
                          </div>
                        ))}
                      </div>
                      <div className="text-[9px] font-black uppercase tracking-wider bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] px-3 py-1.5 rounded-full border border-[var(--brand-primary)]/20">
                        +1.2k usuários ativos
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trending Searches */}
              <div className="p-6 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-surface)]/50 backdrop-blur-xl">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)] mb-6">Buscas em Alta</h3>
                <div className="flex flex-wrap gap-2">
                  {['Arroz 5kg', 'Óleo Soy', 'Leite Integral', 'Açúcar', 'Café', 'Sabão em pó'].map(term => (
                    <button 
                      key={term}
                      onClick={() => navigate({ to: "/buscar", search: { q: term } as any })}
                      className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--brand-primary)]/10 hover:border-[var(--brand-primary)]/30 hover:text-[var(--brand-primary)] transition-all"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Registered Stores Carousel */}
          <Suspense fallback={<Skeleton className="h-[150px] w-full rounded-3xl mb-12" />}>
            <RegisteredStoresCarousel />
          </Suspense>
        </main>
      </div>

      <ProductQuickView 
        product={selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
      />

      <AnimatePresence>
        {showLogoPreview && (
          <LogoPreviewList 
            logos={availableLogos} 
            onClose={() => setShowLogoPreview(false)} 
          />
        )}
      </AnimatePresence>

    </div>
  );
}
