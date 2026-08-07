import { motion } from "framer-motion";
import { 
  ShoppingBasket, 
  TrendingDown, 
  ArrowRight, 
  Store, 
  CheckCircle2, 
  Sparkles,
  ChevronRight,
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[380px] w-full rounded-[32px] bg-white/5" />
        ))}
      </div>
    );
  }

  if (!data?.baskets?.length) return null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 text-[var(--brand-primary)]">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Exclusivo PreçoCerto</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-primary)] leading-tight">
            Cestas que valem <span className="text-[var(--brand-primary)]">muito mais</span>
          </h2>
          <p className="text-[var(--text-secondary)] text-xs max-w-sm">
            As combinações mais baratas nos mercados de Feijó hoje.
          </p>
        </div>

        <Link 
          to="/cesta-basica"
          className="group inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-[var(--brand-primary)] hover:underline"
        >
          Personalizar minha cesta
          <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data.baskets.slice(0, 2).map((basket, idx) => (
          <BasketCard key={basket.id} basket={basket} index={idx} />
        ))}
      </div>

      <div className="flex items-center justify-center gap-4 py-4 px-6 rounded-2xl bg-white/5 border border-white/10 text-white/40 text-[10px] font-bold uppercase tracking-widest text-center">
        <Info className="h-4 w-4 text-[var(--brand-primary)] shrink-0" />
        <span>Baseado nos itens de maior consumo no Brasil. Preços atualizados em {new Date(data.lastUpdate).toLocaleDateString('pt-BR')}.</span>
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
      className="group relative flex flex-col h-full rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] overflow-hidden hover:border-[var(--brand-primary)]/40 transition-all duration-500 shadow-sm"
    >
      {/* Accent Header */}
      <div className={cn(
        "h-2 w-full",
        index === 0 ? "bg-[var(--brand-primary)]" : "bg-white/10"
      )} />

      <div className="p-6 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2.5 rounded-xl bg-[var(--bg-surface-elevated)] text-[var(--brand-primary)] group-hover:scale-110 transition-transform duration-500">
            <ShoppingBasket className="h-5 w-5" />
          </div>
          {basket.economyPct > 10 && (
            <div className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[9px] font-black uppercase tracking-wider">
              -{basket.economyPct}%
            </div>
          )}
        </div>

        <h3 className="text-lg font-black text-[var(--text-primary)] mb-1 group-hover:text-[var(--brand-primary)] transition-colors">
          {basket.name}
        </h3>
        
        <div className="flex items-center gap-2 mb-4">
          <div className="h-5 w-5 rounded-full bg-white flex items-center justify-center overflow-hidden border border-[var(--border-subtle)]">
            {basket.logoUrl ? (
              <img src={basket.logoUrl} alt={basket.marketName} className="h-full w-full object-cover" />
            ) : (
              <Store className="h-2.5 w-2.5 text-[var(--text-tertiary)]" />
            )}
          </div>
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest truncate">
            {basket.marketName}
          </span>
        </div>

        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-2.5 text-[var(--text-secondary)] text-[12px] font-medium">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span>{basket.itemsCount} de {basket.totalItems} itens</span>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-[var(--border-subtle)] flex items-end justify-between">
          <div>
            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.2em] mb-0.5">Total</p>
            <Price value={basket.total} size="lg" className="font-black" />
          </div>
          
          <Button asChild size="icon" className="h-10 w-10 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white shadow-lg shadow-[var(--brand-primary)]/20">
            <Link to="/cesta-basica" search={{ mode: 'compare' }}>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Decorative Blur */}
      <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-[var(--brand-primary)]/10 blur-[60px] rounded-full pointer-events-none group-hover:bg-[var(--brand-primary)]/20 transition-colors" />
    </motion.div>
  );
}
