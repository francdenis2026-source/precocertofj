/**
 * Versões vetoriais (SVG) monocromáticas das logomarcas dos estabelecimentos.
 *
 * Cada arquivo em `public/logos/<slug>-mono.svg` é um traçado vetorial da marca
 * (gerado a partir do master em alta definição). Como é vetor, permanece nítido
 * em qualquer tamanho — de 16px num chip até 512px numa capa — e, por ser
 * aplicado via `mask-image` com `currentColor`, assume automaticamente a cor do
 * tema (navy no claro, dourado/branco no escuro).
 */

/** Slugs com SVG monocromático publicado em `public/logos`. */
export const MONO_LOGO_SLUGS = [
  "central-super",
  "doce-dia",
  "facem",
  "feijoense",
  "parceirao",
  "reboucas",
  "recanto",
  "ultra",
  "vanderley",
] as const;

export type MonoLogoSlug = (typeof MONO_LOGO_SLUGS)[number];

const SLUG_SET = new Set<string>(MONO_LOGO_SLUGS);

/**
 * Extrai o slug da marca a partir da URL da logo colorida
 * (`/logos/doce-dia-v6.webp` → `doce-dia`).
 */
export function monoLogoSlug(logoUrl?: string | null): MonoLogoSlug | null {
  if (!logoUrl) return null;
  const file = logoUrl.split("?")[0].split("/").pop();
  if (!file) return null;
  const base = file
    .replace(/\.(webp|png|jpe?g|svg|avif)$/i, "")
    .replace(/-v\d+$/i, "")
    .replace(/-mono$/i, "");
  return SLUG_SET.has(base) ? (base as MonoLogoSlug) : null;
}

/** Caminho público do SVG monocromático, ou `null` quando não houver versão. */
export function monoLogoSrc(logoUrl?: string | null): string | null {
  const slug = monoLogoSlug(logoUrl);
  return slug ? `/logos/${slug}-mono.svg` : null;
}

/**
 * Caminho público do SVG **colorido** da marca, por tema.
 *
 * São o mesmo traçado vetorial do mono, pintado com a cor real da marca e com
 * a luminosidade calibrada para atingir contraste WCAG AA contra o fundo do
 * tema (branco no claro, navy no escuro). Nítido em qualquer tamanho.
 */
export function colorLogoSrc(
  logoUrl?: string | null,
  theme: "light" | "dark" = "light",
): string | null {
  const slug = monoLogoSlug(logoUrl);
  if (!slug) return null;
  return theme === "dark" ? `/logos/${slug}-color-dark.svg` : `/logos/${slug}-color.svg`;
}
