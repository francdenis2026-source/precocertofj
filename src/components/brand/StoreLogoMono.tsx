import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";
import { monoLogoSrc } from "@/lib/store-logo-mono";

export type StoreLogoMonoProps = {
  /** URL da logo colorida (o slug é derivado dela) ou o próprio SVG mono. */
  src?: string | null;
  name: string;
  /** Classe do bloco: tamanho e cor (`text-*` define a tinta). */
  className?: string;
  style?: CSSProperties;
};

/**
 * Marca monocromática vetorial de um estabelecimento.
 *
 * Renderiza o SVG como `mask-image` pintada com `currentColor`: o desenho fica
 * nítido em qualquer resolução (é vetor) e acompanha o tema automaticamente,
 * sem precisar de arquivos separados para claro/escuro. Quando a loja não tem
 * versão vetorial, cai para as iniciais — nunca quebra o layout.
 */
export function StoreLogoMono({ src, name, className, style }: StoreLogoMonoProps) {
  const mono = src?.endsWith("-mono.svg") ? src : monoLogoSrc(src);

  if (!mono) {
    return (
      <span
        aria-label={name}
        role="img"
        className={cn(
          "grid place-items-center font-mono text-[11px] font-bold uppercase tracking-[0.06em]",
          className,
        )}
        style={style}
      >
        {name.substring(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={name}
      className={cn("block shrink-0", className)}
      style={{
        WebkitMaskImage: `url("${mono}")`,
        maskImage: `url("${mono}")`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        backgroundColor: "currentColor",
        ...style,
      }}
    />
  );
}
