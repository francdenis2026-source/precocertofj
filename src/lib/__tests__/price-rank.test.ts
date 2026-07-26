import { describe, expect, it } from "vitest";
import { cheapestOf, dedupeByStorePrice, sortByPriceStable } from "@/lib/price-rank";

type M = { store: string; price: number; samples?: number; lastSeen?: string };
const entry = (m: M) => ({ store: m.store, price: m.price, samples: m.samples, lastSeen: m.lastSeen });

describe("price-rank", () => {
  it("desempata de forma determinística independente da ordem de entrada", () => {
    const a: M[] = [
      { store: "Facem", price: 1, samples: 1, lastSeen: "2026-07-01" },
      { store: "Rebouças", price: 1, samples: 3, lastSeen: "2026-07-02" },
      { store: "Parceirão", price: 1, samples: 3, lastSeen: "2026-07-05" },
    ];
    const order1 = sortByPriceStable(a, entry).map((m) => m.store);
    const order2 = sortByPriceStable(a.slice().reverse(), entry).map((m) => m.store);
    expect(order1).toEqual(order2);
    expect(order1[0]).toBe("Parceirão");
  });

  it("deduplica o mesmo estabelecimento mantendo o menor preço", () => {
    const list: M[] = [
      { store: "MERCANTIL REBOUÇAS", price: 2.5 },
      { store: "Mercantil Reboucas", price: 1 },
      { store: "Facem", price: 3 },
    ];
    const out = dedupeByStorePrice(list, entry);
    expect(out).toHaveLength(2);
    expect(out[0].price).toBe(1);
  });

  it("cheapestOf é sempre o primeiro item da lista deduplicada", () => {
    const list: M[] = [
      { store: "A", price: 1.005 },
      { store: "B", price: 1.004 },
    ];
    expect(cheapestOf(list, entry)).toBe(dedupeByStorePrice(list, entry)[0]);
  });
});
