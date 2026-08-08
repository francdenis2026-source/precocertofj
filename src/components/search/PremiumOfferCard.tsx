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
      whileHover={{ y: -6, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="h-full"
    >
      <Link 
        to="/loja/$id/produto/$slug" 
        params={{ id: bestPrice.establishmentId || storeId, slug: group.productName.toLowerCase().replace(/\s+/g, '-') }}
        search={{ q: "", from: "" }}
        className="group flex flex-col h-full pc-card p-0 overflow-hidden bg-[var(--bg-surface)] ring-1 ring-[var(--border-subtle)] hover:ring-[var(--brand-primary)]/30 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.5)] transition-all duration-500"
      >
        <div className="hidden">
          {/* Imagem removida conforme solicitação do usuário */}
        </div>

        <div className="p-6 flex flex-col flex-1 bg-[var(--bg-surface)]">
          <div className="flex-1 mb-5">
            <h3 className="text-[17px] font-bold text-[var(--text-primary)] leading-snug line-clamp-2 mb-3 group-hover:text-[var(--brand-primary)] transition-colors duration-300">
              {group.productName}
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] shadow-sm">
                <Store className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
                <span className="text-[12px] font-bold text-[var(--text-secondary)] whitespace-nowrap">
                  {bestPrice.marketName}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-tertiary)]">
                <Clock className="h-3.5 w-3.5" />
                <span>Hoje</span>
              </div>
            </div>
          </div>

          <div className="pt-5 border-t border-[var(--border-subtle)] flex items-end justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-tertiary)]">Menor Preço Local</span>
              <Price value={bestPrice.price} size="lg" className="text-[22px] font-black text-[var(--text-primary)] tracking-tight" />
            </div>
            
            <button className="h-10 px-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-center gap-2 text-[12px] font-bold text-[var(--text-secondary)] group-hover:bg-[var(--brand-primary)] group-hover:text-white group-hover:border-[var(--brand-primary)] transition-all duration-300">
              Detalhes <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}