import { describe, it, expect } from "vitest";
import {
  selectEquivalentIndexes,
  selectCheapestEquivalentIndexes,
  equivalentGroupLabel,
  sizeSignature,
} from "@/lib/equivalent-group";

/**
 * Testes de integração do agrupamento equivalente — a fonte única do "menor
 * preço" no comparador. Cada regra aqui evita uma divergência já observada
 * entre o card resumo e o ranking.
 */
describe("sizeSignature", () => {
  it("normaliza tamanho a partir do nome", () => {
    expect(sizeSignature("Óleo de Soja Coamo 900ml")).toBe(sizeSignature("Óleo de Soja Soya 900 ML"));
  });

  it("usa fallback de colunas quando o nome não traz tamanho", () => {
    expect(sizeSignature("Óleo de Soja", { sizeValue: 900, sizeUnit: "ml" })).not.toBe("");
  });

  it("distingue tamanhos diferentes", () => {
    expect(sizeSignature("Óleo 900ml")).not.toBe(sizeSignature("Óleo 150ml"));
  });
});

describe("selectEquivalentIndexes", () => {
  const oleos = [
    { name: "Óleo de Soja Coamo 900ml", category: "mercearia" },
    { name: "Óleo de Soja Soya 900ml", category: "mercearia" },
    { name: "Óleo de Soja Concórdia 900ml", category: "mercearia" },
    { name: "Óleo de Soja Liza 150ml", category: "mercearia" },
    { name: "Óleo de Coco Capilar 900ml", category: "higiene" },
  ];

  it("agrupa marcas diferentes do mesmo item e tamanho", () => {
    const idx = selectEquivalentIndexes(oleos, "oleo de soja", 0);
    expect(idx).toEqual([0, 1, 2]);
  });

  it("nunca mistura tamanhos diferentes", () => {
    const idx = selectEquivalentIndexes(oleos, "oleo de soja", 0);
    expect(idx).not.toContain(3);
  });

  it("nunca mistura categorias diferentes", () => {
    const idx = selectEquivalentIndexes(oleos, "oleo", 0);
    expect(idx).not.toContain(4);
  });

  it("ignora acentos e caixa da busca", () => {
    expect(selectEquivalentIndexes(oleos, "ÓLEO DE SOJA", 0)).toEqual([0, 1, 2]);
  });

  it("respeita a referência escolhida (item presente em mais mercados)", () => {
    const idx = selectEquivalentIndexes(oleos, "oleo de soja", 1);
    expect(idx).toContain(1);
    expect(idx.sort()).toEqual([0, 1, 2]);
  });

  it("sem termos de busca não agrupa marcas", () => {
    expect(selectEquivalentIndexes(oleos, "", 0)).toEqual([0]);
  });

  it("lista vazia devolve vazio", () => {
    expect(selectEquivalentIndexes([], "oleo", 0)).toEqual([]);
  });

  it("o menor preço do grupo é sempre o menor entre todas as marcas", () => {
    const precos = [9.8, 8.25, 8.99, 5.0, 7.0];
    const idx = selectEquivalentIndexes(oleos, "oleo de soja", 0);
    const menor = Math.min(...idx.map((i) => precos[i]));
    // 5,00 é o 150ml e 7,00 é o capilar — não podem "vencer" a comparação.
    expect(menor).toBe(8.25);
  });
});

describe("equivalentGroupLabel", () => {
  it("usa o prefixo comum entre as marcas", () => {
    expect(
      equivalentGroupLabel(
        ["Óleo de Soja Coamo 900ml", "Óleo de Soja Soya 900ml"],
        "Óleo de Soja Coamo 900ml",
      ),
    ).toBe("Óleo de Soja 900ml");
  });

  it("cai no fallback quando não há prefixo útil", () => {
    expect(equivalentGroupLabel(["Arroz 5kg", "Feijão 1kg"], "Arroz 5kg")).toBe("Arroz 5kg");
  });

  it("um único nome devolve o próprio nome", () => {
    expect(equivalentGroupLabel(["Leite 1L"], "x")).toBe("Leite 1L");
  });
});

describe("selectCheapestEquivalentIndexes", () => {
  it("prioriza o grupo equivalente que contém o menor preço real", () => {
    const idx = selectCheapestEquivalentIndexes(
      [
        { name: "Óleo de Soja Concórdia 900ml", category: "mercearia", minPrice: 8.5, samples: 3 },
        { name: "Óleo de Soja Coamo 900ml", category: "mercearia", minPrice: 8.25, samples: 1 },
        { name: "Óleo de Soja Soya 900ml", category: "mercearia", minPrice: 9, samples: 2 },
        { name: "Óleo de Soja Liza 150ml", category: "mercearia", minPrice: 5, samples: 1 },
      ],
      "oleo de soja",
    );
    expect(idx.sort()).toEqual([0, 1, 2]);
  });

  it("respeita tamanho explícito na busca para não misturar embalagens", () => {
    const idx = selectCheapestEquivalentIndexes(
      [
        { name: "Manteiga Aviação 200g", category: "mercearia", minPrice: 14.99, samples: 2 },
        { name: "Manteiga Itambé 500g", category: "mercearia", minPrice: 24.99, samples: 2 },
        { name: "Manteiga Piracanjuba 200g", category: "mercearia", minPrice: 12.99, samples: 1 },
      ],
      "manteiga 200g",
    );
    expect(idx.sort()).toEqual([0, 2]);
  });
});
