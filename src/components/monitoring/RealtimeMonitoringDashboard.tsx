import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
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
  Zap,
  Search
} from "lucide-react";
import { motion } from "framer-motion";
import { getRealtimeMonitoringStats } from "@/lib/monitoring.functions";
import { cn } from "@/lib/utils";
import { Price } from "@/components/ds/Price";
import { StoreLogoThumb } from "@/components/brand/StoreLogoThumb";
import { ContamigosLogo } from "@/components/brand/ContamigosLogo";

export function RealtimeMonitoringDashboard() {
  const fetchStats = useServerFn(getRealtimeMonitoringStats);
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: stats, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["realtime-monitoring-stats", searchQuery],
    queryFn: () => fetchStats({ data: { query: searchQuery } } as any),
    refetchInterval: 60000,
    staleTime: 30000,
  });


  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] animate-pulse">
          <Activity className="h-4 w-4 text-[var(--brand-primary)] animate-spin-slow" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Iniciando Varredura dos Comércios...</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="pc-card animate-pulse h-56 bg-muted/10 border-dashed border-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">

          <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-emerald-500/20">
            <Zap className="h-3 w-3 text-emerald-500 animate-pulse-slow" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase tracking-widest text-[var(--text-primary)]">Buscar Produtos</span>
            <p className="text-[8px] font-bold text-muted-foreground uppercase leading-none">Digite o nome do produto para varredura</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <PackageSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar por produto (ex: arroz)..."
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[12px] font-medium focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
            />
          </div>
          <button 
            onClick={() => refetch()} 
            className={cn(
              "shrink-0 p-2 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] hover:bg-[var(--bg-surface)] transition-all shadow-sm",
              isFetching && "animate-spin"
            )}
          >
            <RefreshCcw className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
          </button>
        </div>
      </div>


      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {(stats || []).map((store: any, i: number) => (
          <motion.div
            key={store.storeId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="group relative flex flex-col gap-2 p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-[var(--pc-shadow-sm)] hover:shadow-[var(--pc-shadow-md)] hover:-translate-y-1 transition-all duration-300 overflow-hidden min-h-[140px]"
          >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-[var(--brand-primary)]/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
            
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-white p-1.5 shadow-sm border border-border/10 shrink-0 group-hover:scale-105 transition-transform duration-500 overflow-hidden relative">
                  <div className="absolute inset-0 bg-white z-0" />

                  {store.storeName.includes("Contamigos") ? (
                    <ContamigosLogo size="sm" hideName />
                  ) : (
                    <StoreLogoThumb 
                      src={store.storeLogoUrl} 
                      name={store.storeName} 
                      className="h-full w-full border-none p-0 bg-transparent relative z-10"
                      imgClassName="object-contain filter-none mix-blend-multiply"
                      initialsClassName="text-slate-900 font-bold text-[10px]"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-[11px] leading-tight tracking-tight text-[var(--text-primary)] line-clamp-2">
                    {store.storeName.split(/\s+·\s+|\s+-\s+|,\s+/)[0].replace(/^(MERCEARIA|SUPERMERCADO|PANIFICADORA|ACOUGUE|DISTRIBUIDORA)\s+/i, '')}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className={cn("h-1.5 w-1.5 rounded-full", store.status === 'online' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-rose-500")} />
                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-wider">{store.status === 'online' ? 'Ativo' : 'Offline'}</span>
                  </div>
                </div>
              </div>
              
            </div>

            <div className="relative z-10 flex-1 flex flex-col justify-center">
              {store.insights.slice(0, 1).map((insight: any, idx: number) => (
                <div key={idx} className="bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/10 px-2 py-1.5 rounded-lg">
                  <p className="text-[9px] font-bold leading-tight text-[var(--brand-primary)] line-clamp-3">
                    {insight.message}
                  </p>
                </div>
              ))}
            </div>

            <div className="relative z-10 flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]/50 mt-auto">
              <span className="text-[7px] font-black text-muted-foreground uppercase tracking-tighter">Auditado</span>
              <span className="text-[7px] font-bold text-emerald-500 uppercase tracking-tighter">{new Date(store.lastSync).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
