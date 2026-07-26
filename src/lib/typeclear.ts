/**
 * TypeClear — escala tipográfica editorial do PreçoCerto.
 *
 * Escala responsiva automática: cada token usa `clamp(min, fluido, max)` para
 * crescer com a viewport SEM alterar espaçamentos (paddings/gaps continuam nas
 * classes de layout). Assim a legibilidade aumenta em telas maiores sem
 * estourar a altura em telas pequenas.
 *
 * Regras invioláveis (validadas em `src/lib/__tests__/typeclear-scale.test.ts`):
 *  - nenhum token de leitura pode ter mínimo abaixo de {@link MIN_READABLE_PX};
 *  - nenhum token (incluindo selos) pode ter mínimo abaixo de {@link MIN_ANY_PX};
 *  - todo token declara `clamp(...)` — nada de `text-[12px]` fixo.
 */

/** Piso absoluto para qualquer texto do sistema (selos/tags inclusos). */
export const MIN_ANY_PX = 10.5;
/** Piso para textos de leitura (corpo, meta, títulos, células, controles). */
export const MIN_READABLE_PX = 12;

/** Helper: gera a classe de tamanho fluido do Tailwind. */
export const fluid = (minPx: number, maxPx: number, from = 380, to = 1280) => {
  const slope = (maxPx - minPx) / (to - from);
  const vw = +(slope * 100).toFixed(4);
  const base = +(minPx - slope * from).toFixed(3);
  return `text-[clamp(${minPx}px,${base}px_+_${vw}vw,${maxPx}px)]`;
};

export const tc = {
  /** Rótulo dourado acima de um título. */
  eyebrow: `${fluid(11, 12)} font-semibold uppercase leading-none tracking-[0.2em] text-[var(--pc-gold-ink)]`,
  /** Título principal da página (header fixo). */
  h1: `font-serif ${fluid(20, 26)} font-normal leading-[1.15] tracking-tight text-foreground`,
  /** Título de seção. */
  h2: `font-serif ${fluid(19, 24)} font-normal leading-[1.2] tracking-tight text-foreground`,
  /** Subtítulo/apoio de seção. */
  sectionNote: `${fluid(12.5, 14)} leading-[1.4] text-muted-foreground`,
  /** Parágrafo de apoio (tagline, descrições curtas). */
  lead: `${fluid(13.5, 15.5)} leading-[1.5] text-muted-foreground`,
  /** Corpo padrão. */
  body: `${fluid(13.5, 15.5)} leading-[1.55] text-foreground`,
  /** Texto secundário compacto. */
  meta: `${fluid(12.5, 13.5)} leading-[1.35] text-muted-foreground`,
  /** Chips, botões-pílula e filtros. */
  chip: `${fluid(11.5, 12.5)} font-semibold uppercase leading-none tracking-[0.12em]`,
  /** Rótulos de comando (toolbar, toggles). */
  control: `${fluid(11.5, 12.5)} font-semibold uppercase leading-none tracking-[0.08em]`,
  /** Cabeçalho de coluna em tabelas. */
  tableHead: `${fluid(11, 12)} font-bold uppercase leading-none tracking-[0.12em] text-foreground/70`,
  /** Célula de tabela. */
  cell: `${fluid(13, 14.5)} leading-[1.35] text-foreground/80`,
  /** Nome/título de item em lista. */
  itemTitle: `${fluid(13.5, 15.5)} font-semibold leading-[1.3] text-foreground`,
  /** Números (contagens, distâncias, preços). */
  num: `font-mono ${fluid(13, 14.5)} leading-[1.2] tabular-nums`,
  /** Selo minúsculo. */
  tag: `${fluid(10.5, 11.5)} font-bold uppercase leading-none tracking-[0.12em]`,
} as const;

export type TcToken = keyof typeof tc;

/** Tokens que carregam texto de leitura (piso mais alto). */
export const READABLE_TOKENS: TcToken[] = [
  "h1",
  "h2",
  "sectionNote",
  "lead",
  "body",
  "meta",
  "chip",
  "control",
  "cell",
  "itemTitle",
  "num",
];

/** Extrai o `min` (px) declarado no clamp de um token. */
export function minFontPx(token: TcToken): number | null {
  const m = tc[token].match(/text-\[clamp\((\d+(?:\.\d+)?)px/);
  return m ? Number(m[1]) : null;
}
