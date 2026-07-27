#!/usr/bin/env node
/**
 * Lint estático de superfícies escuras (roda no `prebuild`).
 *
 * Falha de contraste recorrente no MODO CLARO: a regra global
 * `html:not(.dark) .text-brand-gold { color: var(--pc-gold-ink) }` troca o
 * dourado por um marrom escuro (#6b4a12) para ficar legível em fundo claro.
 * Quando esse texto está sobre uma superfície NAVY, o resultado é dourado
 * escuro sobre azul escuro (~1.6:1 → reprova AA).
 *
 * Escape correto: marcar o contêiner escuro com `data-surface="navy"`
 * (ou usar `.bg-brand-navy`), ou anotar o texto com `.gold-on-dark`.
 *
 * Este script varre o JSX à procura de elementos com fundo escuro que
 * contenham texto dourado sem nenhum desses escapes.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(root, "src");

/** Fundos escuros conhecidos do design system. */
const DARK_BG =
  /className="[^"]*\b(?:bg-brand-navy(?:-2)?|bg-\[var\(--pc-(?:home-)?navy[^\]]*\]|bg-\[#0[0-9a-f]{5}\]|bg-navy)\b/;
/** Texto/ícone dourado que a regra de light-mode escurece. */
const GOLD_TEXT = /\btext-brand-gold(?:-soft)?(?:\/\d{1,3})?\b/;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx|jsx)$/.test(full)) out.push(full);
  }
  return out;
}

const problems = [];

for (const file of walk(SRC)) {
  const source = readFileSync(file, "utf8");
  const lines = source.split("\n");

  lines.forEach((line, i) => {
    if (!DARK_BG.test(line)) return;
    // Superfície escura devidamente declarada → o CSS já mantém o dourado vivo.
    if (/data-surface="navy"/.test(line) || /\bbg-brand-navy/.test(line)) return;

    // Procura texto dourado no escopo próximo (o elemento e seus filhos diretos).
    const scope = lines.slice(i, i + 40).join("\n");
    const goldLines = scope
      .split("\n")
      .map((l, k) => [l, i + k + 1])
      .filter(([l]) => GOLD_TEXT.test(l) && !/gold-on-dark/.test(l) && !/bg-brand-gold/.test(l));

    for (const [l, lineNo] of goldLines) {
      problems.push({
        file: relative(root, file),
        line: lineNo,
        surface: i + 1,
        snippet: l.trim().slice(0, 120),
      });
    }
  });
}

console.log("\x1b[1mLint de superfícies escuras — dourado legível no modo claro\x1b[0m");
if (problems.length) {
  for (const p of problems) {
    console.error(
      `\x1b[31m  ✗ ${p.file}:${p.line}\x1b[0m (superfície escura na linha ${p.surface})\n    ${p.snippet}`,
    );
  }
  console.error(
    `\n\x1b[31m✗ ${problems.length} texto(s) dourado(s) sobre fundo escuro sem escape.\x1b[0m\n` +
      `  Adicione data-surface="navy" ao contêiner escuro ou a classe gold-on-dark ao texto.`,
  );
  process.exit(1);
}
console.log("\x1b[32m✓ Nenhum dourado escurecido sobre fundo navy\x1b[0m");
