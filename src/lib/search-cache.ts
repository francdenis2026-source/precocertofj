import type { QueryClient } from "@tanstack/react-query";
import type { ProductSuggestion } from "@/lib/product-suggest.server";

/**
 * Cache compartilhado do fluxo de busca.
 *
 * SearchDiscovery (home/`/buscar`), a barra de resultados e a rota de produto
 * usavam fetches independentes: o mesmo termo era consultado várias vezes
 * (sugestão → enriquecimento de preço → resultado da busca → produto).
 * Centralizando chaves e `staleTime` aqui, o React Query passa a deduplicar
 * requisições em voo e a reaproveitar respostas recentes entre as telas.
 */
export const SEARCH_STALE_TIME = 5 * 60_000;
export const SEARCH_GC_TIME = 30 * 60_000;

const norm = (v: string) => v.trim().toLowerCase();

export const searchKeys = {
  all: ["search"] as const,
  suggest: (q: string) => ["search", "suggest", norm(q)] as const,
  prices: (q: string, mode: string = "strict", pureOnly: boolean = true) =>
    ["search", "prices", norm(q), mode, pureOnly ? 1 : 0] as const,
  product: (slug: string) => ["search", "product", slug] as const,
};

type SuggestFn = (args: { data: { query: string }; signal?: AbortSignal }) => Promise<ProductSuggestion[]>;

export function fetchSuggestions(
  qc: QueryClient,
  run: SuggestFn,
  query: string,
  signal?: AbortSignal,
): Promise<ProductSuggestion[]> {
  return qc.fetchQuery({
    queryKey: searchKeys.suggest(query),
    queryFn: () => run({ data: { query }, signal }),
    staleTime: SEARCH_STALE_TIME,
    gcTime: SEARCH_GC_TIME,
  });
}

export type PriceSearchParams = {
  query: string;
  mode?: string;
  pureOnly?: boolean;
  fresh?: boolean;
};

type PriceSearchFn<T> = (args: { data: Record<string, unknown>; signal?: AbortSignal }) => Promise<T>;

export function fetchPriceSearch<T>(
  qc: QueryClient,
  run: PriceSearchFn<T>,
  params: PriceSearchParams,
  signal?: AbortSignal,
): Promise<T> {
  const { query, mode = "strict", pureOnly = true, fresh = false } = params;
  const key = searchKeys.prices(query, mode, pureOnly);
  // `fresh` (ex.: preço novo chegando por realtime) invalida o cache do termo
  // antes de refazer a consulta — os demais termos continuam aproveitáveis.
  if (fresh) qc.removeQueries({ queryKey: key, exact: true });
  return qc.fetchQuery({
    queryKey: key,
    queryFn: () => run({ data: { query, mode, pureOnly, fresh }, signal }),
    staleTime: fresh ? 0 : SEARCH_STALE_TIME,
    gcTime: SEARCH_GC_TIME,
  });
}
