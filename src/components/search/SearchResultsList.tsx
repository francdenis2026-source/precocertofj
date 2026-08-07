import { usePriceSearch } from "@/lib/use-price-search";
import { Route } from "@/routes/buscar";
import { motion, AnimatePresence } from "framer-motion";
import { PremiumOfferCard } from "./PremiumOfferCard";
import { Skeleton } from "@/components/ui/skeleton";

export function SearchResultsList() {
  const { q } = Route.useSearch();
  const { data: result, isPending: isLoading } = usePriceSearch(q);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 w-full rounded-2xl bg-muted/20 animate-pulse overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
          </div>
        ))}
      </div>
    );
  }

  if (!result || !result.groups.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
         <p className="text-lg font-bold text-foreground">Nenhum resultado encontrado</p>
         <p className="text-muted-foreground">Tente buscar por um termo diferente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
       <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Melhor Preço</span>
              <Price value={result.min} size="md" tone="best" className="font-bold" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Economia</span>
              <Price value={(result.max ?? 0) - (result.min ?? 0)} size="md" tone="savings" className="font-bold" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Ofertados</span>
              <span className="text-lg font-bold leading-none">{result.samples}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Ordenar por:</label>
            <select className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-xs font-bold focus:ring-1 focus:ring-[var(--brand-primary)]/20 outline-none cursor-pointer text-[var(--text-primary)]">
              <option>Menor Preço</option>
              <option>Maior Preço</option>
              <option>Mais Relevante</option>
            </select>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence mode="popLayout">
            {result.groups.map((group, i) => (
              <motion.div
                key={group.productName}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
              >
                <PremiumOfferCard group={group} isBest={i === 0} />
              </motion.div>
            ))}
          </AnimatePresence>
       </div>
    </div>
  );
}
