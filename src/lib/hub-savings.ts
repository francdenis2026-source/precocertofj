/**
 * Recalcula a economia média (categoria e por loja) a partir de um subconjunto
 * de produtos do hub — usado quando o usuário aplica filtros no cliente
 * (subgrupos de hortifrúti, busca, loja) e os números do cabeçalho e dos
 * cartões precisam refletir exatamente os resultados exibidos.
 *
 * Mesma fórmula do servidor: base é o MAIOR preço do produto entre as lojas,
 * e só entram produtos presentes em 2+ estabelecimentos.
 */

export type SavingsInput = {
  storePrices: { id: string; name: string; price: number }[];
};

export type HubSavings = {
  /** economia média (%) da categoria no recorte atual (null sem comparáveis) */
  avgSavingPct: number | null;
  /** quantos produtos comparáveis entraram na média */
  comparableProducts: number;
  /** por loja: média (%) e nº de produtos comparáveis */
  byStore: Map<string, { avgSavingPct: number; comparedProducts: number }>;
};

const round1 = (x: number) => Math.round(x * 10) / 10;

export function computeHubSavings(products: readonly SavingsInput[]): HubSavings {
  const cat: number[] = [];
  const perStore = new Map<string, number[]>();

  for (const p of products) {
    const byStore = new Map<string, number>();
    for (const sp of p.storePrices ?? []) {
      const prev = byStore.get(sp.id);
      if (prev === undefined || sp.price < prev) byStore.set(sp.id, sp.price);
    }
    if (byStore.size < 2) continue;

    const prices = [...byStore.values()];
    const max = Math.max(...prices);
    const min = Math.min(...prices);
    if (!(max > 0)) continue;

    cat.push(((max - min) / max) * 100);
    for (const [storeId, price] of byStore) {
      const arr = perStore.get(storeId) ?? [];
      arr.push(((max - price) / max) * 100);
      perStore.set(storeId, arr);
    }
  }

  const byStore = new Map<string, { avgSavingPct: number; comparedProducts: number }>();
  for (const [storeId, xs] of perStore) {
    byStore.set(storeId, {
      avgSavingPct: round1(xs.reduce((s, x) => s + x, 0) / xs.length),
      comparedProducts: xs.length,
    });
  }

  return {
    avgSavingPct: cat.length ? round1(cat.reduce((s, x) => s + x, 0) / cat.length) : null,
    comparableProducts: cat.length,
    byStore,
  };
}
