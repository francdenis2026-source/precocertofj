import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { 
  Scale, 
  Store, 
  ArrowRight, 
  Package, 
  Calculator, 
  Info, 
  Save, 
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  Share2,
  Filter,
  ArrowUpDown
} from "lucide-react";
import { Price } from "@/components/ds/Price";
import { getMultiStoreComparison, MultiComparisonResult, ComparisonItem } from "@/lib/multi-comparison.functions";
import { saveBasket } from "@/lib/saved-baskets.functions";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Button } from "@/components/ui/button";

declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

/**
 * Enhanced Multi-Store Side-by-Side Comparison
 * Supports 3+ stores, saving sets, sharing, and missing item handling.
 */
export function SideBySideComparison({
  storeIds,
  onClose,
  initialData,
  isShared = false
}: {
  storeIds: string[];
  onClose?: () => void;
  initialData?: MultiComparisonResult;
  isShared?: boolean;
}) {
  const fetchMultiStats = useServerFn(getMultiStoreComparison);
  const saveBasketFn = useServerFn(saveBasket);
  
  const [showDetails, setShowDetails] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [filterCommonOnly, setFilterCommonOnly] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: 'price' | 'savings' | 'name', order: 'asc' | 'desc' }>({
    key: 'price',
    order: 'asc'
  });

  const q = useQuery<MultiComparisonResult>({
    queryKey: ["multi-store-comparison", storeIds],
    queryFn: () => fetchMultiStats({ data: { storeIds } }),
    staleTime: 5 * 60_000,
    enabled: !initialData,
    initialData: initialData,
  });

  const data = q.data;

  // Optimized sorting and filtering logic
  const sortedStores = useMemo(() => {
    if (!data) return [];
    return [...data.stores].sort((a, b) => {
      if (sortConfig.key === 'price') {
        const valA = data.adjustedTotals[a.id] || Infinity;
        const valB = data.adjustedTotals[b.id] || Infinity;
        return sortConfig.order === 'asc' ? valA - valB : valB - valA;
      }
      if (sortConfig.key === 'savings') {
        const valA = data.savingsPotential[a.id] || 0;
        const valB = data.savingsPotential[b.id] || 0;
        return sortConfig.order === 'asc' ? valA - valB : valB - valA;
      }
      return sortConfig.order === 'asc' 
        ? a.name.localeCompare(b.name) 
        : b.name.localeCompare(a.name);
    });
  }, [data, sortConfig]);

  const filteredItems = useMemo(() => {
    if (!data) return [];
    let items = [...data.items];
    if (filterCommonOnly) {
      items = items.filter(item => data.stores.every(s => item.prices[s.id]));
    }
    return items;
  }, [data, filterCommonOnly]);

  // Handle saving the comparison set with sharing support
  const handleSave = async (share = false) => {
    if (!data || isShared) return;
    setIsSaving(true);
    try {
      const saved = await saveBasketFn({
        data: {
          name: `Comparação: ${data.stores.map(s => s.name).join(", ").slice(0, 40)}...`,
          mode: "compare",
          filters: { storeIds: storeIds },
          snapshot: { storeIds: storeIds, timestamp: new Date().toISOString() },
          share: share
        }
      });
      
      if (share && saved.shareToken) {
        const shareUrl = `${window.location.origin}/share/${saved.shareToken}`;
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link de compartilhamento copiado!");
      } else {
        toast.success("Conjunto de comparação salvo com sucesso!");
      }
    } catch (err) {
      toast.error("Erro ao realizar ação. Verifique se você está logado.");
    } finally {
      setIsSaving(false);
    }
  };

  // Export as CSV
  const handleExportCSV = () => {
    if (!data) return;
    const headers = ["Produto", ...data.stores.map(s => s.name)];
    const rows = data.items.map(item => [
      item.name,
      ...data.stores.map(s => item.prices[s.id] ? item.prices[s.id].toFixed(2) : "N/D")
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `comparativo-precocerto-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exportando CSV...");
  };

  // Export as PDF
  const handleExportPDF = () => {
    if (!data) return;
    try {
      const doc = new jsPDF({
        orientation: data.stores.length > 3 ? 'landscape' : 'portrait'
      });

      doc.setFontSize(18);
      doc.text("Relatório Comparativo - PreçoCerto Feijó", 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);
      doc.text(`Baseado em ${data.commonCount} itens comuns encontrados em todos os estabelecimentos.`, 14, 35);

      const tableHeaders = ["Produto", ...data.stores.map(s => s.name)];
      const tableRows = data.items.map(item => [
        item.name,
        ...data.stores.map(s => item.prices[s.id] ? `R$ ${item.prices[s.id].toFixed(2)}` : "N/D")
      ]);

      // Add a summary row for totals
      tableRows.push([
        "TOTAL (Itens Comuns)",
        ...data.stores.map(s => `R$ ${data.adjustedTotals[s.id]?.toFixed(2) || "0.00"}`)
      ]);

      doc.autoTable({
        startY: 45,
        head: [tableHeaders],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [11, 30, 58], textColor: 255 },
        styles: { fontSize: 8 },
        didParseCell: (dataCell: any) => {
          if (dataCell.row.index === tableRows.length - 1) {
            dataCell.cell.styles.fontStyle = 'bold';
            dataCell.cell.styles.fillColor = [212, 175, 55];
            dataCell.cell.styles.textColor = 0;
          }
        }
      });

      doc.save(`comparativo-precocerto-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("Exportando PDF...");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF.");
    }
  };

  if (q.isLoading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="pc-card p-20 flex flex-col items-center justify-center gap-6 bg-surface/80 backdrop-blur-xl rounded-[32px]"
      >
        <div className="relative">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary" 
          />
          <Scale className="h-6 w-6 text-primary absolute inset-0 m-auto animate-pulse" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-primary font-black tracking-widest uppercase text-xs animate-pulse">Inteligência PreçoCerto</p>
          <p className="text-muted-foreground font-medium text-sm">Analisando mercados em tempo real...</p>
        </div>
      </motion.div>
    );
  }

  if (!data || data.stores.length === 0) {
    return (
      <div className="pc-card p-12 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-black">Nenhum dado encontrado</h3>
        <p className="text-muted-foreground">Não conseguimos carregar a comparação para esses mercados.</p>
      </div>
    );
  }

  const cheapestStoreId = sortedStores[0]?.id;
  const cheapestStore = data.stores.find(s => s.id === cheapestStoreId);

  return (
    <div className="pc-card overflow-hidden border-border/10 shadow-2xl bg-surface/95 backdrop-blur-2xl max-h-[90vh] flex flex-col rounded-[32px] relative ring-1 ring-black/[0.03]">
      {/* Dynamic Background SVG Pattern */}
      <div className="absolute inset-0 -z-10 opacity-[0.02] pointer-events-none overflow-hidden">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Header */}
      <div className="border-b border-border/30 bg-gradient-to-r from-bg-surface-elevated via-transparent to-bg-surface-elevated p-6 md:p-10 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-2">
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex items-center gap-4 text-primary"
            >
              <div className="h-12 w-12 rounded-2xl bg-brand-primary/5 border border-brand-primary/10 flex items-center justify-center shadow-sm">
                <Scale className="h-6 w-6 text-brand-primary" />
              </div>
              <div>
                <h3 className="text-2xl md:text-3xl font-black tracking-tight uppercase leading-none text-brand-secondary">
                  {isShared ? "Comparativo de Preços" : "Inteligência de Mercado"}
                </h3>
                <p className="text-[10px] text-text-tertiary font-black uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                  Dados atualizados em tempo real
                </p>
              </div>
            </motion.div>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap justify-end">
            {!isShared && (
              <div className="flex items-center gap-3 mr-4 border-r border-border/30 pr-6">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button 
                    onClick={() => handleSave(false)}
                    disabled={isSaving}
                    variant="ghost"
                    className="rounded-xl h-11 border-border/40 hover:bg-bg-surface-elevated transition-all font-black text-[10px] tracking-widest uppercase text-text-secondary"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    SALVAR CONJUNTO
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button 
                    onClick={() => handleSave(true)}
                    disabled={isSaving}
                    className="pc-button-primary h-11 px-8 rounded-xl text-[10px] tracking-[0.15em] uppercase"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    COMPARTILHAR
                  </Button>
                </motion.div>
              </div>
            )}
            <div className="flex items-center gap-1 bg-bg-surface-elevated rounded-xl p-1.5 border border-border/20 shadow-sm">
              <button 
                onClick={handleExportCSV}
                title="Exportar CSV"
                className="p-2.5 hover:bg-bg-surface rounded-lg transition-all text-text-tertiary hover:text-brand-primary"
              >
                <Download className="h-4.5 w-4.5" />
              </button>
              <button 
                onClick={handleExportPDF}
                title="Exportar PDF"
                className="p-2.5 hover:bg-bg-surface rounded-lg transition-all text-text-tertiary hover:text-brand-primary"
              >
                <FileText className="h-4.5 w-4.5" />
              </button>
            </div>
            {onClose && (
              <button 
                onClick={onClose} 
                className="rounded-full p-2.5 hover:bg-danger/5 text-text-tertiary hover:text-danger transition-all ml-3 border border-transparent hover:border-danger/10"
              >
                <XCircle className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8 overflow-y-auto no-scrollbar flex-1">
        {/* Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-muted/10 p-4 rounded-2xl border border-border/20">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <label className="text-xs font-black uppercase flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={filterCommonOnly} 
                  onChange={e => setFilterCommonOnly(e.target.checked)}
                  className="rounded border-border"
                />
                Apenas itens em comum
              </label>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <span className="text-xs font-black text-muted-foreground uppercase flex items-center gap-1">
               <ArrowUpDown className="h-3 w-3" /> Ordenar:
             </span>
             <select 
              className="text-xs bg-background border-border rounded-lg px-2 py-1 outline-none"
              value={sortConfig.key}
              onChange={(e) => setSortConfig({ ...sortConfig, key: e.target.value as any })}
             >
               <option value="price">Menor Preço Total</option>
               <option value="savings">Melhor Economia</option>
               <option value="name">Nome da Loja</option>
             </select>
             <button 
              onClick={() => setSortConfig({ ...sortConfig, order: sortConfig.order === 'asc' ? 'desc' : 'asc' })}
              className="p-1 hover:bg-muted rounded-md"
             >
               <ArrowUpDown className={cn("h-4 w-4 transition-transform", sortConfig.order === 'desc' && "rotate-180")} />
             </button>
          </div>
        </div>

        {/* Comparison Grid */}
        <div className={cn(
          "grid gap-4",
          data.stores.length === 1 ? "grid-cols-1" :
          data.stores.length === 2 ? "grid-cols-1 md:grid-cols-2" : 
          data.stores.length === 3 ? "grid-cols-1 md:grid-cols-3" : 
          "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
        )}>
          {sortedStores.map((store) => {
            const isCheapest = store.id === cheapestStoreId;
            const total = data.adjustedTotals[store.id] || 0;
            const savings = data.savingsPotential[store.id] || 0;
            
            return (
              <motion.div 
                key={store.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className={cn(
                  "pc-card p-6 flex flex-col items-center text-center transition-all duration-300 relative overflow-hidden group",
                  isCheapest 
                    ? "border-savings/40 bg-savings/[0.03] shadow-lg ring-2 ring-savings/20" 
                    : "bg-surface/40 hover:bg-surface/60 opacity-90 hover:opacity-100"
                )}
              >
                {isCheapest && (
                  <div className="absolute top-0 right-0 p-3">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <CheckCircle2 className="h-6 w-6 text-savings" />
                    </motion.div>
                  </div>
                )}
                
                <div className={cn(
                  "h-14 w-14 rounded-2xl flex items-center justify-center mb-4 border transition-transform duration-500 group-hover:rotate-6",
                  isCheapest ? "bg-savings/10 border-savings/20" : "bg-muted/30 border-border/40"
                )}>
                  <Store className={cn("h-7 w-7", isCheapest ? "text-savings" : "text-primary")} />
                </div>
                
                <h4 className="font-black text-lg mb-1 truncate w-full group-hover:text-primary transition-colors">{store.name}</h4>
                
                <div className="mb-4">
                  <Price value={total} size="xl" tone={isCheapest ? 'best' : 'default'} />
                  <p className="text-[9px] uppercase tracking-[0.2em] font-black text-muted-foreground mt-1">
                    Custo Total ({data.commonCount} itens)
                  </p>
                </div>

                {savings > 0 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-savings font-black text-xs mb-3 flex items-center gap-1 bg-savings/10 px-3 py-1 rounded-full"
                  >
                    Economia de <Price value={savings} size="xs" tone="best" />
                  </motion.div>
                )}

                {isCheapest && data.stores.length > 1 && (
                  <motion.div 
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="pc-badge bg-savings text-white px-4 py-1.5 shadow-lg shadow-savings/20 font-black text-[9px] uppercase tracking-wider"
                  >
                    MELHOR PREÇO TOTAL
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Insight Card */}
        <div className="bg-primary/5 rounded-3xl p-6 border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary text-black flex items-center justify-center shrink-0 shadow-xl shadow-primary/20">
              <Calculator className="h-7 w-7" />
            </div>
            <div>
              <h5 className="font-black text-xl leading-tight">
                {cheapestStore ? (
                  <>Recomendação: <span className="text-savings">{cheapestStore.name}</span></>
                ) : (
                  "Análise Detalhada"
                )}
              </h5>
              <p className="text-sm text-muted-foreground font-medium">
                {data.commonCount > 0 
                  ? `Considerando os ${data.commonCount} itens disponíveis em todas as lojas, este é o seu melhor custo.`
                  : "Compare os preços individuais de cada item abaixo."
                }
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowDetails(!showDetails)}
            className="pc-button-primary w-full md:w-auto px-8"
          >
            {showDetails ? "Ocultar Planilha" : "Ver Planilha Detalhada"}
          </button>
        </div>

        {/* Detailed Sheet */}
        <AnimatePresence>
          {showDetails && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-6 border-t border-border/40 mt-6">
                <div className="overflow-x-auto pb-4 custom-scrollbar rounded-2xl border border-border/20">
                  <table className="w-full border-separate border-spacing-y-1.5 px-2">
                    <thead>
                      <tr className="text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground/60 text-left">
                        <th className="px-6 py-3 sticky left-0 bg-surface/95 backdrop-blur z-10 first:rounded-l-xl">Produto</th>
                        {data.stores.map(s => (
                          <th key={s.id} className="px-6 py-3 text-right">{s.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="before:block before:h-1">
                      {filteredItems.map((item: ComparisonItem, idx: number) => {
                        const isMissingAny = data.stores.some(s => !item.prices[s.id]);
                        
                        return (
                          <tr key={idx} className={cn(
                            "pc-card group transition-all hover:border-primary/30",
                            isMissingAny ? "opacity-70 bg-muted/5" : ""
                          )}>
                            <td className="px-4 py-3 rounded-l-2xl border-y border-l border-border/40 group-hover:border-primary/20 sticky left-0 bg-surface/90 backdrop-blur z-10">
                              <div className="flex items-center gap-3 min-w-[180px]">
                                <Package className="h-4 w-4 text-muted-foreground" />
                                <span className="font-bold text-sm truncate">{item.name}</span>
                                {isMissingAny && (
                                  <div className="group/tip relative shrink-0">
                                    <AlertCircle className="h-3 w-3 text-amber-500 cursor-help" />
                                    <div className="absolute bottom-full left-0 mb-2 hidden group-hover/tip:block bg-black text-white text-[10px] p-2 rounded w-48 z-[60] shadow-2xl">
                                      Este item está indisponível em algumas lojas e foi removido do cálculo do Preço Total.
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                            {data.stores.map((s, sIdx) => {
                              const price = item.prices[s.id];
                              const isMin = price && !data.stores.some(other => item.prices[other.id] && item.prices[other.id] < price);
                              
                              return (
                                <td 
                                  key={s.id} 
                                  className={cn(
                                    "px-4 py-3 text-right border-y border-border/40 group-hover:border-primary/20",
                                    sIdx === data.stores.length - 1 ? "rounded-r-2xl border-r" : ""
                                  )}
                                >
                                  {price ? (
                                    <Price value={price} size="sm" tone={isMin && data.stores.length > 1 ? 'best' : 'default'} />
                                  ) : (
                                    <span className="flex items-center justify-end gap-1 text-[10px] font-black text-destructive/60">
                                      <XCircle className="h-3 w-3" />
                                      N/D
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="bg-muted/10 p-4 border-t border-border/40 text-center shrink-0">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          Cálculo Inteligente • Apenas itens comuns a todas as lojas selecionadas compõem o Custo Total.
        </p>
      </div>
    </div>
  );
}