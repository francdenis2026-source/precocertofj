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
    <IsolatedPage fit={!search.q} className="pc-search-scope min-h-screen bg-[#F8F9FA] dark:bg-[#050E1B]">
      <div className="flex min-h-svh flex-col">
        {/* Sticky Search Header */}
        <header className={`sticky top-0 z-50 transition-all duration-300 border-b border-border/40 ${
          scrolled ? "bg-background/95 backdrop-blur-xl py-3 shadow-lg" : "bg-transparent py-4"
        }`}>
           <div className="mx-auto max-w-7xl px-4 flex items-center gap-4">
             <PriceSearchBar 
               initialQuery={search.q} 
               onQueryChange={(q) => navigate({ search: (prev: any) => ({ ...prev, q }), replace: !!search.q })}
               fitResults={false}
             />
           </div>
        </header>

        <AnimatePresence mode="wait">
          {search.q ? (
            <motion.main 
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mx-auto w-full max-w-7xl px-4 py-6 space-y-8"
            >
              <SearchHeroSection query={search.q} />
              <SearchDashboard />
              
              <div className="flex flex-col md:grid md:grid-cols-[280px,1fr] gap-8">
                <SearchFiltersPanel isOpen={filtersOpen} onToggle={() => setFiltersOpen(!filtersOpen)} />
                <div className="space-y-12">
                  <SearchResultsList />
                  <SimilarProductsSection query={search.q} />
                </div>
              </div>
            </motion.main>
          ) : (
            <motion.main 
              key="discovery"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center p-4 max-w-4xl mx-auto w-full"
            >
               <div className="w-full text-center space-y-4 mb-12">
                 <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">
                   Sua economia começa <span className="text-primary italic">aqui</span>.
                 </h1>
                 <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                   Compare preços em tempo real nos principais mercados de Feijó e economize de verdade.
                 </p>
               </div>
               <div className="w-full bg-card border border-border/60 rounded-[40px] p-6 shadow-2xl">
                 <SearchDiscovery onPickQuery={handlePickQuery} />
               </div>
            </motion.main>
          )}
        </AnimatePresence>
      </div>
    </IsolatedPage>
  );
}
