import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { searchProductPrice } from "@/lib/price-search.functions";
import { Route } from "@/routes/buscar";
import { motion, AnimatePresence } from "framer-motion";
import { PremiumOfferCard } from "./PremiumOfferCard";
import { Skeleton } from "@/components/ui/skeleton";

export function SearchResultsList() {
  const { q } = Route.useSearch();
  const runSearch = useServerFn(searchProductPrice);
  const { data: result, isLoading } = useQuery({
    queryKey: ["price-search", q],
    queryFn: () => runSearch({ data: { query: q } }),
    enabled: !!q,
  });

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
    <div className="space-y-6">
       <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            {result.samples} ofertas encontradas
          </h2>
          <select className="bg-transparent text-xs font-bold border-none focus:ring-0 cursor-pointer">
            <option>Menor Preço</option>
            <option>Maior Preço</option>
            <option>Mais Relevante</option>
          </select>
       </div>

       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
