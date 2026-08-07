import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  Cpu, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCcw,
  TrendingUp,
  PackageSearch
} from "lucide-react";
import { motion } from "framer-motion";
import { getRealtimeMonitoringStats } from "@/lib/monitoring.functions";
import { cn } from "@/lib/utils";
import { Price } from "@/components/ds/Price";

export function RealtimeMonitoringDashboard() {
  const fetchStats = useServerFn(getRealtimeMonitoringStats);
  
  const { data: stats, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["realtime-monitoring-stats"],
    queryFn: () => fetchStats(),
    refetchInterval: 10000, // Refresh every 10s
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="pc-card animate-pulse h-48 bg-muted/20" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-success">Sistema Ativo</span>
        </div>
        <button 
          onClick={() => refetch()} 
          className={cn("p-2 rounded-xl bg-muted/20 hover:bg-muted/40 transition-all", isFetching && "animate-spin")}
        >
          <RefreshCcw className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(stats || []).map((store, i) => (
          <motion.div
            key={store.storeId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="pc-card group hover:border-primary/40"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-10 w-10 rounded-2xl flex items-center justify-center",
                  store.status === 'online' ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                )}>
                  {store.status === 'online' ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
                </div>
                <div>
                  <h4 className="font-black text-[15px] tracking-tight">{store.storeName}</h4>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase">ID: {store.storeId.slice(0, 8)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                <Cpu className="h-3 w-3" />
                <span className="text-[9px] font-black">{store.activeSensors} Sensores</span>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Insights IA</p>
              {store.insights.map((insight: any, idx: number) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-2xl bg-muted/20 border border-border/20">
                  {insight.type === 'demand' && <TrendingUp className="h-4 w-4 text-primary shrink-0" />}
                  {insight.type === 'stock' && <PackageSearch className="h-4 w-4 text-danger shrink-0" />}
                  {insight.type === 'price' && <Activity className="h-4 w-4 text-success shrink-0" />}
                  <p className="text-[11px] font-medium leading-tight">{insight.message}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-border/20 flex items-center justify-between">
              <span className="text-[9px] font-bold text-muted-foreground">Sincronizado: {new Date(store.lastSync).toLocaleTimeString()}</span>
              <div className="flex items-center gap-1 text-success">
                <CheckCircle2 className="h-3 w-3" />
                <span className="text-[9px] font-black uppercase">Estável</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
