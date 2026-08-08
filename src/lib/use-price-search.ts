import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { searchProductPrice } from "@/lib/price-search.functions";

/**
 * Consulta compartilhada da busca de preços.
 *
 * Todos os blocos da tela `/buscar` usam a MESMA chave e as MESMAS opções, com
 * `keepPreviousData`: enquanto a nova busca carrega, o conteúdo anterior
 * permanece na tela. Isso evita que a página encolha (skeleton) e volte a
 * crescer — que é o que fazia a tela "pular" para cima/baixo.
 */
export function usePriceSearch(query: string, category?: string) {
  const runSearch = useServerFn(searchProductPrice);
  return useQuery({
    queryKey: ["price-search", query, category],
    queryFn: () => runSearch({ data: { query: query || "", category, limit: 100 } }),
    enabled: true,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}
