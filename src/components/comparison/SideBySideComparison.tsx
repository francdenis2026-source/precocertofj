import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Scale, TrendingDown, Store, ArrowRight, Package, Calculator, Info } from "lucide-react";
import { Price } from "@/components/ds/Price";
import { getStoreComparisonStats } from "@/lib/comparison.functions";
import { cn } from "@/lib/utils";
import { tc } from "@/lib/typeclear";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

/**
 * Feature 3: Side-by-Side Comparison
 * Develops a tool that presents the total cost of a grocery trip side-by-side in different establishments,
 * allowing the customer to compare values visually and efficiently.
 */
export function SideBySideComparison({
  storeAId,
  storeAName,
  storeBId,
  storeBName,
  onClose,
}: {
  storeAId: string;
  storeAName: string;
  storeBId: string;
  storeBName: string;
  onClose?: () => void;
}) {
  const fetchStats = useServerFn(getStoreComparisonStats);
  const [showDetails, setShowDetails] = useState(false);

  const q = useQuery({
    queryKey: ["store-side-by-side", storeAId, storeBId],
    queryFn: () => fetchStats({ data: { storeAId, storeBId } }),
    staleTime: 5 * 60_000,
  });

  const stats = q.data;

  // Calculate total costs (mocking some basket logic if not fully available in API)
  const totalA = stats?.items.reduce((acc: number, curr: any) => acc + curr.priceA, 0) || 0;
  const totalB = stats?.items.reduce((acc: number, curr: any) => acc + curr.priceB, 0) || 0;
  const diff = Math.abs(totalA - totalB);
  const cheaperStore = totalA < totalB ? storeAName : storeBName;
  const savingsPct = totalA && totalB ? Math.round((diff / Math.max(totalA, totalB)) * 100) : 0;

  return (
    <div className="pc-card overflow-hidden border-primary/20 shadow-2xl">
      {/* Header */}
      <div className="border-b border-border/40 bg-primary/5 p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-primary">
            <Scale className="h-6 w-6" />
            <h3 className="text-xl font-black tracking-tight uppercase">Comparação Lado a Lado</h3>
          </div>
          {onClose && (
            <button onClick={onClose} className="rounded-full p-2 hover:bg-muted transition-colors">
              <ArrowRight className="h-5 w-5 rotate-180" />
            </button>
          )}
        </div>
        <p className="text-sm text-muted-foreground font-medium">
          Compare o custo total da sua feira entre dois estabelecimentos de forma visual.
        </p>
      </div>

      <div className="p-6 space-y-8">
        {q.isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground font-bold animate-pulse">Analisando preços em tempo real...</p>
          </div>
        ) : stats && stats.totalCompared > 0 ? (
          <>
            {/* Comparison Visualizer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/40 hidden md:block" />
              
              {/* Store A */}
              <div className={cn(
                "pc-card p-6 flex flex-col items-center text-center transition-all duration-300",
                totalA < totalB ? "border-savings/40 bg-savings/[0.03] shadow-lg scale-105 z-10" : "opacity-80"
              )}>
                <div className="h-16 w-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4 border border-border/40">
                  <Store className="h-8 w-8 text-primary" />
                </div>
                <h4 className="font-black text-lg mb-1">{storeAName}</h4>
                <div className="mb-4">
                  <Price value={totalA} size="xl" tone={totalA < totalB ? 'best' : 'default'} />
                  <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground mt-1">Custo Total Est. ({stats.totalCompared} itens)</p>
                </div>
                {totalA < totalB && (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }}
                    className="pc-badge bg-savings text-white px-4 py-1.5 shadow-lg shadow-savings/20 font-black text-[12px]"
                  >
                    MELHOR OPÇÃO
                  </motion.div>
                )}
              </div>

              {/* Store B */}
              <div className={cn(
                "pc-card p-6 flex flex-col items-center text-center transition-all duration-300",
                totalB < totalA ? "border-savings/40 bg-savings/[0.03] shadow-lg scale-105 z-10" : "opacity-80"
              )}>
                <div className="h-16 w-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4 border border-border/40">
                  <Store className="h-8 w-8 text-primary" />
                </div>
                <h4 className="font-black text-lg mb-1">{storeBName}</h4>
                <div className="mb-4">
                  <Price value={totalB} size="xl" tone={totalB < totalA ? 'best' : 'default'} />
                  <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground mt-1">Custo Total Est. ({stats.totalCompared} itens)</p>
                </div>
                {totalB < totalA && (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }}
                    className="pc-badge bg-savings text-white px-4 py-1.5 shadow-lg shadow-savings/20 font-black text-[12px]"
                  >
                    MELHOR OPÇÃO
                  </motion.div>
                )}
              </div>
            </div>

            {/* Savings Insight */}
            <div className="bg-primary/5 rounded-3xl p-6 border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-primary text-black flex items-center justify-center shrink-0 shadow-xl shadow-primary/20">
                  <Calculator className="h-7 w-7" />
                </div>
                <div>
                  <h5 className="font-black text-xl leading-tight">Economia de <span className="text-savings"><Price as="span" value={diff} /></span></h5>
                  <p className="text-sm text-muted-foreground font-medium">Ao comprar no {cheaperStore} você economiza aproximadamente {savingsPct}%.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowDetails(!showDetails)}
                className="pc-button-primary w-full md:w-auto px-8"
              >
                {showDetails ? "Ocultar Detalhes" : "Ver Detalhes dos Itens"}
              </button>
            </div>

            {/* Detailed Item Breakdown */}
            <AnimatePresence>
              {showDetails && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-6 border-t border-border/40 mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-black text-sm uppercase tracking-widest text-muted-foreground">Comparação por Item</h4>
                      <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
                        <span>{storeAName}</span>
                        <span>vs</span>
                        <span>{storeBName}</span>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                      {stats.items.map((item: any, i: number) => (
                        <div key={i} className="pc-card py-3 px-4 flex items-center justify-between group hover:border-primary/30 transition-all">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 border border-border/40">
                              <Package className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <span className="font-bold text-sm truncate group-hover:text-primary transition-colors">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-6 shrink-0 ml-4">
                            <div className="flex flex-col items-end">
                              <Price value={item.priceA} size="sm" tone={item.priceA < item.priceB ? 'best' : 'default'} />
                            </div>
                            <div className="flex flex-col items-end">
                              <Price value={item.priceB} size="sm" tone={item.priceB < item.priceA ? 'best' : 'default'} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <div className="text-center py-20 px-6">
            <div className="h-20 w-20 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Info className="h-10 w-10 text-muted-foreground" />
            </div>
            <h4 className="text-xl font-black mb-2">Sem itens suficientes</h4>
            <p className="text-muted-foreground max-w-sm mx-auto font-medium">
              Não encontramos produtos cadastrados em comum o suficiente entre esses dois mercados para realizar uma comparação segura do custo total.
            </p>
          </div>
        )}
      </div>
      
      {/* Footer / CTA */}
      <div className="bg-muted/10 p-6 border-t border-border/40 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Preços baseados nos últimos registros capturados pelo PreçoCerto</p>
      </div>
    </div>
  );
}
