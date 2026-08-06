import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Scale, TrendingDown, TrendingUp, X } from "lucide-react";
import { Price } from "@/components/ds/Price";
import { getStoreComparisonStats } from "@/lib/comparison.functions";
import { cn } from "@/lib/utils";
import { tc } from "@/lib/typeclear";

export function QuickStoreCompare({
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
  onClose: () => void;
}) {
  const fetchStats = useServerFn(getStoreComparisonStats);
  const q = useQuery({
    queryKey: ["store-comparison", storeAId, storeBId],
    queryFn: () => fetchStats({ data: { storeAId, storeBId } }),
    staleTime: 60_000,
  });

  const stats = q.data;

  return (
    <div className="rounded-xl border border-primary/20 bg-card/95 p-4 shadow-xl backdrop-blur-md">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          <h3 className={cn(tc.panelTitle, "text-primary")}>Comparação Direta</h3>
        </div>
        <button onClick={onClose} className="rounded-full p-1 hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>

      {q.isLoading ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : stats ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-background/50 p-3 text-center border border-border/40">
              <p className={tc.metaMuted}>{storeAName}</p>
              <div className="mt-1 flex items-center justify-center gap-1">
                <TrendingDown className="h-4 w-4 text-savings" />
                <span className="text-lg font-bold text-savings">{stats.cheaperA}</span>
              </div>
              <p className="text-[10px] uppercase text-muted-foreground">Mais baratos</p>
            </div>
            <div className="rounded-lg bg-background/50 p-3 text-center border border-border/40">
              <p className={tc.metaMuted}>{storeBName}</p>
              <div className="mt-1 flex items-center justify-center gap-1">
                <TrendingDown className="h-4 w-4 text-savings" />
                <span className="text-lg font-bold text-savings">{stats.cheaperB}</span>
              </div>
              <p className="text-[10px] uppercase text-muted-foreground">Mais baratos</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className={tc.meta}>Itens em comum ({stats.totalCompared})</p>
            <div className="max-h-[300px] overflow-y-auto rounded-lg border border-border/60 bg-muted/20 divide-y divide-border/40">
              {stats.items.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 text-[12px]">
                  <span className="truncate font-medium">{item.name}</span>
                  <div className="flex shrink-0 items-center gap-3">
                    <Price value={item.priceA} size="xs" tone={item.priceA < item.priceB ? 'best' : 'default'} />
                    <Price value={item.priceB} size="xs" tone={item.priceB < item.priceA ? 'best' : 'default'} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className={tc.metaMuted}>Nenhum produto em comum encontrado para comparação.</p>
      )}
    </div>
  );
}
