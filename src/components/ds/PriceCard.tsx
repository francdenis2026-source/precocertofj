import { forwardRef, type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, formatBRL } from "./Badge";
import { ProductImage } from "./ProductImage";
import { UnitPriceBadge } from "@/components/product/UnitPriceBadge";
import { Price } from "@/components/ds/Price";

export type PriceTrend = "down" | "up" | "flat";

export interface PriceCardProps extends HTMLMotionProps<"article"> {
  name: string;
  brand?: string | null;
  imageUrl?: string | null;
  price: number;
  /** Preço anterior para calcular economia/variação. */
  previousPrice?: number | null;
  /** Mercado onde foi encontrado o preço. */
  marketName?: string | null;
  /** Rótulo curto de destaque (ex.: "Menor preço"). */
  highlight?: string | null;
  /** Rótulo secundário (ex.: unidade, gramagem). */
  unit?: string | null;
  /** Direção da variação; se não passar, é inferida do previousPrice. */
  trend?: PriceTrend;
  /** Ação principal (botão). */
  action?: ReactNode;
  /** Torna o card denso (mobile / listagens). */
  compact?: boolean;
}

/**
 * PriceCard — card de produto com foco tipográfico no preço (mono, tabular).
 * Segue a estética Signal White: imagem contida, hover-lift, badge de economia.
 */
export const PriceCard = forwardRef<HTMLElement, PriceCardProps>(function PriceCard(
  {
    className,
    name,
    brand,
    imageUrl,
    price,
    previousPrice,
    marketName,
    highlight,
    unit,
    trend,
    action,
    compact = false,
    onClick,
    onKeyDown,
    ...rest
  },
  ref,
) {
  const inferredTrend: PriceTrend =
    trend ??
    (previousPrice == null || previousPrice === price
      ? "flat"
      : price < previousPrice
        ? "down"
        : "up");

  const delta =
    previousPrice != null && previousPrice > 0 ? ((price - previousPrice) / previousPrice) * 100 : 0;
  const savings = previousPrice != null && previousPrice > price ? previousPrice - price : 0;

  const TrendIcon = inferredTrend === "down" ? TrendingDown : inferredTrend === "up" ? TrendingUp : Minus;
  const trendClass =
    inferredTrend === "down"
        ? "text-[var(--pc-brand-accent)]"
      : inferredTrend === "up"
        ? "text-[var(--danger)]"
        : "text-muted-foreground";

  const interactive = typeof onClick === "function";

  return (
    <motion.article
      ref={ref}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      role={interactive ? "link" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (!interactive || e.defaultPrevented) return;
        if (e.currentTarget !== e.target) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(e as unknown as React.MouseEvent<HTMLElement>);
        }
      }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--pc-shadow-sm)] transition-all hover:shadow-[var(--pc-shadow-md)]",
        compact ? "gap-2 p-3" : "gap-3 p-4",
        interactive &&
          "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      {...rest}
    >
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-[var(--radius-xl)] bg-muted/40",
          compact ? "aspect-[4/3]" : "aspect-square",
        )}
      >
        <ProductImage
          src={imageUrl}
          alt={name}
          name={name}
          brand={brand}
          size={compact ? "md" : "lg"}
          imgClassName="group-hover:scale-[1.03]"
        />

        {highlight ? (
          <span className="absolute left-2 top-2">
            <Badge variant="primary" size="sm">
              {highlight}
            </Badge>
          </span>
        ) : null}
        {savings > 0 ? (
          <span className="absolute right-2 top-2">
            <Badge variant="primary" size="sm">
              <Price value={savings} size="xs" tone="savings" prefix="−R$" />
            </Badge>
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {brand ? (
          <span className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {brand}
          </span>
        ) : null}
        <h3
          className={cn(
            "line-clamp-2 font-display font-medium leading-snug text-foreground",
            compact ? "text-sm" : "text-[15px]",
          )}
          title={name}
        >
          {name}
        </h3>
        {unit ? <span className="text-xs text-muted-foreground">{unit}</span> : null}

        <div className="mt-1 flex items-baseline gap-2">
          <span
            className={cn(
              "font-mono font-semibold tabular-nums text-foreground",
              compact ? "text-lg" : "text-price",
            )}
          >
            <Price value={price} size={compact ? "md" : "xl"} />
          </span>
          {previousPrice != null && previousPrice !== price ? (
            <Price value={previousPrice} size="xs" tone="strike" />
          ) : null}
          <UnitPriceBadge price={price} productName={name} className="ml-auto" />
        </div>

        <div className="mt-0.5 flex items-center justify-between gap-2 text-xs">
          {marketName ? (
            <span className="truncate text-muted-foreground" title={marketName}>
              {marketName}
            </span>
          ) : (
            <span />
          )}
          {previousPrice != null && Math.abs(delta) > 0.01 ? (
            <span className={cn("inline-flex items-center gap-1 font-medium tabular-nums", trendClass)}>
              <TrendIcon className="h-3.5 w-3.5" aria-hidden />
              {delta > 0 ? "+" : ""}
              {delta.toFixed(1)}%
            </span>
          ) : null}
        </div>

        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </motion.article>
  );
});
