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
  PackageSearch,
  Zap
} from "lucide-react";
import { motion } from "framer-motion";
import { getRealtimeMonitoringStats } from "@/lib/monitoring.functions";
import { cn } from "@/lib/utils";
import { Price } from "@/components/ds/Price";
import { StoreLogoThumb } from "@/components/brand/StoreLogoThumb";
import { ContamigosLogo } from "@/components/brand/ContamigosLogo";

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
          <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-emerald-500/20">
            <Zap className="h-3 w-3 text-emerald-500 animate-pulse" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase tracking-widest text-[var(--text-primary)]">Live Insights</span>
            <p className="text-[8px] font-bold text-muted-foreground uppercase leading-none">Monitoramento Ativo</p>
          </div>
        </div>
        <button 
          onClick={() => refetch()} 
          className={cn(
            "p-2 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] hover:bg-[var(--bg-surface)] transition-all shadow-sm",
            isFetching && "animate-spin"
          )}
        >
          <RefreshCcw className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(stats || []).map((store: any, i: number) => (
          <motion.div
            key={store.storeId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="group relative flex flex-col gap-3 p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-[var(--pc-shadow-sm)] hover:shadow-[var(--pc-shadow-md)] hover:-translate-y-1 transition-all duration-300 overflow-hidden"
          >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-[var(--brand-primary)]/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
            
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-white p-1 shadow-sm border border-border/10 shrink-0 group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                  {store.storeName.includes("Contamigos") ? (
                    <ContamigosLogo size="sm" hideName />
                  ) : (
                    <StoreLogoThumb 
                      src={store.storeLogoUrl} 
                      name={store.storeName} 
                      className="h-full w-full border-none p-0 bg-transparent"
                      imgClassName="object-contain"
                      initialsClassName="text-slate-900 font-bold text-[10px]"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="font-black text-[13px] tracking-tight text-[var(--text-primary)] truncate">
                    {store.storeName.split(/\s+·\s+|\s+-\s+|,\s+/)[0].replace(/^(MERCEARIA|SUPERMERCADO|PANIFICADORA|ACOUGUE|DISTRIBUIDORA)\s+/i, '')}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", store.status === 'online' ? "bg-emerald-500" : "bg-rose-500")} />
                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-wider">{store.status}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end">
                <div className="px-2 py-0.5 rounded-md bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]">
                   <span className="text-[8px] font-black text-[var(--brand-primary)]">{store.activeSensors}S</span>
                </div>
              </div>
            </div>

            <div className="relative z-10 grid grid-cols-1 gap-1.5 mt-1">
              {store.insights.slice(0, 1).map((insight: any, idx: number) => (
                <div key={idx} className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-[var(--bg-surface-elevated)]/50 border border-[var(--border-subtle)]/50 group-hover:bg-[var(--bg-surface-elevated)] group-hover:border-[var(--brand-primary)]/20 transition-colors">
                  <div className={cn(
                    "mt-0.5 p-1 rounded-md",
                    insight.type === 'demand' ? "bg-amber-500/10 text-amber-500" :
                    insight.type === 'stock' ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"
                  )}>
                    {insight.type === 'demand' && <TrendingUp className="h-2.5 w-2.5" />}
                    {insight.type === 'stock' && <PackageSearch className="h-2.5 w-2.5" />}
                    {insight.type === 'price' && <Activity className="h-2.5 w-2.5" />}
                  </div>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] leading-snug">{insight.message}</p>
                </div>
              ))}
            </div>

            <div className="relative z-10 flex items-center justify-between pt-3 mt-1 border-t border-[var(--border-subtle)]/50">
              <div className="flex items-center gap-1">
                <RefreshCcw className="h-2.5 w-2.5 text-muted-foreground" />
                <span className="text-[8px] font-bold text-muted-foreground uppercase">{new Date(store.lastSync).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'})}</span>
              </div>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                <CheckCircle2 className="h-2.5 w-2.5" />
                <span className="text-[7px] font-black uppercase tracking-tighter">Verified</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
