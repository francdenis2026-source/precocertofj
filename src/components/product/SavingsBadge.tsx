import { TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Badge unificado de economia percentual — usado no ProductCard do
 * comparador, na lista de melhores preços e em qualquer componente que
 * exiba a diferença entre o menor preço e a média.
 *
 * Padrão editorial:
 * - Fundo `savings` sólido em destaque ou tonal (10%) para uso discreto
 * - Numeral tabular + ícone TrendingDown
 * - Focus-ring quando renderizado dentro de link/botão pai
 */
export function SavingsBadge({
  pct,
  variant = "solid",
  size = "md",
  className,
  precision = 0,
}: {
  pct: number;
  variant?: "solid" | "tonal" | "outline";
  size?: "sm" | "md";
  className?: string;
  precision?: 0 | 1;
}) {
  const safe = Number.isFinite(pct) ? pct : 0;
  if (safe <= 0) return null;

  const base =
    "inline-flex items-center gap-1 rounded-full font-mono font-bold uppercase tracking-widest tabular-nums";
  const sizes = {
    sm: "px-1.5 py-0.5 text-[9px]",
    md: "px-2.5 py-1 text-[10px]",
  };
  const variants = {
    solid: "bg-savings text-savings-foreground shadow-sm",
    tonal: "bg-savings/15 text-savings ring-1 ring-inset ring-savings/20",
    outline: "border border-savings/40 bg-transparent text-savings",
  };

  return (
    <span
      className={cn(base, sizes[size], variants[variant], className)}
      aria-label={`Economia de ${safe.toFixed(precision)} por cento`}
    >
      <TrendingDown className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} strokeWidth={2.4} />
      -{safe.toFixed(precision)}%
    </span>
  );
}
