/**
 * Ordenação estável de preços e deduplicação por estabelecimento.
 *
 * Em empates de valor, a ordem precisa ser determinística — caso contrário o
 * "Menor preço" pode apontar para um estabelecimento diferente da primeira
 * linha da lista, dando a impressão de repetição/divergência entre seções.
 */

export type PriceRankEntry = {
  /** Nome do estabelecimento */
  store: string;
  /** Valor usado no ranking */
  price: number;
  /** Amostras conhecidas (mais amostras = mais confiável em empates) */
  samples?: number | null;
  /** Última captura (ISO) — mais recente vence em empates */
  lastSeen?: string | null;
};

/** Chave canônica de estabelecimento (case/acentos/espaços insensível). */
export function storeKey(name: string | null | undefined): string {
  return (name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Preço normalizado em centavos, evitando empates falsos por float. */
export function priceKey(price: number): number {
  return Math.round(price * 100);
}

/**
 * Comparador estável: preço → mais amostras → captura mais recente → nome.
 * Determinístico para o mesmo conjunto de dados, independente da ordem inicial.
 */
export function comparePriceEntries(a: PriceRankEntry, b: PriceRankEntry): number {
  const byPrice = priceKey(a.price) - priceKey(b.price);
  if (byPrice !== 0) return byPrice;

  const bySamples = (b.samples ?? 0) - (a.samples ?? 0);
  if (bySamples !== 0) return bySamples;

  const at = a.lastSeen ? Date.parse(a.lastSeen) : 0;
  const bt = b.lastSeen ? Date.parse(b.lastSeen) : 0;
  if (Number.isFinite(at) && Number.isFinite(bt) && at !== bt) return bt - at;

  return storeKey(a.store).localeCompare(storeKey(b.store), "pt-BR");
}

/** Ordena de forma estável, sem mutar a lista original. */
export function sortByPriceStable<T>(
  items: readonly T[],
  toEntry: (item: T) => PriceRankEntry,
): T[] {
  return items.slice().sort((a, b) => comparePriceEntries(toEntry(a), toEntry(b)));
}

/**
 * Remove duplicatas do mesmo estabelecimento (e do mesmo par loja+preço),
 * mantendo sempre a melhor ocorrência segundo o comparador estável.
 */
export function dedupeByStorePrice<T>(
  items: readonly T[],
  toEntry: (item: T) => PriceRankEntry,
): T[] {
  const best = new Map<string, T>();
  for (const item of items) {
    const entry = toEntry(item);
    const key = storeKey(entry.store);
    if (!key) continue;
    const current = best.get(key);
    if (!current || comparePriceEntries(entry, toEntry(current)) < 0) {
      best.set(key, item);
    }
  }
  return sortByPriceStable(Array.from(best.values()), toEntry);
}

/** Primeiro colocado consistente com a lista renderizada. */
export function cheapestOf<T>(
  items: readonly T[],
  toEntry: (item: T) => PriceRankEntry,
): T | null {
  return dedupeByStorePrice(items, toEntry)[0] ?? null;
}
