/**
 * Ícones SVG profissionais para categorias alimentares.
 * Detecção heurística por palavras-chave no nome do produto (pt-BR).
 * Traço fino, monocromático, herda `currentColor`.
 */
import { memo, type ReactElement, type SVGProps } from "react";

export type FoodCategory =
  | "arroz"
  | "feijao"
  | "graos"
  | "massa"
  | "pao"
  | "farinha"
  | "acucar"
  | "cafe"
  | "leite"
  | "queijo"
  | "ovo"
  | "carne"
  | "frango"
  | "peixe"
  | "embutido"
  | "oleo"
  | "molho"
  | "tempero"
  | "enlatado"
  | "biscoito"
  | "doce"
  | "chocolate"
  | "fruta"
  | "verdura"
  | "bebida"
  | "refrigerante"
  | "agua"
  | "suco"
  | "cerveja"
  | "higiene"
  | "limpeza"
  | "farmacia"
  | "papel"
  | "generic";

const RULES: Array<[FoodCategory, RegExp]> = [
  ["arroz", /\barroz\b/i],
  ["feijao", /\bfeij[aã]o\b|\blentilha|\bgr[aã]o\s*de\s*bico/i],
  ["massa", /\bmacarr[aã]o|\bespaguete|\bpenne|\bparafuso|\bmassa\b|\btalharim|\blasanha/i],
  ["pao", /\bp[aã]o\b|\bp[aã]es\b|\bbisnaguinha|\bbrioche/i],
  ["farinha", /\bfarinha|\bfub[aá]|\bamido|\bpolvilho|\bmaisena/i],
  ["acucar", /\ba[cç][uú]car|\badoçante|\badocante/i],
  ["cafe", /\bcaf[eé]\b|\bcappuccino|\bexpresso/i],
  ["leite", /\bleite\b|\biogurte|\bcream|\bcreme\s*de\s*leite|\bleite\s*condensado/i],
  ["queijo", /\bqueijo|\bmussarela|\bprato|\brequeij[aã]o|\bmanteiga|\bmargarina/i],
  ["ovo", /\bovo(s)?\b/i],
  ["frango", /\bfrango|\bgalinha|\bpeito\s*de\s*frango|\bcoxa/i],
  ["peixe", /\bpeixe|\bsardinha|\bat[uú]m|\bsalm[aã]o|\btilapia|\btil[aá]pia|\bbacalhau/i],
  ["embutido", /\bsalsicha|\blingui[cç]a|\blinguica|\bpresunto|\bmortadela|\bpeito\s*de\s*peru|\bsalame|\bbacon/i],
  ["carne", /\bcarne|\bpicanha|\balcatra|\bpatinho|\bcox[aã]o|\bhamburguer|\bh[aá]mburguer|\bacem|\bcupim/i],
  ["oleo", /\b[oó]leo|\bazeite|\bmanteiga\s*de|\bgordura/i],
  ["molho", /\bmolho|\bketchup|\bmaionese|\bmostarda|\bcatchup|\bsh[oō]yu|\bshoyu|\bvinagre/i],
  ["tempero", /\btempero|\bsal\b|\bpimenta|\ba[cç]afr[aã]o|\bor[eé]gano|\bcaldo\b|\bcondimento/i],
  ["enlatado", /\bmilho\s*verde|\bervilha|\bseleta|\bpalmito|\benlatad/i],
  ["biscoito", /\bbiscoito|\bbolacha|\bwafer|\btorrada|\bsalgadinho/i],
  ["chocolate", /\bchocolate|\bcacau|\bbombom|\bnutella/i],
  ["doce", /\bdoce|\bgeleia|\bmel\b|\bcocada|\bpa[cç]oca|\bbala\b|\bpirulito|\bsorvete/i],
  ["fruta", /\bbanana|\bma[cç][aã]|\blaranja|\buva\b|\bmam[aã]o|\babacaxi|\bmelancia|\blim[aã]o|\bmanga\b|\bfruta/i],
  ["verdura", /\balface|\btomate|\bcebola|\balho\b|\bcenoura|\bbatata|\bpimenti|\bverdura|\blegume|\bmandioca|\bagri[aã]o/i],
  ["refrigerante", /\brefrigerante|\bcoca|\bguaran[aá]|\bpepsi|\bfanta|\bsprite/i],
  ["agua", /\b[aá]gua\b|\bmineral/i],
  ["suco", /\bsuco|\bn[eé]ctar|\bpolpa\s*de/i],
  ["cerveja", /\bcerveja|\bchopp|\bvinho|\bcachaça|\bcachaca|\bwhisky|\bvodka/i],
  ["bebida", /\bbebida|\bch[aá]\b|\bmate\b|\bisot[oô]nico|\benerg[eé]tico/i],
  ["papel", /\bpapel|\bguardanapo|\bfralda|\babsorvente|\blenço|\blenco/i],
  ["higiene", /\bsab[oó]nete|\bshampoo|\bcondicionador|\bcreme\s*dental|\bpasta\s*de\s*dente|\bdesodorante|\bhigiene/i],
  ["limpeza", /\bdetergente|\bsab[aã]o|\bamaciante|\balvejante|\b[aá]gua\s*sanit|\bdesinfetante|\blimpeza|\bmulti[- ]?uso/i],
  ["farmacia", /\bremedio|\brem[eé]dio|\bcomprimido|\bdipirona|\bparacetamol|\bibuprofeno|\bantibi[oó]tico|\bpomada|\bxarope/i],
];

export function detectFoodCategory(text: string): FoodCategory {
  if (!text) return "generic";
  for (const [cat, re] of RULES) if (re.test(text)) return cat;
  return "generic"; // fallback neutro
}

type IconProps = SVGProps<SVGSVGElement>;
const S = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/* eslint-disable react/no-unknown-property */
const Icons: Record<FoodCategory, (p: IconProps) => ReactElement> = {
  arroz: (p) => (
    <svg viewBox="0 0 48 48" {...S} {...p}>
      <path d="M12 18h24l-3 20a2 2 0 0 1-2 2H17a2 2 0 0 1-2-2L12 18Z" />
      <path d="M14 18c1-4 4-8 10-8s9 4 10 8" />
      <ellipse cx="20" cy="26" rx="1.3" ry="2" />
      <ellipse cx="26" cy="30" rx="1.3" ry="2" />
      <ellipse cx="30" cy="24" rx="1.3" ry="2" />
      <ellipse cx="22" cy="34" rx="1.3" ry="2" />
    </svg>
  ),
  feijao: (p) => (
    <svg viewBox="0 0 48 48" {...S} {...p}>
      <path d="M18 10c-6 2-10 8-10 14s5 14 14 14 14-6 14-14-4-12-10-14c-4-1.4-4 4-8 4s-4-5-4-4Z" />
      <path d="M20 20c2 3 2 6 6 8" />
    </svg>
  ),
  graos: (p) => (
    <svg viewBox="0 0 48 48" {...S} {...p}>
      <path d="M10 34h28l-2 6H12l-2-6Z" />
      <circle cx="16" cy="22" r="3" />
      <circle cx="24" cy="18" r="3" />
      <circle cx="32" cy="22" r="3" />
      <circle cx="20" cy="28" r="3" />
      <circle cx="28" cy="28" r="3" />
    </svg>
  ),
  massa: (p) => (
    <svg viewBox="0 0 48 48" {...S} {...p}>
      <rect x="10" y="12" width="28" height="24" rx="2" />
      <path d="M14 16v16M18 16v16M22 16v16M26 16v16M30 16v16M34 16v16" />
    </svg>
  ),
  pao: (p) => (
    <svg viewBox="0 0 48 48" {...S} {...p}>
      <path d="M10 24c0-6 6-10 14-10s14 4 14 10c0 3-2 5-4 5v9a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2v-9c-2 0-4-2-4-5Z" />
      <path d="M18 22l2 4M24 22l2 4M30 22l2 4" />
    </svg>
  ),
  farinha: (p) => (
    <svg viewBox="0 0 48 48" {...S} {...p}>
      <path d="M14 14h20l-2 24a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2l-2-24Z" />
      <path d="M14 20h20" />
      <path d="M20 26c1 1 2 1 3 0s2-1 3 0 2 1 3 0" />
    </svg>
  ),
  acucar: (p) => (
    <svg viewBox="0 0 48 48" {...S} {...p}>
      <path d="M12 16h24l-2 22a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2l-2-22Z" />
      <path d="M12 16l4-6h16l4 6" />
      <path d="M18 26h4v4h-4zM26 30h4v4h-4z" />
    </svg>
  ),
  cafe: (p) => (
    <svg viewBox="0 0 48 48" {...S} {...p}>
      <path d="M10 18h22v14a6 6 0 0 1-6 6H16a6 6 0 0 1-6-6V18Z" />
      <path d="M32 22h4a4 4 0 0 1 0 8h-4" />
      <path d="M18 10c-1 2 1 3 0 5M24 10c-1 2 1 3 0 5" />
    </svg>
  ),
  leite: (p) => (
    <svg viewBox="0 0 48 48" {...S} {...p}>
      <path d="M18 8h12v6l4 6v20a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2V20l4-6V8Z" />
      <path d="M18 24h12" />
    </svg>
  ),
  queijo: (p) => (
    <svg viewBox="0 0 48 48" {...S} {...p}>
      <path d="M8 30l24-14 10 6-24 14L8 30Z" />
      <path d="M8 30v6l10 6 24-14v-6" />
      <circle cx="22" cy="26" r="1.5" />
      <circle cx="30" cy="22" r="1.2" />
      <circle cx="18" cy="32" r="1.2" />
    </svg>
  ),
  ovo: (p) => (
    <svg viewBox="0 0 48 48" {...S} {...p}>
      <path d="M24 6c-8 0-14 10-14 20s6 16 14 16 14-6 14-16S32 6 24 6Z" />
    </svg>
  ),
  carne: (p) => (
    <svg viewBox="0 0 48 48" {...S} {...p}>
      <path d="M10 20c0-6 5-10 11-10 5 0 8 3 9 6 4 0 8 3 8 8 0 6-5 10-11 10-4 0-7-2-9-5-4 0-8-3-8-9Z" />
      <circle cx="16" cy="20" r="2" />
    </svg>
  ),
  frango: (p) => (
    <svg viewBox="0 0 48 48" {...S} {...p}>
      <path d="M16 14c0-4 3-6 7-6s7 3 7 7c4 0 8 3 8 8s-4 9-9 9c-3 0-5-1-6-3l-6 10c-2 3-6 2-6-2l4-8c-2-1-4-4-4-7 0-4 2-8 5-8Z" />
      <circle cx="22" cy="16" r="1.2" />
    </svg>
  ),
  peixe: (p) => (
    <svg viewBox="0 0 48 48" {...S} {...p}>
      <path d="M6 24c4-6 10-10 18-10s14 4 18 10c-4 6-10 10-18 10S10 30 6 24Z" />
      <circle cx="30" cy="22" r="1.4" />
      <path d="M6 24l-2-4M6 24l-2 4" />
      <path d="M18 20c-2 2-2 6 0 8" />
    </svg>
  ),
  embutido: (p) => (
    <svg viewBox="0 0 48 48" {...S} {...p}>
      <rect x="6" y="20" width="36" height="10" rx="5" transform="rotate(-8 24 25)" />
      <path d="M14 24c2 0 2-2 4-2M22 22c2 0 2-2 4-2M30 20c2 0 2-2 4-2" />
    </svg>
  ),
  oleo: (p) => (
    <svg viewBox="0 0 48 48" {...S} {...p}>
      <path d="M20 6h8v6l2 4v22a2 2 0 0 1-2 2H20a2 2 0 0 1-2-2V16l2-4V6Z" />
      <path d="M20 22h8v10h-8z" />
    </svg>
  ),
  molho: (p) => (
    <svg viewBox="0 0 48 48" {...S} {...p}>
      <path d="M20 6h8v4l4 4v24a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2V14l4-4V6Z" />
      <path d="M18 20h12v8H18z" />
    </svg>
  ),
  tempero: (p) => (
    <svg viewBox="0 0 48 48" {...S} {...p}>
      <path d="M18 10h12v6H18z" />
      <path d="M16 16h16l-2 22a2 2 0 0 1-2 2H20a2 2 0 0 1-2-2l-2-22Z" />
      <circle cx="22" cy="20" r="0.8" fill="currentColor" />
      <circle cx="26" cy="22" r="0.8" fill="currentColor" />
      <circle cx="24" cy="26" r="0.8" fill="currentColor" />
      <circle cx="28" cy="28" r="0.8" fill="currentColor" />
      <circle cx="20" cy="28" r="0.8" fill="currentColor" />
    </svg>
  ),
  enlatado: (p) => (
    <svg viewBox="0 0 48 48" {...S} {...p}>
      <rect x="12" y="10" width="24" height="30" rx="2" />
      <path d="M12 16h24M12 34h24" />
      <path d="M18 22h12v6H18z" />
    </svg>
  ),
  biscoito: (p) => (
    <svg viewBox="0 0 48 48" {...S} {...p}>
      <circle cx="24" cy="24" r="16" />
      <circle cx="18" cy="20" r="1.3" fill="currentColor" />
      <circle cx="28" cy="18" r="1.3" fill="currentColor" />
      <circle cx="30" cy="28" r="1.3" fill="currentColor" />
      <circle cx="20" cy="30" r="1.3" fill="currentColor" />
      <circle cx="24" cy="24" r="1.3" fill="currentColor" />
    </svg>
  ),
  chocolate: (p) => (
    <svg viewBox="0 0 48 48" {...S} {...p}>
      <rect x="10" y="10" width="28" height="28" rx="2" />
      <path d="M17 10v28M24 10v28M31 10v28M10 17h28M10 24h28M10 31h28" />
    </svg>
  ),
  doce: (p) => (
    <svg viewBox="0 0 48 48" {...S} {...p}>
      <circle cx="24" cy="24" r="10" />
      <path d="M14 24l-6-4 2 8-2 8 6-4M34 24l6-4-2 8 2 8-6-4" />
    </svg>
  ),
  fruta: (p) => (
    <svg viewBox="0 0 48 48" {...S} {...p}>
      <path d="M24 14c-8 0-14 6-14 14s6 14 14 14 14-6 14-14-6-14-14-14Z" />
      <path d="M24 14c0-4 2-8 6-8" />
      <path d="M20 22c-2 2-2 6 0 8" />
    </svg>
  ),
  verdura: (p) => (
    <svg viewBox="0 0 48 48" {...S} {...p}>
      <path d="M10 26c0-8 6-14 14-14s14 6 14 14c0 6-4 12-14 12S10 32 10 26Z" />
      <path d="M24 12v26M17 16c2 4 5 6 7 6M31 16c-2 4-5 6-7 6M14 22c3 3 6 4 10 4M34 22c-3 3-6 4-10 4" />
    </svg>
  ),
  refrigerante: (p) => (
    <svg viewBox="0 0 48 48" {...S} {...p}>
      <path d="M18 8h12l-1 6h1v22a4 4 0 0 1-4 4h-6a4 4 0 0 1-4-4V14h1l-1-6Z" />
      <path d="M18 20h12" />
    </svg>
  ),
  agua: (p) => (
    <svg viewBox="0 0 48 48" {...S} {...p}>
      <path d="M24 6c6 8 10 14 10 20a10 10 0 0 1-20 0c0-6 4-12 10-20Z" />
      <path d="M18 26c1 3 3 5 6 5" />
    </svg>
  ),
  suco: (p) => (
    <svg viewBox="0 0 48 48" {...S} {...p}>
      <path d="M16 10h16l-2 28a2 2 0 0 1-2 2H20a2 2 0 0 1-2-2L16 10Z" />
      <path d="M16 20h16" />
      <path d="M22 6c0 3-3 3-3 4" />
    </svg>
  ),
  cerveja: (p) => (
    <svg viewBox="0 0 48 48" {...S} {...p}>
      <path d="M14 16h18v22a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2V16Z" />
      <path d="M32 20h4a4 4 0 0 1 0 8h-4" />
      <path d="M14 16c0-4 4-6 9-6s9 2 9 6" />
      <path d="M18 22v12M24 22v12M28 22v12" />
    </svg>
  ),
  bebida: (p) => (
    <svg viewBox="0 0 48 48" {...S} {...p}>
      <path d="M14 12h20l-2 26a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4L14 12Z" />
      <path d="M14 22h20" />
    </svg>
  ),
  higiene: (p) => (
    <svg viewBox="0 0 48 48" {...S} {...p}>
      <rect x="14" y="14" width="20" height="26" rx="3" />
      <path d="M20 8h8v6h-8z" />
      <path d="M18 22h12" />
    </svg>
  ),
  limpeza: (p) => (
    <svg viewBox="0 0 48 48" {...S} {...p}>
      <path d="M18 8h8v6h4l4 26a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2l4-26h4V8Z" />
      <path d="M18 20h12" />
    </svg>
  ),
  farmacia: (p) => (
    <svg viewBox="0 0 48 48" {...S} {...p}>
      <rect x="8" y="18" width="32" height="12" rx="6" transform="rotate(-30 24 24)" />
      <path d="M16 18l16 12" transform="rotate(-30 24 24)" />
    </svg>
  ),
  papel: (p) => (
    <svg viewBox="0 0 48 48" {...S} {...p}>
      <rect x="10" y="10" width="20" height="28" rx="2" />
      <path d="M30 14h6a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H14" />
      <path d="M14 18h12M14 24h12M14 30h8" />
    </svg>
  ),
  generic: (p) => (
    <svg viewBox="0 0 48 48" {...S} {...p}>
      <path d="M10 18l14-8 14 8v14L24 40 10 32V18Z" />
      <path d="M10 18l14 8 14-8M24 26v14" />
    </svg>
  ),
};
/* eslint-enable react/no-unknown-property */

function ProductCategoryIconBase({
  category,
  className,
  ...rest
}: { category: FoodCategory; className?: string } & IconProps) {
  const Icon = Icons[category] ?? Icons.generic;
  return <Icon className={className} {...rest} />;
}

/* PERFORMANCE: ícone puro (props primitivas) — memoizado. */
export const ProductCategoryIcon = memo(ProductCategoryIconBase);
ProductCategoryIcon.displayName = "ProductCategoryIcon";
