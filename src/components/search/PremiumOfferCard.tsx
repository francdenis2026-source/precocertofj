import { type ProductGroup } from "@/lib/price-search.functions";
import { Price } from "@/components/ds/Price";
import { Badge } from "@/components/ds/Badge";
import { ProductImage } from "@/components/ds/ProductImage";
import { MapPin, Clock, ArrowRight, Star, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";
import { useSignedLogoUrl } from "@/hooks/use-signed-logo-urls";

export function PremiumOfferCard({ group, isBest }: { group: ProductGroup; isBest?: boolean }) {
  const bestPrice = group.prices[0];
  const marketLogo = useSignedLogoUrl(bestPrice.marketLogoUrl);

  return (
    <article className="group relative flex flex-col h-full bg-white dark:bg-card/40 backdrop-blur-md border border-border rounded-[42px] overflow-hidden hover:shadow-[0_32px_64px_rgba(0,0,0,0.1)] hover:border-primary hover:-translate-y-1.5 transition-all duration-500 ease-[0.22,1,0.36,1]">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      {isBest && (
        <div className="absolute top-6 left-6 z-10">
          <Badge variant="savings" size="sm" className="uppercase tracking-[0.2em] font-black shadow-2xl shadow-savings/20 px-4 py-1.5">
            Melhor Preço
          </Badge>
        </div>
      )}
      
      <div className="relative aspect-[4/3] p-10 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-muted/10" />
        <ProductImage 
          name={group.productName} 
          alt={group.productName}
          size="lg" 
          className="w-full h-full object-contain group-hover:scale-110 group-hover:rotate-2 transition-transform duration-700 ease-out z-10 drop-shadow-2xl" 
        />
      </div>

      <div className="flex-1 p-8 flex flex-col space-y-6 relative z-10">
        <header className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Parmalat</span>
            <button className="text-muted-foreground/40 hover:text-primary transition-colors">
              <Star className="h-4 w-4" />
            </button>
          </div>
          <h3 className="font-bold text-lg text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
            {group.productName}
          </h3>
        </header>

        <div className="flex items-end justify-between gap-2">
          <div className="space-y-1">
            <Price value={group.min} size="lg" tone="best" />
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
               <Clock className="h-2.5 w-2.5" /> Atualizado hoje
            </div>
          </div>
          <div className="text-right">
             <div className="flex items-center gap-1.5 justify-end mb-1">
               {marketLogo ? (
                 <img src={marketLogo} alt="" className="h-4 w-4 object-contain" />
               ) : (
                 <div className="h-4 w-4 bg-muted rounded-full" />
               )}
               <span className="text-[10px] font-bold text-foreground truncate max-w-[80px]">
                 {bestPrice.marketName}
               </span>
             </div>
             <div className="flex items-center gap-1 text-[10px] text-muted-foreground justify-end">
               <MapPin className="h-2.5 w-2.5" /> 1.2km
             </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border/40 flex items-center gap-2">
          <button className="flex-1 bg-muted/40 hover:bg-primary hover:text-primary-foreground text-foreground rounded-2xl py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-2">
            Ver detalhes <ArrowRight className="h-3 w-3" />
          </button>
          <button className="h-10 w-10 flex items-center justify-center rounded-2xl border border-border group-hover:border-primary/40 text-muted-foreground hover:text-primary transition-all">
            <ShoppingCart className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
