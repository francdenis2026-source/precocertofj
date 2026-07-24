/**
 * Utilitários de contraste WCAG.
 *
 * Usado para escolher automaticamente a cor do texto/ícone que fica sobre um
 * `brand_color` arbitrário de estabelecimento, garantindo pelo menos AA
 * (contraste ≥ 4.5:1 para texto normal, 3:1 para texto largo/UI).
 */

const NAVY = "#0b1e3f"; // texto escuro (combina com --brand-navy)
const WHITE = "#ffffff";

function parseHex(hex: string | null | undefined): [number, number, number] | null {
  if (!hex) return null;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const int = parseInt(m[1], 16);
  return [(int >> 16) & 0xff, (int >> 8) & 0xff, int & 0xff];
}

function channelLuminance(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** Luminância relativa 0..1 (WCAG). */
export function relativeLuminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb;
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

/** Razão de contraste entre duas cores hex (retorna 1..21). */
export function contrastRatio(a: string, b: string): number {
  const L1 = relativeLuminance(a);
  const L2 = relativeLuminance(b);
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Escolhe automaticamente entre texto branco ou navy para atingir AA
 * sobre `bg` (fallback: branco quando bg inválido).
 */
export function readableTextOn(bg: string | null | undefined): "#ffffff" | "#0b1e3f" {
  if (!bg) return WHITE;
  const c = parseHex(bg);
  if (!c) return WHITE;
  const white = contrastRatio(bg, WHITE);
  const navy = contrastRatio(bg, NAVY);
  return navy >= white ? NAVY : WHITE;
}

/** true quando o par (fg, bg) atinge WCAG AA para texto normal (≥ 4.5). */
export function meetsAA(fg: string, bg: string): boolean {
  return contrastRatio(fg, bg) >= 4.5;
}
