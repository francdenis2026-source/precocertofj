/**
 * Validação automática de contraste (WCAG) dos tokens reais de `src/styles.css`.
 *
 * Cobre as superfícies apontadas pelo usuário — hero, cards do painel ao vivo e
 * faixa "Explorar o PreçoCerto" — nos temas claro e escuro. As cores são lidas
 * direto do CSS (não duplicadas), então qualquer regressão de token quebra o teste.
 *
 * As opacidades (glass/border) são compostas sobre o fundo real da seção, que é
 * o que o usuário enxerga em qualquer viewport (a cor não muda com a largura;
 * o que muda é o tamanho do texto, coberto por typeclear-scale.test.ts).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const CSS = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

/** Extrai o bloco do seletor que contém `marker` (styles.css tem vários `:root`). */
function block(selector: string, marker: string): string {
  const re = new RegExp(`(^|\\})\\s*${selector.replace(".", "\\.")}\\s*\\{`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(CSS))) {
    const start = CSS.indexOf("{", m.index);
    let depth = 0;
    for (let j = start; j < CSS.length; j++) {
      if (CSS[j] === "{") depth++;
      else if (CSS[j] === "}") {
        depth--;
        if (depth === 0) {
          const body = CSS.slice(start, j);
          if (body.includes(marker)) return body;
          break;
        }
      }
    }
  }
  throw new Error(`bloco ${selector} contendo ${marker} não encontrado`);
}

const MARKER = "--pc-home-hero-bg";
const LIGHT = block(":root", MARKER);
const DARK = block(".dark", MARKER);

type RGBA = [number, number, number, number];

function readVar(scope: string, name: string): string {
  const m = new RegExp(`--${name}\\s*:\\s*([^;]+);`).exec(scope);
  if (!m) throw new Error(`token --${name} ausente`);
  return m[1].trim();
}

function parseColor(value: string): RGBA {
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const int = parseInt(hex[1], 16);
    return [(int >> 16) & 255, (int >> 8) & 255, int & 255, 1];
  }
  const rgb = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[/,]\s*([\d.]+))?\s*\)/i.exec(
    value,
  );
  if (rgb) {
    return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), rgb[4] ? Number(rgb[4]) : 1];
  }
  throw new Error(`cor não suportada no teste: ${value}`);
}

function color(scope: string, name: string): RGBA {
  return parseColor(readVar(scope, name));
}

/** Compõe `fg` (com alfa) sobre `bg` opaco. */
function over(fg: RGBA, bg: RGBA): RGBA {
  const a = fg[3];
  return [
    fg[0] * a + bg[0] * (1 - a),
    fg[1] * a + bg[1] * (1 - a),
    fg[2] * a + bg[2] * (1 - a),
    1,
  ];
}

function luminance([r, g, b]: RGBA): number {
  const ch = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

function contrast(fg: RGBA, bg: RGBA): number {
  const a = luminance(fg);
  const b = luminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

const AA = 4.5;
const AA_LARGE = 3;
const UI = 3; // bordas e componentes não textuais

describe.each([
  ["light", LIGHT],
  ["dark", DARK],
])("Homepage — contraste dos tokens (%s)", (_theme, S) => {
  const heroBg = color(S, "pc-home-hero-bg");
  const exploreBg = color(S, "pc-home-explore-bg");
  const glass = color(S, "pc-home-onhero-glass");
  const glassSoft = color(S, "pc-home-onhero-glass-soft");
  const cardBg = over(glass, heroBg);
  const metricBg = over(glassSoft, cardBg);

  it("texto principal sobre o hero passa AA", () => {
    expect(contrast(color(S, "pc-home-onhero-fg"), heroBg)).toBeGreaterThanOrEqual(AA);
  });

  it("texto secundário (80%) sobre o hero passa AA", () => {
    expect(
      contrast(over(color(S, "pc-home-onhero-fg-80"), heroBg), heroBg),
    ).toBeGreaterThanOrEqual(AA);
  });

  it("labels do painel ao vivo (70%) sobre o card passam AA", () => {
    expect(
      contrast(over(color(S, "pc-home-onhero-fg-70"), metricBg), metricBg),
    ).toBeGreaterThanOrEqual(AA);
  });

  it("legendas discretas (60%) sobre o card passam AA-large", () => {
    expect(
      contrast(over(color(S, "pc-home-onhero-fg-60"), cardBg), cardBg),
    ).toBeGreaterThanOrEqual(AA_LARGE);
  });

  it("números em gold do painel ao vivo passam AA-large sobre o card", () => {
    expect(contrast(color(S, "pc-home-onhero-gold"), metricBg)).toBeGreaterThanOrEqual(AA_LARGE);
  });

  it("eyebrow 'Painel ao vivo' em gold passa AA sobre o card", () => {
    expect(contrast(color(S, "pc-home-onhero-gold"), cardBg)).toBeGreaterThanOrEqual(AA);
  });

  it("bordas dos cards são perceptíveis (>= 3:1 não exigido, mas nunca invisíveis)", () => {
    const border = over(color(S, "pc-home-onhero-border"), cardBg);
    expect(contrast(border, cardBg)).toBeGreaterThan(1.15);
  });

  it("faixa 'Explorar o PreçoCerto' usa fundo sólido (sem transparência)", () => {
    expect(readVar(S, "pc-home-explore-bg")).toMatch(/^#[0-9a-f]{6}$/i);
    expect(exploreBg[3]).toBe(1);
  });

  it("texto sobre a faixa Explorar passa AA", () => {
    expect(contrast(color(S, "pc-home-onhero-fg"), exploreBg)).toBeGreaterThanOrEqual(AA);
    expect(
      contrast(over(color(S, "pc-home-onhero-fg-80"), exploreBg), exploreBg),
    ).toBeGreaterThanOrEqual(AA);
  });

  it("gold sobre a faixa Explorar passa AA-large", () => {
    expect(contrast(color(S, "pc-home-onhero-gold"), exploreBg)).toBeGreaterThanOrEqual(UI);
  });

  it("hero e faixa Explorar não colapsam na mesma cor (separação visual)", () => {
    expect(readVar(S, "pc-home-hero-bg")).not.toBe(readVar(S, "pc-home-explore-bg"));
  });
});

describe("Tema claro e escuro definem o mesmo conjunto de tokens", () => {
  const NAMES = [
    "pc-home-hero-bg",
    "pc-home-explore-bg",
    "pc-home-onhero-fg",
    "pc-home-onhero-fg-90",
    "pc-home-onhero-fg-85",
    "pc-home-onhero-fg-80",
    "pc-home-onhero-fg-70",
    "pc-home-onhero-fg-60",
    "pc-home-onhero-glass",
    "pc-home-onhero-glass-soft",
    "pc-home-onhero-glass-hover",
    "pc-home-onhero-border",
    "pc-home-onhero-border-soft",
    "pc-home-onhero-border-hover",
    "pc-home-onhero-gold",
  ];

  it.each(NAMES)("--%s existe nos dois temas e muda de valor", (name) => {
    const l = readVar(LIGHT, name);
    const d = readVar(DARK, name);
    expect(l).toBeTruthy();
    expect(d).toBeTruthy();
    expect(l).not.toBe(d);
  });
});
