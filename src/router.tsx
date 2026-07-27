import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { PageLoader, RouteError, RouteNotFound } from "@/components/feedback";
import { useRouter } from "@tanstack/react-router";

function DefaultErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  if (typeof console !== "undefined") console.error(error);
  const router = useRouter();
  return (
    <RouteError
      message={error?.message || "Algo deu errado por aqui. Você pode tentar de novo ou voltar para o início."}
      onRetry={() => {
        router.invalidate();
        reset();
      }}
    />
  );
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Respostas ficam "frescas" por 1 min e são reutilizadas por 30 min:
        // evita refetch em cada navegação/foco (principal causa de lag).
        staleTime: 60_000,
        gcTime: 30 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    // O TanStack Query controla a validade dos dados; o router só pré-carrega
    // o código/rota no hover, deixando a abertura de páginas instantânea.
    defaultPreloadStaleTime: 0,
    defaultPreloadDelay: 30,
    defaultPendingMs: 1200,
    defaultPendingMinMs: 0,
    defaultPendingComponent: () => <PageLoader fullScreen />,

    defaultErrorComponent: DefaultErrorComponent,
    defaultNotFoundComponent: () => <RouteNotFound />,

  });

  return router;
};
