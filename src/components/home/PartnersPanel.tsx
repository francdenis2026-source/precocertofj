/**
 * PartnersPanel — painel reutilizável de tiles (logos/rótulos).
 *
 * Padroniza borda, elevação, tipografia e estados de foco/hover para
 * qualquer grade de "marcas parceiras" no app. Aceita um estado de
 * carregamento (skeleton), rótulo de eyebrow, título e CTA opcional.
 *
 * Requisitos atendidos:
 *  • Hierarquia clara dentro do tile (imagem OU rótulo compacto com truncamento
 *    correto para nomes longos, sem estourar o card).
 *  • Estados de foco visíveis (ring dourado) e navegação por teclado.
 *  • Skeleton com pulse para evitar sensação de "apagado".
 *  • Grade responsiva: 3 cols em telas < 380px, escalando até 8 no desktop.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SmartLogoImage, useLogoPresentation } from "@/components/brand/SmartLogo";

export type PartnerTileItem = {
  id: string | number;
  name: string;
  logoUrl?: string | null;
  href?: string;
};

export type PartnersPanelProps = {
  /** Rótulo pequeno (uppercase) acima do título. */
  eyebrow?: string;
  /** Título do painel. */
  title: string;
  /** Rota para o CTA "Ver todos". Se ausente, o CTA não aparece. */
  ctaHref?: string;
  /** Rótulo do CTA. Padrão: "Ver todos". */
  ctaLabel?: string;
  /** Rota padrão de cada tile quando `item.href` não é fornecido. */
  defaultTileHref?: string;
  items: PartnerTileItem[];
  /** Enquanto true, mostra skeleton de tiles em vez dos dados. */
  loading?: boolean;
  /** Quantidade de skeletons — deve refletir a densidade esperada. */
  skeletonCount?: number;
  /** Máximo de tiles exibidos. */
  maxItems?: number;
  className?: string;
};

const gold = "var(--pc-home-gold, #c9a84c)";
const serif = "font-['Instrument_Serif',ui-serif,Georgia,serif]";

export function PartnersPanel({
  eyebrow,
  title,
  ctaHref,
  ctaLabel = "Ver todos",
  defaultTileHref,
  items,
  loading = false,
  skeletonCount = 8,
  maxItems = 12,
  className,
}: PartnersPanelProps) {
  const visible = items.slice(0, maxItems);
  const showEmpty = !loading && visible.length === 0;
  if (showEmpty) return null;

  const headingId = `partners-panel-${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 40)}`;

  return (
    <section aria-labelledby={headingId} className={cn("pc-container pt-2 sm:pt-3", className)}>
      <div
        className={cn(
          "rounded-[var(--pc-radius-md,16px)] border px-3 py-3 sm:px-4 sm:py-4",
          "shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_10px_30px_-18px_rgba(0,0,0,0.55)]",
          "transition-opacity duration-300",
        )}
        style={{
          background: "var(--pc-home-card)",
          borderColor: "var(--pc-home-line)",
        }}
      >
        <header className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:mb-3.5">
          <div className="min-w-0">
            {eyebrow ? (
              <p
                className="truncate text-[10.5px] font-bold uppercase tracking-[0.22em] sm:text-[11px]"
                style={{ color: "var(--pc-gold-ink)" }}
              >
                {eyebrow}
              </p>
            ) : null}
            <h2
              id={headingId}
              className={cn(serif, "mt-0.5 truncate leading-[1.15]")}
              style={{
                color: "var(--pc-home-heading)",
                fontSize: "clamp(1.05rem, 2vw, 1.45rem)",
                letterSpacing: "-0.015em",
              }}
            >
              {title}
            </h2>
            <p
              className="mt-0.5 truncate text-[11.5px] sm:text-[12px]"
              style={{ color: "color-mix(in oklab, var(--pc-home-heading) 68%, transparent)" }}
            >
              Toque no mercado para ver os preços de hoje
            </p>
          </div>


          {ctaHref ? (
            <Link
              to={ctaHref}
              aria-label={`${ctaLabel} — ${title}`}
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1",
                "text-[10px] font-bold uppercase tracking-[0.16em] sm:text-[11px]",
                "transition-colors duration-200",
                "hover:bg-white/[0.04]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              )}
              style={
                {
                  color: gold,
                  borderColor: "color-mix(in oklab, var(--pc-home-gold) 30%, transparent)",
                  ["--tw-ring-color" as string]:
                    "color-mix(in oklab, var(--pc-home-gold) 65%, transparent)",
                  ["--tw-ring-offset-color" as string]: "var(--pc-home-card)",
                } as React.CSSProperties
              }
            >
              <span className="hidden sm:inline">{ctaLabel}</span>
              <span className="sm:hidden">Todos</span>
              <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={2.6} aria-hidden />
            </Link>
          ) : null}
        </header>

        <ul
          role="list"
          aria-busy={loading || undefined}
          className={cn(
            // Trilho compacto: rolagem horizontal com snap no mobile,
            // linha única distribuída no desktop.
            "-mx-1 flex snap-x snap-mandatory gap-1.5 overflow-x-auto px-1 pb-1",
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            "sm:gap-2 md:mx-0 md:grid md:grid-flow-col md:auto-cols-fr md:overflow-visible md:px-0 md:pb-0",
          )}
        >
          {loading
            ? Array.from({ length: skeletonCount }).map((_, i) => (
                <li key={`sk-${i}`} className="w-[104px] shrink-0 snap-start sm:w-[120px] md:w-auto">
                  <PartnerTileSkeleton />
                </li>
              ))
            : visible.map((it) => (
                <li key={it.id} className="w-[104px] shrink-0 snap-start sm:w-[120px] md:w-auto">
                  <PartnerTile item={it} defaultHref={defaultTileHref} />
                </li>
              ))}
        </ul>

      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Tile                                                                        */
/* -------------------------------------------------------------------------- */

type PartnerTileProps = {
  item: PartnerTileItem;
  defaultHref?: string;
  /** Relevo/sombra 3D premium (não altera a altura do tile). */
  premium3d?: boolean;
};

/** Placa única cor-de-pérola: uma só superfície, sem "quadrado branco". */
const PLATE_BG =
  "linear-gradient(168deg, #fdfefe 0%, #f1f5fa 46%, #e4ebf4 100%)";

export const PartnerTile = forwardRef<HTMLAnchorElement, PartnerTileProps>(
  function PartnerTile({ item, defaultHref, premium3d = false }, ref) {
    const href = item.href ?? defaultHref ?? "/estabelecimentos";
    const hasLogo = Boolean(item.logoUrl);
    // Marca de tinta clara → dispensa placa (o logo respira sobre o painel).
    const { metrics } = useLogoPresentation(item.logoUrl, { targetFill: 0.92 });
    const lightInk = Boolean(
      metrics?.analyzed &&
        metrics.hasAlpha &&
        (metrics.lightInkRatio > 0.5 || metrics.contentLuma > 0.72),
    );
    const needsPlate = hasLogo && !lightInk;

    return (
      <Link
        ref={ref as any}
        to={href}
        aria-label={`Ver preços de ${item.name}`}
        title={item.name}
        className={cn(
          "group relative flex h-[66px] w-full items-center justify-center overflow-hidden sm:h-[76px]",
          "rounded-[14px] border",
          "px-2.5 py-2",
          "transition-all duration-200 will-change-transform",
          "hover:-translate-y-0.5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:-translate-y-0.5",
        )}
        style={
          {
            // Uma única superfície por tile: placa pérola para marcas escuras,
            // vidro sutil (integrado ao painel) para marcas de tinta clara.
            background: needsPlate
              ? PLATE_BG
              : "linear-gradient(180deg, color-mix(in oklab, var(--pc-home-heading) 8%, transparent) 0%, color-mix(in oklab, var(--pc-home-heading) 3%, transparent) 100%)",
            borderColor: needsPlate
              ? "color-mix(in oklab, var(--pc-home-gold) 26%, transparent)"
              : "color-mix(in oklab, var(--pc-home-line) 85%, transparent)",
            boxShadow: needsPlate
              ? premium3d
                ? "inset 0 1px 0 rgba(255,255,255,0.95), 0 1px 2px rgba(8,18,42,0.18), 0 12px 22px -16px rgba(8,18,42,0.6)"
                : "0 1px 2px rgba(8,18,42,0.18)"
              : "inset 0 1px 0 color-mix(in oklab, var(--pc-home-heading) 10%, transparent)",
            ["--tw-ring-color" as string]:
              "color-mix(in oklab, var(--pc-home-gold) 75%, transparent)",
            ["--tw-ring-offset-color" as string]: "var(--pc-home-card)",
          } as React.CSSProperties
        }
      >
        {hasLogo ? (
          <span className="relative flex h-[86%] w-[94%] items-center justify-center overflow-hidden">
            <SmartLogoImage
              src={item.logoUrl}
              name={item.name}
              premium3d={premium3d && needsPlate}
              targetFill={0.96}
              className="group-hover:brightness-[1.03]"

            />
          </span>
        ) : (
          <TileLabel name={item.name} />
        )}


        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100 group-focus-visible:scale-x-100"
          style={{ background: gold }}
        />
      </Link>
    );
  },
);

function TileLabel({ name }: { name: string }) {
  // Nomes longos entram como duas linhas com quebra por palavra + truncate visual
  // (line-clamp) sem estourar o tile.
  return (
    <span
      className={cn(
        "line-clamp-2 break-words text-center font-bold uppercase leading-[1.05] tracking-[0.08em]",
        "text-[10px] min-[380px]:text-[10.5px] sm:text-[11px]",
      )}
      style={{ color: "var(--pc-home-heading)" }}
    >
      {name}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Skeleton                                                                    */
/* -------------------------------------------------------------------------- */

function PartnerTileSkeleton({ children }: { children?: ReactNode }) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative flex h-[66px] w-full items-center justify-center overflow-hidden sm:h-[76px]",
        "rounded-[14px] border",
      )}
      style={{
        borderColor: "color-mix(in oklab, var(--pc-home-line) 85%, transparent)",
        background: "color-mix(in oklab, var(--pc-home-heading) 5%, transparent)",
      }}
    >
      <span
        className="h-2/5 w-3/5 animate-pulse rounded"
        style={{ background: "color-mix(in oklab, var(--pc-home-heading) 12%, transparent)" }}
      />
      {children}

    </div>
  );
}
