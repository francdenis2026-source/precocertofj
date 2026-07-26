/**
 * PreçoCerto — Navy Trust Design Tokens
 *
 * Fonte única de verdade para telas que precisam de acesso direto às cores
 * (ex: gradientes inline, SVGs, canvases). Para UI padrão, prefira as classes
 * Tailwind semânticas (bg-primary, text-foreground, border-border, etc.),
 * que estão mapeadas para essa mesma paleta em `src/styles.css`.
 */

export const NT = {
  // Superfícies
  paper: "#f6f7fb",
  surface: "#ffffff",
  line: "#e4e7ee",

  // Tinta / navy institucional
  ink: "#0a1631",
  navy: "#0f1b3d",
  navy2: "#1e3a5f",
  navy3: "#3b6fa0",

  // Accent editorial (dourado)
  gold: "#b58a3c",
  goldDark: "#8a6b2c",
  goldSoft: "#e6d6a8",

  // Semânticos
  success: "#0f7a4f",
  successSoft: "#e7f4ee",
  danger: "#b3382c",
  warning: "#c9922a",
} as const;

export const NT_FONTS = {
  editorial:
    "'Instrument Serif', ui-serif, Georgia, 'Times New Roman', serif",
  sans:
    "'Work Sans', 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
  mono:
    "'IBM Plex Mono', ui-monospace, SFMono-Regular, 'JetBrains Mono', monospace",
} as const;

/** Classes utilitárias reutilizáveis — combinam com Tailwind arbitrary values. */
export const nt = {
  serif: "font-['Instrument_Serif',ui-serif,Georgia,serif]",
  sans: "font-['Work_Sans',system-ui,sans-serif]",
  mono: "font-['IBM_Plex_Mono',ui-monospace,monospace] tabular-nums",

  // Layout
  card: "rounded-2xl border border-border bg-card",
  cardHover: "transition-shadow hover:shadow-sm",
  panel: "rounded-xl border border-border bg-card",
  hairline: "border-border",

  // Typography
  eyebrow:
    "text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground",
  editorialTitle: "font-['Instrument_Serif',ui-serif,serif] font-normal leading-tight",

  // Buttons
  btnPrimary:
    "inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed",
  btnGold:
    "inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-accent-foreground transition-transform hover:scale-[1.02] disabled:opacity-50",
  btnGhost:
    "inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-[13px] font-semibold text-foreground transition-colors hover:border-primary/40",

  // Numbers
  price:
    "font-['IBM_Plex_Mono',ui-monospace,monospace] tabular-nums font-semibold",
} as const;
