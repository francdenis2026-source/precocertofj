import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function LoadingSkeleton({
  rows = 3,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)} role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-11 animate-pulse rounded-lg bg-muted/60"
          style={{ opacity: 1 - i * 0.12 }}
        />
      ))}
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl border border-border/60 bg-card p-4 shadow-sm",
        className,
      )}
    >
      <div className="h-4 w-24 rounded bg-muted" />
      <div className="mt-3 h-7 w-32 rounded bg-muted" />
      <div className="mt-2 h-3 w-40 rounded bg-muted/70" />
    </div>
  );
}

/**
 * RankingSkeleton — placeholder editorial para telas de ranking/comparação
 * (menor preço em destaque + filtros + lista de lojas). Reproduz o rhythm
 * vertical real para evitar CLS ao trocar de estado.
 */
export function RankingSkeleton({
  rows = 6,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label="Loading price ranking"
      className={cn("space-y-2.5", className)}
    >
      <div className="animate-pulse rounded-xl border border-border/70 bg-card p-3">
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="mt-2 h-3 w-64 rounded bg-muted/70" />
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5">
          <div className="h-10 w-10 rounded-full bg-emerald-500/20" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2.5 w-24 rounded bg-emerald-600/30" />
            <div className="h-4 w-3/4 rounded bg-muted" />
          </div>
          <div className="h-7 w-24 rounded bg-emerald-500/25" />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-border/70 bg-card px-2.5 py-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-7 w-16 animate-pulse rounded-full bg-muted/70" />
        ))}
      </div>
      <div className="rounded-xl border border-border/70 bg-card p-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex animate-pulse items-center gap-3 border-b border-border/40 px-1.5 py-2 last:border-0"
            style={{ opacity: 1 - i * 0.06 }}
          >
            <div className="h-8 w-8 shrink-0 rounded-lg bg-muted" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-2/5 rounded bg-muted" />
              <div className="h-2.5 w-1/4 rounded bg-muted/70" />
            </div>
            <div className="h-5 w-20 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * FadeSwap — envelope simples para transições suaves entre skeleton e
 * conteúdo real (fade + slide curto). Respeita `prefers-reduced-motion`.
 */
export function FadeSwap({
  showKey,
  children,
  className,
}: {
  showKey: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      key={showKey}
      className={cn(
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * LocationsSkeleton — placeholder para a página /onde-comprar
 * (busca + chips de cidade/bairro + lista de ofertas por loja).
 * Reproduz o rhythm real do layout para evitar CLS.
 */
export function LocationsSkeleton({
  rows = 4,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div role="status" aria-label="Loading locations and deals" className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-border/70 bg-card p-2.5"
          style={{ opacity: 1 - i * 0.08 }}
        >
          <div className="mb-2 flex items-start gap-2">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="h-3.5 w-3/5 rounded bg-muted" />
              <div className="h-2.5 w-2/5 rounded bg-muted/70" />
            </div>
            <div className="h-5 w-24 rounded-full bg-emerald-500/15" />
          </div>
          <div className="grid gap-1 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5">
                <div className="h-3.5 w-3.5 shrink-0 rounded bg-muted" />
                <div className="flex-1 space-y-1">
                  <div className="h-2.5 w-2/3 rounded bg-muted" />
                  <div className="h-2 w-1/2 rounded bg-muted/70" />
                </div>
                <div className="h-3.5 w-14 rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
