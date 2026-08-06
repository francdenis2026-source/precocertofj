import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { searchProductPrice } from "@/lib/price-search.functions";
import { motion } from "framer-motion";
import { Price } from "@/components/ds/Price";
import { Badge } from "@/components/ds/Badge";
import { TrendingDown, TrendingUp, Minus, Star, Share2, Bell, Maximize2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PriceHistoryChart } from "./PriceHistoryChart";

export function SearchHeroSection({ query }: { query: string }) {
  const runSearch = useServerFn(searchProductPrice);
  const { data: result, isLoading } = useQuery({
    queryKey: ["price-search", query],
    queryFn: () => runSearch({ data: { query } }),
    enabled: !!query,
  });

  if (isLoading) return <SearchHeroSkeleton />;
  if (!result || !result.groups.length) return null;

  const topGroup = result.groups[0];
  const bestPrice = result.min ?? 0;
  const avgPrice = result.avg ?? 0;
  const maxPrice = result.max ?? 0;
  const potentialSavings = maxPrice - bestPrice;
  const savingsPct = avgPrice > 0 ? Math.round(((avgPrice - bestPrice) / avgPrice) * 100) : 0;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card p-6 md:p-8 shadow-elev-2">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,350px] gap-8">
        <div className="space-y-6">
          <header className="space-y-2">
             <div className="flex flex-wrap items-center gap-2">
               <Badge variant="primary" size="sm" className="uppercase tracking-widest font-bold">
                 Melhor resultado
               </Badge>
               <span className="text-xs text-muted-foreground flex items-center gap-1">
                 <Clock className="h-3 w-3" /> Atualizado há 2 horas
               </span>
             </div>
             <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
               {topGroup.productName}
             </h1>
             <div className="flex items-center gap-4 text-sm text-muted-foreground">
               <span>Marca: <strong className="text-foreground">Parmalat</strong></span>
               <span>Categoria: <strong className="text-foreground">Laticínios</strong></span>
             </div>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
             <div className="space-y-1">
               <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Melhor preço</p>
               <Price value={bestPrice} size="xl" tone="best" />
             </div>
             <div className="space-y-1">
               <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preço médio</p>
               <Price value={avgPrice} size="xl" />
             </div>
             <div className="space-y-1">
               <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Economia máx.</p>
               <div className="flex items-baseline gap-2">
                 <Price value={potentialSavings} size="xl" tone="savings" />
                 <span className="text-sm font-bold text-savings">({savingsPct}%)</span>
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
