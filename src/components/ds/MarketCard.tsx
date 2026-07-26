import { forwardRef, type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { MapPin, Store, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSignedLogoUrl } from "@/hooks/use-signed-logo-urls";
import { Badge } from "./Badge";
import { RatingInline } from "./RatingStars";


export interface MarketCardProps extends HTMLMotionProps<"article"> {
  name: string;
  logoUrl?: string | null;
  /** Bairro ou cidade. */
  neighborhood?: string | null;
  /** Distância em km. */
  distanceKm?: number | null;
  /** Total de produtos monitorados. */
  productCount?: number | null;
  /** Nota (0-5). */
  rating?: number | null;
  /** Selo customizado (ex.: "Mais barato hoje"). */
  badge?: ReactNode;
  /** Ação principal opcional (link ou botão). */
  action?: ReactNode;
  compact?: boolean;
  /** Layout: linha horizontal (default) ou tile vertical estilo categoria. */
  variant?: "row" | "tile";
}

/**
 * MarketCard — card de mercado/mercado, focado em hierarquia visual limpa.
 */
export const MarketCard = forwardRef<HTMLElement, MarketCardProps>(function MarketCard(
  {
    className,
    name,
    logoUrl,
    neighborhood,
    distanceKm,
    productCount,
    rating,
    badge,
    action,
    compact = false,
    variant = "row",
    onClick,
    onKeyDown,
    ...rest
  },
  ref,
) {
  const interactive = typeof onClick === "function";
  const resolvedLogo = useSignedLogoUrl(logoUrl);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    onKeyDown?.(e);
    if (!interactive || e.defaultPrevented) return;
    if (e.currentTarget !== e.target) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.(e as unknown as React.MouseEvent<HTMLElement>);
    }
  };

  const distanceLabel =
    typeof distanceKm === "number"
      ? distanceKm < 1
        ? `${Math.round(distanceKm * 1000)} m`
        : `${distanceKm.toFixed(1)} km`
      : null;

  if (variant === "tile") {
    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();

    return (
      <motion.article
        ref={ref}
        whileHover={{ y: -3 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        role={interactive ? "link" : undefined}
        tabIndex={interactive ? 0 : undefined}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-elev-1 transition-all duration-200 hover:border-primary/50 hover:shadow-elev-3",
          interactive &&
            "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          className,
        )}
        {...rest}
      >
        {/* Logo showcase panel — protagonist */}
        <div className="relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-white via-white to-[color-mix(in_oklab,var(--primary)_6%,white)] p-4">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "linear-gradient(to right, color-mix(in oklab, var(--foreground) 5%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--foreground) 5%, transparent) 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }}
          />
          {resolvedLogo ? (
            <img
              src={resolvedLogo ?? undefined}
              alt={`${name} logo`}
              loading="lazy"
              className="relative z-10 max-h-full max-w-[82%] object-contain drop-shadow-sm transition-transform duration-300 group-hover:scale-[1.06]"
            />
          ) : (
            <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <span className="font-display text-xl font-bold tracking-tight">
                {initials || <Store className="h-7 w-7" aria-hidden />}
              </span>
            </div>
          )}
          {badge ? <div className="absolute right-2 top-2 z-20">{badge}</div> : null}
        </div>

        {/* Info strip */}
        <div className="flex flex-1 flex-col gap-1.5 border-t border-border/70 px-3.5 py-3">
          <h3
            className="line-clamp-1 font-display text-[14px] font-bold leading-tight tracking-tight text-foreground"
            title={name}
          >
            {name}
          </h3>
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1 text-[11.5px] text-muted-foreground">
              {neighborhood ? (
                <>
                  <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                  <span className="truncate">{neighborhood}</span>
                  {distanceLabel ? (
                    <span className="ml-1 shrink-0 tabular-nums">· {distanceLabel}</span>
                  ) : null}
                </>
              ) : (
                <span className="font-mono text-[11px] uppercase tracking-[0.14em]">Explore</span>
              )}
            </div>
            {typeof productCount === "number" ? (
              <span className="shrink-0 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {productCount}
                <span className="ml-0.5 text-muted-foreground">itens</span>
              </span>
            ) : null}
          </div>
        </div>

        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 bg-gradient-to-r from-primary via-primary to-accent transition-transform duration-300 group-hover:scale-x-100"
        />
      </motion.article>
    );
  }


  return (
    <motion.article
      ref={ref}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      role={interactive ? "link" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "group flex items-center gap-3 rounded-2xl border border-border bg-card shadow-elev-1 transition-shadow hover:shadow-elev-2",
        compact ? "p-2.5" : "p-3",
        interactive &&
          "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      {...rest}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted/50 ring-1 ring-border/60",
          compact ? "h-11 w-11" : "h-14 w-14",
        )}
      >
        {resolvedLogo ? (
          <img src={resolvedLogo ?? undefined} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <Store className={cn("text-muted-foreground", compact ? "h-5 w-5" : "h-6 w-6")} aria-hidden />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2">
          <h3
            className={cn(
              "truncate font-display font-semibold text-foreground",
              compact ? "text-sm" : "text-base",
            )}
            title={name}
          >
            {name}
          </h3>
          {badge}
        </div>

        <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12.5px] leading-snug text-muted-foreground">
          {neighborhood ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden />
              {neighborhood}
            </span>
          ) : null}
          {distanceLabel ? <span className="tabular-nums">{distanceLabel}</span> : null}
          {typeof productCount === "number" ? (
            <span className="tabular-nums">{productCount} produtos</span>
          ) : null}
          {typeof rating === "number" ? <RatingInline value={rating} /> : null}
        </div>

      </div>

      {action ?? (
        <ArrowUpRight
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
          aria-hidden
        />
      )}
    </motion.article>
  );
});

MarketCard.displayName = "MarketCard";

export function MarketCardBestPrice() {
  return (
    <Badge variant="savings" size="sm">
      Menor preço
    </Badge>
  );
}
