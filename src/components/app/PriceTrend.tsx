import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";

import { Sparkline, type SparkPoint } from "@/components/charts/Sparkline";
import { cn } from "@/lib/utils";
import { tc } from "@/lib/typeclear";

/**
 * Mini visualizações de tendência de preço reutilizáveis no painel:
 * - `TrendBadge`: variação percentual com seta e cor semântica.
 * - `MiniTrend`: sparkline compacto + variação + data da última atualização.
 */

export function trendDirection(changePct: number | null | undefined) {
  if (changePct == null || Number.isNaN(changePct)) return "flat" as const;
  if (changePct > 0.5) return "up" as const;
  if (changePct < -0.5) return "down" as const;
  return "flat" as const;
}

export function formatUpdatedAt(date: string | null | undefined): string {
  if (!date) return "sem registro";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "sem registro";
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  const label = d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
  if (days <= 0) return `hoje · ${label}`;
  if (days === 1) return `ontem · ${label}`;
  if (days < 30) return `há ${days} dias · ${label}`;
  return label;
}

export function TrendBadge({
  changePct,
  className,
  label,
}: {
  changePct: number | null | undefined;
  className?: string;
  label?: string;
}) {
  const dir = trendDirection(changePct);
  const Icon = dir === "down" ? ArrowDown : dir === "up" ? ArrowUp : ArrowRight;
  const text =
    changePct == null || dir === "flat"
      ? "estável"
      : `${changePct > 0 ? "+" : ""}${changePct.toFixed(1)}%`;

  return (
    <span
      className={cn(
        tc.metaMuted,
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-medium",
        dir === "down" && "border-savings/40 bg-savings/10 text-savings",
        dir === "up" && "border-destructive/40 bg-destructive/10 text-destructive",
        dir === "flat" && "border-border/70 bg-muted/50 text-muted-foreground",
        className,
      )}
      title={
        dir === "down"
          ? "Preço caiu no período"
          : dir === "up"
            ? "Preço subiu no período"
            : "Preço sem variação relevante"
      }
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {label ? `${label} ${text}` : text}
    </span>
  );
}

export function MiniTrend({
  points,
  changePct,
  lastUpdate,
  className,
  width = 110,
  height = 30,
}: {
  points: SparkPoint[];
  changePct: number | null | undefined;
  lastUpdate?: string | null;
  className?: string;
  width?: number;
  height?: number;
}) {
  const hasSeries = points.length >= 2;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {hasSeries ? (
        <Sparkline
          points={points}
          width={width}
          height={height}
          ariaLabel={`Tendência de preço: ${points.length} registros`}
        />
      ) : (
        <span className={cn(tc.metaMuted, "italic")}>histórico insuficiente</span>
      )}
      <span className="flex min-w-0 flex-col items-start gap-0.5">
        <TrendBadge changePct={hasSeries ? changePct : null} />
        {lastUpdate !== undefined && (
          <span className={cn(tc.metaMuted, "truncate")}>{formatUpdatedAt(lastUpdate)}</span>
        )}
      </span>
    </div>
  );
}
