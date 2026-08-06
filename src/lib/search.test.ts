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

describe("Price Sorting Logic (Enriched Suggestions)", () => {
  it("should sort items by min price correctly, handling nulls", () => {
    const items = [
      { id: "1", minPrice: 10.5, market: "A" },
      { id: "2", minPrice: 5.2, market: "B" },
      { id: "3", minPrice: null, market: null },
      { id: "4", minPrice: 8.9, market: "C" },
      { id: "5", minPrice: 5.2, market: "D" } // Tie
    ];

    const sorted = [...items].sort((a, b) => {
      if (a.minPrice === null) return 1;
      if (b.minPrice === null) return -1;
      if (a.minPrice !== b.minPrice) return a.minPrice - b.minPrice;
      // Secondary sort to ensure consistency on ties
      return (a.market || "").localeCompare(b.market || "");
    });

    expect(sorted[0].minPrice).toBe(5.2);
    expect(sorted[0].market).toBe("B");
    expect(sorted[1].minPrice).toBe(5.2);
    expect(sorted[1].market).toBe("D");
    expect(sorted[2].minPrice).toBe(8.9);
    expect(sorted[3].minPrice).toBe(10.5);
    expect(sorted[4].minPrice).toBe(null);
  });
});


