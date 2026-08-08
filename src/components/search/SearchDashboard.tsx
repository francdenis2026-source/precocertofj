import { motion } from "framer-motion";
import { TrendingDown, ShoppingBag, PiggyBank, RefreshCw } from "lucide-react";
import { Price } from "@/components/ds/Price";
import { usePriceSearch } from "@/lib/use-price-search";
import { Route } from "@/routes/buscar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function SearchDashboard() {
  const { q } = Route.useSearch();
  const { data: result, isPending: isLoading } = usePriceSearch(q);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-[var(--radius-lg)] bg-[var(--bg-surface)] border border-[var(--border-subtle)]" />
        ))}
      </div>
    );
  }

  if (!result || !result.groups.length) return null;

  const stats = [
    { label: "Menor Preço", value: result.min ?? 0, icon: <TrendingDown className="h-4 w-4" />, tone: "best" as const },
    { label: "Economia", value: (result.max ?? 0) - (result.min ?? 0), icon: <PiggyBank className="h-4 w-4" />, tone: "savings" as const },
    { label: "Ofertas", value: result.samples ?? 0, icon: <ShoppingBag className="h-4 w-4" />, isNumber: true },
    { label: "Produtos", value: result.groups.length ?? 0, icon: <RefreshCw className="h-4 w-4" />, isNumber: true },
  ];

  return (
    <div className="bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-[var(--radius-3xl)] p-8 shadow-[var(--pc-shadow-md)]">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:divide-x md:divide-[var(--border-subtle)]">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "flex flex-col gap-1.5",
              i > 0 && "md:pl-8"
            )}
          >
            <div className="flex items-center gap-2">
              <div className="text-[var(--text-tertiary)]">{stat.icon}</div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                {stat.label}
              </span>
            </div>
            <div className="mt-1">
              {stat.isNumber ? (
                <div className="text-2xl font-bold tracking-tight text-[var(--text-primary)] leading-none">
                  {stat.value}
                </div>
              ) : (
                <Price 
                  value={stat.value} 
                  size="lg" 
                  tone={stat.tone} 
                  className="text-2xl font-bold text-[var(--text-primary)] leading-none" 
                />
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}