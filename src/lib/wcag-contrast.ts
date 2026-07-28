/**
 * Utilitário de contraste WCAG 2.1 (relative luminance).
 *
 * Aceita cores em `#rrggbb`, `#rgb`, `rgb()` e `rgba()`. Quando a cor de
 * primeiro plano tem alpha < 1, compõe sobre o `background` fornecido
 * antes de calcular o contraste — condição real de renderização.
 *
 * Usado pelos testes de gráficos do console admin para garantir que
 * eixos, grid, tooltip e series mantenham contraste AA/AAA contra o
 * fundo navy do escopo `.admin-scope`.
 */

export type Rgba = { r: number; g: number; b: number; a: number };

export function parseColor(input: string): Rgba {
  const s = input.trim().toLowerCase();
  const hex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    const h = hex[1];
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
      a: 1,
    };
  }
  const rgba = s.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/,
  );
  if (rgba) {
    return {
      r: Number(rgba[1]),
      g: Number(rgba[2]),
      b: Number(rgba[3]),
      a: rgba[4] != null ? Number(rgba[4]) : 1,
    };
  }
  throw new Error(`parseColor: formato não suportado — ${input}`);
}

export function composite(fg: Rgba, bg: Rgba): Rgba {
  if (fg.a >= 1) return fg;
  const a = fg.a + bg.a * (1 - fg.a);
  return {
    r: Math.round((fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a),
    g: Math.round((fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a),
    b: Math.round((fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a),
    a,
  };
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function luminance(c: Rgba): number {
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

/**
 * Razão de contraste entre `fg` e `bg`. Se `fg` tiver alpha, é composto
 * sobre `bg` antes do cálculo.
 */
export function contrastRatio(fg: string, bg: string): number {
  const bgC = parseColor(bg);
  const fgC = composite(parseColor(fg), bgC);
  const l1 = luminance(fgC);
  const l2 = luminance(bgC);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** WCAG AA para texto normal: ≥ 4.5:1. */
export const WCAG_AA_TEXT = 4.5;
/** WCAG AA para texto grande e componentes gráficos não-textuais: ≥ 3:1. */
export const WCAG_AA_LARGE = 3;
