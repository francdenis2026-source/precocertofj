/**
 * PreçoCerto — Mini Design System
 * ---------------------------------------------------------------
 * Fonte única de tokens e classes reutilizáveis para padronizar
 * tipografia, cores, espaçamentos e componentes entre web e mobile.
 *
 * Regras de uso:
 * - Prefira as constantes daqui (ds.*) a strings soltas nos componentes.
 * - Cores → tokens semânticos definidos em `src/styles.css` (@theme).
 *   Para acesso direto por gradientes/SVG, use `NT` de `design-tokens.ts`.
 * - Layout → `ds.container`, `ds.sectionY.*` garantem gutters e ritmo
 *   consistentes em todas as páginas.
 * - Tipografia → `ds.type.*` usa as utilities `text-display/h1/h2/...`
 *   já definidas no CSS (clamp() para escalar em mobile e desktop).
 */

export const ds = {
  /* ---------- Layout ---------- */
  container: "container-page",
  sectionY: {
    sm: "section-y-sm",
    md: "section-y-md",
    lg: "section-y-lg",
  },
  stack: {
    xs: "stack-xs",
    sm: "stack-sm",
    md: "stack-md",
    lg: "stack-lg",
    xl: "stack-xl",
  },
  grid: {
    cols1: "grid grid-cols-1 gap-4",
    cols2: "grid grid-cols-1 gap-4 sm:grid-cols-2",
    cols3: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
    cols4: "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4",
  },

  /* ---------- Typography (mapeia utilities do CSS) ---------- */
  type: {
    display: "text-display",          // hero display – clamp 2.25 → 3.75rem
    editorial: "text-editorial font-display",
    h1: "text-h1",
    h2: "text-h2",
    h3: "text-h3",
    title: "text-title",
    subtitle: "text-subtitle",
    body: "text-body",
    caption: "text-caption",
    overline: "text-overline",
    eyebrow: "text-overline",         // alias legível
    price: "text-price",
  },

  /* ---------- Botões ---------- */
  btn: {
    /* base compartilhada */
    base:
      "inline-flex items-center justify-center gap-2 rounded-xl font-semibold " +
      "transition-transform duration-150 hover:scale-[1.02] active:scale-[0.99] " +
      "disabled:opacity-50 disabled:pointer-events-none focus-ring",
    sizes: {
      sm: "px-3 py-2 text-[13px]",
      md: "px-4 py-2.5 text-sm sm:px-5 sm:py-3",
      lg: "px-5 py-3 text-[14.5px] sm:px-6 sm:py-3.5 sm:text-[15.5px]",
    },
    variants: {
      primary: "bg-primary text-primary-foreground shadow-elev-1 hover:shadow-elev-2",
      accent: "bg-accent text-accent-foreground shadow-elev-1 hover:shadow-elev-2",
      ghost: "border border-border bg-card text-foreground hover:border-primary/40",
      outlineOnDark:
        "border-2 border-white/40 bg-white/5 text-white backdrop-blur hover:border-white hover:bg-white/15",
    },
  },

  /* ---------- Superfícies ---------- */
  card: {
    base: "ds-card",
    hover: "ds-card ds-card-hover",
    padded: "ds-card p-6 md:p-7",
    paddedHover: "ds-card ds-card-hover p-6 md:p-7",
    paddedLg: "ds-card p-7 md:p-9",
  },

  /* ---------- Chips / Tags ---------- */
  chip: {
    base: "ds-chip",
    onDark:
      "inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 " +
      "px-3 py-1.5 text-[12px] font-medium text-white/90 backdrop-blur transition-colors " +
      "hover:bg-white/15 hover:text-white",
  },

  /* ---------- Inputs ---------- */
  input: {
    base:
      "w-full min-w-0 rounded-xl border border-input bg-card px-3 py-2.5 text-[15px] " +
      "text-foreground outline-none placeholder:text-muted-foreground focus-ring " +
      "sm:text-[16px]",
    onDark:
      "min-w-0 flex-1 bg-transparent py-2.5 pr-1 text-[15px] text-white outline-none " +
      "placeholder:text-white/85 sm:py-3 sm:text-[16px]",
  },

  /* ---------- Estados de foco / motion ---------- */
  focus: "focus-ring",
} as const;

export type DS = typeof ds;

/** Helper — concatena classes ignorando falsy. */
export const dsx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");
