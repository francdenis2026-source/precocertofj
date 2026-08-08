import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { 
  Activity, 
  RefreshCcw,
  PackageSearch,
  Zap,
  LayoutGrid,
  Search,
  Timer
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getRealtimeMonitoringStats } from "@/lib/monitoring.functions";
import { cn } from "@/lib/utils";
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
      <div className="space-y-6">
        <div className="flex items-center gap-3 p-4 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] animate-pulse">
          <Activity className="h-4 w-4 text-[var(--brand-primary)] animate-spin-slow" />
          <span className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">Iniciando Varredura...</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-32 rounded-[var(--radius-xl)] bg-[var(--bg-surface-elevated)]/50 border border-[var(--border-subtle)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Search and Header Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--brand-primary)]/10">
              <Zap className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
            </div>
            <span className="t-kicker text-[var(--brand-primary)]">Inteligência de Mercado</span>
          </div>
          <h3 className="t-h3 !leading-none">Monitoramento Ativo</h3>
          <p className="t-caption max-w-md">Varredura automática de preços em todos os estabelecimentos cadastrados a cada 60 minutos.</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-72 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)] group-focus-within:text-[var(--brand-primary)] transition-colors" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por produto..."
              className="w-full h-11 pl-10 pr-4 rounded-[var(--radius-lg)] bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[14px] font-medium placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]/50 transition-all"
            />
          </div>
          <button 
            onClick={() => refetch()} 
            disabled={isFetching}
            className={cn(
              "shrink-0 h-11 w-11 flex items-center justify-center rounded-[var(--radius-lg)] bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] transition-all shadow-sm active:scale-95",
              isFetching && "opacity-50"
            )}
            title="Atualizar agora"
          >
            <RefreshCcw className={cn("h-4 w-4 text-[var(--text-secondary)]", isFetching && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Grid of Stores/Products */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence mode="popLayout">
          {(stats || []).map((store: any, i: number) => (
            <motion.div
              key={store.storeId}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
              className="pc-card !p-4 flex flex-col gap-4 group h-full"
            >
              {/* Card Header: Store Info */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 shrink-0 rounded-[var(--radius-md)] bg-white border border-[var(--border-subtle)] p-1.5 flex items-center justify-center shadow-sm overflow-hidden group-hover:scale-105 transition-transform duration-500">
                    {store.storeName.includes("Contamigos") ? (
                      <ContamigosLogo size="sm" hideName />
                    ) : (
                      <StoreLogoThumb 
                        src={store.storeLogoUrl} 
                        name={store.storeName} 
                        className="h-full w-full border-none p-0 bg-transparent"
                        imgClassName="object-contain filter-none mix-blend-multiply"
                        initialsClassName="text-slate-900 font-bold text-[10px]"
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[13px] font-bold text-[var(--text-primary)] leading-tight truncate">
                      {store.storeName.split(/\s+·\s+|\s+-\s+|,\s+/)[0].replace(/^(MERCEARIA|SUPERMERCADO|PANIFICADORA|ACOUGUE|DISTRIBUIDORA)\s+/i, '')}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className={cn("h-1.5 w-1.5 rounded-full", store.status === 'online' ? "bg-[var(--success)]" : "bg-[var(--danger)]")} />
                      <span className="t-caption !text-[9px] uppercase font-bold tracking-wider">{store.status === 'online' ? 'Ativo' : 'Pausado'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]">
                  <Timer className="h-3 w-3 text-[var(--text-tertiary)]" />
                  <span className="text-[10px] font-bold text-[var(--text-secondary)]">{new Date(store.lastSync).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
              </div>

              {/* Card Body: Recent Scan Result */}
              <div className="flex-1 bg-[var(--bg-base)]/40 rounded-[var(--radius-lg)] p-3 border border-[var(--border-subtle)]/50 group-hover:border-[var(--brand-primary)]/20 transition-colors">
                {store.insights && store.insights.length > 0 ? (
                  <div className="space-y-2">
                    {store.insights.slice(0, 1).map((insight: any, idx: number) => (
                      <p key={idx} className="text-[11px] font-medium leading-relaxed text-[var(--text-secondary)] line-clamp-3">
                        {insight.message}
                      </p>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center opacity-30">
                    <LayoutGrid className="h-5 w-5" />
                  </div>
                )}
              </div>

              {/* Card Footer: Metadata */}
              <div className="flex items-center justify-between text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-tighter pt-1">
                <span className="flex items-center gap-1">
                  <Activity className="h-3 w-3 text-[var(--brand-primary)]/50" />
                  Auditado agora
                </span>
                <span className="text-[var(--success)]">Verificado</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
