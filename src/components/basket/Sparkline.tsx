import { useMemo } from "react";

type Point = { t: string; p: number };

/**
 * Sparkline SVG minimal, sem dependências.
 * - Cor sobe/desce conforme diff entre primeiro e último ponto.
 * - Nada é renderizado quando há menos de 2 pontos.
 */
export function Sparkline({
  points,
  width = 60,
  height = 18,
  strokeWidth = 1.5,
  className,
  ariaLabel,
}: {
  points: Point[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  className?: string;
  ariaLabel?: string;
}) {
  const path = useMemo(() => {
    if (!points || points.length < 2) return null;
    const values = points.map((p) => p.p);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const stepX = width / (points.length - 1);
    const coords = points.map((pt, i) => {
      const x = i * stepX;
      const y = height - ((pt.p - min) / range) * (height - strokeWidth) - strokeWidth / 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const delta = values[values.length - 1] - values[0];
    return { d: coords.join(" "), delta };
  }, [points, width, height, strokeWidth]);

  if (!path) {
    return (
      <span
        className={className}
        style={{ display: "inline-block", width, height, opacity: 0.35 }}
        aria-label={ariaLabel ?? "Sem histórico"}
      >
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <line
            x1={0}
            y1={height / 2}
            x2={width}
            y2={height / 2}
            stroke="currentColor"
            strokeWidth={1}
            strokeDasharray="2 2"
          />
        </svg>
      </span>
    );
  }

  const trending = path.delta > 0 ? "up" : path.delta < 0 ? "down" : "flat";
  const stroke =
    trending === "up"
      ? "hsl(var(--destructive))"
      : trending === "down"
        ? "rgb(5, 150, 105)"
        : "hsl(var(--muted-foreground))";

  return (
    <span
      className={className}
      style={{ display: "inline-block", lineHeight: 0 }}
      aria-label={ariaLabel ?? `Tendência ${trending === "up" ? "de alta" : trending === "down" ? "de baixa" : "estável"} nos últimos 7 dias`}
      role="img"
    >
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <polyline
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          points={path.d}
        />
      </svg>
    </span>
  );
}
