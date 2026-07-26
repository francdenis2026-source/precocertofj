/**
 * Regressão anti-flicker de /buscar.
 *
 * Trava as invariantes que causaram piscadas no passado:
 *  - a URL só é sincronizada ao enviar a busca (nunca a cada tecla);
 *  - toda navegação de filtro usa `replace: true` (sem remontar a rota);
 *  - alturas reservadas (skeleton e resultados) impedem redimensionamento;
 *  - o modo de animações reduzidas existe e é aplicado ao escopo da busca.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const route = read("src/routes/buscar.tsx");
const bar = read("src/components/scanner/PriceSearchBar.tsx");
const styles = read("src/styles.css");

describe("/buscar — regressão de flicker", () => {
  it("não sincroniza a URL no onChange do input", () => {
    const onChange = bar.slice(bar.indexOf("onChange={(e) =>"), bar.indexOf("onFocus={() =>"));
    expect(onChange).not.toContain("onQueryChange");
  });

  it("sincroniza a query apenas ao enviar/limpar a busca", () => {
    const calls = bar.match(/onQueryChange\?\.\(/g) ?? [];
    expect(calls.length).toBe(2); // runQuery (submit) + clear
  });

  it("toda navegação de filtro usa replace: true", () => {
    const navigates = route.match(/navigate\(\{[\s\S]*?\n {4}\}\)/g) ?? [];
    expect(navigates.length).toBeGreaterThan(0);
    for (const call of navigates) {
      expect(call).toContain("replace: true");
    }
  });

  it("reserva altura estável no skeleton e nos resultados", () => {
    expect(bar.match(/min-h-\[640px\]/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(route).toContain("[overflow-anchor:none]");
  });

  it("mantém a barra de filtros fixa (sticky) para não deslocar conteúdo", () => {
    expect(route).toContain("sticky top-[var(--pc-search-top,52px)]");
  });

  it("expõe o modo de animações reduzidas na busca", () => {
    expect(route).toContain("useReducedMotion");
    expect(route).toContain("pc-reduce-motion");
    expect(styles).toContain(".pc-search-scope.pc-reduce-motion");
    expect(styles).toMatch(/transition-duration:\s*0\.001ms\s*!important/);
  });
});
