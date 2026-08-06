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
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
            Cestas que valem <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-primary)] to-[#FFD700]">muito mais</span>
          </h2>
          <p className="text-white/60 text-sm max-w-lg">
            Nossa inteligência varreu os mercados de Feijó e montou as combinações mais baratas para o seu bolso hoje.
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {data.baskets.map((basket, idx) => (
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
      className="group relative flex flex-col h-full rounded-[32px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] overflow-hidden hover:border-[var(--brand-primary)]/40 transition-all duration-500 shadow-2xl"
    >
      {/* Accent Header */}
      <div className={cn(
        "h-2 w-full",
        index === 0 ? "bg-[var(--brand-primary)]" : "bg-white/10"
      )} />

      <div className="p-8 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-6">
          <div className="p-3 rounded-2xl bg-[var(--bg-surface-elevated)] text-[var(--brand-primary)] group-hover:scale-110 transition-transform duration-500">
            <ShoppingBasket className="h-6 w-6" />
          </div>
          {basket.economyPct > 10 && (
            <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-wider">
              -{basket.economyPct}%
            </div>
          )}
        </div>

        <h3 className="text-xl font-black text-white mb-1 group-hover:text-[var(--brand-primary)] transition-colors">
          {basket.name}
        </h3>
        
        <div className="flex items-center gap-2 mb-6">
          <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border border-white/10">
            {basket.logoUrl ? (
              <img src={basket.logoUrl} alt={basket.marketName} className="h-full w-full object-cover" />
            ) : (
              <Store className="h-3 w-3 text-white/40" />
            )}
          </div>
          <span className="text-[11px] font-bold text-white/50 uppercase tracking-widest truncate">
            {basket.marketName}
          </span>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-3 text-white/70 text-[13px] font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>{basket.itemsCount} de {basket.totalItems} itens encontrados</span>
          </div>
          <div className="flex items-center gap-3 text-white/70 text-[13px] font-medium">
            <TrendingDown className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>Economia de <Price value={basket.savingsVsAvg} size="xs" tone="savings" className="inline-flex ml-1" /></span>
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-white/5 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Total da Cesta</p>
            <Price value={basket.total} size="2xl" className="font-black" />
          </div>
          
          <Button asChild size="icon" className="h-12 w-12 rounded-2xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--pc-brand-navy)] shadow-xl shadow-[var(--brand-primary)]/20">
            <Link to="/cesta-basica" search={{ mode: 'compare' }}>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Decorative Blur */}
      <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-[var(--brand-primary)]/10 blur-[60px] rounded-full pointer-events-none group-hover:bg-[var(--brand-primary)]/20 transition-colors" />
    </motion.div>
  );
}
