/**
 * Tema compartilhado dos gráficos do console admin.
 *
 * Recharts não herda `color`/`currentColor` nos ticks/grid/legenda, então
 * centralizamos aqui as cores em stroke/fill explícito para garantir
 * contraste consistente contra o card dark navy do escopo `.admin-scope`.
 *
 * Também expõe utilitários de layout compacto: um usuário pode alternar
 * entre densidades (`normal` / `compact`) sem duplicar magic numbers.
 */

export type ChartDensity = "normal" | "compact";

/** Tokens de cor prontos para passar em stroke / fill do recharts. */
export const chartTheme = {
  grid: "hsl(var(--foreground) / 0.16)",
  axis: "hsl(var(--foreground) / 0.80)",
  axisSoft: "hsl(var(--foreground) / 0.55)",
  primary: "hsl(var(--primary))",
  primaryStrong: "hsl(var(--primary) / 0.9)",
  accent: "#e0b64d", // gold — combina com `goldRule` do PageHeader
  emerald: "#34d399",
  destructive: "hsl(var(--destructive))",
} as const;

export const tickStyle = { fontSize: 10, fill: chartTheme.axis } as const;
export const tickStyleSoft = { fontSize: 10, fill: chartTheme.axisSoft } as const;

export const tooltipStyle = {
  fontSize: 12,
  borderRadius: 10,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--popover))",
  color: "hsl(var(--popover-foreground))",
  boxShadow: "0 8px 24px hsl(0 0% 0% / 0.35)",
} as const;

export const tooltipLabelStyle = {
  color: "hsl(var(--popover-foreground))",
  fontWeight: 600,
} as const;

export const tooltipItemStyle = {
  color: "hsl(var(--popover-foreground))",
} as const;

export const legendStyle = {
  fontSize: 10,
  color: chartTheme.axis,
  paddingTop: 2,
} as const;

/**
 * Altura utilizada pela área do gráfico e paddings do card conforme densidade.
 * Compact reduz ~28% na altura sem perder legibilidade dos eixos.
 */
export function chartMetrics(density: ChartDensity) {
  const isCompact = density === "compact";
  return {
    height: isCompact ? 112 : 156,
    listHeight: isCompact ? 132 : 176,
    padY: isCompact ? "py-2" : "py-2.5",
    padX: isCompact ? "px-2.5" : "px-3",
    tickFontSize: isCompact ? 9 : 10,
    barMaxSize: isCompact ? 22 : 28,
    legendHeight: isCompact ? 14 : 18,
    xAxisAngleHeight: isCompact ? 30 : 38,
    yAxisWidth: isCompact ? 40 : 48,
    strokeWidth: isCompact ? 1.8 : 2.2,
    marginTop: isCompact ? 4 : 6,
  } as const;
}
