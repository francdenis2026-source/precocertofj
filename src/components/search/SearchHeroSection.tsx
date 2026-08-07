import { usePriceSearch } from "@/lib/use-price-search";
import { motion } from "framer-motion";
import { Price } from "@/components/ds/Price";
import { Badge } from "@/components/ds/Badge";
import { TrendingDown, TrendingUp, Star, Share2, Bell, Maximize2, Clock, MapPin, Store } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PriceHistoryChart } from "./PriceHistoryChart";
import { cn } from "@/lib/utils";

export function SearchHeroSection({ query, isCategory }: { query: string; isCategory?: boolean }) {
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
    <section className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 md:p-10 shadow-[var(--pc-shadow-md)]">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-10 relative z-10">
        <div className="space-y-8">
          <header className="space-y-4">
             <div className="flex flex-wrap items-center gap-3">
                <span className="pc-badge bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border border-[var(--brand-primary)]/20 px-3 py-1">
                  {isCategory ? 'Explorar Categoria' : 'Melhor Resultado'}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Atualizado hoje
                </span>
             </div>
             
             <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--text-primary)] leading-tight">
                  {isCategory ? `Produtos em ${query}` : topGroup.productName}
                </h1>
                <div className="flex items-center gap-4 text-[13px]">
                   <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                      <Store className="h-4 w-4 text-[var(--brand-primary)]" />
                      <span className="font-semibold">{topGroup.prices[0]?.marketName || "—"}</span>
                   </div>
                   <div className="w-1 h-1 rounded-full bg-[var(--border-subtle)]" />
                   <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                      <MapPin className="h-4 w-4" />
                      <span>{result.markets.length} mercados</span>
                   </div>
                </div>
             </div>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="pc-stat-card">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]">Menor preço</span>
                <Price value={bestPrice} size="lg" className="text-2xl font-bold text-[var(--text-primary)]" />
              </div>
              <div className="pc-stat-card">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]">Preço médio</span>
                <Price value={avgPrice} size="lg" className="text-2xl font-bold text-[var(--text-primary)]" />
              </div>
              <div className="pc-stat-card border-[var(--success)]/20 bg-[var(--success)]/5">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--success)]">Economia máx.</span>
                <div className="flex items-baseline gap-2">
                  <Price value={potentialSavings} size="lg" className="text-2xl font-bold text-[var(--success)]" />
                  <span className="text-[11px] font-bold text-[var(--success)]">({savingsPct}%)</span>
                </div>
              </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-4 border-t border-[var(--border-subtle)]">
            <button className="pc-button-primary">
              <Star className="h-4 w-4 mr-2" /> Favoritar
            </button>
            <button className="pc-button-secondary">
              <Bell className="h-4 w-4 mr-2" /> Criar Alerta
            </button>
            <button className="pc-button-secondary">
              <Share2 className="h-4 w-4 mr-2" /> Compartilhar
            </button>
          </div>
        </div>

        <div className="space-y-4 lg:border-l lg:border-[var(--border-subtle)] lg:pl-10">
           <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Histórico (30 dias)</h3>
              <span className="pc-badge bg-[var(--success)]/10 text-[var(--success)]">
                 <TrendingDown className="h-3 w-3 mr-1" /> Estável
              </span>
            </div>
            <div className="h-[140px] w-full bg-[var(--bg-base)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] p-4">
               <PriceHistoryChart productName={topGroup.productName} compact />
            </div>
           <button className="text-[12px] font-bold text-[var(--brand-primary)] hover:underline flex items-center gap-1 mx-auto transition-colors">
             Ver histórico completo <Maximize2 className="h-3 w-3" />
           </button>
        </div>
      </div>
    </section>
  );
}

function SearchHeroSkeleton() {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 h-[380px] animate-pulse">
      <div className="space-y-6">
        <Skeleton className="h-4 w-32 bg-[var(--bg-base)]" />
        <Skeleton className="h-10 w-2/3 bg-[var(--bg-base)]" />
        <div className="grid grid-cols-3 gap-6 pt-8">
          <Skeleton className="h-20 w-full bg-[var(--bg-base)]" />
          <Skeleton className="h-20 w-full bg-[var(--bg-base)]" />
          <Skeleton className="h-20 w-full bg-[var(--bg-base)]" />
        </div>
      </div>
    </div>
  );
}