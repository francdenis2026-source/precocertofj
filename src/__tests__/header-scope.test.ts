/**
 * Header global — escopo restrito à homepage.
 *
 * Garante que o SiteHeader (barra completa com nav + tema) só é renderizado em
 * "/" e que as rotas internas usam PageHeader/InternalPageHeader/HomeBrandLink.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC = join(process.cwd(), "src");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      out.push(...walk(full));
    } else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

const files = walk(SRC)
  .map((p) => ({ rel: relative(process.cwd(), p).replace(/\\/g, "/"), src: readFileSync(p, "utf8") }))
  .filter((f) => !/__tests__\//.test(f.rel) && !/\.(test|spec)\.tsx?$/.test(f.rel));

const header = files.find((f) => f.rel.endsWith("components/layout/SiteHeader.tsx"))!;

describe("SiteHeader", () => {
  it("retorna null fora da homepage", () => {
    expect(header.src).toMatch(/if\s*\(pathname\s*!==\s*["']\/["']\)\s*return null/);
  });

  it("expõe o marcador data-site-header para os testes E2E", () => {
    expect(header.src).toMatch(/data-site-header="global"/);
  });

  it("é importado apenas pela rota da homepage", () => {
    const importers = files
      .filter((f) => /from\s+["']@\/components\/layout\/SiteHeader["']/.test(f.src))
      .map((f) => f.rel)
      .filter((rel) => !rel.endsWith("layout/SiteHeader.tsx"));

    expect(importers.sort()).toEqual(["src/routes/index.tsx"]);
  });
});

describe("Rotas internas mantêm navegação para a home", () => {
  const routeFiles = files.filter(
    (f) =>
      f.rel.startsWith("src/routes/") &&
      f.rel.endsWith(".tsx") &&
      !f.rel.includes("/api/") &&
      !/routes\/(index|__root)\.tsx$/.test(f.rel),
  );

  it.each(routeFiles.map((f) => f.rel))("%s tem header interno ou link para a home", (rel) => {
    const src = routeFiles.find((f) => f.rel === rel)!.src;
    const hasBrand =
      /HomeBrandLink/.test(src) ||
      /PageHeader/.test(src) ||
      /InternalPageHeader/.test(src) ||
      /PageShell/.test(src) ||
      /AuthHero/.test(src) ||
      /createFileRoute\([^)]*\)\(\{\s*component:\s*\(\)\s*=>\s*null/.test(src);
    expect(hasBrand, `${rel} não oferece caminho de volta para a homepage`).toBe(true);
  });
});
