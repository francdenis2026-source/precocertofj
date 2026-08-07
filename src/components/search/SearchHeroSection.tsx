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
    <section className="relative overflow-hidden rounded-[24px] border border-[var(--border-subtle)] bg-[#0F1B3D] p-8 md:p-10 shadow-lg group/hero text-white">
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-12 relative z-10">
        <div className="space-y-8">
          <header className="space-y-4">
             <div className="flex flex-wrap items-center gap-3">
                <Badge variant="primary" size="sm" className="bg-primary/20 text-white border-none uppercase tracking-widest font-black px-3 py-0.5 rounded-full">
                  MELHOR RESULTADO
                </Badge>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 flex items-center gap-1.5">
                  <Clock className="h-3 w-3" /> HOJE
                </span>
             </div>
             
             <div className="space-y-1">
                <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white leading-tight lg:max-w-[15ch]">
                  {topGroup.productName}
                </h1>
             </div>

             <div className="flex items-center gap-6 text-sm">
               <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-widest text-white/50 font-black">Marca</span>
                   <strong className="text-white text-lg font-bold">{topGroup.prices[0]?.marketName || "—"}</strong>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-widest text-white/50 font-black">Outras Lojas</span>
                  <strong className="text-white text-lg font-bold">{result.markets.length} disponíveis</strong>
                </div>
             </div>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-1 bg-white/5 rounded-2xl p-4 border border-white/10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Melhor preço</p>
                <Price value={bestPrice} size="lg" tone="onhero" className="text-3xl font-bold text-white" />
              </div>
              <div className="space-y-1 bg-white/5 rounded-2xl p-4 border border-white/10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Preço médio</p>
                <Price value={avgPrice} size="lg" tone="onhero" className="text-3xl font-bold text-white" />
              </div>
              <div className="space-y-1 bg-white/5 rounded-2xl p-4 border border-white/10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Economia máx.</p>
                <div className="flex items-baseline gap-2">
                  <Price value={potentialSavings} size="lg" tone="onhero" className="text-3xl font-bold text-white" />
                  <span className="text-xs font-bold text-emerald-400">({savingsPct}%)</span>
                </div>
              </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-4 border-t border-border/40">
            <button className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:brightness-110 transition-all">
              <Star className="h-4 w-4" /> Favoritar
            </button>
            <button className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2 text-sm font-bold text-white hover:bg-white/10 transition-all">
              <Bell className="h-4 w-4" /> Criar Alerta
            </button>
            <button className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2 text-sm font-bold text-white hover:bg-white/10 transition-all">
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
