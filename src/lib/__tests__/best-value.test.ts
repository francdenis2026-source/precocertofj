import { describe, it, expect } from "vitest";
import { pickBestValue } from "@/lib/best-value";

describe("pickBestValue — melhor custo-benefício (R$/unidade)", () => {
  it("elege a embalagem maior quando ela tem menor R$/kg", () => {
    const r = pickBestValue([
      { key: "arroz-1kg", name: "Arroz Tio João 1kg", price: 7.5 },
      { key: "arroz-5kg", name: "Arroz Tio João 5kg", price: 29.9 },
    ]);
    expect(r).not.toBeNull();
    expect(r?.key).toBe("arroz-5kg");
    expect(r?.base).toBe("kg");
    expect(r?.cheapestKey).toBe("arroz-1kg");
    expect(r?.differsFromCheapest).toBe(true);
    expect(r?.label).toMatch(/5,98\/kg/);
    expect(Math.round(r?.advantagePct ?? 0)).toBe(20);
  });

  it("retorna null quando todas as embalagens têm o mesmo tamanho", () => {
    const r = pickBestValue([
      { key: "a", name: "Feijão Carioca 1kg", price: 8.9 },
      { key: "b", name: "Feijão Carioca 1kg", price: 9.9 },
    ]);
    expect(r).toBeNull();
  });

  it("não compara bases diferentes (kg vs L)", () => {
    const r = pickBestValue([
      { key: "a", name: "Óleo de Soja 900ml", price: 7.0 },
      { key: "b", name: "Açúcar 5kg", price: 20.0 },
    ]);
    expect(r).toBeNull();
  });

  it("retorna null quando menos de 2 itens têm tamanho detectável", () => {
    const r = pickBestValue([
      { key: "a", name: "Arroz 5kg", price: 29.9 },
      { key: "b", name: "Arroz sem medida", price: 7.5 },
    ]);
    expect(r).toBeNull();
  });

  it("ignora vantagem irrelevante (< 1%) quando o vencedor não é o mais barato", () => {
    // 2L a R$ 10,00 = R$ 5,00/L ; 1L a R$ 5,02 = R$ 5,02/L → 0,4% de vantagem
    const r = pickBestValue([
      { key: "peq", name: "Suco 1L", price: 5.02 },
      { key: "gde", name: "Suco 2L", price: 10.0 },
    ]);
    expect(r).toBeNull();
  });

  it("aceita multipack e reporta o rótulo de origem", () => {
    const r = pickBestValue([
      { key: "unit", name: "Refrigerante 2L", price: 9.0 },
      { key: "pack", name: "Refrigerante 6x2L", price: 39.0 },
    ]);
    expect(r?.key).toBe("pack");
    expect(r?.sourceLabel).toBe("6x2L");
    expect(r?.base).toBe("L");
  });

  it("mantém o selo quando o vencedor também é o de menor preço absoluto", () => {
    const r = pickBestValue([
      { key: "gde", name: "Leite em pó 800g", price: 22.0 },
      { key: "peq", name: "Leite em pó 1kg", price: 20.0 },
    ]);
    expect(r?.key).toBe("peq");
    expect(r?.differsFromCheapest).toBe(false);
  });

  it("usa o tamanho persistido quando o nome não traz medida", () => {
    const r = pickBestValue([
      { key: "a", name: "Detergente", price: 3.0, sizeValue: 500, sizeUnit: "ml" },
      { key: "b", name: "Detergente refil", price: 9.0, sizeValue: 2000, sizeUnit: "ml" },
    ]);
    expect(r?.key).toBe("b");
    expect(r?.base).toBe("L");
  });
});
