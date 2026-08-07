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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[400px] w-full rounded-3xl" />
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
    <div className="space-y-10">
       <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight text-foreground">
              Resultados
            </h2>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
              {result.samples} ofertas em tempo real
            </p>
          </div>
          <div className="flex items-center gap-4">
            <select className="bg-white dark:bg-card/50 backdrop-blur-md border border-border rounded-xl px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer">
              <option>Menor Preço</option>
              <option>Maior Preço</option>
              <option>Mais Relevante</option>
            </select>
          </div>
       </div>

       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
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
