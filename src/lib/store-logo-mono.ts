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
