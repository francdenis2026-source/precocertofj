import { motion } from "framer-motion";
import { TrendingDown, ShoppingBag, PiggyBank, RefreshCw } from "lucide-react";
import { Price } from "@/components/ds/Price";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { searchProductPrice } from "@/lib/price-search.functions";
import { Route } from "@/routes/buscar";
import { Skeleton } from "@/components/ui/skeleton";

export function SearchDashboard() {
  const { q } = Route.useSearch();
  const runSearch = useServerFn(searchProductPrice);
  const { data: result, isLoading } = useQuery({
    queryKey: ["price-search", q],
    queryFn: () => runSearch({ data: { query: q || "" } }),
    enabled: true,
  });

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
          className="bg-white dark:bg-card/40 backdrop-blur-md border border-border p-6 rounded-[32px] shadow-sm hover:shadow-xl hover:border-primary transition-all duration-300 group"
        >
          <div className="flex items-center gap-2 mb-1 text-muted-foreground">
            {stat.icon}
            <span className="text-[10px] font-bold uppercase tracking-wider">{stat.label}</span>
          </div>
          {stat.isNumber ? (
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {stat.value}
            </div>
          ) : (
            <Price value={stat.value} size="lg" tone={stat.tone} />
          )}
        </motion.div>
      ))}
    </div>
  );
}
