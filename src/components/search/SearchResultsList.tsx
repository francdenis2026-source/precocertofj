import { usePriceSearch } from "@/lib/use-price-search";
import { Route } from "@/routes/buscar";
import { motion, AnimatePresence } from "framer-motion";
import { PremiumOfferCard } from "./PremiumOfferCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Price } from "@/components/ds/Price";
import { ArrowUpDown, Filter, ShoppingBag } from "lucide-react";

export function SearchResultsList() {
  const { q } = Route.useSearch();
  const { data: result, isPending: isLoading } = usePriceSearch(q);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-[4/5] w-full rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] animate-pulse" />
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
                <option>Menor Preço</option>
                <option>Maior Economia</option>
                <option>Mais Relevantes</option>
              </select>
            </div>
          </div>
       </div>

       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {result.groups.map((group, i) => (
              <motion.div
                key={group.productName}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <PremiumOfferCard group={group} isBest={i === 0} />
              </motion.div>
            ))}
          </AnimatePresence>
       </div>
    </div>
  );
}