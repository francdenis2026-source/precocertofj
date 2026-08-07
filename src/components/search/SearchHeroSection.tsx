import { usePriceSearch } from "@/lib/use-price-search";
import { motion } from "framer-motion";
import { Price } from "@/components/ds/Price";
import { Badge } from "@/components/ds/Badge";
import { TrendingDown, TrendingUp, Minus, Star, Share2, Bell, Maximize2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PriceHistoryChart } from "./PriceHistoryChart";

export function SearchHeroSection({ query }: { query: string }) {
  const { data: result, isPending: isLoading } = usePriceSearch(query);

  if (isLoading) return <SearchHeroSkeleton />;
  if (!result || !result.groups.length) return null;

  const topGroup = result.groups[0];
  const bestPrice = result.min ?? 0;
  const avgPrice = result.avg ?? 0;
  const maxPrice = result.max ?? 0;
  const potentialSavings = maxPrice - bestPrice;
  const savingsPct = avgPrice > 0 ? Math.round(((avgPrice - bestPrice) / avgPrice) * 100) : 0;

  return (
    <section className="relative overflow-hidden rounded-[40px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] dark:bg-[var(--bg-surface)]/80 backdrop-blur-xl p-8 md:p-12 shadow-[var(--pc-shadow-lg)] group/hero">
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-12 relative z-10">
        <div className="space-y-8">
          <header className="space-y-4">
             <div className="flex flex-wrap items-center gap-3">
               <Badge variant="primary" size="sm" className="uppercase tracking-[0.2em] font-black px-4 py-1 rounded-full shadow-lg shadow-primary/20">
                 Melhor resultado
               </Badge>
               <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
                 <Clock className="h-3 w-3" /> Hoje
               </span>
             </div>
             
             <div className="space-y-1">
               <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-foreground leading-[0.95] lg:max-w-[12ch]">
                 {topGroup.productName}
               </h1>
             </div>

             <div className="flex items-center gap-6 text-sm">
               <div className="flex flex-col">
                 <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Marca</span>
                  <strong className="text-foreground text-lg">{topGroup.prices[0]?.marketName || "—"}</strong>
                </div>
                <div className="w-px h-8 bg-border/60" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Outras Lojas</span>
                  <strong className="text-foreground text-lg">{result.markets.length} disponíveis</strong>
                </div>
             </div>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
             <div className="space-y-2 bg-primary/5 rounded-3xl p-5 border border-primary/10 transition-transform group-hover/hero:scale-[1.02]">
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Melhor preço</p>
               <Price value={bestPrice} size="xl" tone="best" className="text-4xl" />
             </div>
             <div className="space-y-2 bg-muted/20 rounded-3xl p-5 border border-border/40 transition-transform group-hover/hero:scale-[1.02] delay-75">
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Preço médio</p>
               <Price value={avgPrice} size="xl" className="text-4xl" />
             </div>
             <div className="space-y-2 bg-savings/5 rounded-3xl p-5 border border-savings/10 transition-transform group-hover/hero:scale-[1.02] delay-150">
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-savings/60">Economia máx.</p>
               <div className="flex items-baseline gap-2">
                 <Price value={potentialSavings} size="xl" tone="savings" className="text-4xl" />
                 <span className="text-sm font-black text-savings">({savingsPct}%)</span>
               </div>
             </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-4 border-t border-border/40">
            <button className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 transition-all">
              <Star className="h-4 w-4" /> Favoritar
            </button>
            <button className="flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-bold text-foreground hover:bg-muted transition-all">
              <Bell className="h-4 w-4" /> Criar Alerta
            </button>
            <button className="flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-bold text-foreground hover:bg-muted transition-all">
              <Share2 className="h-4 w-4" /> Compartilhar
            </button>
          </div>
        </div>

        <div className="space-y-4">
           <div className="flex items-center justify-between">
             <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Tendência (30 dias)</h3>
             <Badge variant="savingsSoft" size="sm">
                <TrendingDown className="h-3 w-3 mr-1" /> Estável
             </Badge>
           </div>
           <div className="h-[140px] w-full bg-muted/20 rounded-2xl p-4 overflow-hidden border border-border/40">
              <PriceHistoryChart productName={topGroup.productName} compact />
           </div>
           <div className="text-center">
             <button className="text-xs font-bold text-primary hover:underline flex items-center gap-1 mx-auto">
               Ver histórico completo <Maximize2 className="h-3 w-3" />
             </button>
           </div>
        </div>
      </div>
    </section>
  );
}

function SearchHeroSkeleton() {
  return (
    <div className="rounded-3xl border border-border/60 bg-card p-8 h-[350px]">
      <div className="space-y-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-2/3" />
        <div className="grid grid-cols-3 gap-8 pt-8">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    </div>
  );
}

const Clock = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
