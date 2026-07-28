import { describe, it, expect } from "vitest";

// Contraste WCAG AA para abas ativas (fundo colorido + texto branco no claro,
// texto escuro no escuro) e sidebar. Detecta regressões dos tokens --pc-tone-*.

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function relLuminance([r, g, b]: [number, number, number]) {
  const s = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
}
function contrast(fg: string, bg: string) {
  const L1 = relLuminance(hexToRgb(fg));
  const L2 = relLuminance(hexToRgb(bg));
  const [a, b] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (a + 0.05) / (b + 0.05);
}

// Tokens espelhados de src/styles.css (:root e .dark)
const TONES_LIGHT = {
  overview: "#2563eb",
  catalog: "#059669",
  commerce: "#b58a3c",
  people: "#7c3aed",
  system: "#e11d48",
};
const TONES_DARK = {
  overview: "#60a5fa",
  catalog: "#34d399",
  commerce: "#f2c66b",
  people: "#c4b5fd",
  system: "#fb7185",
};

// Fundos dos containers
const LIGHT_BG = "#ffffff";
const DARK_BG = "#0b1220"; // pc-navy aproximado

const AA_NORMAL = 4.5;
const AA_LARGE = 3.0;

describe("WCAG AA — abas ativas dos hubs admin", () => {
  it("modo claro: texto branco sobre a cor do tom (aba ativa)", () => {
    for (const [name, color] of Object.entries(TONES_LIGHT)) {
      const ratio = contrast("#ffffff", color);
      expect(ratio, `tone=${name} claro`).toBeGreaterThanOrEqual(AA_LARGE);
    }
  });

  it("modo escuro: texto navy escuro sobre a cor do tom", () => {
    for (const [name, color] of Object.entries(TONES_DARK)) {
      const ratio = contrast(DARK_BG, color);
      expect(ratio, `tone=${name} escuro`).toBeGreaterThanOrEqual(AA_LARGE);
    }
  });
});

describe("WCAG AA — sidebar (item ativo e ícones tonais)", () => {
  it("ícones tonais em modo claro sobre fundo claro (não-texto 3:1)", () => {
    for (const [name, color] of Object.entries(TONES_LIGHT)) {
      const ratio = contrast(color, LIGHT_BG);
      // WCAG 1.4.11 non-text contrast: 3:1 para ícones/glifos graficos
      expect(ratio, `tone=${name} sobre claro`).toBeGreaterThanOrEqual(AA_LARGE);
    }
  });

  it("ícones tonais em modo escuro sobre fundo navy", () => {
    for (const [name, color] of Object.entries(TONES_DARK)) {
      const ratio = contrast(color, DARK_BG);
      expect(ratio, `tone=${name} sobre navy`).toBeGreaterThanOrEqual(AA_NORMAL);
    }
  });
});
