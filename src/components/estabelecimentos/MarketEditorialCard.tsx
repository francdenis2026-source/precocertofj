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
 * MarketEditorialCard — card premium de mercado.
 *
 * Anatomia: painel de marca (logo protagonista sobre grade técnica) →
 * cabeçalho com nome e localidade → trilho de dados tabulares →
 * rodapé com categoria e CTA. Fio dourado no topo e régua inferior
 * animada dão o acabamento editorial.
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
        <div className="absolute right-2.5 top-2.5 z-20">{favoriteSlot}</div>
      ) : null}

      <Link
        to="/estabelecimento/$slug"
        params={{ slug }}
        aria-label={`Ver detalhes de ${name}`}
        className={cn(
          "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-200",
          "hover:-translate-y-[3px] hover:shadow-[0_18px_40px_-24px_color-mix(in_oklab,var(--pc-home-navy)_55%,transparent)]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          isCheapest
            ? "border-brand-gold/70 ring-1 ring-brand-gold/25"
            : "border-border/70 hover:border-brand-gold/60",
        )}
      >
        {/* Fio dourado superior */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, color-mix(in oklab, var(--brand-gold) 80%, transparent) 50%, transparent)",
          }}
        />

        {/* Painel de marca */}
        <div
          className="relative flex h-[104px] items-center justify-center overflow-hidden px-4"
          style={{ background: "color-mix(in oklab, var(--pc-home-navy) 4%, white)" }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.5]"
            style={{
              backgroundImage:
                "linear-gradient(to right, color-mix(in oklab, var(--pc-home-navy) 8%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--pc-home-navy) 8%, transparent) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          {typeof rank === "number" && (
            <span
              aria-hidden
              className="absolute bottom-2 left-2.5 select-none font-sans text-[26px] font-bold leading-none tracking-tighter"
              style={{ color: "color-mix(in oklab, var(--pc-home-navy) 16%, transparent)" }}
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
              className="relative z-10 max-h-[76px] max-w-[74%] object-contain drop-shadow-sm transition-transform duration-300 group-hover:scale-[1.05]"
            />
          ) : (
            <span className="relative z-10 grid h-16 w-16 place-items-center rounded-xl bg-brand-navy/10 text-[18px] font-bold text-brand-navy ring-1 ring-brand-navy/15">
              {initials || <Store className="h-6 w-6" aria-hidden />}
            </span>
          )}

          {/* Selos contextuais */}
          <div className="absolute left-2.5 top-2 z-10 flex flex-wrap items-center gap-1">
            {isCheapest && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-gold px-2 py-[2px] text-[9.5px] font-bold uppercase tracking-[0.14em] text-brand-navy shadow-sm">
                <PiggyBank className="h-2.5 w-2.5" aria-hidden /> Mais barato
              </span>
            )}
            {!isCheapest && isFeatured && (
              <span className="inline-flex items-center gap-1 rounded-full border border-brand-navy/15 bg-white/85 px-2 py-[2px] text-[9.5px] font-bold uppercase tracking-[0.14em] text-brand-navy shadow-sm">
                Destaque
              </span>
            )}
          </div>

          {/* Classificação */}
          <span
            className="absolute bottom-2.5 right-2.5 z-10 inline-flex items-center rounded-full border px-2 py-[2px] text-[9.5px] font-bold uppercase tracking-[0.16em]"
            style={{
              background: `color-mix(in oklab, ${tierColor} 14%, white)`,
              borderColor: `color-mix(in oklab, ${tierColor} 45%, transparent)`,
              color: tierColor,
            }}
            title={`Classificação por catálogo: ${tierLabel}`}
          >
            {tierLabel}
          </span>
        </div>

        {/* Cabeçalho */}
        <div className="border-t border-border/70 px-3.5 pb-2 pt-2.5">
          <h3 className="truncate text-[15px] font-semibold leading-[1.2] tracking-[-0.01em] text-foreground">
            {name}
          </h3>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[12px] font-medium text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0 text-[var(--pc-gold-ink)]" aria-hidden />
            <span className="truncate">
              {[neighborhood, city].filter(Boolean).join(" · ") || "Localização não informada"}
            </span>
          </p>
        </div>

        {/* Trilho de dados */}
        <dl className="mx-3.5 grid grid-cols-2 gap-x-2 border-y border-border/60 py-2 text-[11.5px]">
          <div className="flex min-w-0 items-center gap-1.5">
            <Package className="h-3.5 w-3.5 shrink-0 text-[var(--pc-gold-ink)]" aria-hidden />
            <dt className="sr-only">Produtos cadastrados</dt>
            <dd className="min-w-0 truncate text-muted-foreground">
              <span className="font-bold tabular-nums text-foreground">{productsCount}</span> produtos
            </dd>
          </div>
          <div className="flex min-w-0 items-center gap-1.5">
            <Radio
              className={cn(
                "h-3.5 w-3.5 shrink-0",
                freshnessLive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
              )}
              aria-hidden
            />
            <dt className="sr-only">Atualização</dt>
            <dd className="min-w-0 truncate text-muted-foreground">{freshnessLabel}</dd>
          </div>
          {distanceLabel && (
            <div className="col-span-2 mt-1.5 flex min-w-0 items-center gap-1.5 border-t border-border/40 pt-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--pc-gold-ink)]" aria-hidden />
              <dt className="sr-only">Distância</dt>
              <dd className="min-w-0 truncate text-muted-foreground">
                <span className="font-bold tabular-nums text-foreground">{distanceLabel}</span>{" "}
                {distanceQualifier}
              </dd>
            </div>
          )}
          {typeof maxSavings === "number" && maxSavings > 0 && (
            <div className="col-span-2 mt-1.5 flex min-w-0 items-center gap-1.5 border-t border-border/40 pt-1.5">
              <PiggyBank className="h-3.5 w-3.5 shrink-0 text-[var(--pc-gold-ink)]" aria-hidden />
              <dt className="sr-only">Economia potencial</dt>
              <dd className="min-w-0 truncate text-muted-foreground">
                economize até{" "}
                <span className="font-bold tabular-nums text-foreground">
                  R$ {maxSavings.toFixed(2).replace(".", ",")}
                </span>
              </dd>
            </div>
          )}
        </dl>

        {/* Rodapé */}
        <div className="mt-auto flex items-center justify-between gap-2 px-3.5 py-2.5">
          <span className="min-w-0 truncate text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {topCategory ?? "Ver catálogo"}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-brand-gold/12 px-2 py-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--pc-gold-ink)] transition-colors group-hover:bg-brand-gold group-hover:text-brand-navy">
            Ver preços
            <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </div>

        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 bg-brand-gold transition-transform duration-300 group-hover:scale-x-100"
        />
      </Link>
    </div>
  );
}

export function MarketEditorialCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <div className="h-[104px] animate-pulse bg-muted/70" />
      <div className="space-y-2 p-3.5">
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-2.5 w-3/4 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
