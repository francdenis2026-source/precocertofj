import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { Check, TrendingDown, Store, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSignedLogoUrl } from "@/hooks/use-signed-logo-urls";
import { Badge, formatBRL } from "./Badge";
import { ProductImage } from "./ProductImage";
import { Price } from "@/components/ds/Price";

/** Renderiza uma logo do bucket privado `logos` assinando-a on demand. */
function SignedLogo({ url, alt }: { url: string | null | undefined; alt: string }) {
  const resolved = useSignedLogoUrl(url);
  if (!resolved) return null;
  return (
    <img
      src={resolved}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="h-full w-full object-contain object-center p-0.5"
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />

  );
}

export interface ComparisonRow {
  marketId: string;
  marketName: string;
  logoUrl?: string | null;
  price: number;
  /** Rótulo opcional (ex.: "Atualizado hoje"). */
  meta?: string | null;
  /** ISO timestamp da última leitura de preço, usado no indicador de frescor. */
  lastSeenAt?: string | null;
}

/** Limite (dias) a partir do qual o preço é considerado defasado. */
const STALE_THRESHOLD_DAYS = 30;

function formatFreshness(iso: string | null | undefined): {
  label: string;
  days: number;
  stale: boolean;
} | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;
  const diffMs = Date.now() - then;
  const days = Math.max(0, Math.floor(diffMs / 86_400_000));
  const stale = days > STALE_THRESHOLD_DAYS;
  const label =
    days <= 0
      ? "atualizado hoje"
      : days === 1
        ? "atualizado ontem"
        : days < 30
          ? `atualizado há ${days} dias`
          : days < 60
            ? "atualizado há +1 mês"
            : `atualizado há ${Math.floor(days / 30)} meses`;
  return { label, days, stale };
}

export interface ComparisonCardProps extends HTMLMotionProps<"article"> {
  productName: string;
  productImage?: string | null;
  rows: ComparisonRow[];
  /** ID do mercado destacado como "melhor preço". Default: menor preço. */
  bestMarketId?: string;
  onRowSelect?: (row: ComparisonRow) => void;
}

/**
 * ComparisonCard — comparativo compacto de um produto entre N mercados.
 * Destaca o menor preço com badge e ícone, mantém alinhamento tabular.
 */
export const ComparisonCard = forwardRef<HTMLElement, ComparisonCardProps>(function ComparisonCard(
  { className, productName, productImage, rows, bestMarketId, onRowSelect, onClick, onKeyDown, ...rest },
  ref,
) {
  const sorted = [...rows].sort((a, b) => a.price - b.price);
  const bestId = bestMarketId ?? sorted[0]?.marketId;
  const bestPrice = sorted[0]?.price ?? 0;
  const worstPrice = sorted[sorted.length - 1]?.price ?? 0;
  const savings = worstPrice - bestPrice;
  const interactive = typeof onClick === "function";

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      role={interactive ? "link" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (!interactive) return;
        if (e.defaultPrevented) return;
        // Only trigger when the card itself is the focus target — the
        // per-market <button> rows handle their own Enter/Space.
        if (e.currentTarget !== e.target) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(e as unknown as React.MouseEvent<HTMLElement>);
        }
      }}
      className={cn(
        "flex flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-elev-1",
        interactive &&
          "cursor-pointer transition-shadow hover:shadow-elev-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      {...rest}
    >
      <header className="flex items-center gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted/40 ring-1 ring-border/60 sm:h-16 sm:w-16">
          <ProductImage src={productImage} alt={productName} name={productName} size="md" fit="contain" imgClassName="p-1.5" />
        </div>

        <div className="min-w-0 flex-1">

          <h3 className="truncate font-display text-base font-semibold text-foreground" title={productName}>
            {productName}
          </h3>
          <p className="text-xs text-muted-foreground">
            {rows.length} {rows.length === 1 ? "mercado" : "mercados"} comparados
          </p>
        </div>
        {savings > 0 ? (
          <Badge variant="savings" size="sm">
            <TrendingDown className="mr-1 h-3 w-3" aria-hidden />
            economia <Price value={savings} size="xs" tone="savings" prefix="R$" />
          </Badge>
        ) : null}
      </header>

      <ul className="divide-y divide-border/70 rounded-xl border border-border/70 bg-background/50">
        {sorted.map((row) => {
          const isBest = row.marketId === bestId;
          const freshness = formatFreshness(row.lastSeenAt);
          return (
            <li key={row.marketId}>
              <button
                type="button"
                onClick={(e) => {
                  // Prevent the outer card's click handler from firing twice.
                  e.stopPropagation();
                  onRowSelect?.(row);
                }}
                className={cn(
                  "group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                  isBest ? "bg-savings/5" : "hover:bg-muted/40",
                  freshness?.stale && "bg-destructive/5",
                )}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted/60 ring-1 ring-border/60">
                  {row.logoUrl ? (
                    <SignedLogo url={row.logoUrl} alt="" />
                  ) : (
                    <Store className="h-4 w-4 text-muted-foreground" aria-hidden />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{row.marketName}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    {row.meta ? (
                      <span className="truncate text-[11px] text-muted-foreground">{row.meta}</span>
                    ) : null}
                    {freshness ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium leading-none",
                          freshness.stale
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted/60 text-muted-foreground",
                        )}
                        title={row.lastSeenAt ?? undefined}
                      >
                        {freshness.stale ? (
                          <AlertTriangle className="h-3 w-3" aria-hidden />
                        ) : (
                          <Clock className="h-3 w-3" aria-hidden />
                        )}
                        {freshness.stale ? `defasado · ${freshness.label}` : freshness.label}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "font-mono text-base font-semibold tabular-nums",
                      isBest && !freshness?.stale ? "text-savings" : "text-foreground",
                      freshness?.stale && "line-through decoration-destructive/60",
                    )}
                  >
                    <Price value={row.price} size="sm" prefix="R$" />
                  </span>
                  {isBest && !freshness?.stale ? (
                    <span
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-savings text-savings-foreground"
                      aria-label="Menor preço"
                    >
                      <Check className="h-3 w-3" aria-hidden />
                    </span>
                  ) : null}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </motion.article>
  );
});
