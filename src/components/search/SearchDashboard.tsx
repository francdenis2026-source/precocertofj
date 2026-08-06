import { motion } from "framer-motion";
import { TrendingDown, ShoppingBag, PiggyBank, RefreshCw } from "lucide-react";
import { Price } from "@/components/ds/Price";

export function SearchDashboard() {
  const stats = [
    { label: "Melhor Preço", value: 12.90, icon: <TrendingDown className="h-4 w-4" />, tone: "best" as const },
    { label: "Economia", value: 4.50, icon: <PiggyBank className="h-4 w-4" />, tone: "savings" as const },
    { label: "Ofertados", value: 12, icon: <ShoppingBag className="h-4 w-4" />, isNumber: true },
    { label: "Últimas 24h", value: 8, icon: <RefreshCw className="h-4 w-4" />, isNumber: true },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-card border border-border/60 p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
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
