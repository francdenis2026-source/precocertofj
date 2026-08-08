import { type ProductGroup } from "@/lib/price-search.functions";
import { Price } from "@/components/ds/Price";
import { Clock, Store, ArrowRight, ShoppingBag, ChevronDown, ChevronUp, Tag } from "lucide-react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { addToCart, removeFromCart } from "@/lib/cart.functions";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function PremiumOfferCard({ group, isBest, storeId = "general" }: { group: ProductGroup; isBest?: boolean; storeId?: string }) {
  const bestPrice = group.prices[0];
  const navigate = useNavigate();
  const runAdd = useServerFn(addToCart);
  const runRemove = useServerFn(removeFromCart);
  const qc = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const secondBestPrice = group.prices.length > 1 ? group.prices[1] : null;
  const priceGap = secondBestPrice ? secondBestPrice.price - bestPrice.price : 0;
  
  // Swipe logic
  const x = useMotionValue(0);
  const background = useTransform(
    x,
    [0, 150],
    ["rgba(59, 130, 246, 0)", "rgba(59, 130, 246, 0.2)"]
  );
  const opacity = useTransform(x, [0, 100], [0, 1]);
  const scale = useTransform(x, [0, 100], [0.8, 1]);

  const handleDragEnd = async (_: any, info: any) => {
    if (info.offset.x > 100) {
      if (typeof window !== 'undefined' && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
      
      const tid = toast.loading("Adicionando à cesta...");
      try {
        const result = await runAdd({ data: { catalogId: group.catalogId || undefined, slug: group.productName } });
        const itemId = result.itemId;
        qc.invalidateQueries({ queryKey: ["cart"] });
        
        toast.success(`${group.productName} na cesta!`, {
          id: tid,
          action: {
            label: "Desfazer",
            onClick: async () => {
              try {
                await runRemove({ data: { itemId } });
                qc.invalidateQueries({ queryKey: ["cart"] });
                toast.success("Item removido da cesta");
              } catch (err) {
                toast.error("Erro ao desfazer");
              }
            }
          }
        });
      } catch (e: any) {
        toast.error(e.message || "Erro ao adicionar", { id: tid });
      }
    }
  };

  const handleManualAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (typeof window !== 'undefined' && window.navigator.vibrate) {
      window.navigator.vibrate(40);
    }
    
    const tid = toast.loading("Adicionando à cesta...");
    try {
      const result = await runAdd({ data: { catalogId: group.catalogId || undefined, slug: group.productName } });
      const itemId = result.itemId;
      qc.invalidateQueries({ queryKey: ["cart"] });
      
      toast.success(`${group.productName} na cesta!`, {
        id: tid,
        action: {
          label: "Desfazer",
          onClick: async () => {
            try {
              await runRemove({ data: { itemId } });
              qc.invalidateQueries({ queryKey: ["cart"] });
              toast.success("Item removido da cesta");
            } catch (err) {
              toast.error("Erro ao desfazer");
            }
          }
        }
      });
    } catch (e: any) {
      toast.error(e.message || "Erro ao adicionar", { id: tid });
    }
  };

  const savings = group.avg && bestPrice.price < group.avg ? group.avg - bestPrice.price : 0;
  
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-xl)]">
      {/* Swipe background indicator */}
      <motion.div 
        style={{ background }}
        className="absolute inset-0 z-0 flex items-center pl-6 pointer-events-none"
      >
        <motion.div style={{ opacity, scale }} className="flex items-center gap-2 text-[var(--brand-primary)]">
          <ShoppingBag size={24} />
          <span className="text-[10px] font-black uppercase tracking-widest">Solte para Adicionar</span>
        </motion.div>
      </motion.div>

      <motion.div
        layout
        drag="x"
        dragConstraints={{ left: 0, right: 150 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x }}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 touch-pan-y"
        role="listitem"
        aria-label={`Produto: ${group.productName}, Preço: ${bestPrice.price}. Deslize para a direita ou clique no botão para adicionar à cesta.`}
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

          <div className="p-4 md:p-6 flex flex-col flex-1 bg-[var(--bg-surface)]">
            <div className="flex-1 mb-3 md:mb-5">
              <motion.h3 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="text-[15px] md:text-[17px] font-bold text-[var(--text-primary)] leading-snug line-clamp-2 mb-2 md:mb-3 group-hover:text-[var(--brand-primary)] transition-colors duration-300"
              >
                {group.productName}
              </motion.h3>
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] shadow-sm">
                  <Store className="h-3 md:h-3.5 w-3 md:w-3.5 text-[var(--brand-primary)]" />
                  <span className="text-[10px] md:text-[12px] font-bold text-[var(--text-secondary)] whitespace-nowrap">
                    {bestPrice.marketName}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] md:text-[11px] font-bold text-[var(--text-tertiary)]">
                  <Clock className="h-3 md:h-3.5 w-3 md:w-3.5" />
                  <span>Hoje</span>
                </div>
              </div>
            </div>

            <div className="pt-3 md:pt-5 border-t border-[var(--border-subtle)] flex items-end justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-tertiary)]">Menor Preço Local</span>
                  {savings > 0 && (
                    <span className="text-[9px] font-black text-[var(--brand-primary)] bg-[var(--brand-primary)]/10 px-1.5 py-0.5 rounded-sm">
                      POUPE R$ {savings.toFixed(2).replace('.', ',')}
                    </span>
                  )}
                </div>
                <Price value={bestPrice.price} size="lg" className="text-[18px] md:text-[22px] font-black text-[var(--text-primary)] tracking-tight" />
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleManualAdd}
                  className="h-8 md:h-10 w-8 md:w-10 rounded-xl bg-[var(--brand-primary)] text-white flex items-center justify-center hover:bg-[var(--brand-primary)]/90 transition-all duration-300 shadow-sm"
                  aria-label="Adicionar à cesta"
                >
                  <ShoppingBag size={16} />
                </button>
                <div className="h-8 md:h-10 px-3 md:px-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-center gap-2 text-[10px] md:text-[12px] font-bold text-[var(--text-secondary)] group-hover:bg-[var(--bg-surface-elevated)] group-hover:text-[var(--text-primary)] transition-all duration-300">
                  <span className="hidden sm:inline">Detalhes</span> <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          </div>
        </Link>
      </motion.div>
    </div>
  );
}
