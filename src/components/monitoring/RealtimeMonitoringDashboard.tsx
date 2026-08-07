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
    refetchInterval: 3000, // Reduced from 10s to 3s for a more "real-time" feel without over-fetching
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-widest text-success">Sistema Ativo</span>
        </div>
        <button 
          onClick={() => refetch()} 
          className={cn("p-1.5 rounded-lg bg-muted/20 hover:bg-muted/40 transition-all", isFetching && "animate-spin")}
        >
          <RefreshCcw className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(stats || []).map((store, i) => (
          <motion.div
            key={store.storeId}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="pc-card group p-3 hover:border-primary/40 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="h-8 w-8 rounded-lg bg-white p-1 border border-border/10 shrink-0">
                   <img 
                    src={`https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&q=80&w=100&h=100&store=${store.storeName}`} 
                    className="h-full w-full object-cover rounded-sm"
                    alt={store.storeName}
                   />
                </div>
                <div className="min-w-0">
                  <h4 className="font-black text-[12px] truncate">{store.storeName}</h4>
                  <div className="flex items-center gap-1">
                    <div className={cn("h-1 w-1 rounded-full", store.status === 'online' ? "bg-success" : "bg-danger")} />
                    <span className="text-[8px] font-bold text-muted-foreground uppercase">{store.status}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {store.insights.slice(0, 1).map((insight: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/20 border border-border/10">
                  {insight.type === 'demand' && <TrendingUp className="h-3 w-3 text-primary shrink-0" />}
                  {insight.type === 'stock' && <PackageSearch className="h-3 w-3 text-danger shrink-0" />}
                  {insight.type === 'price' && <Activity className="h-3 w-3 text-success shrink-0" />}
                  <p className="text-[10px] font-medium truncate">{insight.message}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/10">
              <span className="text-[8px] font-bold text-muted-foreground uppercase">{new Date(store.lastSync).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              <div className="flex items-center gap-1 text-success">
                <CheckCircle2 className="h-2.5 w-2.5" />
                <span className="text-[8px] font-black uppercase">OK</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
