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
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    defaultPendingComponent: () => <PageLoader fullScreen />,
    defaultErrorComponent: DefaultErrorComponent,
    defaultNotFoundComponent: () => <RouteNotFound />,
  });

  return router;
};
