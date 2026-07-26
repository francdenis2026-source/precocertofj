import { Link } from "@tanstack/react-router";
import { ChevronRight, MapPin, Package, PiggyBank, Radio, Store } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { HighlightMatch } from "@/components/search/HighlightMatch";
import { SmartLogoImage, useLogoPresentation } from "@/components/brand/SmartLogo";

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
  /** Tokens da busca — destacados no nome/localidade. */
  highlightTokens?: string[];
  /** Card acima da dobra: carrega a logo imediatamente. */
  priority?: boolean;
  className?: string;
}


const PLATE_BG =
  "radial-gradient(120% 120% at 50% 0%, #ffffff 0%, #f3f6fb 62%, #e9eef7 100%)";

/**
 * MarketEditorialCard — card compacto e horizontal de mercado.
 *
 * Anatomia: chip de marca (placa clara apenas quando a logo precisa de
 * contraste) + nome/localidade → linha única de dados → rodapé com CTA.
 * Sem grande painel branco: a marca ocupa um chip fixo, garantindo altura
 * igual entre todos os cards.
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
  highlightTokens,
  priority = false,
  className,
}: MarketEditorialCardProps) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  // Reaproveita o cache de métricas já preenchido pela imagem (uma análise por
  // URL em toda a aplicação); só dispara leitura própria nos cards prioritários.
  const { metrics } = useLogoPresentation(logoUrl, {
    targetFill: 0.94,
    enabled: priority,
  });
  const lightInk = Boolean(
    metrics?.analyzed &&
      metrics.hasAlpha &&
      (metrics.lightInkRatio > 0.5 || metrics.contentLuma > 0.72),
  );
  const needsPlate = Boolean(logoUrl) && !lightInk;


  return (
    <div className={cn("relative h-full", className)}>
      {favoriteSlot ? <div className="absolute right-2 top-2 z-20">{favoriteSlot}</div> : null}

      <Link
        to="/estabelecimento/$slug"
        params={{ slug }}
        aria-label={`Ver preços de ${name}`}
        className={cn(
          "group relative flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-200",
          "hover:-translate-y-[2px] hover:shadow-[0_14px_32px_-22px_color-mix(in_oklab,var(--pc-home-navy)_55%,transparent)]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          isCheapest
            ? "border-brand-gold/70 ring-1 ring-brand-gold/25"
            : "border-border/70 hover:border-brand-gold/60",
        )}
      >
        {/* Cabeçalho compacto: marca + identificação */}
        <div className="flex items-start gap-2.5 px-3 pb-2 pt-2.5">
          <span
            className={cn(
              "relative grid h-[52px] w-[52px] shrink-0 place-items-center overflow-hidden rounded-[11px]",
              needsPlate ? "ring-1 ring-black/[0.06]" : "",
            )}
            style={needsPlate ? { background: PLATE_BG } : undefined}
          >
            {logoUrl ? (
              <span className="flex h-[86%] w-[86%] items-center justify-center overflow-hidden">
                <SmartLogoImage
                  src={logoUrl}
                  name={name}
                  targetFill={0.96}
                  className="transition-transform duration-300 group-hover:scale-[1.05]"
                />
              </span>
            ) : (
              <span className="grid h-full w-full place-items-center rounded-[11px] bg-brand-navy/10 text-[14px] font-bold text-brand-navy ring-1 ring-brand-navy/15">
                {initials || <Store className="h-5 w-5" aria-hidden />}
              </span>
            )}
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              {typeof rank === "number" && (
                <span
                  aria-hidden
                  className="shrink-0 text-[10.5px] font-bold tabular-nums tracking-tight text-foreground/45"
                >
                  {String(rank).padStart(2, "0")}
                </span>
              )}
              <span
                className="shrink-0 rounded-full border px-1.5 py-[1px] text-[9px] font-bold uppercase leading-none tracking-[0.1em] text-foreground/85"
                style={{
                  background: `color-mix(in oklab, ${tierColor} 16%, transparent)`,
                  borderColor: `color-mix(in oklab, ${tierColor} 45%, transparent)`,
                }}
                title={`Preços cadastrados: ${tierLabel}`}
              >
                {tierLabel}
              </span>

              {isCheapest ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-gold px-1.5 py-[1px] text-[9px] font-bold uppercase leading-none tracking-[0.1em] text-brand-navy">
                  <PiggyBank className="h-2.5 w-2.5" aria-hidden /> Mais barato
                </span>
              ) : isFeatured ? (
                <span className="inline-flex shrink-0 items-center rounded-full border border-brand-navy/25 px-1.5 py-[1px] text-[9px] font-bold uppercase leading-none tracking-[0.1em] text-brand-navy dark:border-brand-gold/30 dark:text-[var(--pc-gold-ink)]">
                  Destaque
                </span>
              ) : null}
            </span>

            <h3 className="mt-1 truncate text-[14.5px] font-semibold leading-[1.2] tracking-[-0.01em] text-foreground">
              <HighlightMatch text={name} tokens={highlightTokens ?? []} mode="loose" />
            </h3>
            <p className="mt-0.5 flex items-center gap-1 truncate text-[11.5px] font-medium text-foreground/70">
              <MapPin className="h-3 w-3 shrink-0 text-[var(--pc-gold-ink)]" aria-hidden />
              <span className="truncate">
                <HighlightMatch
                  text={
                    [neighborhood, city].filter(Boolean).join(" · ") || "Localização não informada"
                  }
                  tokens={highlightTokens ?? []}
                  mode="loose"
                />
              </span>
            </p>
          </span>
        </div>

        {/* Linha única de dados */}
        <dl className="mx-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/60 py-1.5 text-[11.5px] text-foreground/80">
          <div className="flex min-w-0 items-center gap-1">
            <Package className="h-3.5 w-3.5 shrink-0 text-[var(--pc-gold-ink)]" aria-hidden />
            <dt className="sr-only">Produtos com preço</dt>
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
              <dt className="sr-only">Economia possível</dt>
              <dd className="truncate">
                economize até{" "}
                <span className="font-bold tabular-nums text-foreground">
                  R$ {maxSavings.toFixed(2).replace(".", ",")}
                </span>
              </dd>
            </div>
          )}
        </dl>

        {/* Rodapé */}
        <div className="mt-auto flex items-center justify-between gap-2 px-3 py-1.5">
          <span className="min-w-0 truncate text-[10.5px] font-semibold text-foreground/70">
            {topCategory && topCategory.trim().toLowerCase() !== "outros"
              ? `Mais preços em ${topCategory.toLowerCase()}`
              : "Ver catálogo completo"}

          </span>

          <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-brand-gold/16 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[var(--pc-gold-ink)] transition-colors group-hover:bg-brand-gold group-hover:text-brand-navy">
            Ver preços
            <ChevronRight
              className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
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
      <div className="flex items-start gap-2.5 p-3">
        <div className="h-[52px] w-[52px] shrink-0 animate-pulse rounded-[11px] bg-muted/70" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="mx-3 h-2.5 animate-pulse rounded bg-muted/70" />
      <div className="p-3" />
    </div>
  );
}
