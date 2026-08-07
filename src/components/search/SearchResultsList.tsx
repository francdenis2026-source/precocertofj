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
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-square w-full rounded-3xl bg-white border border-gray-100 animate-pulse overflow-hidden relative" />
        ))}
      </div>
    );
  }

  if (!result || !result.groups.length) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-[40px] border border-gray-100">
         <div className="h-20 w-20 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-200 mb-6">
            <ShoppingBag size={40} />
         </div>
         <h3 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tight">SEM RESULTADOS</h3>
         <p className="text-gray-500 font-bold text-sm max-w-xs mx-auto">Tente buscar por termos mais genéricos ou verifique a ortografia.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
       <div className="flex items-center justify-between border-b border-gray-100 pb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Ordenar:</label>
              <select className="bg-transparent text-xs font-black uppercase tracking-widest focus:outline-none cursor-pointer text-gray-900">
                <option>Menor Preço</option>
                <option>Mais Relevante</option>
              </select>
            </div>
            <button className="lg:hidden flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm text-[10px] font-black uppercase tracking-[0.2em] text-gray-900">
              <Filter size={14} /> Filtros
            </button>
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
            {result.groups.length} PRODUTOS ENCONTRADOS
          </p>
       </div>

       <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {result.groups.map((group, i) => (
              <motion.div
                key={group.productName}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
              >
                <PremiumOfferCard group={group} isBest={i === 0} />
              </motion.div>
            ))}
          </AnimatePresence>
       </div>
    </div>
  );
}
