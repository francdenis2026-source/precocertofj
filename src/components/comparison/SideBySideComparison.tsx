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
  XCircle
} from "lucide-react";
import { Price } from "@/components/ds/Price";
import { getMultiStoreComparison } from "@/lib/multi-comparison.functions";
import { saveBasket } from "@/lib/saved-baskets.functions";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Enhanced Multi-Store Side-by-Side Comparison
 * Supports 3+ stores, saving sets, sharing, and missing item handling.
 */
export function SideBySideComparison({
  storeIds,
  onClose,
}: {
  storeIds: string[];
  onClose?: () => void;
}) {
  const fetchMultiStats = useServerFn(getMultiStoreComparison);
  const saveBasketFn = useServerFn(saveBasket);
  
  const [showDetails, setShowDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const q = useQuery({
    queryKey: ["multi-store-comparison", storeIds],
    queryFn: () => fetchMultiStats({ data: { storeIds } }),
    staleTime: 5 * 60_000,
  });

  const data = q.data;

  // Handle saving the comparison set
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveBasketFn({
        data: {
          name: `Comparação: ${data?.stores.map(s => s.name).join(", ").slice(0, 40)}...`,
          mode: "compare",
          filters: { storeIds: storeIds },
          snapshot: { storeIds: storeIds, timestamp: new Date().toISOString() },
          share: false
        }
      });
      toast.success("Conjunto de comparação salvo com sucesso!");
    } catch (err) {
      toast.error("Erro ao salvar comparação. Verifique se você está logado.");
    } finally {
      setIsSaving(false);
    }
  };

  // Export as CSV
  const handleExport = () => {
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
    link.setAttribute("download", `comparativo-precos-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exportando CSV...");
  };

  if (q.isLoading) {
    return (
      <div className="pc-card p-20 flex flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground font-black animate-pulse">Analisando mercados em tempo real...</p>
      </div>
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

  const cheapestStoreId = Object.entries(data.totals).length > 0 
    ? Object.entries(data.totals).reduce((a, b) => a[1] < b[1] ? a : b)[0]
    : null;
  const cheapestStore = data.stores.find(s => s.id === cheapestStoreId);

  return (
    <div className="pc-card overflow-hidden border-primary/20 shadow-2xl bg-surface/50 backdrop-blur-xl">
      {/* Header */}
      <div className="border-b border-border/40 bg-primary/5 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <Scale className="h-6 w-6" />
              <h3 className="text-xl font-black tracking-tight uppercase">Comparação Multi-Lojas</h3>
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              Análise de {data.stores.length} estabelecimentos em Feijó.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="pc-button-secondary py-2 px-4 flex items-center gap-2 text-xs"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Salvando..." : "Salvar Conjunto"}
            </button>
            <button 
              onClick={handleExport}
              className="pc-button-secondary py-2 px-4 flex items-center gap-2 text-xs"
            >
              <Download className="h-4 w-4" />
              Exportar
            </button>
            {onClose && (
              <button onClick={onClose} className="rounded-full p-2 hover:bg-muted transition-colors ml-2">
                <ArrowRight className="h-5 w-5 rotate-180" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Comparison Grid */}
        <div className={cn(
          "grid gap-4",
          data.stores.length === 1 ? "grid-cols-1" :
          data.stores.length === 2 ? "grid-cols-1 md:grid-cols-2" : 
          data.stores.length === 3 ? "grid-cols-1 md:grid-cols-3" : 
          "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
        )}>
          {data.stores.map((store) => {
            const isCheapest = store.id === cheapestStoreId;
            const total = data.totals[store.id] || 0;
            
            return (
              <motion.div 
                key={store.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "pc-card p-6 flex flex-col items-center text-center transition-all duration-300 relative overflow-hidden",
                  isCheapest ? "border-savings/40 bg-savings/[0.03] shadow-lg ring-2 ring-savings/20" : "opacity-90 grayscale-[0.3] hover:grayscale-0"
                )}
              >
                {isCheapest && (
                  <div className="absolute top-0 right-0 p-2">
                    <CheckCircle2 className="h-5 w-5 text-savings" />
                  </div>
                )}
                
                <div className="h-14 w-14 rounded-2xl bg-muted/30 flex items-center justify-center mb-4 border border-border/40">
                  <Store className="h-7 w-7 text-primary" />
                </div>
                
                <h4 className="font-black text-lg mb-1 truncate w-full">{store.name}</h4>
                
                <div className="mb-4">
                  <Price value={total} size="xl" tone={isCheapest ? 'best' : 'default'} />
                  <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground mt-1">
                    Custo Total ({data.commonCount} itens comuns)
                  </p>
                </div>

                {isCheapest && data.stores.length > 1 && (
                  <div className="pc-badge bg-savings text-white px-4 py-1.5 shadow-lg shadow-savings/20 font-black text-[10px] uppercase tracking-wider">
                    MELHOR PREÇO TOTAL
                  </div>
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
                <div className="overflow-x-auto pb-4 custom-scrollbar">
                  <table className="w-full border-separate border-spacing-y-2">
                    <thead>
                      <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-left">
                        <th className="px-4 py-2">Produto</th>
                        {data.stores.map(s => (
                          <th key={s.id} className="px-4 py-2 text-right">{s.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((item, idx) => {
                        const isMissingAny = data.stores.some(s => !item.prices[s.id]);
                        
                        return (
                          <tr key={idx} className={cn(
                            "pc-card group transition-all hover:border-primary/30",
                            isMissingAny ? "opacity-70 bg-muted/5" : ""
                          )}>
                            <td className="px-4 py-3 rounded-l-2xl border-y border-l border-border/40 group-hover:border-primary/20">
                              <div className="flex items-center gap-3">
                                <Package className="h-4 w-4 text-muted-foreground" />
                                <span className="font-bold text-sm">{item.name}</span>
                                {isMissingAny && data.stores.length > 1 && (
                                  <div className="group/tip relative">
                                    <Info className="h-3 w-3 text-amber-500 cursor-help" />
                                    <div className="absolute bottom-full left-0 mb-2 hidden group-hover/tip:block bg-black text-white text-[10px] p-2 rounded w-40 z-50">
                                      Este item não foi encontrado em todas as lojas comparadas e foi removido do cálculo do total.
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
                                      INDISPONÍVEL
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
      
      <div className="bg-muted/10 p-6 border-t border-border/40 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          Preços dinâmicos • Os itens ausentes em qualquer loja são excluídos da soma para garantir uma comparação justa.
        </p>
      </div>
    </div>
  );
}
