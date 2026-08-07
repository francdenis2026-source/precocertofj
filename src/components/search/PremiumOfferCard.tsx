import { type ProductGroup } from "@/lib/price-search.functions";
import { Price } from "@/components/ds/Price";
import { Badge } from "@/components/ds/Badge";
import { ProductImage } from "@/components/ds/ProductImage";
import { Clock, Store, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function PremiumOfferCard({ group, isBest }: { group: ProductGroup; isBest?: boolean }) {
  const bestPrice = group.prices[0];
  const priceChange = group.prices.length > 1 ? (group.prices[0].price - group.prices[1].price) : 0;
  
  const discount = group.max > group.min 
    ? Math.round(((group.max - group.min) / group.max) * 100) 
    : 0;

  return (
    <article className="group relative flex flex-col h-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[16px] p-4 transition-all duration-300 hover:shadow-md hover:border-[var(--brand-primary)]/30">
      
      {/* Badge Superior */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1 items-end">
        {isBest && (
          <Badge variant="primary" size="sm" className="bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
            Menor preço
          </Badge>
        )}
        {priceChange < 0 && (
          <Badge variant="savingsSoft" size="sm">
            <TrendingDown className="h-3 w-3 mr-1" /> {Math.abs(priceChange).toFixed(0)}%
          </Badge>
        )}
      </div>
      
      <div className="flex gap-4">
        {/* Imagem compacta */}
        <div className="relative w-20 h-20 shrink-0 rounded-[12px] overflow-hidden bg-[#F1F2F5]">
          <ProductImage 
            name={group.productName} 
            alt={group.productName}
            className="w-full h-full object-contain" 
          />
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
          <div className="space-y-1">
            <h3 className="font-semibold text-sm text-[var(--text-primary)] leading-tight line-clamp-2">
              {group.productName}
            </h3>
            <div className="flex items-center gap-1 text-[12px] text-[var(--text-tertiary)]">
              <Store className="h-3 w-3 shrink-0" />
              <span className="truncate">{bestPrice.marketName}</span>
            </div>
          </div>
          
          <div className="flex items-baseline justify-between mt-2">
             <Price value={group.min} size="md" tone={isBest ? "best" : "default"} className="font-bold" />
          </div>
        </div>
      </div>
    </article>
  );
}
