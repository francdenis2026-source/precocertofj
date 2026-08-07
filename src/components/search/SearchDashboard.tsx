import { motion } from "framer-motion";
import { TrendingDown, ShoppingBag, PiggyBank, RefreshCw } from "lucide-react";
import { Price } from "@/components/ds/Price";
import { usePriceSearch } from "@/lib/use-price-search";
import { Route } from "@/routes/buscar";
import { Skeleton } from "@/components/ui/skeleton";

export function SearchDashboard() {
  const { q } = Route.useSearch();
  const { data: result, isPending: isLoading } = usePriceSearch(q);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!result || !result.groups.length) return null;

  const stats = [
    { label: "Melhor Preço", value: result.min ?? 0, icon: <TrendingDown className="h-4 w-4" />, tone: "best" as const },
    { label: "Economia", value: (result.max ?? 0) - (result.min ?? 0), icon: <PiggyBank className="h-4 w-4" />, tone: "savings" as const },
    { label: "Ofertados", value: result.samples ?? 0, icon: <ShoppingBag className="h-4 w-4" />, isNumber: true },
    { label: "Produtos", value: result.groups.length ?? 0, icon: <RefreshCw className="h-4 w-4" />, isNumber: true },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-4 rounded-[16px] shadow-sm transition-all duration-300"
        >
          <div className="flex flex-col-reverse gap-0.5">
            {stat.isNumber ? (
              <div className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                {stat.value}
              </div>
            ) : (
              <Price value={stat.value} size="md" tone={stat.tone} className="font-bold" />
            )}
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">{stat.label}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
