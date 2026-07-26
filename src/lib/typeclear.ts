/**
 * TypeClear — escala tipográfica editorial do PreçoCerto.
 *
 * Espelha exatamente o refinamento aplicado em `/buscar` para que todas as
 * páginas internas compartilhem tamanhos, line-height, tracking e pesos.
 * Use estes tokens em vez de repetir `text-[12.5px]` solto nos componentes.
 */
export const tc = {
  /** Rótulo dourado acima de um título. */
  eyebrow:
    "text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--pc-gold-ink)]",
  /** Título principal da página (header fixo). */
  h1: "font-serif text-[17px] font-normal leading-tight tracking-tight text-foreground sm:text-[21px]",
  /** Título de seção. */
  h2: "font-serif text-[19px] font-normal leading-tight tracking-tight text-foreground",
  /** Subtítulo/apoio de seção. */
  sectionNote: "text-[11.5px] leading-relaxed text-muted-foreground",
  /** Parágrafo de apoio (tagline, descrições curtas). */
  lead: "text-[12.5px] leading-relaxed text-muted-foreground md:text-[13px]",
  /** Corpo padrão. */
  body: "text-[12.5px] leading-relaxed text-foreground",
  /** Texto secundário compacto. */
  meta: "text-[11.5px] leading-snug text-muted-foreground",
  /** Chips, botões-pílula e filtros. */
  chip: "text-[10.5px] font-semibold uppercase tracking-[0.14em]",
  /** Rótulos de comando (toolbar, toggles). */
  control: "text-[10.5px] font-semibold uppercase tracking-[0.1em]",
  /** Cabeçalho de coluna em tabelas. */
  tableHead: "text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/70",
  /** Célula de tabela. */
  cell: "text-[12px] leading-snug text-foreground/80",
  /** Nome/título de item em lista. */
  itemTitle: "text-[12.5px] font-semibold leading-snug text-foreground",
  /** Números (contagens, distâncias, preços). */
  num: "font-mono text-[12px] tabular-nums",
  /** Selo minúsculo. */
  tag: "text-[8.5px] font-bold uppercase leading-none tracking-[0.14em]",
} as const;
