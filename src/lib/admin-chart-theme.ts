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
/**
 * Cores fixas (não tokens) — o admin roda em `.admin-scope` com fundo navy
 * escuro e os tokens `--primary/--foreground` estão em oklch, que o Recharts
 * não interpola via `hsl(var(...))`. Usamos literais garantidos para manter
 * contraste WCAG AA contra o navy #0a1631/#0f1b3d.
 */
export const chartTheme = {
  grid: "rgba(226, 232, 240, 0.18)",
  axis: "rgba(226, 232, 240, 0.92)",
  axisSoft: "rgba(226, 232, 240, 0.68)",
  primary: "#60a5fa",        // azul claro — visível no navy
  primaryStrong: "#93c5fd",
  accent: "#f4c46b",         // gold acessível
  emerald: "#34d399",
  destructive: "#f87171",
  tooltipBg: "#0b1226",
  tooltipBorder: "rgba(244, 196, 107, 0.35)",
  tooltipFg: "#f8fafc",
} as const;

export const tickStyle = { fontSize: 10, fill: chartTheme.axis } as const;
export const tickStyleSoft = { fontSize: 10, fill: chartTheme.axisSoft } as const;

export const tooltipStyle = {
  fontSize: 12,
  borderRadius: 10,
  border: `1px solid ${chartTheme.tooltipBorder}`,
  background: chartTheme.tooltipBg,
  color: chartTheme.tooltipFg,
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.45)",
} as const;

export const tooltipLabelStyle = {
  color: chartTheme.tooltipFg,
  fontWeight: 600,
} as const;

export const tooltipItemStyle = {
  color: chartTheme.tooltipFg,
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
    height: isCompact ? 104 : 136,
    listHeight: isCompact ? 118 : 156,
    padY: isCompact ? "py-2" : "py-2.5",
    padX: isCompact ? "px-2.5" : "px-3",
    tickFontSize: isCompact ? 9 : 10,
    barMaxSize: isCompact ? 22 : 28,
    legendHeight: isCompact ? 14 : 18,
    xAxisAngleHeight: isCompact ? 26 : 34,
    yAxisWidth: isCompact ? 36 : 44,
    strokeWidth: isCompact ? 1.8 : 2.2,
    marginTop: isCompact ? 4 : 6,
  } as const;
}
