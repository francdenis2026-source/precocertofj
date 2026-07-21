import { describe, it, expect } from "vitest";
import {
  filterByTokens,
  groupAndScore,
  scoreProductName,
  type ScanLike,
} from "@/lib/search-scoring";

function row(name: string, price = 10, market = "M1"): ScanLike {
  return {
    product_name: name,
    price_captured: price,
    market_name: market,
    created_at: "2025-01-01T00:00:00Z",
  };
}

describe("filterByTokens (strict)", () => {
  it("é insensível a caixa e acentos", () => {
    const rows = [row("Óleo de Soja"), row("Oleoso Creme")];
    const { list } = filterByTokens(rows, "ÓLEO");
    expect(list.map((r) => r.product_name)).toEqual(["Óleo de Soja"]);
  });

  it("'sal' rejeita 'Salsicha' e 'Salgadinho'", () => {
    const rows = [row("Sal Grosso"), row("Salsicha Sadia"), row("Salgadinho Cheetos")];
    const { list } = filterByTokens(rows, "sal");
    expect(list.map((r) => r.product_name)).toEqual(["Sal Grosso"]);
  });

  it("'cha' rejeita 'Chapeu' e 'Chaveiro'", () => {
    const rows = [row("Chá Verde"), row("Chapeu de Palha"), row("Chaveiro")];
    const { list } = filterByTokens(rows, "cha");
    expect(list.map((r) => r.product_name)).toEqual(["Chá Verde"]);
  });

  it("'oleo' aceita apenas nomes com a palavra inteira 'óleo'", () => {
    const rows = [
      row("Óleo de Soja"),
      row("Oleoso Creme"),
      row("Óleo Girassol"),
    ];
    const { list } = filterByTokens(rows, "oleo");
    expect(list.map((r) => r.product_name).sort()).toEqual([
      "Óleo Girassol",
      "Óleo de Soja",
    ]);
  });

  it("descarta scans sem preço válido", () => {
    const rows: ScanLike[] = [
      { ...row("Sal Grosso"), price_captured: null },
      row("Sal Refinado", 5),
    ];
    const { list } = filterByTokens(rows, "sal");
    expect(list.map((r) => r.product_name)).toEqual(["Sal Refinado"]);
  });
});

describe("filterByTokens (loose)", () => {
  it("permite prefixo — 'oleo' casa 'Oleoso'", () => {
    const rows = [row("Óleo de Soja"), row("Oleoso Creme")];
    const { list } = filterByTokens(rows, "oleo", "loose");
    expect(list.length).toBe(2);
  });
});

describe("scoreProductName", () => {
  it("produto com nome exatamente digitado recebe prioridade máxima", () => {
    const exact = scoreProductName("Leite Ninho Integral", ["leite", "ninho", "integral"], null, "LEITE ninho integral");
    const noisy = scoreProductName("Biscoito Leite Ninho Integral Recheado", ["leite", "ninho", "integral"], null, "LEITE ninho integral");
    expect(exact.score).toBeGreaterThan(noisy.score);
  });

  it("nome curto e exato pontua mais que nome comprido com prefixo", () => {
    const a = scoreProductName("Arroz Tio João", ["arroz", "tio"]);
    const b = scoreProductName(
      "Condicionador Arroz e Tio Nacho Restaurador 400ml",
      ["arroz", "tio"],
    );
    expect(a.score).toBeGreaterThan(b.score);
  });

  it("adiciona reason 'brand' quando marca do catálogo bate", () => {
    const { reasons } = scoreProductName("Leite Ninho Integral", ["ninho"], "Ninho");
    expect(reasons.some((r) => r.kind === "brand")).toBe(true);
  });
});

describe("groupAndScore ordena por relevância", () => {
  it("query 'arroz tio' prioriza 'Arroz Tio João' sobre alternativas ruidosas", () => {
    const rows = [
      row("Arroz Tio João 5kg", 20, "MA"),
      row("Arroz Tio João 5kg", 22, "MB"),
      row("Condicionador Arroz e Tio Nacho 400ml", 15, "MC"),
    ];
    const { tokens, list } = filterByTokens(rows, "arroz tio");
    const groups = groupAndScore(list, tokens, "arroz tio");
    expect(groups[0].productName.toLowerCase()).toContain("arroz tio joão");
  });

  it("query completa prioriza o produto exato mesmo com menos amostras", () => {
    const rows = [
      row("Leite Ninho Integral", 12, "A"),
      row("Biscoito Leite Ninho Integral Recheado", 8, "B"),
      row("Biscoito Leite Ninho Integral Recheado", 9, "C"),
    ];
    const { tokens, list } = filterByTokens(rows, "leite ninho integral");
    const groups = groupAndScore(list, tokens, "leite ninho integral");
    expect(groups[0].productName).toBe("Leite Ninho Integral");
  });

  it("empate de score → mais amostras vence", () => {
    const rows = [
      row("Sal Grosso", 5, "A"),
      row("Sal Grosso", 5, "B"),
      row("Sal Refinado", 3, "C"),
    ];
    const { tokens, list } = filterByTokens(rows, "sal");
    const groups = groupAndScore(list, tokens);
    expect(groups[0].productName).toBe("Sal Grosso");
  });
});
