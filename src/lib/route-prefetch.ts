import type { QueryClient } from "@tanstack/react-query";

/**
 * Pré-carrega os DADOS das rotas mais usadas (o router já pré-carrega o
 * código no hover). Assim, abrir Buscar, Bairros, Mercados ou Ranking é
 * instantâneo: a query já está no cache quando a tela monta.
 */

type Prefetcher = (qc: QueryClient) => Promise<unknown>;

const prefetchers: Record<string, Prefetcher> = {
  "/buscar": async (qc) => {
    const { getSearchHighlights } = await import("@/lib/search-highlights.functions");
    return qc.prefetchQuery({
      queryKey: ["search-highlights"],
      queryFn: () => getSearchHighlights(),
      staleTime: 5 * 60_000,
    });
  },
  "/mapa": async (qc) => {
    const { listEstablishmentsByNeighborhood } = await import("@/lib/scans-history.functions");
    return qc.prefetchQuery({
      queryKey: ["neighborhoods"],
      queryFn: () => listEstablishmentsByNeighborhood({}),
      staleTime: 60_000,
    });
  },
  "/estabelecimentos": async (qc) => {
    const { listPublicEstablishments } = await import("@/lib/establishments-public.functions");
    return qc.prefetchQuery({
      queryKey: ["public-establishments"],
      queryFn: () => listPublicEstablishments({}),
      staleTime: 60_000,
    });
  },
  "/melhores-precos": async (qc) => {
    const { supabase } = await import("@/integrations/supabase/client");
    return qc.prefetchQuery({
      queryKey: ["price-comparisons"],
      queryFn: async () => {
        const { data, error } = await supabase.rpc("get_price_comparisons");
        if (error) throw error;
        return data ?? [];
      },
      staleTime: 5 * 60_000,
    });
  },
  "/comparador": async (qc) => {
    const { supabase } = await import("@/integrations/supabase/client");
    return qc.prefetchQuery({
      queryKey: ["price-comparisons"],
      queryFn: async () => {
        const { data, error } = await supabase.rpc("get_price_comparisons");
        if (error) throw error;
        return data ?? [];
      },
      staleTime: 5 * 60_000,
    });
  },
  "/onde-comprar": async (qc) => {
    const { getWhereToBuyRegions } = await import("@/lib/where-to-buy.functions");
    return qc.prefetchQuery({
      queryKey: ["where-to-buy-regions"],
      queryFn: () => getWhereToBuyRegions(),
      staleTime: 10 * 60_000,
    });
  },
};

const done = new Set<string>();

/** Pré-carrega os dados de uma rota (idempotente por sessão). */
export function prefetchRouteData(queryClient: QueryClient, path: string) {
  const key = path.split("?")[0].replace(/\/+$/, "") || "/";
  const run = prefetchers[key];
  if (!run || done.has(key)) return;
  done.add(key);
  void run(queryClient).catch(() => done.delete(key));
}

/** Aquece as rotas principais quando o navegador estiver ocioso. */
export function warmMainRoutes(queryClient: QueryClient) {
  if (typeof window === "undefined") return;
  const targets = ["/buscar", "/mapa", "/estabelecimentos", "/melhores-precos", "/comparador", "/onde-comprar"];
  const idle =
    (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
      .requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1200));
  targets.forEach((path, i) =>
    idle(() => window.setTimeout(() => prefetchRouteData(queryClient, path), i * 250), { timeout: 4000 }),
  );
}
