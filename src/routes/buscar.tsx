import { createFileRoute, useNavigate, retainSearchParams } from "@tanstack/react-router";
import { Suspense, useState, useEffect } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { PriceSearchBar } from "@/components/scanner/PriceSearchBar";
import { SearchHeroSection } from "@/components/search/SearchHeroSection";
import { SearchDashboard } from "@/components/search/SearchDashboard";
import { SearchFiltersPanel } from "@/components/search/SearchFiltersPanel";
import { SearchResultsList } from "@/components/search/SearchResultsList";
import { SimilarProductsSection } from "@/components/search/SimilarProductsSection";
import { SearchMarketsSection } from "@/components/search/SearchMarketsSection";
import { IsolatedPage } from "@/components/layout/IsolatedPage";
import { SearchDiscovery } from "@/components/search/SearchDiscovery";
import { motion, AnimatePresence } from "framer-motion";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  categoria: fallback(z.string(), "").default(""),
  mode: fallback(z.string(), "strict").default("strict"),
  pure: fallback(z.string(), "1").default("1"),
  brand: fallback(z.string(), "").default(""),
  min: fallback(z.string(), "").default(""),
  max: fallback(z.string(), "").default(""),
  sort: fallback(z.string(), "cheapest").default("cheapest"),
  product: fallback(z.string(), "").default(""),
  market: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/buscar")({
  validateSearch: zodValidator(searchSchema),
  search: {
    middlewares: [
      retainSearchParams([
        "q",
        "categoria",
        "mode",
        "pure",
        "brand",
        "min",
        "max",
        "sort",
        "product",
        "market",
      ]),
    ],
  },
  component: SearchPage,
});

function SearchPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/buscar" });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handlePickQuery = (q: string) => {
    navigate({ search: (prev: any) => ({ ...prev, q }), replace: !!search.q });
  };

  return (
    <IsolatedPage fit={false} className="pc-search-scope min-h-screen bg-[#F8F9FA] dark:bg-[#050E1B] selection:bg-primary selection:text-primary-foreground">
      <div className="flex min-h-svh flex-col">
        {/* Sticky Search Header */}
        <header 
          className={cn(
            "sticky top-0 z-50 transition-all duration-500 border-b border-border/40",
            scrolled 
              ? "bg-background/80 backdrop-blur-2xl py-3 shadow-[0_8px_32px_rgba(0,0,0,0.08)] translate-y-0" 
              : "bg-transparent py-6"
          )}
        >
           <div className="mx-auto max-w-7xl px-4 flex items-center gap-6">
             <motion.div 
               initial={false}
               animate={{ scale: scrolled ? 0.95 : 1 }}
               className="flex-1"
             >
               <PriceSearchBar 
                 initialQuery={search.q} 
                 onQueryChange={(q) => navigate({ search: (prev: any) => ({ ...prev, q }), replace: !!search.q })}
                 fitResults={false}
               />
             </motion.div>
           </div>
        </header>

        <AnimatePresence mode="wait">
          {search.q ? (
            <motion.main 
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mx-auto w-full max-w-7xl px-4 py-8 md:py-12 space-y-12 pb-24"
            >
              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                  <SearchHeroSection query={search.q} />
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                >
                  <SearchDashboard />
                </motion.div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-10 items-start">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="lg:sticky lg:top-32"
                >
                  <SearchFiltersPanel isOpen={filtersOpen} onToggle={() => setFiltersOpen(!filtersOpen)} />
                </motion.div>

                <div className="space-y-20">
                  <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                  >
                    <SearchResultsList />
                  </motion.section>

                  <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                  >
                    <SearchMarketsSection />
                  </motion.section>

                  <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                  >
                    <SimilarProductsSection query={search.q} />
                  </motion.section>
                </div>
              </div>
            </motion.main>
          ) : (
            <motion.main 
              key="discovery"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.5, ease: "circOut" }}
              className="flex-1 flex flex-col items-center justify-center p-6 max-w-5xl mx-auto w-full"
            >
               <div className="w-full text-center space-y-6 mb-16">
                 <motion.h1 
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: 0.2 }}
                   className="text-5xl md:text-7xl font-black tracking-tight text-foreground leading-[1.1]"
                 >
                   Encontre o melhor <br />
                   <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">preço em Feijó.</span>
                 </motion.h1>
                 <motion.p 
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: 0.3 }}
                   className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
                 >
                   Compare ofertas em tempo real e economize em cada compra com inteligência e praticidade.
                 </motion.p>
               </div>
               
               <motion.div 
                 initial={{ opacity: 0, y: 40 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.4, type: "spring", damping: 20 }}
                 className="w-full relative group"
               >
                 <div className="absolute -inset-4 bg-gradient-to-b from-primary/10 to-transparent rounded-[60px] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                 <div className="relative w-full bg-card/60 backdrop-blur-3xl border border-white/10 dark:border-white/5 rounded-[48px] p-8 md:p-12 shadow-[0_32px_128px_rgba(0,0,0,0.1)]">
                   <SearchDiscovery onPickQuery={handlePickQuery} />
                 </div>
               </motion.div>
            </motion.main>
          )}
        </AnimatePresence>
      </div>
    </IsolatedPage>
  );
}
