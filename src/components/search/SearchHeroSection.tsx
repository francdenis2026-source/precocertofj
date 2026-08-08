import { usePriceSearch } from "@/lib/use-price-search";
import { motion } from "framer-motion";
import { Price } from "@/components/ds/Price";
import { Badge } from "@/components/ds/Badge";
import { TrendingDown, TrendingUp, Star, Share2, Bell, Maximize2, Clock, MapPin, Store, Sparkles } from "lucide-react";
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
    <section className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border-subtle)] bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg-base)] p-6 md:p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
      {/* Decorative background accent */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-[var(--brand-primary)]/5 blur-[120px] pointer-events-none" />
      
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-12 relative z-10">
        <div className="space-y-10">
          <header className="space-y-6">
             <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 rounded-full bg-[var(--brand-primary)] px-4 py-1.5 shadow-[0_4px_12px_rgba(59,130,246,0.3)]">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-white">
                    {isCategory ? 'Explorar Categoria' : 'Melhor Escolha Hoje'}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]/50">
                  <Clock className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                    Auditado Agora
                  </span>
                </div>
             </div>
             
             <div className="space-y-3">
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-[var(--text-primary)] leading-[1.1]">
                  {isCategory ? `Produtos em ${query}` : topGroup.productName}
                </h1>
                <div className="flex flex-wrap items-center gap-5">
                   <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]">
                      <Store className="h-5 w-5 text-[var(--brand-primary)]" />
                      <span className="text-[15px] font-black text-[var(--text-primary)]">{topGroup.prices[0]?.marketName || "—"}</span>
                   </div>
                   <div className="flex items-center gap-2 text-[var(--text-secondary)] font-bold">
                      <MapPin className="h-4 w-4" />
                      <span>{result.markets.length} mercados monitorados</span>
                   </div>
                </div>
             </div>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="pc-stat-card bg-[var(--bg-surface-elevated)]/50 border-[var(--border-subtle)] group hover:border-[var(--brand-primary)]/40 transition-colors">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)] mb-2 block">Menor Preço</span>
                <Price value={bestPrice} size="xl" className="font-black text-[var(--text-primary)]" />
              </div>
              <div className="pc-stat-card bg-[var(--bg-surface-elevated)]/50 border-[var(--border-subtle)]">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)] mb-2 block">Média Local</span>
                <Price value={avgPrice} size="xl" className="font-black text-[var(--text-primary)]" />
              </div>
              <div className="pc-stat-card border-[var(--success)]/30 bg-[var(--success)]/5 ring-1 ring-[var(--success)]/10">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--success)] mb-2 block">Economia Direta</span>
                <div className="flex items-baseline gap-2">
                  <Price value={potentialSavings} size="xl" className="font-black text-[var(--success)]" />
                  <span className="text-[13px] font-black text-[var(--success)]">(-{savingsPct}%)</span>
                </div>
              </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-8 border-t border-[var(--border-subtle)]">
            <button className="h-12 px-8 rounded-2xl bg-[var(--brand-primary)] text-white font-black text-[13px] uppercase tracking-widest shadow-[0_8px_20px_-6px_rgba(59,130,246,0.4)] hover:bg-[var(--pc-brand-primary-soft)] hover:-translate-y-0.5 transition-all active:translate-y-0">
              <Star className="h-4 w-4 mr-2 inline-block" /> Favoritar Produto
            </button>
            <button className="h-12 px-6 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] font-black text-[13px] uppercase tracking-widest hover:bg-[var(--bg-surface-hover)] hover:-translate-y-0.5 transition-all active:translate-y-0">
              <Bell className="h-4 w-4 mr-2 inline-block" /> Ativar Alertas
            </button>
            <button className="h-12 w-12 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface-elevated)] flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-all">
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-6 lg:border-l lg:border-[var(--border-subtle)] lg:pl-12">
           <div className="flex items-center justify-between">
              <h3 className="text-[12px] font-black uppercase tracking-[0.25em] text-[var(--text-tertiary)]">Variação de Preço</h3>
              <div className="flex items-center gap-1.5 text-[var(--success)] font-black text-[11px] uppercase tracking-wider bg-[var(--success)]/10 px-3 py-1 rounded-full">
                 <TrendingDown className="h-3.5 w-3.5" /> Tendência Queda
              </div>
            </div>
            
            <div className="h-[180px] w-full bg-[var(--bg-base)]/80 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] p-6 shadow-inner relative overflow-hidden group">
               <div className="absolute inset-0 bg-gradient-to-t from-[var(--brand-primary)]/5 to-transparent pointer-events-none" />
               <PriceHistoryChart productName={topGroup.productName} compact />
            </div>

           <button className="w-full h-11 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[12px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all flex items-center justify-center gap-2">
             Análise Técnica Completa <Maximize2 className="h-4 w-4" />
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