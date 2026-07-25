#!/usr/bin/env node
// Automated WCAG contrast check for design tokens (OKLCH → sRGB → relative luminance)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(__dirname, "../src/styles.css"), "utf8");

/* ---------- OKLCH → sRGB (D65) ---------- */
function oklchToRgb(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  // OKLab → LMS
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l3 = l_ ** 3, m3 = m_ ** 3, s3 = s_ ** 3;
  const r =  4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bl = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;
  const enc = (u) => (u <= 0.0031308 ? 12.92 * u : 1.055 * u ** (1 / 2.4) - 0.055);
  return [r, g, bl].map((v) => Math.min(1, Math.max(0, enc(v))));
}
function relLuminance([r, g, b]) {
  const lin = (u) => (u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrast(a, b) {
  const [L1, L2] = [relLuminance(a), relLuminance(b)].sort((x, y) => y - x);
  return (L1 + 0.05) / (L2 + 0.05);
}

/* ---------- Parse tokens from :root and .dark ---------- */
function extractBlock(source, selector) {
  const re = new RegExp(`${selector.replace(".", "\\.")}\\s*\\{([\\s\\S]*?)\\}`, "m");
  const m = source.match(re);
  return m ? m[1] : "";
}
function parseTokens(block) {
  const tokens = {};
  const re = /--([a-z0-9-]+)\s*:\s*oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/gi;
  let m;
  while ((m = re.exec(block))) {
    tokens[m[1]] = oklchToRgb(parseFloat(m[2]), parseFloat(m[3]), parseFloat(m[4]));
  }
  return tokens;
}
const light = parseTokens(extractBlock(css, ":root"));
const dark = parseTokens(extractBlock(css, ".dark"));

/* ---------- Pairs to test (semantic bg/fg combinations) ---------- */
const pairs = [
  ["Button — Primary", "primary", "primary-foreground"],
  ["Button — Accent / btn-signal", "accent", "accent-foreground"],
  ["Button — Destructive", "destructive", "destructive-foreground"],
  ["Button — Secondary", "secondary", "secondary-foreground"],
  ["Badge — Savings", "savings", "savings-foreground"],
  ["Badge — Warning", "warning", "warning-foreground"],
  ["Badge — Capture", "capture", "capture-foreground"],
  ["Card surface", "card", "card-foreground"],
  ["Popover", "popover", "popover-foreground"],
  ["Muted surface", "muted", "muted-foreground"],
  ["Sidebar primary", "sidebar-primary", "sidebar-primary-foreground"],
  ["Sidebar accent", "sidebar-accent", "sidebar-accent-foreground"],
  ["Page background", "background", "foreground"],
];

const AA_NORMAL = 4.5, AA_LARGE = 3.0, AAA_NORMAL = 7.0;
function grade(r) {
  if (r >= AAA_NORMAL) return { tag: "AAA", ok: true };
  if (r >= AA_NORMAL) return { tag: "AA", ok: true };
  if (r >= AA_LARGE) return { tag: "AA-Large", ok: true };
  return { tag: "FAIL", ok: false };
}

let failures = 0;
function runMode(name, tokens) {
  console.log(`\n\x1b[1m▸ ${name}\x1b[0m`);
  console.log("  " + "Pair".padEnd(34) + "Ratio".padStart(8) + "   Grade");
  for (const [label, bg, fg] of pairs) {
    if (!tokens[bg] || !tokens[fg]) {
      console.log(`  ${label.padEnd(34)}   —   (missing token)`);
      continue;
    }
    const r = contrast(tokens[bg], tokens[fg]);
    const g = grade(r);
    if (!g.ok) failures++;
    const color = g.ok ? (r >= AAA_NORMAL ? "\x1b[32m" : "\x1b[36m") : "\x1b[31m";
    console.log(
      `  ${label.padEnd(34)}${color}${r.toFixed(2).padStart(6)}:1  ${g.tag}\x1b[0m`
    );
  }
}

console.log("\x1b[1mWCAG contrast audit — design tokens\x1b[0m");
runMode("Light mode  (:root)", light);
runMode("Dark mode   (.dark)", dark);

console.log("");
if (failures > 0) {
  console.error(`\x1b[31m✗ ${failures} pair(s) below AA (4.5:1 normal / 3:1 large)\x1b[0m`);
  process.exit(1);
}
console.log("\x1b[32m✓ All semantic bg/fg pairs meet WCAG AA\x1b[0m");
