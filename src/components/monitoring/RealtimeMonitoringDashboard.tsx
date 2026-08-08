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
  Timer,
  ShieldAlert
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";
import { getRealtimeMonitoringStats } from "@/lib/monitoring.functions";
import { cn } from "@/lib/utils";
import { StoreLogoThumb } from "@/components/brand/StoreLogoThumb";
import { ContamigosLogo } from "@/components/brand/ContamigosLogo";

export function RealtimeMonitoringDashboard() {
  const fetchStats = useServerFn(getRealtimeMonitoringStats);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 12;
  
  const { data, isLoading, refetch, isFetching, error } = useQuery({
    queryKey: ["realtime-monitoring-stats", searchQuery, page],
    queryFn: () => fetchStats({ data: { query: searchQuery, page, pageSize } }),
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const stats = data?.stores || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  if (error) {
    return (
      <div className="p-12 rounded-[var(--radius-2xl)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-center shadow-2xl">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--danger)]/10 mb-6">
          <ShieldAlert className="h-8 w-8 text-[var(--danger)] opacity-80" />
        </div>
        <h4 className="t-h3 mb-3">Acesso Restrito</h4>
        <p className="t-small max-w-sm mx-auto mb-8">
          {error.message || "Você não tem permissão para acessar esta funcionalidade de monitoramento."}
        </p>
        <button 
          onClick={() => window.location.href = '/'}
          className="pc-button-secondary"
        >
          Voltar para o Início
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 p-4 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] animate-pulse shadow-2xl shadow-blue-500/5">
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
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1); // Reset to first page on search
              }}
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
                  <div className="h-10 w-10 shrink-0 rounded-[var(--radius-md)] bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] p-1.5 flex items-center justify-center shadow-sm overflow-hidden group-hover:scale-105 transition-transform duration-500">
                    {store.storeName.includes("Contamigos") ? (
                      <ContamigosLogo size="sm" hideName />
                    ) : (
                      <StoreLogoThumb 
                        src={store.storeLogoUrl} 
                        name={store.storeName} 
                        className="h-full w-full border-none p-0 bg-transparent brightness-90 contrast-125 saturate-0 group-hover:saturate-100 group-hover:brightness-100 transition-all duration-500"
                        imgClassName="object-contain filter-none"

                        initialsClassName="text-slate-900 font-bold text-[10px]"
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[13px] font-bold text-[var(--text-primary)] leading-tight truncate group-hover:text-[var(--brand-primary)] transition-colors">
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
              <div className="flex-1 bg-[var(--bg-surface-elevated)]/30 rounded-[var(--radius-lg)] p-3 border border-[var(--border-subtle)] group-hover:border-[var(--brand-primary)]/20 transition-all duration-300">
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

      {/* Pagination Performance */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || isFetching}
            className="h-10 px-4 rounded-[var(--radius-md)] bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[12px] font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-50 transition-all"
          >
            Anterior
          </button>
          <div className="text-[12px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">
            Página {page} de {totalPages}
          </div>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || isFetching}
            className="h-10 px-4 rounded-[var(--radius-md)] bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[12px] font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-50 transition-all"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}

