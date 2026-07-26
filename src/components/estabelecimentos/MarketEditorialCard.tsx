import { Link } from "@tanstack/react-router";
import {
  ChevronRight,
  MapPin,
  Package,
  PiggyBank,
  Radio,
  Store,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface MarketEditorialCardProps {
  slug: string;
  name: string;
  logoUrl?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  productsCount: number;
  /** Rótulo de frescor, ex.: "Atualizado hoje". */
  freshnessLabel: string;
  freshnessLive: boolean;
  /** Classificação por catálogo. */
  tierLabel: string;
  tierColor: string;
  /** Distância formatada + qualificador (opcional). */
  distanceLabel?: string | null;
  distanceQualifier?: string | null;
  /** Categoria principal exibida no rodapé. */
  topCategory?: string | null;
  /** Economia máxima detectada (R$), quando houver. */
  maxSavings?: number | null;
  isCheapest?: boolean;
  isFeatured?: boolean;
  /** Botão de favorito (posicionado no canto). */
  favoriteSlot?: ReactNode;
  /** Índice para exibir a numeração editorial. */
  rank?: number;
  className?: string;
}

/**
 * MarketEditorialCard — card compacto de mercado.
 *
 * Anatomia (altura reduzida): painel de marca enxuto → nome + localidade →
 * uma única linha de dados tabulares (produtos · atualização · distância ·
 * economia) → rodapé com categoria e CTA.
 */
export function MarketEditorialCard({
  slug,
  name,
  logoUrl,
  neighborhood,
  city,
  productsCount,
  freshnessLabel,
  freshnessLive,
  tierLabel,
  tierColor,
  distanceLabel,
  distanceQualifier,
  topCategory,
  maxSavings,
  isCheapest = false,
  isFeatured = false,
  favoriteSlot,
  rank,
  className,
}: MarketEditorialCardProps) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className={cn("relative h-full", className)}>
      {favoriteSlot ? (
        <div className="absolute right-2 top-2 z-20">{favoriteSlot}</div>
      ) : null}

      <Link
        to="/estabelecimento/$slug"
        params={{ slug }}
        aria-label={`Ver detalhes de ${name}`}
        className={cn(
          "group relative flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-200",
          "hover:-translate-y-[2px] hover:shadow-[0_14px_32px_-22px_color-mix(in_oklab,var(--pc-home-navy)_55%,transparent)]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          isCheapest
            ? "border-brand-gold/70 ring-1 ring-brand-gold/25"
            : "border-border/70 hover:border-brand-gold/60",
        )}
      >
        {/* Painel de marca — enxuto */}
        <div
          className="relative flex h-[72px] items-center justify-center overflow-hidden px-3"
          style={{ background: "color-mix(in oklab, var(--pc-home-navy) 5%, white)" }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.45]"
            style={{
              backgroundImage:
                "linear-gradient(to right, color-mix(in oklab, var(--pc-home-navy) 8%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--pc-home-navy) 8%, transparent) 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }}
          />
          {typeof rank === "number" && (
            <span
              aria-hidden
              className="absolute bottom-1 left-2 select-none font-sans text-[18px] font-bold leading-none tracking-tighter"
              style={{ color: "color-mix(in oklab, var(--pc-home-navy) 55%, transparent)" }}
            >
              {String(rank).padStart(2, "0")}
            </span>
          )}

          {logoUrl ? (
            <img
              src={logoUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="relative z-10 max-h-[54px] max-w-[62%] object-contain drop-shadow-sm transition-transform duration-300 group-hover:scale-[1.04]"
            />
          ) : (
            <span className="relative z-10 grid h-12 w-12 place-items-center rounded-lg bg-brand-navy/10 text-[15px] font-bold text-brand-navy ring-1 ring-brand-navy/15">
              {initials || <Store className="h-5 w-5" aria-hidden />}
            </span>
          )}

          {/* Selo de destaque / mais barato */}
          {(isCheapest || isFeatured) && (
            <div className="absolute left-2 top-1.5 z-10 flex items-center gap-1">
              {isCheapest ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-gold px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-[0.12em] text-brand-navy shadow-sm">
                  <PiggyBank className="h-2.5 w-2.5" aria-hidden /> Mais barato
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-brand-navy/20 bg-white/90 px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-[0.12em] text-brand-navy shadow-sm">
                  Destaque
                </span>
              )}
            </div>
          )}

          {/* Classificação por catálogo */}
          <span
            className="absolute bottom-1.5 right-2 z-10 inline-flex items-center rounded-full border px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-[0.14em]"
            style={{
              background: `color-mix(in oklab, ${tierColor} 14%, white)`,
              borderColor: `color-mix(in oklab, ${tierColor} 55%, transparent)`,
              color: `color-mix(in oklab, ${tierColor} 62%, black)`,
            }}
            title={`Classificação por catálogo: ${tierLabel}`}
          >
            {tierLabel}
          </span>
        </div>

        {/* Nome + localidade */}
        <div className="border-t border-border/70 px-3 pb-1.5 pt-2">
          <h3 className="truncate text-[14.5px] font-semibold leading-[1.2] tracking-[-0.01em] text-foreground">
            {name}
          </h3>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[11.5px] font-medium text-foreground/70">
            <MapPin className="h-3 w-3 shrink-0 text-[var(--pc-gold-ink)]" aria-hidden />
            <span className="truncate">
              {[neighborhood, city].filter(Boolean).join(" · ") || "Localização não informada"}
            </span>
          </p>
        </div>

        {/* Linha única de dados */}
        <dl className="mx-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/60 py-1.5 text-[11.5px] text-foreground/80">
          <div className="flex min-w-0 items-center gap-1">
            <Package className="h-3.5 w-3.5 shrink-0 text-[var(--pc-gold-ink)]" aria-hidden />
            <dt className="sr-only">Produtos cadastrados</dt>
            <dd className="truncate">
              <span className="font-bold tabular-nums text-foreground">{productsCount}</span> produtos
            </dd>
          </div>
          <div className="flex min-w-0 items-center gap-1">
            <Radio
              className={cn(
                "h-3.5 w-3.5 shrink-0",
                freshnessLive ? "text-emerald-600 dark:text-emerald-400" : "text-foreground/65",
              )}
              aria-hidden
            />
            <dt className="sr-only">Atualização</dt>
            <dd className="truncate">{freshnessLabel}</dd>
          </div>
          {distanceLabel && (
            <div className="flex min-w-0 items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--pc-gold-ink)]" aria-hidden />
              <dt className="sr-only">Distância</dt>
              <dd className="truncate">
                <span className="font-bold tabular-nums text-foreground">{distanceLabel}</span>{" "}
                <span className="hidden sm:inline">{distanceQualifier}</span>
              </dd>
            </div>
          )}
          {typeof maxSavings === "number" && maxSavings > 0 && (
            <div className="flex min-w-0 items-center gap-1">
              <PiggyBank className="h-3.5 w-3.5 shrink-0 text-[var(--pc-gold-ink)]" aria-hidden />
              <dt className="sr-only">Economia potencial</dt>
              <dd className="truncate">
                até{" "}
                <span className="font-bold tabular-nums text-foreground">
                  R$ {maxSavings.toFixed(2).replace(".", ",")}
                </span>
              </dd>
            </div>
          )}
        </dl>

        {/* Rodapé */}
        <div className="mt-auto flex items-center justify-between gap-2 px-3 py-2">
          <span className="min-w-0 truncate text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/75">
            {topCategory ?? "Ver catálogo"}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-brand-gold/16 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[var(--pc-gold-ink)] transition-colors group-hover:bg-brand-gold group-hover:text-brand-navy">
            Ver preços
            <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </div>

        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 bg-brand-gold transition-transform duration-300 group-hover:scale-x-100"
        />
      </Link>
    </div>
  );
}

export function MarketEditorialCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
      <div className="h-[72px] animate-pulse bg-muted/70" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
