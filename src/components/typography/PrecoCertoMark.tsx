import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "inline" | "hero" | "banner" | "card" | "label";

export interface PrecoCertoMarkProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  /** Texto exibido — default "preço certo". */
  children?: React.ReactNode;
  /** Hierarquia tipográfica: hero (opsz 144), banner (destaque médio), card (compacto), label (badges/legendas) ou inline. */
  variant?: Variant;
  /** Envolver em <span> (default) ou <strong> para semântica de destaque. */
  as?: "span" | "strong" | "em";
}

const variantCls: Record<Variant, string> = {
  inline: "font-editorial pc-editorial-accent",
  hero: "font-editorial pc-editorial-accent pc-hero-editorial",
  banner:
    "font-editorial pc-editorial-accent text-[clamp(1.25rem,2.4vw,2rem)] leading-[1.05] tracking-tight",
  card:
    "font-editorial pc-editorial-accent text-[clamp(0.95rem,1.4vw,1.15rem)] leading-tight tracking-tight",
  // Label: otimizada para badges, chips, tooltips e legendas pequenas.
  // opsz mais baixo (60) preserva contraste dos traços em corpos pequenos;
  // tracking neutro evita colisão entre glifos; peso 500 mantém presença sem virar título.
  label:
    "font-editorial pc-editorial-accent text-[0.72rem] leading-none tracking-[0.005em] [font-variation-settings:'opsz'_60,'SOFT'_25] font-medium",
};

/**
 * Destaque tipográfico reutilizável para o termo "preço certo".
 * Aplica Fraunces italic (opsz 144) + acento dourado via .pc-editorial-accent,
 * garantindo hierarquia consistente em heros, banners e cards.
 */
export function PrecoCertoMark({
  children = "preço certo",
  variant = "inline",
  as = "span",
  className,
  ...rest
}: PrecoCertoMarkProps) {
  const Comp = as as React.ElementType;
  return (
    <Comp className={cn(variantCls[variant], className)} {...rest}>
      {children}
    </Comp>
  );
}

export default PrecoCertoMark;
