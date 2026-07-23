/**
 * Teste "E2E estático" — garante que o seletor de tema aparece
 * exclusivamente na homepage e nunca em outras rotas / layouts.
 *
 * Estratégia: varre o `src/` e valida:
 *  1. `ThemeToggle` é renderizado apenas via `<SiteHeader ... showThemeToggle .../>`.
 *  2. `SiteHeader` só recebe `showThemeToggle` a partir de `src/routes/index.tsx`
 *     (a homepage). Nenhuma outra rota (inclusive `/colaborar`) o passa.
 *  3. `src/routes/colaborar.tsx` não importa `ThemeToggle`.
 *
 * O teste roda no vitest (sem browser) e falha rapidamente se alguém
 * reintroduzir o toggle em outra área.
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

function read(p: string): string {
  return readFileSync(p, "utf8");
}

describe("ThemeToggle — visibilidade restrita à homepage", () => {
  const files = ALL_FILES.map((p) => ({ path: p, rel: relative(process.cwd(), p), src: read(p) }))
    // Exclui os próprios testes para não contarem como uso em produção.
    .filter((f) => !/__tests__\//.test(f.rel) && !/\.(test|spec)\.(t|j)sx?$/.test(f.rel));

  it("é importado apenas pelo SiteHeader", () => {
    const importers = files
      .filter((f) => /from\s+["']@\/components\/theme-toggle["']/.test(f.src))
      .map((f) => f.rel)
      .filter((rel) => !rel.endsWith("theme-toggle.tsx"));

    expect(importers.sort()).toEqual(["src/components/layout/SiteHeader.tsx"]);
  });

  it("colaborar.tsx NÃO importa ou usa ThemeToggle", () => {
    const collab = files.find((f) => f.rel.endsWith("routes/colaborar.tsx"));
    expect(collab, "src/routes/colaborar.tsx precisa existir").toBeTruthy();
    expect(collab!.src).not.toMatch(/ThemeToggle/);
    expect(collab!.src).not.toMatch(/theme-toggle/);
  });

  it("SiteHeader só recebe showThemeToggle a partir da homepage (routes/index.tsx)", () => {
    const enablers = files
      .filter((f) => /<SiteHeader[^>]*\bshowThemeToggle\b/.test(f.src))
      .map((f) => f.rel);

    expect(enablers.sort()).toEqual(["src/routes/index.tsx"]);
  });

  it("todas as demais rotas que usam SiteHeader NÃO passam showThemeToggle", () => {
    const offenders = files
      .filter((f) => /^src\/routes\//.test(f.rel))
      .filter((f) => f.rel !== "src/routes/index.tsx")
      .filter((f) => /<SiteHeader\b/.test(f.src))
      .filter((f) => /<SiteHeader[^>]*\bshowThemeToggle\b/.test(f.src))
      .map((f) => f.rel);

    expect(offenders).toEqual([]);
  });
});
