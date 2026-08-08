import { Link } from "@tanstack/react-router";
import { ProductImage } from "@/components/ds/ProductImage";
import { Price } from "@/components/ds/Price";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ShoppingCart, Plus, TrendingDown, Clock, Info } from "lucide-react";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  brand?: string | null;
  unit?: string | null;
  marketName?: string;
  lastUpdate?: string | Date;
  maxSavings?: number;
  onAdd?: () => void;
  onClick?: () => void;
  className?: string;
}

export function ProductCard({
  id,
  name,
  price,
  brand,
  unit,
  marketName,
  lastUpdate,
  maxSavings,
  onAdd,
  onClick,
  className
}: ProductCardProps) {
  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  return (
    <article
      onClick={onClick}
      className={cn(
        "group flex flex-col bg-[var(--bg-surface)] rounded-[24px] border border-[var(--border-subtle)] overflow-hidden transition-all duration-500 hover:shadow-[var(--shadow-lg)] hover:border-[var(--brand-primary)]/30 hover:-translate-y-1.5 cursor-pointer",
        className
      )}
    >
      <div className="aspect-square bg-white p-6 flex items-center justify-center relative overflow-hidden shrink-0">
        <ProductImage 
          name={name} 
          alt={name}
          className="w-full h-full object-contain transition-transform duration-700 ease-out group-hover:scale-110" 
        />
        
        {maxSavings && maxSavings > 5 && (
          <div className="absolute top-3 right-3 z-10">
            <span className="bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg shadow-lg shadow-emerald-500/20">
              -{maxSavings}%
            </span>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-1 flex-col">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider truncate">
            {brand || "Genérico"} {unit ? `· ${unit}` : ""}
          </span>
          {lastUpdate && (
            <div className="flex items-center gap-1 text-[9px] font-bold text-[var(--text-tertiary)] uppercase shrink-0">
              <Clock className="h-2.5 w-2.5" />
              {formatDate(lastUpdate)}
            </div>
          )}
        </div>

        <h3 className="text-[14px] font-bold text-[var(--text-primary)] leading-tight mb-3 line-clamp-2 min-h-[2.5rem] group-hover:text-[var(--brand-primary)] transition-colors">
          {name}
        </h3>

        <div className="mt-auto space-y-3">
          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <Price value={price} size="lg" className="text-[var(--brand-primary)] font-black" />
              {marketName && (
                <span className="text-[10px] font-bold text-[var(--text-secondary)] truncate max-w-[120px]">
                  {marketName}
                </span>
              )}
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAdd?.();
              }}
              className="h-10 w-10 rounded-xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] flex items-center justify-center transition-all hover:bg-[var(--brand-primary)] hover:text-white shadow-sm"
              aria-label="Adicionar à cesta"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
