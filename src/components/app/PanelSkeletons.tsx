import { RefreshCw } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Skeletons compartilhados do painel do cliente.
 * Substituem spinners "vazios" por blocos com a mesma forma do conteúdo,
 * o que evita a sensação de tela travada em telas menores.
 */

export function MetricRailSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="grid grid-cols-1 divide-y divide-border/60 min-[420px]:grid-cols-2 min-[420px]:divide-x sm:grid-cols-4 sm:divide-y-0"
    >
      <span className="sr-only">Carregando métricas do painel</span>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3 px-3.5 py-2.5 md:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Skeleton className="h-7 w-7 shrink-0 rounded-lg" />
            <div className="min-w-0 space-y-1.5">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-2 w-24" />
            </div>
          </div>
          <Skeleton className="h-4 w-12 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function PanelBlockSkeleton({
  rows = 5,
  className,
  label = "Carregando",
}: {
  rows?: number;
  className?: string;
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "flex h-full min-h-0 flex-1 flex-col gap-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/80 p-3.5 backdrop-blur-md shadow-xl",
        className,
      )}
    >
      <span className="sr-only">{label}</span>
      <Skeleton className="h-3.5 w-32" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3 w-[70%]" />
            <Skeleton className="h-2.5 w-[45%]" />
          </div>
          <Skeleton className="h-3 w-12 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function ListDetailSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="space-y-3 rounded-2xl border border-border bg-card p-3.5 sm:p-4"
    >
      <span className="sr-only">Carregando lista</span>
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <Skeleton className="h-9 w-full rounded-lg" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2.5 rounded-lg border border-border/60 p-2.5">
            <Skeleton className="h-4 w-4 shrink-0 rounded" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3 w-[60%]" />
              <Skeleton className="h-2.5 w-[35%]" />
            </div>
            <Skeleton className="h-3.5 w-14 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Aviso discreto quando o carregamento demora demais, com retry claro. */
export function StalledNotice({
  onRetry,
  message = "Está demorando mais que o normal.",
  className,
}: {
  onRetry: () => void;
  message?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-[12.5px] text-foreground/85",
        className,
      )}
    >
      <span className="min-w-0">{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-[12px] font-semibold text-foreground transition hover:bg-accent"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden />
        Tentar novamente
      </button>
    </div>
  );
}
