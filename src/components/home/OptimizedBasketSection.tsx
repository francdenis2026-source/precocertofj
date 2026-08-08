import { motion } from "framer-motion";
import { 
  ShoppingBasket, 
  ArrowRight, 
  Store, 
  CheckCircle2, 
  Sparkles,
  Info
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { getOtimizedBaskets } from "@/lib/home-optimized-basket.functions";
import { Price } from "@/components/ds/Price";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function OptimizedBasketSection() {
  const fetchBaskets = useServerFn(getOtimizedBaskets);
  
  const { data, isLoading } = useQuery({
    queryKey: ["home-optimized-baskets"],
    queryFn: () => fetchBaskets(),
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-[400px] w-full rounded-[var(--radius-2xl)] bg-[var(--bg-surface)]" />
        ))}
      </div>
    );
  }

  if (!data?.baskets?.length) return null;

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {data.baskets.slice(0, 2).map((basket, idx) => (
          <BasketCard key={basket.id} basket={basket} index={idx} />
        ))}
      </div>

      <div className="flex items-center justify-center gap-3 py-4 px-6 rounded-xl bg-[var(--bg-surface-elevated)]/30 border border-[var(--border-subtle)] text-[var(--text-tertiary)] text-[10px] font-bold uppercase tracking-widest text-center">
        <Info className="h-4 w-4 text-[var(--brand-primary)] shrink-0" />
        <span>Preços verificados localmente. Economia calculada sobre a média.</span>
      </div>
    </div>
  );
}

function BasketCard({ basket, index }: { basket: any; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="group relative flex flex-col h-full rounded-[var(--radius-2xl)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] overflow-hidden hover:border-[var(--brand-primary)]/40 hover:shadow-2xl hover:shadow-[var(--brand-primary)]/5 transition-all duration-500 min-h-[220px]"
    >
      <div className={cn(
        "h-1.5 w-full",
        index === 0 ? "bg-[var(--brand-primary)]" : "bg-[var(--border-subtle)]"
      )} />

      <div className="p-6 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div className="h-10 w-10 rounded-xl bg-[var(--bg-surface-elevated)] text-[var(--brand-primary)] flex items-center justify-center border border-[var(--border-subtle)] group-hover:scale-110 transition-transform duration-500">
            <ShoppingBasket size={20} />
          </div>
          {basket.economyPct > 10 && (
            <div className="px-2 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider">
              -{basket.economyPct}%
            </div>
          )}
        </div>

        <h3 className="text-lg font-black text-[var(--text-primary)] mb-1 uppercase tracking-tight">
          {basket.name}
        </h3>
        
        <div className="flex items-center gap-2 mb-4">
          <div className="h-5 w-5 rounded-full bg-white flex items-center justify-center overflow-hidden border border-[var(--border-subtle)]">
            {basket.logoUrl ? (
              <img src={basket.logoUrl} alt="" className="h-full w-full object-contain p-0.5" />
            ) : (
              <Store className="h-3 w-3 text-[var(--text-tertiary)]" />
            )}
          </div>
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider truncate">
            {basket.marketName}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[var(--text-secondary)] text-[12px] font-bold mb-6">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span>{basket.itemsCount} de {basket.totalItems} itens</span>
        </div>

        <div className="mt-auto pt-4 border-t border-[var(--border-subtle)] flex items-end justify-between">
          <div>
            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-1">Total</p>
            <Price value={basket.total} size="md" className="text-xl font-black" />
          </div>
          
          <Link 
            to="/cesta" 
            search={{ mode: 'compare' }}
            className="h-10 px-4 rounded-lg bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-soft)] text-white text-[11px] font-bold uppercase flex items-center gap-2 transition-all"
          >
            Ver cesta <ArrowRight size={14} />
          </Link>
        </div>
      </div>
      
      <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-[var(--brand-primary)]/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-[var(--brand-primary)]/10 transition-all duration-700" />
    </motion.div>
  );
}
