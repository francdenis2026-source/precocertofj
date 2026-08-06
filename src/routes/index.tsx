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
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchSuggestionsRef = useRef<any>(null);
  const searchAnchorRef = useRef<HTMLFormElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const [sort, setSort] = useState<"recent" | "price" | "near">("recent");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showLogoPreview, setShowLogoPreview] = useState(false);

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
    if (isSearchFocused && searchAnchorRef.current) {
      const yOffset = -100; // Ajuste para deixar a barra de busca em uma posição "profissional"
      const y = searchAnchorRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
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
      
      {/* Professional Realism Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[var(--bg-base)]" />
        <motion.div 
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 0.5, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute inset-0 bg-cover bg-center brightness-[0.6] saturate-[1.2]" 
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=2000')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-base)] via-[var(--bg-base)]/95 to-[var(--bg-base)] transition-colors duration-300" />
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
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--brand-primary)]">Ao vivo em Feijó <span className="text-[var(--text-tertiary)] mx-1">·</span> Acre</span>
            </motion.div>
            
            {/* Logo Preview Trigger (Hidden Admin Feature) */}
            <div className="absolute top-4 left-4 z-50 flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowLogoPreview(true)}
                className="rounded-full bg-white/5 border border-white/10 text-[8px] font-black uppercase tracking-widest text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] transition-all"
              >
                Preview Logomarcas
              </Button>
            </div>

            
            <h1 className="font-display text-[32px] sm:text-[40px] font-bold tracking-tight leading-[1.1] mb-6 max-w-2xl text-[var(--text-primary)]">
              Preço Inteligente, Economia Garantida.
            </h1>

            <div className="relative w-full max-w-2xl">
              <form 
                ref={searchAnchorRef}
                onSubmit={submitSearch} 
                className="group relative w-full flex items-center h-[64px] sm:h-[72px] rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 shadow-2xl transition-all duration-300 focus-within:border-[var(--brand-primary)] focus-within:ring-4 focus-within:ring-[var(--brand-primary)]/10"
              >
                <Search className="ml-5 h-6 w-6 text-[var(--text-tertiary)] group-focus-within:text-[var(--brand-primary)] transition-colors" />
                <input 
                  value={q} 
                  onChange={(e) => setQ(e.target.value)}
                  onFocus={() => { console.log("Input focused"); setIsSearchFocused(true); }}
                  onBlur={() => { console.log("Input blurred"); setTimeout(() => setIsSearchFocused(false), 200); }}
                  onKeyDown={(e) => {
                    if (searchSuggestionsRef.current?.handleKeyDown(e)) {
                      // Se a sugestão consumiu o evento, não faz nada
                      return;
                    }
                  }}
                  placeholder="Busque por arroz, feijão, leite..." 
                  className="flex-1 bg-transparent px-5 text-lg font-medium outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]" 
                />
                <Button type="submit" className="hidden sm:flex rounded-full px-10 bg-[var(--brand-primary)] h-[52px] sm:h-[56px] font-bold text-white dark:text-black hover:scale-[1.02] active:scale-95 transition-all shadow-[0_12px_24px_-8px_var(--brand-glow)]">
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
              />
            </div>
          </motion.section>

          {/* Categories Horizontal Navigation */}
          <section className="mb-16">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
              <div className="flex flex-col gap-1">
                <h2 className="section-title mb-0">Navegar por Categoria</h2>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
                  <span className="w-6 h-[1px] bg-[var(--border-subtle)]"></span>
                  Explore nosso catálogo
                </div>
              </div>

              {/* Fast Filter/Search for categories */}
              <div className="relative group/search w-full sm:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)] group-focus-within/search:text-[var(--brand-primary)] transition-colors" />
                <input 
                  type="text"
                  placeholder="Filtrar categorias ou itens..."
                  onChange={(e) => {
                    const term = e.target.value.toLowerCase();
                    const container = document.getElementById('category-scroll-container');
                    if (!container) return;
                    const items = container.querySelectorAll('[data-category-item]');
                    items.forEach((item: any) => {
                      const label = item.getAttribute('data-label')?.toLowerCase() || '';
                      if (label.includes(term) || term === '') {
                        item.style.display = 'flex';
                        item.style.opacity = '1';
                      } else {
                        item.style.display = 'none';
                        item.style.opacity = '0';
                      }
                    });
                  }}
                  className="w-full h-11 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl pl-11 pr-4 text-xs font-medium outline-none focus:border-[var(--brand-primary)]/50 focus:ring-4 focus:ring-[var(--brand-primary)]/5 transition-all"
                />
              </div>
            </div>
            
            <Carousel
              opts={{ align: "start", loop: false, dragFree: true, skipSnaps: true, containScroll: "trimSnaps" }}
              className="group/carousel relative"
            >
              <CarouselContent 
                id="category-scroll-container"
                className="-ml-4 pb-6 select-none"
              >
                {CATEGORIES.map(({ slug, label, Icon, color }) => (
                  <CarouselItem 
                    key={slug} 
                    className="pl-4 basis-[45%] sm:basis-[30%] md:basis-[22%] lg:basis-[18%] xl:basis-[15%] snap-start"
                  >
                    <Link 
                      to="/categoria/$slug" 
                      params={{ slug: slug as any }}
                      data-category-item
                      data-label={label}
                      className="group/card relative flex flex-col items-center justify-end h-[180px] rounded-[24px] overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)] transition-all duration-500 hover:border-[var(--brand-primary)]/40 hover:-translate-y-1 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.5)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-base)]"
                    >
                      {/* Category Ambient Glow */}
                      <div className="absolute inset-0 z-0">
                        <div 
                          className="absolute inset-0 opacity-5 group-hover/card:opacity-15 transition-opacity duration-700" 
                          style={{ 
                            background: `radial-gradient(circle at 50% 40%, ${color} 0%, transparent 70%)`,
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-surface)] via-[var(--bg-surface)]/80 to-transparent transition-colors duration-300" />
                      </div>

                      <div className="relative z-10 w-full p-6 flex flex-col items-center">
                        <div className="relative mb-4">
                          {/* Icon Container with Glassmorphism */}
                          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] dark:bg-white/[0.03] border border-white/10 dark:border-white/10 backdrop-blur-xl text-[var(--text-primary)] group-hover/card:scale-110 group-hover/card:bg-[var(--brand-primary)] group-hover/card:text-white dark:group-hover/card:text-black group-hover/card:border-[var(--brand-primary)] transition-all duration-500 shadow-2xl">
                            <Icon className="h-7 w-7 transition-transform duration-500 group-hover/card:rotate-6" />
                          </div>
                          <div 
                            className="absolute -inset-2 blur-2xl opacity-0 group-hover/card:opacity-20 transition-opacity duration-500 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                        </div>
                        
                        <div className="flex flex-col items-center gap-1.5">
                          <span className="text-sm font-bold tracking-tight text-[var(--text-primary)] group-hover/card:text-[var(--brand-primary)] transition-colors">
                            {label}
                          </span>
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)] group-hover/card:text-[var(--brand-primary)]/70 transition-colors">
                            Explorar
                          </span>
                        </div>
                      </div>
                    </Link>
                  </CarouselItem>
                ))}
                
                <CarouselItem 
                  key="all-categories" 
                  className="pl-4 basis-[45%] sm:basis-[30%] md:basis-[22%] lg:basis-[18%] xl:basis-[15%] snap-start"
                >
                  <Link 
                    to="/buscar" 
                    className="group/card relative flex flex-col items-center justify-center h-[180px] rounded-[24px] border border-dashed border-[var(--border-subtle)] bg-white/[0.01] transition-all duration-500 hover:border-[var(--brand-primary)]/40 hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/5 text-[var(--text-tertiary)] group-hover/card:text-white group-hover/card:border-[var(--brand-primary)]/30 transition-all mb-3">
                      <PlusCircle className="h-6 w-6" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-tertiary)] group-hover/card:text-white transition-colors">Todas</span>
                  </Link>
                </CarouselItem>
              </CarouselContent>
              <CarouselPrevious className="left-[-20px] h-10 w-10 border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--brand-primary)] hover:text-white dark:hover:text-black transition-all shadow-xl z-20" />
              <CarouselNext className="right-[-20px] h-10 w-10 border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--brand-primary)] hover:text-white dark:hover:text-black transition-all shadow-xl z-20" />
            </Carousel>
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
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
                        sort === "recent" ? "bg-[var(--brand-primary)] text-white dark:text-black shadow-lg" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      <Clock className="h-3 w-3" />
                      Recentes
                    </button>
                    <button 
                      onClick={() => setSort("price")}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
                        sort === "price" ? "bg-[var(--brand-primary)] text-white dark:text-black shadow-lg" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      <TrendingDown className="h-3 w-3" />
                      Menor Preço
                    </button>
                    <button 
                      onClick={() => setSort("near")}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
                        sort === "near" ? "bg-[var(--brand-primary)] text-white dark:text-black shadow-lg" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      <MapPin className="h-3 w-3" />
                      Perto
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-[32px] overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)]/50 backdrop-blur-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)] bg-white/[0.02]">
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Produto</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Mercado</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Preço</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Variação</th>
                        <th className="px-6 py-5"></th>
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
                                product.dropPct > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                              )}>
                                {product.dropPct > 0 ? <TrendingDown className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5 rotate-180" />}
                                {Math.abs(product.dropPct)}%
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-5 text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
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
              <div className="p-8 rounded-[32px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] shadow-2xl relative overflow-hidden group">
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
              <div className="p-8 rounded-[32px] border border-[var(--border-subtle)] bg-[var(--bg-surface)]/50 backdrop-blur-xl">
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
          <RegisteredStoresCarousel />
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
