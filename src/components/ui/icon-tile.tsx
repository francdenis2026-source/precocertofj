/**
 * IconTile — Primitiva unificada de pastilha de ícone (Navy Trust).
 *
 * Compartilha a MESMA gramática visual com `CategoryIcon`, aplicada agora
 * também a itens de menu, botões e badges — para consistência total.
 *
 *  - Pastilha rounded (raio proporcional ao tamanho)
 *  - Fundo: gradiente derivado de tokens semânticos (nunca cores hard-coded)
 *  - Anel hairline: primary (navy) no light, accent (gold) no dark
 *  - Highlight glass superior sutil
 *  - Halo dourado radial no hover (opcional)
 *  - Ícone: 58% do tile, strokeWidth 1.75, cor primary/foreground
 *    com transição para accent no hover
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Size = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
type Tone = "surface" | "accent" | "primary";
type Density = "compact" | "regular" | "spacious";

/**
 * Densidade controla o percentual do ícone dentro da pastilha,
 * permitindo hierarquia visual sem trocar o tamanho da caixa.
 *  - compact  → mais respiro, ícone menor (menus densos)
 *  - regular  → default equilibrado
 *  - spacious → ícone dominante (destaques, FAB)
 */
const DENSITY: Record<Density, string> = {
  compact: "52%",
  regular: "58%",
  spacious: "64%",
};

const SIZE: Record<Size, { box: string; radius: string }> = {
  xs: { box: "h-7 w-7", radius: "rounded-lg" },
  sm: { box: "h-9 w-9", radius: "rounded-xl" },
  md: { box: "h-11 w-11", radius: "rounded-2xl" },
  lg: { box: "h-14 w-14", radius: "rounded-2xl" },
  xl: { box: "h-20 w-20", radius: "rounded-[22px]" },
  "2xl": { box: "h-24 w-24", radius: "rounded-[26px]" },
};

interface IconTileProps extends React.HTMLAttributes<HTMLSpanElement> {
  icon: LucideIcon;
  size?: Size;
  tone?: Tone;
  density?: Density;
  /** Ativa halo dourado + lift no hover do wrapper `.group`. */
  interactive?: boolean;
  /** Rótulo acessível quando o tile for isolado (sem texto ao lado). */
  label?: string;
}

const TONE: Record<Tone, string> = {
  surface: cn(
    "bg-gradient-to-br from-secondary to-card",
    "dark:from-[oklch(0.30_0.07_258)] dark:to-[oklch(0.22_0.06_260)]",
    "ring-1 ring-inset ring-primary/15 dark:ring-accent/30",
    "shadow-[0_6px_16px_-10px_oklch(0.44_0.12_252/0.35)]",
    "dark:shadow-[0_6px_16px_-10px_oklch(0_0_0/0.6)]",
    "[--icon-color:var(--color-primary)] dark:[--icon-color:var(--color-foreground)]",
  ),
  primary: cn(
    "bg-gradient-to-br from-primary to-[oklch(0.36_0.11_255)]",
    "ring-1 ring-inset ring-accent/30",
    "shadow-[0_8px_20px_-10px_oklch(0.44_0.12_252/0.65)]",
    "[--icon-color:var(--color-primary-foreground)]",
  ),
  accent: cn(
    "bg-gradient-to-br from-accent to-[oklch(0.66_0.12_75)]",
    "ring-1 ring-inset ring-accent/50",
    "shadow-[0_8px_20px_-10px_oklch(0.74_0.11_82/0.55)]",
    "[--icon-color:var(--color-accent-foreground)]",
  ),
};

export const IconTile = React.forwardRef<HTMLSpanElement, IconTileProps>(
  (
    { icon: Icon, size = "sm", tone = "surface", density = "regular", interactive = false, className, label, ...rest },
    ref,
  ) => {
    const s = SIZE[size];
    const iconPct = DENSITY[density];
    return (
      <span
        ref={ref}
        aria-hidden={label ? undefined : true}
        aria-label={label}
        role={label ? "img" : undefined}
        className={cn(
          "relative inline-grid place-items-center overflow-hidden shrink-0",
          "transition-all duration-300 will-change-transform",
          s.box,
          s.radius,
          TONE[tone],
          interactive &&
            "group-hover:-translate-y-0.5 group-hover:ring-accent/60 group-hover:shadow-[0_10px_22px_-10px_oklch(0.74_0.11_82/0.45)]",
          className,
        )}
        {...rest}
      >
        {/* Halo dourado radial (hover) */}
        {interactive && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background:
                "radial-gradient(120% 90% at 20% 15%, oklch(0.74 0.11 82 / 0.22) 0%, transparent 55%)",
            }}
          />
        )}
        {/* Highlight glass superior — presente em todos os tons */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-1.5 top-1 h-1/3 rounded-t-[14px]",
            "bg-gradient-to-b from-white/70 to-transparent",
            "dark:from-white/10",
            tone === "accent" && "from-white/60 dark:from-white/25",
            tone === "primary" && "from-white/25 dark:from-white/15",
          )}
        />
        <Icon
          className={cn(
            "relative transition-colors duration-300",
            tone === "surface" && "text-[color:var(--icon-color)] group-hover:text-accent",
            tone !== "surface" && "text-[color:var(--icon-color)]",
          )}
          style={{ width: iconPct, height: iconPct, strokeWidth: 1.75 }}
          absoluteStrokeWidth
        />
      </span>
    );
  },
);
IconTile.displayName = "IconTile";
