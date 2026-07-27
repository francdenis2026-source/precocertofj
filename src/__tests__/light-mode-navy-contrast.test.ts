import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

/**
 * Regressão de contraste no modo claro.
 *
 * A regra `html:not(.dark) .text-brand-gold { color: var(--pc-gold-ink) }`
 * escurece o dourado para fundos claros. Sobre superfícies navy isso reprova
 * WCAG AA, então o hero de categoria precisa declarar `data-surface="navy"`
 * e o dourado precisa do escape `gold-on-dark`.
 */
describe("modo claro — dourado sobre superfícies navy", () => {
  const css = read("src/styles.css");
  const categoria = read("src/routes/categoria.$slug.tsx");

  it("define o token --pc-navy", () => {
    expect(css).toMatch(/--pc-navy:\s*#[0-9a-f]{6}/i);
  });

  it("mantém o dourado vivo dentro de [data-surface=navy] no modo claro", () => {
    expect(css).toMatch(/html:not\(\.dark\)[\s\S]{0,200}\[data-surface="navy"\]/);
  });

  it("exclui .gold-on-dark da conversão para gold-ink", () => {
    expect(css).toMatch(/\):not\(\.gold-on-dark\)/);
  });

  it("hero de categoria declara a superfície navy", () => {
    expect(categoria).toMatch(/data-surface="navy"[\s\S]{0,200}bg-\[var\(--pc-navy/);
  });

  it("eyebrow 'Categoria' e números das métricas usam gold-on-dark", () => {
    expect(categoria).toMatch(/gold-on-dark[^"]*text-brand-gold[\s\S]{0,80}Categoria/);
    expect(categoria).toMatch(/gold-on-dark[^"]*text-brand-gold[\s\S]{0,120}toLocaleString/);
  });

  it("rótulos das métricas ficam acima de white/80 sobre navy", () => {
    const labels = categoria.match(/text-white\/(\d{2})/g) ?? [];
    for (const l of labels) {
      expect(Number(l.split("/")[1])).toBeGreaterThanOrEqual(80);
    }
  });
});
