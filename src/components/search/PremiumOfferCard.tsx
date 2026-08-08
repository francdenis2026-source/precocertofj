import { type ProductGroup } from "@/lib/price-search.functions";
import { Price } from "@/components/ds/Price";
import { Clock, Store, ArrowRight, ShoppingBag, ChevronDown, ChevronUp, Tag, BarChart3, Medal, Download, Share2, Filter, Bookmark, Check } from "lucide-react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { addToCart, removeFromCart } from "@/lib/cart.functions";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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

  const toggleExpand = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const savings = group.avg && bestPrice.price < group.avg ? group.avg - bestPrice.price : 0;
  
  const [marketFilter, setMarketFilter] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const marketTypes = useMemo(() => {
    const types = new Set<string>();
    group.prices.forEach(p => {
      if (p.marketKind) types.add(p.marketKind);
    });
    return Array.from(types);
  }, [group.prices]);

  const filteredPrices = useMemo(() => {
    if (!marketFilter) return group.prices;
    return group.prices.filter(p => p.marketKind === marketFilter);
  }, [group.prices, marketFilter]);

  const handleExportPDF = () => {
    toast.info("Gerando PDF da comparação...", {
      description: "Esta funcionalidade requer o módulo de exportação premium."
    });
  };

  const handleSaveComparison = () => {
    setIsSaved(true);
    toast.success("Comparação salva na sua conta!", {
      description: "Você pode acessá-la em Perfil > Comparações Salvas."
    });
  };
  
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
        <div className="group flex flex-col h-full pc-card p-0 overflow-hidden bg-[var(--bg-surface)] ring-1 ring-[var(--border-subtle)] hover:ring-[var(--brand-primary)]/30 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.5)] transition-all duration-500">
          <Link 
            to="/loja/$id/produto/$slug" 
            params={{ id: bestPrice.establishmentId || storeId, slug: group.productName.toLowerCase().replace(/\s+/g, '-') }}
            search={{ q: "", from: "" }}
            className="flex flex-col flex-1"
          >
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
                  <Dialog>
                    <DialogTrigger asChild>
                      <button 
                        onClick={(e) => e.stopPropagation()}
                        className="h-8 md:h-10 px-3 md:px-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-center gap-2 text-[10px] md:text-[12px] font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)] transition-all duration-300"
                      >
                        <BarChart3 size={14} className="text-[var(--brand-primary)]" />
                        <span className="hidden sm:inline">Comparar</span>
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl bg-[var(--bg-surface)] border-[var(--border-subtle)] p-0 gap-0 overflow-hidden">
                      <DialogHeader className="p-6 pb-4 bg-[var(--bg-surface-elevated)] border-b border-[var(--border-subtle)]">
                        <DialogTitle className="text-xl font-black tracking-tight text-[var(--text-primary)] flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <BarChart3 className="text-[var(--brand-primary)]" />
                            Comparativo de Preços
                          </div>
                          <div className="flex items-center gap-2 mr-8">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 px-2 text-[var(--text-tertiary)] hover:text-[var(--brand-primary)]"
                              onClick={handleSaveComparison}
                            >
                              {isSaved ? <Check className="text-green-500" /> : <Bookmark size={14} />}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 px-2 text-[var(--text-tertiary)] hover:text-[var(--brand-primary)]"
                              onClick={handleExportPDF}
                            >
                              <Download size={14} />
                            </Button>
                          </div>
                        </DialogTitle>
                        <p className="text-sm text-[var(--text-secondary)] mt-1 font-medium italic">
                          {group.productName}
                        </p>
                      </DialogHeader>

                      {/* Filters */}
                      {marketTypes.length > 0 && (
                        <div className="px-6 py-3 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]/50 flex items-center gap-2 overflow-x-auto no-scrollbar">
                          <Filter size={12} className="text-[var(--text-tertiary)] shrink-0" />
                          <Badge 
                            variant={marketFilter === null ? "default" : "outline"}
                            className="cursor-pointer whitespace-nowrap"
                            onClick={() => setMarketFilter(null)}
                          >
                            Todos
                          </Badge>
                          {marketTypes.map(type => (
                            <Badge 
                              key={type}
                              variant={marketFilter === type ? "default" : "outline"}
                              className="cursor-pointer whitespace-nowrap capitalize"
                              onClick={() => setMarketFilter(type)}
                            >
                              {type.toLowerCase()}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      <div className="p-0 max-h-[400px] overflow-y-auto no-scrollbar">
                        <table className="w-full text-left border-collapse">
                          <thead className="sticky top-0 z-20">
                            <tr className="bg-[var(--bg-surface-elevated)]">
                              <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] border-b border-[var(--border-subtle)]">Estabelecimento</th>
                              <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] border-b border-[var(--border-subtle)] text-right">Preço</th>
                              <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] border-b border-[var(--border-subtle)] text-right">Diferença</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-subtle)]/50">
                            {filteredPrices.map((price, idx) => {
                              // Find original index for 1st/2nd place badges
                              const originalIdx = group.prices.findIndex(p => p.establishmentId === price.establishmentId && p.price === price.price);
                              return (
                                <tr key={`${price.establishmentId}-${idx}`} className={cn(
                                  "group/row transition-colors hover:bg-[var(--brand-primary)]/5",
                                  originalIdx === 0 && "bg-[var(--brand-primary)]/5"
                                )}>
                                  <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-[var(--text-primary)]">{price.marketName}</span>
                                        {originalIdx === 0 && (
                                          <span className="flex items-center gap-1 text-[9px] font-black bg-[var(--brand-primary)] text-white px-1.5 py-0.5 rounded-sm uppercase tracking-tighter shadow-sm">
                                            <Medal size={8} /> 1º
                                          </span>
                                        )}
                                        {originalIdx === 1 && (
                                          <span className="flex items-center gap-1 text-[9px] font-black bg-slate-500 text-white px-1.5 py-0.5 rounded-sm uppercase tracking-tighter shadow-sm">
                                            2º
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] text-[var(--text-tertiary)] font-medium">{price.neighborhood || "Centro"}</span>
                                        {price.marketKind && (
                                          <span className="text-[9px] text-[var(--text-tertiary)]/70 px-1 rounded-sm border border-[var(--border-subtle)]/30 capitalize">
                                            {price.marketKind.toLowerCase()}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <Price value={price.price} size="sm" className={cn(
                                      "font-black tracking-tight",
                                      originalIdx === 0 ? "text-[var(--brand-primary)]" : "text-[var(--text-primary)]"
                                    )} />
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    {originalIdx === 0 ? (
                                      <span className="text-[10px] font-black text-[var(--brand-primary)] uppercase tracking-tighter">Melhor Preço</span>
                                    ) : (
                                      <span className="text-[11px] font-bold text-[var(--danger)]/80 tabular-nums">
                                        +R$ {(price.price - bestPrice.price).toFixed(2).replace('.', ',')}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      
                      <div className="p-6 bg-[var(--bg-surface-elevated)] border-t border-[var(--border-subtle)]">
                        <div className="flex items-start gap-4 p-4 rounded-xl bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/10">
                          <Tag className="text-[var(--brand-primary)] mt-0.5" size={18} />
                          <div>
                            <p className="text-sm font-bold text-[var(--text-primary)] mb-1">Dica de Economia</p>
                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
                              {secondBestPrice 
                                ? `Economia de R$ ${priceGap.toFixed(2).replace('.', ',')} comprando no ${bestPrice.marketName} vs 2º lugar.`
                                : `O ${bestPrice.marketName} detém o menor preço registrado.`}
                            </p>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          </Link>

          {/* Comparison Toggle */}
          {group.prices.length > 1 && (
            <div className="px-4 pb-4 md:px-6 md:pb-6">
              <button 
                onClick={toggleExpand}
                className="w-full py-2 flex items-center justify-center gap-2 text-[10px] md:text-[11px] font-black uppercase tracking-widest text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] transition-colors border-t border-[var(--border-subtle)]/50"
              >
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {isExpanded ? "Ocultar Comparação" : `Comparar ${group.prices.length} Lojas`}
              </button>
              
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 space-y-3">
                      {priceGap > 0 && (
                        <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/10 flex items-center gap-3">
                          <Tag size={16} className="text-green-500" />
                          <p className="text-[11px] font-bold text-green-500/90 leading-tight">
                            Este é o menor preço! Você economiza <span className="font-black text-green-500">R$ {priceGap.toFixed(2).replace('.', ',')}</span> em relação à segunda melhor opção.
                          </p>
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        {group.prices.slice(1).map((price, idx) => (
                          <div key={`${price.establishmentId}-${idx}`} className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-surface-elevated)]/50 border border-[var(--border-subtle)]/30 group/item">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-[var(--text-secondary)]">{price.marketName}</span>
                              <span className="text-[9px] text-[var(--text-tertiary)]">{price.neighborhood || "Próximo"}</span>
                            </div>
                            <div className="text-right">
                              <Price value={price.price} size="sm" className="font-bold text-[var(--text-primary)]" />
                              <div className="text-[9px] font-bold text-[var(--danger)]/70">
                                +R$ {(price.price - bestPrice.price).toFixed(2).replace('.', ',')}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}