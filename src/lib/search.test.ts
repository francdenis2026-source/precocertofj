import { describe, it, expect } from "vitest";
import { normalize, tokenizeQuery } from "./search-tokens";

describe("Search Logic", () => {
  it("should normalize queries correctly (case, accents, ç/c)", () => {
    expect(normalize("Arroz")).toBe("arroz");
    expect(normalize("FEIJÃO")).toBe("feijao");
    expect(normalize("açucar")).toBe("acucar");
    expect(normalize("ACÚCAR")).toBe("acucar");
  });

  it("should tokenize queries correctly", () => {
    expect(tokenizeQuery("Arroz Integral")).toEqual(["arroz", "integral"]);
    expect(tokenizeQuery("Feijão Carioca 1kg")).toEqual(["feijao", "carioca", "1kg"]);
  });

  it("should handle ç and c interchangeability if normalize does it", () => {
    // Check if normalize converts both to 'c'
    expect(normalize("açougue")).toBe("acougue");
    expect(normalize("acougue")).toBe("acougue");
  });
});

describe("Price Sorting Logic (Mocked)", () => {
  it("should sort items by min price correctly", () => {
    const items = [
      { id: "1", minPrice: 10.5 },
      { id: "2", minPrice: 5.2 },
      { id: "3", minPrice: null },
      { id: "4", minPrice: 8.9 }
    ];

    const sorted = items.sort((a, b) => {
      if (a.minPrice === null) return 1;
      if (b.minPrice === null) return -1;
      return a.minPrice - b.minPrice;
    });

    expect(sorted[0].id).toBe("2");
    expect(sorted[1].id).toBe("4");
    expect(sorted[2].id).toBe("1");
    expect(sorted[3].id).toBe("3");
  });
});
