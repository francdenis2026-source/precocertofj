#!/usr/bin/env node
/**
 * Auditoria WCAG (AA/AAA) das cores COMPOSTAS usadas nos pilares da homepage,
 * nos tiles de categoria e nos badges do design system.
 *
 * Diferente de check-contrast.mjs (que testa apenas pares de tokens opacos),
 * este script resolve `color-mix(in oklab, X n%, transparent | Y)` e faz a
 * composição alfa sobre a superfície real (card / paper) antes de medir.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(__dirname, "../src/styles.css"), "utf8");

/* ---------------- color engine ---------------- */
const clamp01 = (v) => Math.min(1, Math.max(0, v));

function oklabToRgb(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l3 = l_ ** 3, m3 = m_ ** 3, s3 = s_ ** 3;
  const lin = [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ];
  return lin.map((u) => clamp01(u <= 0.0031308 ? 12.92 * u : 1.055 * u ** (1 / 2.4) - 0.055));
}
function rgbToOklab([r, g, b]) {
  const inv = (u) => (u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4);
  const [R, G, B] = [inv(r), inv(g), inv(b)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 0.2428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function relLum([r, g, b]) {
  const lin = (u) => (u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrast(a, b) {
  const [L1, L2] = [relLum(a), relLum(b)].sort((x, y) => y - x);
  return (L1 + 0.05) / (L2 + 0.05);
}

/* ---------------- token table ---------------- */
function extractBlock(source, selector) {
  const re = new RegExp(`${selector.replace(".", "\\.")}\\s*\\{([\\s\\S]*?)\\n\\}`, "m");
  const m = source.match(re);
  return m ? m[1] : "";
}
function parseVars(block) {
  const out = {};
  const re = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let m;
  while ((m = re.exec(block))) out[m[1]] = m[2].trim();
  return out;
}
const LIGHT = parseVars(extractBlock(css, ":root"));
const DARK = { ...LIGHT, ...parseVars(extractBlock(css, ".dark")) };

/* ---------------- value resolution ---------------- */
function parseColor(value, vars, depth = 0) {
  if (depth > 8) return null;
  const v = String(value).trim();

  if (v.startsWith("var(")) {
    const name = v.slice(4, -1).split(",")[0].trim();
    return vars[name] ? parseColor(vars[name], vars, depth + 1) : null;
  }
  if (v === "transparent") return { rgb: [0, 0, 0], a: 0 };
  if (v === "white") return { rgb: [1, 1, 1], a: 1 };
  if (v === "black") return { rgb: [0, 0, 0], a: 1 };

  let m = /^#([0-9a-f]{6})$/i.exec(v);
  if (m) {
    const i = parseInt(m[1], 16);
    return { rgb: [((i >> 16) & 255) / 255, ((i >> 8) & 255) / 255, (i & 255) / 255], a: 1 };
  }
  m = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+))?\s*\)$/i.exec(v);
  if (m) {
    const [L, C, h] = [parseFloat(m[1]), parseFloat(m[2]), (parseFloat(m[3]) * Math.PI) / 180];
    return { rgb: oklabToRgb(L, C * Math.cos(h), C * Math.sin(h)), a: m[4] ? parseFloat(m[4]) : 1 };
  }
  m = /^rgb\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\/\s*([\d.]+)\s*\)$/i.exec(v);
  if (m) {
    return {
      rgb: [+m[1] / 255, +m[2] / 255, +m[3] / 255],
      a: parseFloat(m[4]),
    };
  }
  m = /^color-mix\(\s*in\s+ok(?:lab|lch)\s*,\s*(.+)\)$/i.exec(v);
  if (m) {
    const parts = splitTop(m[1]);
    const [c1, p1] = splitPct(parts[0]);
    const [c2, p2] = splitPct(parts[1]);
    const a = parseColor(c1, vars, depth + 1);
    const b = parseColor(c2, vars, depth + 1);
    if (!a || !b) return null;
    let w1 = p1 ?? (p2 != null ? 100 - p2 : 50);
    const w2 = 100 - w1;
    // premultiplied mix in oklab
    const A = rgbToOklab(a.rgb).map((x) => x * a.a);
    const B = rgbToOklab(b.rgb).map((x) => x * b.a);
    const alpha = (a.a * w1 + b.a * w2) / 100;
    if (alpha === 0) return { rgb: [0, 0, 0], a: 0 };
    const mixed = A.map((x, i) => (x * w1 + B[i] * w2) / 100 / alpha);
    return { rgb: oklabToRgb(mixed[0], mixed[1], mixed[2]), a: alpha };
  }
  return null;
}
function splitTop(s) {
  const out = [];
  let depth = 0, cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim());
}
function splitPct(part) {
  const m = /^(.*?)\s+([\d.]+)%$/.exec(part.trim());
  return m ? [m[1].trim(), parseFloat(m[2])] : [part.trim(), null];
}
/** Achata camadas (fundo → frente) num sRGB opaco. */
function flatten(layers, vars) {
  let out = null;
  for (const layer of layers) {
    const c = parseColor(layer, vars);
    if (!c) throw new Error(`cor não resolvida: ${layer}`);
    if (!out) { out = c.rgb.slice(); continue; }
    out = out.map((base, i) => c.rgb[i] * c.a + base * (1 - c.a));
  }
  return out;
}

/* ---------------- pares auditados ---------------- */
const CARD = "var(--pc-home-card)";
const GOLD = "var(--pc-home-gold)";
const NAVY = "var(--pc-home-navy)";

/** { label, bgLayers, fg, min } — min = razão mínima exigida (4.5 texto, 3 UI/texto grande) */
const CASES = [
  // ---- Pilares (ribbon sobre card) ----
  { label: "Pilar · título", bg: [CARD], fg: "var(--pc-home-heading)", min: 4.5 },
  { label: "Pilar · descrição", bg: [CARD], fg: "var(--pc-text-body)", min: 4.5 },
  { label: "Pilar · ícone (gold)", bg: [CARD, `color-mix(in oklab, ${GOLD} 14%, transparent)`], fg: GOLD, min: 3 },
  { label: "Pilar · borda ícone", bg: [CARD], fg: `color-mix(in oklab, ${GOLD} 30%, transparent)`, min: 1 },
  { label: "Pilar · chevron (gold)", bg: [CARD, `color-mix(in oklab, ${GOLD} 22%, transparent)`], fg: GOLD, min: 3 },
  // ---- Pilar Plus (fundo gold) ----
  { label: "Plus · título sobre gold", bg: [GOLD], fg: NAVY, min: 4.5 },
  { label: "Plus · descrição sobre gold", bg: [GOLD], fg: `color-mix(in oklab, ${NAVY} 82%, transparent)`, min: 4.5 },
  { label: "Plus · ícone sobre gold", bg: [GOLD, `color-mix(in oklab, ${NAVY} 16%, transparent)`], fg: NAVY, min: 3 },
  { label: "Plus · chevron sobre gold", bg: [GOLD, `color-mix(in oklab, ${NAVY} 14%, transparent)`], fg: NAVY, min: 3 },
  // ---- Tiles de categoria ----
  { label: "Categoria · rótulo", bg: [CARD], fg: "var(--pc-home-heading)", min: 4.5 },
  { label: "Categoria · 'Ver ofertas'", bg: [CARD], fg: "color-mix(in oklab, var(--pc-home-ink) 78%, transparent)", min: 4.5 },
  { label: "Categoria · ícone gold", bg: [CARD, `color-mix(in oklab, ${GOLD} 18%, transparent)`], fg: GOLD, min: 3 },
  { label: "Categoria · seta gold", bg: [CARD], fg: GOLD, min: 3 },
  { label: "Ver todas · rótulo", bg: [CARD, `color-mix(in oklab, ${GOLD} 8%, transparent)`], fg: "var(--pc-home-heading)", min: 4.5 },
  { label: "Ver todas · ícone (navy/gold)", bg: [GOLD], fg: NAVY, min: 3 },
  // ---- Badges do design system (tonais sobre card) ----
  { label: "Badge · primary tonal", bg: ["var(--card)", "color-mix(in oklab, var(--primary) 10%, transparent)"], fg: "var(--primary)", min: 4.5 },
  { label: "Badge · savings tonal", bg: ["var(--card)", "color-mix(in oklab, var(--savings) 10%, transparent)"], fg: "var(--savings)", min: 4.5 },
  { label: "Badge · savings solid", bg: ["var(--savings)"], fg: "var(--savings-foreground)", min: 4.5 },
  { label: "Badge · warning tonal", bg: ["var(--card)", "color-mix(in oklab, var(--warning) 15%, transparent)"], fg: "var(--warning-foreground)", min: 4.5 },
  { label: "Badge · destructive tonal", bg: ["var(--card)", "color-mix(in oklab, var(--destructive) 10%, transparent)"], fg: "var(--destructive)", min: 4.5 },
  { label: "Badge · muted", bg: ["var(--muted)"], fg: "var(--muted-foreground)", min: 4.5 },
  { label: "Badge · outline", bg: ["var(--background)"], fg: "var(--foreground)", min: 4.5 },
  { label: "SavingsBadge · tonal 15%", bg: ["var(--card)", "color-mix(in oklab, var(--savings) 15%, transparent)"], fg: "var(--savings)", min: 4.5 },
];

let failures = 0;
function run(mode, vars) {
  console.log(`\n\x1b[1m▸ ${mode}\x1b[0m`);
  console.log("  " + "Elemento".padEnd(34) + "Ratio".padStart(8) + "  Exig.  Status");
  for (const c of CASES) {
    let bg, fg;
    try {
      bg = flatten(c.bg, vars);
      fg = flatten([...c.bg, c.fg], vars);
    } catch (e) {
      console.log(`  ${c.label.padEnd(34)}   —   (${e.message})`);
      failures++;
      continue;
    }
    const r = contrast(bg, fg);
    const ok = r >= c.min;
    if (!ok) failures++;
    const tag = !ok ? "FAIL" : r >= 7 ? "AAA" : r >= 4.5 ? "AA" : "AA-Large";
    const color = ok ? (r >= 7 ? "\x1b[32m" : "\x1b[36m") : "\x1b[31m";
    console.log(`  ${c.label.padEnd(34)}${color}${r.toFixed(2).padStart(6)}:1  ${String(c.min).padStart(4)}   ${tag}\x1b[0m`);
  }
}

console.log("\x1b[1mWCAG — pilares, categorias e badges (cores compostas)\x1b[0m");
run("Light mode  (:root)", LIGHT);
run("Dark mode   (.dark)", DARK);
console.log("");
if (failures > 0) {
  console.error(`\x1b[31m✗ ${failures} combinação(ões) abaixo do mínimo exigido\x1b[0m`);
  process.exit(1);
}
console.log("\x1b[32m✓ Todas as combinações de pilares, categorias e badges passam\x1b[0m");
