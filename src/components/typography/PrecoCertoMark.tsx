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
  // Inline (dentro de h1/h2 de página): herda a cor do título — leitura limpa —
  // com fio dourado sublinhando o trecho-chave.
  inline: "pc-editorial-accent",
  // Hero (homepage): assinatura de marca em ouro sólido.
  hero: "font-editorial pc-editorial-accent pc-editorial-accent--fill pc-hero-editorial",
  // Banner: intermediário — mantém preenchimento dourado mas menor que o hero.
  banner:
    "font-editorial pc-editorial-accent pc-editorial-accent--fill text-[clamp(1.25rem,2.4vw,2rem)] leading-[1.05] tracking-tight",
  // Card: compacto, herda cor, com sublinhado ouro.
  card:
    "pc-editorial-accent text-[clamp(0.95rem,1.4vw,1.15rem)] leading-tight tracking-tight",
  // Label: badges/legendas — italic Fraunces roman, cor herdada, sem sublinhado
  // (evita ruído em corpos pequenos). Peso 500 preserva presença.
  label:
    "font-serif italic font-medium text-[0.78rem] leading-none tracking-[0.005em] [font-variation-settings:'opsz'_60,'SOFT'_25]",
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
