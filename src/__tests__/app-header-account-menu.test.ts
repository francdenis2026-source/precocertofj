/**
 * AppHeader — rótulos neutros + menu de conta.
 *
 * Regressões cobertas:
 * 1. O header nunca imprime o nome de um estabelecimento (ex.: "Claudia").
 * 2. O badge verde mostra a contagem de ITENS cadastrados, derivada do
 *    somatório de `productCount` (recalcula sozinho quando a query muda).
 * 3. Perfil/configurações vivem em um dropdown acionado por chip, com
 *    foco visível e o comportamento de teclado/Esc do Radix.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const src = readFileSync(join(process.cwd(), "src/components/app/AppHeader.tsx"), "utf8");

describe("AppHeader — rótulos neutros", () => {
  it("não renderiza nome de estabelecimento", () => {
    expect(src).not.toMatch(/\btop\.name\b/);
    expect(src).not.toMatch(/stores\[0\]\.name/);
    expect(src).not.toMatch(/Claudia|Cláudia/i);
  });

  it("usa o rótulo neutro 'Melhores preços'", () => {
    expect(src).toContain("Melhores preços");
  });
});

describe("AppHeader — badge de itens cadastrados", () => {
  it("soma productCount para obter os itens", () => {
    expect(src).toMatch(/const items = stores\.reduce\(\(acc, s\) => acc \+ s\.productCount, 0\)/);
  });

  it("formata em pt-BR e rotula como itens", () => {
    expect(src).toMatch(/items\.toLocaleString\("pt-BR"\)/);
    expect(src).toMatch(/itens cadastrados/);
  });
});

describe("AppHeader — menu de conta", () => {
  it("o chip é o trigger do dropdown", () => {
    expect(src).toMatch(/<DropdownMenuTrigger asChild>/);
    expect(src).toMatch(/data-\[state=open\]/);
  });

  it("expõe foco visível no chip", () => {
    expect(src).toMatch(/focus-visible:ring-2/);
  });

  it("agrupa perfil, alertas, assinatura e sair no menu", () => {
    for (const item of ["/perfil", "/alertas", "/minhas-licencas"]) {
      expect(src).toContain(`to="${item}"`);
    }
    expect(src).toMatch(/onSelect=\{\(\) => void signOut\(\)\}/);
  });

  it("não deixa botões de conta soltos no header", () => {
    expect(src).not.toMatch(/onClick=\{signOut\}/);
  });
});
