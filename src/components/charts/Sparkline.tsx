import { cn } from "@/lib/utils";

export type SparkPoint = { date: string; price: number };

type Props = {
  points: SparkPoint[];
  width?: number;
  height?: number;
  className?: string;
  tone?: "primary" | "savings" | "accent";
  ariaLabel?: string;
};

/**
 * Sparkline SVG puro — sem dependências, responsivo, animação suave via CSS.
 * Renderiza `null` se houver menos de 2 pontos.
 */
export function Sparkline({
  points,
  width = 120,
  height = 32,
  className,
  tone = "savings",
  ariaLabel,
}: Props) {
  if (!points || points.length < 2) return null;

  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const stepX = width / (points.length - 1);
  const pad = 2;
  const usableH = height - pad * 2;

  const coords = points.map((p, i) => {
    const x = i * stepX;
    const norm = (p.price - min) / range;
    const y = pad + usableH * (1 - norm);
    return { x, y };
  });

  const linePath = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");
  const areaPath =
    `M0,${height} L` +
    coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" L") +
    ` L${width},${height} Z`;

  const first = points[0].price;
  const last = points[points.length - 1].price;
  const trendDown = last < first;
  const effectiveTone: "primary" | "savings" | "accent" =
    tone === "savings" ? (trendDown ? "savings" : "accent") : tone;

  const colorClass =
    effectiveTone === "savings"
      ? "text-savings"
      : effectiveTone === "accent"
        ? "text-accent"
        : "text-primary";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      preserveAspectRatio="none"
      className={cn("block", colorClass, className)}
      role="img"
      aria-label={ariaLabel ?? "Tendência de preço"}
    >
      <path d={areaPath} fill="currentColor" opacity={0.14} />
      <path
        d={linePath}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={coords[coords.length - 1].x}
        cy={coords[coords.length - 1].y}
        r={2}
        fill="currentColor"
      />
    </svg>
  );
}
