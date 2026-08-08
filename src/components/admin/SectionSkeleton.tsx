import { cn } from "@/lib/utils";
import { tc } from "@/lib/typeclear";

/**
 * Placeholder de carregamento para seções pesadas do console administrativo.
 * Mantém a altura estável (evita saltos de layout em redes lentas).
 */
export function SectionSkeleton({
  rows = 3,
  chart = false,
  label = "Carregando seção",
  className,
}: {
  rows?: number;
  chart?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={cn("space-y-2 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5", className)}
    >
      <span className="sr-only">{label}…</span>
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 shrink-0 animate-pulse rounded-md bg-muted/70" />
        <div className="h-3 w-40 animate-pulse rounded bg-muted/70" />
        <div className={cn(tc.meta, "ml-auto text-muted-foreground")} aria-hidden="true">
          {label}…
        </div>
      </div>
      {chart ? (
        <div className="grid gap-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[132px] animate-pulse rounded-lg bg-muted/40" />
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              className="h-6 animate-pulse rounded-md bg-muted/40"
              style={{ width: `${100 - i * 7}%` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
