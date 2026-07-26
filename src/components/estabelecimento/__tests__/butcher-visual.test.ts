import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Testes de regressão visual/estrutural do açougue (Facem e Recanto da Carne).
 * Garantem que mudanças futuras não quebrem tipografia Typeclear, contraste por
 * tokens, layout compacto e acessibilidade (ARIA / aria-live).
 */
const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const BUTCHER = read("src/components/estabelecimento/ButcherCounter.tsx");
const DICAS = read("src/components/estabelecimento/PreparoDicas.tsx");
const QUICKVIEW = read("src/components/product/ProductQuickView.tsx");
const ROUTE_STORE = read("src/routes/estabelecimento.$slug.tsx");
const ROUTE_BUTCHER = read("src/routes/estabelecimento.$slug_.acougue.tsx");

const SOURCES: Array<[string, string]> = [
  ["ButcherCounter", BUTCHER],
  ["PreparoDicas", DICAS],
  ["ProductQuickView", QUICKVIEW],
];

describe("açougue · cores por tokens do tema", () => {
  it.each(SOURCES)("%s não usa cores cruas ou fora da paleta", (_name, src) => {
    // Hex/rgb() literais e utilitários fixos quebram claro/escuro.
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(src).not.toMatch(/rgba?\(/);
    expect(src).not.toMatch(/\b(?:text|bg|border)-(?:blue|indigo|purple|emerald|green|red|gray|slate|zinc)-\d{2,3}\b/);
    expect(src).not.toMatch(/\b(?:text|bg)-(?:white|black)\b/);
  });

  it("usa apenas sombras tokenizadas", () => {
    for (const [, src] of SOURCES) expect(src).not.toMatch(/shadow-\[/);
    expect(BUTCHER).toContain("shadow-elev-1");
  });

  it("hero da loja usa o token navy da marca", () => {
    expect(ROUTE_STORE).toContain("bg-brand-navy");
    expect(ROUTE_STORE).not.toContain("var(--pc-navy,#0b1e3f)");
  });
});

describe("açougue · tipografia Typeclear e layout compacto", () => {
  it("mantém a escala tipográfica compacta do balcão", () => {
    expect(BUTCHER).toContain('font-serif text-[17px]'); // título do balcão
    expect(BUTCHER).toContain('text-[11px] font-bold uppercase tracking-[0.16em]');
    // Nenhum texto acima de 22px dentro do balcão (evita títulos gigantes).
    const sizes = [...BUTCHER.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)].map((m) => Number(m[1]));
    expect(sizes.length).toBeGreaterThan(5);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(22);
  });

  it("mantém controles compactos de 32-36px e grade responsiva", () => {
    expect(BUTCHER).toMatch(/h-8 shrink-0 items-center/); // chips de proteína
    expect(BUTCHER).toContain("h-9 w-full rounded-lg border border-border bg-background pl-9");
    expect(BUTCHER).toContain("grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3");
  });

  it("linhas da lista têm alvo de toque adequado no mobile", () => {
    expect(BUTCHER).toContain("min-h-11");
  });
});

describe("açougue · acessibilidade", () => {
  it("trilho de proteína e modo de exibição são radiogroups rotulados", () => {
    expect(BUTCHER).toContain('aria-label="Filtrar por proteína"');
    expect(BUTCHER).toContain('aria-label="Modo de exibição"');
    expect((BUTCHER.match(/role="radiogroup"/g) ?? []).length).toBe(2);
    expect(BUTCHER).toContain("aria-checked");
    expect(BUTCHER).toContain("tabIndex");
  });

  it("skeletons, erro e vazio são anunciados por leitores de tela", () => {
    expect((BUTCHER.match(/aria-live="polite"/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(BUTCHER).toContain('aria-busy="true"');
    expect(BUTCHER).toContain('role="alert"');
    expect(BUTCHER).toMatch(/role="status"/);
  });

  it("modal do produto anuncia carregamento, erro e vazio", () => {
    expect(QUICKVIEW).toContain('aria-live="polite"');
    expect(QUICKVIEW).toContain('role="alert"');
    expect(QUICKVIEW).toContain("onCloseAutoFocus");
  });

  it("todos os elementos interativos têm foco visível", () => {
    for (const [, src] of SOURCES) expect(src).toContain("focus-visible:ring");
  });
});

describe("açougue · estado compartilhável na URL", () => {
  it.each([
    ["estabelecimento.$slug", ROUTE_STORE],
    ["estabelecimento.$slug_.acougue", ROUTE_BUTCHER],
  ])("%s espelha filtros e produto aberto na URL", (_name, src) => {
    for (const key of ["bq", "prot", "bsort", "bview", "p"]) {
      expect(src).toContain(`${key}:`);
    }
    expect(src).toContain("search.p");
  });
});
