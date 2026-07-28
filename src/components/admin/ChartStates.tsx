import { Loader2, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { tc } from "@/lib/typeclear";

/**
 * Skeleton animado usado enquanto os gráficos do console admin carregam.
 * Mantém a altura reservada para o gráfico real — evita layout shift ao
 * hidratar. Aceita `label` opcional para descrever o que está carregando.
 */
export function ChartSkeleton({
  height,
  label,
  className,
}: {
  height: number;
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "relative flex w-full items-center justify-center overflow-hidden rounded-lg bg-muted/30",
        className,
      )}
      style={{ height }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent,hsl(var(--foreground)/0.05),transparent)] bg-[length:200%_100%] animate-[shimmer_1.6s_infinite]" />
      <div className="relative flex flex-col items-center gap-1.5 text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        <span className={cn(tc.meta, "sr-only sm:not-sr-only")}>
          {label ?? "Carregando dados..."}
        </span>
      </div>
    </div>
  );
}

/**
 * Estado vazio para gráficos: aplica quando a série retorna sem pontos.
 * Diferente do skeleton, aqui o dado JÁ carregou — não é loading.
 */
export function ChartEmpty({
  height,
  title,
  hint,
  className,
}: {
  height: number;
  title?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/70 bg-card/40 px-3 text-center",
        className,
      )}
      style={{ height }}
    >
      <BarChart3 className="h-4 w-4 text-muted-foreground/70" aria-hidden />
      <p className={cn(tc.meta, "font-semibold text-foreground/80")}>
        {title ?? "Sem dados no período"}
      </p>
      {hint ? <p className={cn(tc.meta, "text-muted-foreground")}>{hint}</p> : null}
    </div>
  );
}
