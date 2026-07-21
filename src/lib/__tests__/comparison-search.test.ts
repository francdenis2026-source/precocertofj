import { describe, expect, it } from "vitest";
import { filterAndSortComparisonRows, type ComparisonSearchRow } from "@/lib/comparison-search";

function row(displayName: string, minPrice: number, category = "laticinios"): ComparisonSearchRow {
  return {
    display_name: displayName,
    product_key: displayName.toLowerCase(),
    min_price: minPrice,
    category,
    stores: [{ product_name: displayName }],
  };
}

describe("filterAndSortComparisonRows", () => {
  it("para 'leite', mantém o produto principal e remove itens sem relação direta", () => {
    const rows = [
      row("Sabonete Nivea Proteína Leite 85g", 3),
      row("Doce de Leite Junco 400g", 8),
      row("Leite Uht Italac Integral 1l", 8.75),
      row("Leite Uht Italac Desnatado 1l", 9),
    ];

    expect(filterAndSortComparisonRows(rows, "leite", "").map((item) => item.display_name)).toEqual([
      "Leite Uht Italac Integral 1l",
      "Leite Uht Italac Desnatado 1l",
    ]);
  });

  it("não busca pelo nome da categoria quando o termo não aparece no produto", () => {
    const rows = [
      row("Queijo Mussarela 400g", 18, "laticinios"),
      row("Arroz Branco 1kg", 6, "mercearia"),
    ];

    expect(filterAndSortComparisonRows(rows, "laticinios", "")).toEqual([]);
  });
});