import { memo } from "react";
import { Trophy, ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { tc } from "@/lib/typeclear";
import { shortenStoreName } from "@/lib/store-name";
import { Price } from "@/components/ds/Price";

const serif = "font-['Instrument_Serif',ui-serif,Georgia,serif]";

/**
 * PriceSpotlight — bloco editorial de destaque para o menor preço.
 *
 * Aplica a mesma linguagem visual do painel "Explorar" (serif Instrument
 * Serif + divisor vertical dourado), estabelecendo hierarquia clara
 * entre preço, estabelecimento e disponibilidade.
 *
 * Uso: no comparador e no ranking, imediatamente acima da grade de
 * resultados. Componente puramente apresentacional.
 */
export const PriceSpotlight = memo(function PriceSpotlight({
  kicker = "Destaque",
  productName,
  sizeLabel,
  price,
  storeName,
  storesAvailable,
  lastSeenLabel,
  detailSlug,
  ctaLabel = "Ver comparação completa",
  className,
}: {
  kicker?: string;
  productName: string;
  sizeLabel?: string | null;
  price: number | null;
  storeName?: string | null;
  storesAvailable?: number | null;
  lastSeenLabel?: string | null;
  detailSlug?: string | null;
  ctaLabel?: string;
  className?: string;
}) {
  if (price == null) return null;

  return (
    <section
      aria-label="Menor preço em destaque"
      className={cn(
        "pc-surface-3 relative overflow-hidden px-4 py-4 md:px-6 md:py-5",
        className,
      )}
    >
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] md:items-center md:gap-6">
        {/* Coluna 1 — Preço em destaque */}
        <div className="min-w-0">
          <p
            /* Sem override de cor: tc.eyebrow já usa --pc-gold-ink, que mantém
               contraste AA sobre a superfície navy do spotlight. */
            className={cn(tc.eyebrow, "inline-flex items-center gap-1.5")}
          >
            <Trophy className="h-3 w-3" strokeWidth={2.4} aria-hidden />
            {kicker}
          </p>
          <Price as="p" value={price} size="xl" className="mt-1" />
          <p className={cn(tc.meta, "mt-1.5 text-muted-foreground")}>
            {storeName ? (
              <>
                em{" "}
                <span className={cn(tc.storeName, "align-baseline")}>
                  {shortenStoreName(storeName)}
                </span>
              </>
            ) : (
              "Menor preço atual"
            )}
          </p>
        </div>

        {/* Divisor vertical dourado — só desktop */}
        <div
          aria-hidden
          className="hidden md:block h-full w-px"
          style={{
            background:
              "linear-gradient(to bottom, transparent, hsl(var(--accent)) 20%, hsl(var(--accent)) 80%, transparent)",
          }}
        />

        {/* Coluna 2 — Produto e disponibilidade */}
        <div className="min-w-0 border-t border-border/60 pt-3 md:border-t-0 md:pt-0">
          <p className={cn(tc.eyebrow, "text-muted-foreground")}>Produto</p>
          <h3
            className={cn(
              serif,
              "mt-0.5 text-[22px] font-normal leading-tight tracking-tight text-foreground md:text-[26px]",
            )}
          >
            {productName}
          </h3>
          {sizeLabel ? (
            <p className={cn(tc.meta, "mt-0.5 text-muted-foreground")}>{sizeLabel}</p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {typeof storesAvailable === "number" && storesAvailable > 0 ? (
              <span className={cn(tc.meta, "text-foreground/80")}>
                <span className="font-semibold text-foreground">{storesAvailable}</span>{" "}
                {storesAvailable === 1 ? "mercado" : "mercados"} com preço
              </span>
            ) : null}
            {lastSeenLabel ? (
              <span className={cn(tc.meta, "text-muted-foreground")}>
                Atualizado {lastSeenLabel}
              </span>
            ) : null}
          </div>

          {detailSlug ? (
            <Link
              to="/produto/$slug"
              params={{ slug: detailSlug }}
              className={cn(
                tc.chip,
                "mt-3 inline-flex items-center gap-1 text-primary transition-opacity hover:opacity-80",
              )}
            >
              {ctaLabel}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
});
