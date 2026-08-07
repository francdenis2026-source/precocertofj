import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { computeFairPrice, type FairPriceInput } from "@/lib/fair-price";

type Props = FairPriceInput & {
  size?: "sm" | "md";
  showDiff?: boolean;
  className?: string;
};

/**
 * Selo semáforo "Preço justo" (verde/amarelo/vermelho) baseado no percentil
 * histórico observado. Renderiza `null` quando não há dados suficientes.
 */
export function FairPriceBadge({
  price,
  min,
  avg,
  max,
  size = "sm",
  showDiff = false,
  className,
}: Props) {
  const s = computeFairPrice({ price, min, avg, max });
  if (!s) return null;

  const toneCls =
    s.tone === "great"
      ? "border-savings/40 bg-savings/15 text-savings"
      : s.tone === "fair"
        ? "border-warning/40 bg-warning/20 text-warning-foreground"
        : "border-destructive/40 bg-destructive/15 text-destructive";

  const Icon =
    s.tone === "great" ? TrendingDown : s.tone === "bad" ? TrendingUp : Minus;

  const sizeCls =
    size === "md"
      ? "gap-1.5 px-2.5 py-1 text-[11px]"
      : "gap-1 px-2 py-0.5 text-[11px]";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-bold uppercase tracking-wider",
        toneCls,
        sizeCls,
        className,
      )}
      title={
        s.diffPct !== null
          ? `${s.label} · ${s.diffPct >= 0 ? "+" : ""}${s.diffPct.toFixed(0)}% vs média`
          : s.label
      }
    >
      <Icon
        className={size === "md" ? "h-3 w-3" : "h-2.5 w-2.5"}
        strokeWidth={2.5}
      />
      {s.label}
      {showDiff && s.diffPct !== null && (
        <span className="num opacity-80">
          {s.diffPct >= 0 ? "+" : ""}
          {s.diffPct.toFixed(0)}%
        </span>
      )}
    </span>
  );
}
