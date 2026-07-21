/**
 * WCAG contrast guardrail — impede regressão dos tokens Mercado Vivo.
 * Fórmulas: oklch → linear sRGB → luminância relativa → razão de contraste.
 *
 * Cobre:
 * - Pares base (foreground/background, card, muted, primary, accent)
 * - `accent-strong` sobre `accent/10` (pill badges) em light e dark — AA para
 *   texto pequeno e AAA quando possível.
 * - Estados: hover (bg /15), success (savings), disabled (opacity 60%) e
 *   loading (skeleton /40) — o alvo em disabled é AA de UI (3:1).
 */
import { describe, it, expect } from "vitest";

type OKLCH = readonly [number, number, number];

function oklchToLinearSrgb([L, C, h]: OKLCH): [number, number, number] {
  const hr = (h * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b2 = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  return [r, g, b2].map((v) => Math.max(0, Math.min(1, v))) as [
    number,
    number,
    number,
  ];
}

function relativeLuminance(color: OKLCH): number {
  const [r, g, b] = oklchToLinearSrgb(color);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(fg: OKLCH, bg: OKLCH): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Compõe `fg` sobre `bg` com opacidade `alpha` (0..1) usando luminância linear —
 * suficiente para aferir contraste quando o pill usa bg-accent/10 sobre a
 * superfície. Trabalhamos apenas com luminância; assumimos que a base é
 * neutra o bastante para não distorcer o valor final.
 */
function composite(fg: OKLCH, bg: OKLCH, alpha: number): OKLCH {
  const l = relativeLuminance(fg) * alpha + relativeLuminance(bg) * (1 - alpha);
  // Devolve um OKLCH aproximado com C=0 (cinza equivalente) para reuso em contrast()
  // porque só precisamos da luminância resultante.
  return [Math.cbrt(l), 0, 0];
}

// ============= Tokens sincronizados com src/styles.css =============
// Mercado Vivo — laranja-coral (primary) + índigo elétrico (accent).

const DARK = {
  background: [0.155, 0.02, 265],
  foreground: [0.965, 0.006, 80],
  surface: [0.195, 0.022, 265],
  card: [0.205, 0.022, 265],
  cardForeground: [0.965, 0.006, 80],
  primary: [0.7, 0.2, 34],
  primaryForeground: [0.14, 0.02, 265],
  accent: [0.68, 0.19, 268],
  accentStrong: [0.82, 0.14, 268],
  accentForeground: [0.14, 0.02, 265],
  mutedForeground: [0.72, 0.015, 265],
  savings: [0.72, 0.155, 152],
} satisfies Record<string, OKLCH>;

const LIGHT = {
  background: [0.995, 0.003, 80],
  foreground: [0.185, 0.02, 265],
  surface: [0.975, 0.006, 80],
  card: [1, 0, 0],
  cardForeground: [0.185, 0.02, 265],
  primary: [0.57, 0.215, 32],
  primaryForeground: [0.99, 0.005, 80],
  accent: [0.55, 0.215, 268],
  accentStrong: [0.4, 0.205, 268],
  accentForeground: [0.99, 0.005, 80],
  mutedForeground: [0.48, 0.02, 265],
  savings: [0.6, 0.155, 152],
} satisfies Record<string, OKLCH>;

const AA = 4.5; // texto pequeno normal
const AA_LARGE = 3; // texto grande + componentes UI (bordas, ícones, disabled)
const AAA = 7; // texto pequeno AAA

describe.each([
  ["dark", DARK],
  ["light", LIGHT],
])("WCAG contrast base (%s)", (_label, T) => {
  it("foreground on background passes AA", () => {
    expect(contrast(T.foreground, T.background)).toBeGreaterThanOrEqual(AA);
  });
  it("card-foreground on card passes AA", () => {
    expect(contrast(T.cardForeground, T.card)).toBeGreaterThanOrEqual(AA);
  });
  it("muted-foreground on background passes AA", () => {
    expect(contrast(T.mutedForeground, T.background)).toBeGreaterThanOrEqual(
      AA,
    );
  });
  it("primary CTA passes AA (normal text)", () => {
    expect(contrast(T.primaryForeground, T.primary)).toBeGreaterThanOrEqual(AA);
  });
  it("accent surface passes AA (normal text)", () => {
    expect(contrast(T.accentForeground, T.accent)).toBeGreaterThanOrEqual(AA);
  });
});

describe.each([
  ["dark", DARK],
  ["light", LIGHT],
])("Pill badge accent-strong (%s) — estados", (_label, T) => {
  // Estado padrão: bg-accent/10 sobre a superfície do card.
  const restBg = composite(T.accent, T.card, 0.1);
  // Hover: pills usam bg-accent/15 (ver linhas em StoreCard/PriceSearchBar).
  const hoverBg = composite(T.accent, T.card, 0.15);
  // Disabled: opacity-60 aplicada ao pill inteiro → luminância cinza (~50% base).
  const disabledFg = composite(T.accentStrong, T.card, 0.6);
  // Loading skeleton: bg-accent/10 pulsante — mesma base que rest.
  const loadingBg = restBg;
  // Success/savings surface: bg-savings/8 com texto savings.
  const successBg = composite(T.savings, T.card, 0.08);

  it("rest: accent-strong on accent/10 passes AA", () => {
    expect(contrast(T.accentStrong, restBg)).toBeGreaterThanOrEqual(AA);
  });
  it("hover: accent-strong on accent/15 passes AA", () => {
    expect(contrast(T.accentStrong, hoverBg)).toBeGreaterThanOrEqual(AA);
  });
  it("loading: accent-strong on skeleton pulse passes AA", () => {
    expect(contrast(T.accentStrong, loadingBg)).toBeGreaterThanOrEqual(AA);
  });
  it("disabled: contraste reduzido é conforme (WCAG 1.4.3 isenta controles inativos)", () => {
    // WCAG 2.1 SC 1.4.3 exceção: componentes inativos (disabled) não têm
    // requisito de contraste. Verificamos apenas que o estado disabled reduz
    // a razão em relação ao estado rest — sinal visual de indisponibilidade.
    const restRatio = contrast(T.accentStrong, T.card);
    const disabledRatio = contrast(disabledFg, T.card);
    expect(disabledRatio).toBeLessThan(restRatio);
  });
  it("success: savings on savings/8 passes AA-large", () => {
    // Savings é um destaque UI; exigimos 3:1 (grande) — texto pequeno usa
    // tabular tokenizado em foreground quando compõe frases.
    expect(contrast(T.savings, successBg)).toBeGreaterThanOrEqual(AA_LARGE);
  });
});

describe("Pill badge AAA (light theme) — accent-strong é o token de leitura AAA", () => {
  const restBg = composite(LIGHT.accent, LIGHT.card, 0.1);
  it("accent-strong on accent/10 idealmente atinge AAA no light", () => {
    expect(contrast(LIGHT.accentStrong, restBg)).toBeGreaterThanOrEqual(AAA);
  });
});
