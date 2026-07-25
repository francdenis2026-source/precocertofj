import { describe, it, expect } from "vitest";
import {
  auditPriceConsistency,
  auditCardAgainstRanking,
  auditRow,
} from "@/lib/price-audit";

const store = (name: string, price: number) => ({ store_name: name, establishment_id: name, price });

describe("auditRow", () => {
  it("não aponta problema quando cache e detalhe batem", () => {
    expect(
      auditRow({
        display_name: "Óleo de Soja Coamo 900ml",
        min_price: 8.25,
        max_price: 9.99,
        store_count: 2,
        stores: [store("Rebouças", 8.25), store("100% Feijoense", 9.99)],
      }),
    ).toEqual([]);
  });

  it("detecta menor/maior invertidos", () => {
    const issues = auditRow({ display_name: "Arroz 5kg", min_price: 30, max_price: 25, stores: [] });
    expect(issues.map((i) => i.code)).toContain("inverted-range");
    expect(issues[0].severity).toBe("critical");
  });

  it("detecta divergência entre cache agregado e lista por loja", () => {
    const issues = auditRow({
      display_name: "Leite 1L",
      min_price: 6.5,
      max_price: 7.5,
      stores: [store("A", 5.9), store("B", 7.5)],
    });
    expect(issues.map((i) => i.code)).toContain("source-divergence");
  });

  it("detecta loja faltando no cache", () => {
    const faltando = auditRow({
      display_name: "Café 500g",
      min_price: 18,
      max_price: 22,
      store_count: 4,
      stores: [store("A", 18), store("B", 22)],
    });
    expect(faltando.map((i) => i.code)).toContain("missing-store-in-cache");

    const semDetalhe = auditRow({
      display_name: "Café 500g",
      min_price: 18,
      store_count: 3,
      stores: [],
    });
    expect(semDetalhe.map((i) => i.code)).toContain("missing-store-in-cache");
  });
});

describe("auditCardAgainstRanking", () => {
  const ranking = {
    label: "Óleo de Soja 900ml",
    stores: [store("Rebouças", 8.25), store("Central Super", 8.5)],
    cheapest: store("Rebouças", 8.25),
  };

  it("aprova card idêntico ao topo do ranking", () => {
    expect(auditCardAgainstRanking({ price: 8.25, storeName: "Rebouças" }, ranking)).toEqual([]);
  });

  it("acusa preço divergente", () => {
    const issues = auditCardAgainstRanking({ price: 8.99, storeName: "Rebouças" }, ranking);
    expect(issues[0].code).toBe("card-ranking-divergence");
  });

  it("acusa estabelecimento divergente", () => {
    const issues = auditCardAgainstRanking({ price: 8.25, storeName: "Facem" }, ranking);
    expect(issues.some((i) => i.message.includes("Facem"))).toBe(true);
  });

  it("acusa ranking fora de ordem", () => {
    const issues = auditCardAgainstRanking(
      { price: 8.25, storeName: "Rebouças" },
      { ...ranking, stores: [store("Rebouças", 8.25), store("X", 7.9)] },
    );
    expect(issues.map((i) => i.code)).toContain("ranking-unsorted");
  });
});

describe("auditPriceConsistency", () => {
  it("agrega contagens por severidade", () => {
    const report = auditPriceConsistency({
      rows: [
        { display_name: "A", min_price: 10, max_price: 5, stores: [] },
        { display_name: "B", min_price: 3, max_price: 4, store_count: 3, stores: [store("s", 3)] },
      ],
      ranking: {
        label: "A",
        stores: [store("s", 3)],
        cheapest: store("s", 3),
      },
      card: { price: 3, storeName: "s" },
    });
    expect(report.criticalCount).toBe(1);
    expect(report.warnCount).toBe(1);
  });

  it("busca saudável não gera alerta", () => {
    const report = auditPriceConsistency({
      rows: [
        {
          display_name: "Óleo de Soja Coamo 900ml",
          min_price: 8.25,
          max_price: 9.99,
          store_count: 2,
          stores: [store("Rebouças", 8.25), store("100% Feijoense", 9.99)],
        },
      ],
      ranking: {
        label: "Óleo de Soja 900ml",
        stores: [store("Rebouças", 8.25), store("100% Feijoense", 9.99)],
        cheapest: store("Rebouças", 8.25),
      },
      card: { price: 8.25, storeName: "Rebouças" },
    });
    expect(report.issues).toEqual([]);
  });
});
