/**
 * Teste estático — garante que o seletor de tema aparece no header global
 * (SiteHeader) e é importado exclusivamente por ele.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC = join(process.cwd(), "src");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      out.push(...walk(full));
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const ALL_FILES = walk(SRC);
const read = (p: string) => readFileSync(p, "utf8");

describe("ThemeToggle — disponível no header global", () => {
  const files = ALL_FILES.map((p) => ({ path: p, rel: relative(process.cwd(), p), src: read(p) }))
    .filter((f) => !/__tests__\//.test(f.rel) && !/\.(test|spec)\.(t|j)sx?$/.test(f.rel));

  it("é importado apenas pelo SiteHeader", () => {
    const importers = files
      .filter((f) => /from\s+["']@\/components\/theme-toggle["']/.test(f.src))
      .map((f) => f.rel)
      .filter((rel) => !rel.endsWith("theme-toggle.tsx"));

    expect(importers.sort()).toEqual(["src/components/layout/SiteHeader.tsx"]);
  });

  it("SiteHeader tem showThemeToggle habilitado por padrão", () => {
    const header = files.find((f) => f.rel.endsWith("components/layout/SiteHeader.tsx"))!;
    expect(header.src).toMatch(/showThemeToggle\s*=\s*true/);
  });
});
