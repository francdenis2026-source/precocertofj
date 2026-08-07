import { type ProductGroup } from "@/lib/price-search.functions";
import { Price } from "@/components/ds/Price";
import { ProductImage } from "@/components/ds/ProductImage";
import { Clock, Store, TrendingDown, ArrowRight, ShoppingBag, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

export function PremiumOfferCard({ group, isBest, storeId = "general" }: { group: ProductGroup; isBest?: boolean; storeId?: string }) {
  const bestPrice = group.prices[0];
  const savingsPct = group.max > group.min ? Math.round(((group.max - group.min) / group.max) * 100) : 0;
  
  return (
    <motion.div
      layout
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <Link 
        to="/loja/$id/produto/$slug" 
        params={{ id: bestPrice.establishmentId || storeId, slug: group.productName.toLowerCase().replace(/\s+/g, '-') }}
        search={{ q: "", from: "" }}
        className="group flex flex-col h-full pc-card p-0 overflow-hidden bg-[var(--bg-surface)]"
      >
        <div className="relative aspect-square bg-[var(--bg-base)]/50 flex items-center justify-center p-8 transition-colors group-hover:bg-[var(--bg-surface-elevated)]/50">
          <ProductImage 
            name={group.productName} 
            alt={group.productName}
            className="object-contain w-full h-full drop-shadow-sm transition-transform duration-500 group-hover:scale-105" 
          />
          
          {isBest && (
            <div className="absolute top-3 left-3 z-10">
               <span className="pc-badge bg-[var(--success)] text-white shadow-sm">
                  Melhor Preço
               </span>
            </div>
          )}

          {savingsPct > 10 && (
             <div className="absolute top-3 right-3 z-10">
                <span className="pc-badge bg-[var(--brand-primary)] text-white shadow-sm">
                   -{savingsPct}%
                </span>
             </div>
          )}
        </div>

        <div className="p-5 flex flex-col flex-1">
          <div className="flex-1 mb-4">
            <h3 className="text-[16px] font-bold text-[var(--text-primary)] leading-snug line-clamp-2 mb-2 group-hover:text-[var(--brand-primary)] transition-colors">
              {group.productName}
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[11px] font-bold text-[var(--text-secondary)] flex items-center gap-1">
                <Store className="h-3 w-3" /> {bestPrice.marketName}
              </span>
              <div className="w-1 h-1 rounded-full bg-[var(--border-subtle)]" />
              <span className="text-[11px] font-bold text-[var(--text-tertiary)] flex items-center gap-1">
                <Clock className="h-3 w-3" /> Hoje
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">A partir de</span>
              <Price value={bestPrice.price} size="lg" className="text-[20px] font-bold text-[var(--text-primary)]" />
            </div>
            <div className="h-9 w-9 rounded-[var(--radius-md)] bg-[var(--bg-surface-elevated)] flex items-center justify-center text-[var(--text-secondary)] group-hover:bg-[var(--brand-primary)] group-hover:text-white transition-all">
              <ArrowRight size={18} />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}