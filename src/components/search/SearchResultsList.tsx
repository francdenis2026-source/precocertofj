import { usePriceSearch } from "@/lib/use-price-search";
import { Route } from "@/routes/buscar";
import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { useEffect, useState, useMemo, lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const PremiumOfferCard = lazy(() => import("./PremiumOfferCard").then(m => ({ default: m.PremiumOfferCard })));

const ITEMS_PER_PAGE = 20;

export function SearchResultsList() {
  const { q, c } = Route.useSearch();
  const { data: result, isPending: isLoading } = usePriceSearch(q, c);
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  
  const { ref, inView } = useInView({
    threshold: 0.1,
    rootMargin: "200px",
  });

  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE);
  }, [q, c]);

  useEffect(() => {
    if (inView && result && displayCount < result.groups.length) {
      setDisplayCount(prev => prev + ITEMS_PER_PAGE);
    }
  }, [inView, result, displayCount]);

  const visibleGroups = useMemo(() => {
    if (!result?.groups) return [];
    return result.groups.slice(0, displayCount);
  }, [result, displayCount]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-[200px] w-full rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] animate-pulse" />
        ))}
      </div>
    );
  }

  if (!result || !result.groups.length) return null;

  return (
    <div className="space-y-8">
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Ofertas em Feijó</h2>
            <p className="text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
              {result.groups.length} {result.groups.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[var(--bg-surface)] px-4 py-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] shadow-[var(--shadow-sm)]">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Ordenar:</label>
              <select className="bg-transparent text-[12px] font-bold focus:outline-none cursor-pointer text-[var(--text-primary)]">
                <option>Melhor Preço</option>
                <option>Maior Economia</option>
                <option>Mais Relevante</option>
              </select>
            </div>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
          <AnimatePresence mode="popLayout">
            {visibleGroups.map((group, i) => (
              <motion.div
                key={group.productName}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ 
                  duration: 0.4, 
                  delay: (i % ITEMS_PER_PAGE) * 0.03,
                  ease: [0.16, 1, 0.3, 1] 
                }}
              >
                <Suspense fallback={<div className="h-[180px] w-full rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] animate-pulse" />}>
                  <PremiumOfferCard group={group} isBest={i === 0 && !q} />
                </Suspense>
              </motion.div>
            ))}
          </AnimatePresence>
       </div>

       {displayCount < result.groups.length && (
         <div ref={ref} className="flex justify-center py-12">
           <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]">
             <Loader2 className="h-5 w-5 animate-spin text-[var(--brand-primary)]" />
             <span className="text-sm font-bold text-[var(--text-secondary)]">Carregando mais ofertas...</span>
           </div>
         </div>
       )}

    </div>
  );
}
