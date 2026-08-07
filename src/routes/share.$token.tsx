import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/brand/AppShell";
import { getSharedBasket } from "@/lib/saved-baskets.functions";
import { SideBySideComparison } from "@/components/comparison/SideBySideComparison";
import { PageLoader, RouteError, EmptyState } from "@/components/feedback";
import { Share2 } from "lucide-react";

export const Route = createFileRoute("/share/$token")({
  head: () => ({
    meta: [
      { title: "Comparação de Preços Compartilhada — PreçoCerto" },
      { name: "description", content: "Veja esta lista comparativa de preços em Feijó." },
    ],
  }),
  component: SharedComparisonPage,
});

function SharedComparisonPage() {
  const { token } = Route.useParams();
  const fetchShared = useServerFn(getSharedBasket);

  const { data: basket, isLoading, error } = useQuery({
    queryKey: ["shared-basket", token],
    queryFn: () => fetchShared({ data: { token } }),
  });

  if (isLoading) return <PageLoader fullScreen />;
  
  if (error || !basket) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center p-4">
          <EmptyState
            icon={Share2}
            title="Link Inválido ou Expirado"
            message="Este link de compartilhamento não existe mais ou foi desativado pelo autor."
          />
        </div>
      </AppShell>
    );
  }

  // Parse filters to get storeIds
  const filters = basket.filters as { storeIds?: string[] };
  const storeIds = filters.storeIds || [];

  if (storeIds.length === 0) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center p-4">
          <EmptyState
            icon={Share2}
            title="Sem dados para exibir"
            message="Esta comparação não possui estabelecimentos selecionados."
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black text-foreground uppercase tracking-tight">
            {basket.name}
          </h1>
          <p className="text-muted-foreground mt-2 font-medium">
            Comparação criada em {new Date(basket.createdAt).toLocaleDateString("pt-BR")}
          </p>
        </div>

        <SideBySideComparison 
          storeIds={storeIds} 
          isShared={true}
        />
        
        <div className="mt-12 p-8 pc-card bg-primary/5 border-primary/20 text-center">
          <h2 className="text-xl font-black mb-2">Gostou dessa economia?</h2>
          <p className="text-muted-foreground mb-6">
            Crie sua própria conta no PreçoCerto para montar listas, comparar mercados e economizar na sua feira em Feijó.
          </p>
          <div className="flex justify-center gap-4">
            <a href="/auth" className="pc-button-primary px-8">Criar Conta Grátis</a>
            <a href="/" className="pc-button-secondary px-8">Ir para o Início</a>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
