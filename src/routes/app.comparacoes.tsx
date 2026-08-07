import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/brand/AppShell";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { listSavedBaskets, deleteSavedBasket } from "@/lib/saved-baskets.functions";
import { 
  PageHeader, 
  SectionCard,
} from "@/components/layout";
import { 
  Scale, 
  Trash2, 
  ExternalLink, 
  Calendar,
  Package,
  Store,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/ds/Price";
import { EmptyState, ListRowsSkeleton } from "@/components/feedback";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/app/comparacoes")({
  head: () => ({
    meta: [
      { title: "Minhas Comparações — PreçoCerto" },
      { name: "description", content: "Gerencie seus conjuntos de comparação de preços salvos." },
    ],
  }),
  component: () => (
    <ProtectedGate>
      <SavedComparisonsPage />
    </ProtectedGate>
  ),
});

function SavedComparisonsPage() {
  const fetchBaskets = useServerFn(listSavedBaskets);
  const deleteBasketFn = useServerFn(deleteSavedBasket);

  const { data: baskets, isLoading, refetch } = useQuery({
    queryKey: ["saved-comparisons"],
    queryFn: () => fetchBaskets(),
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta comparação?")) return;
    try {
      await deleteBasketFn({ data: { id } });
      toast.success("Comparação excluída");
      refetch();
    } catch (err) {
      toast.error("Erro ao excluir");
    }
  };

  const comparisons = baskets?.filter(b => b.mode === "compare") || [];

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 md:px-6 pb-20">
        <PageHeader
          title="Comparações Salvas"
          description="Acesse e gerencie seus conjuntos de comparação favoritos."
        />

        {isLoading ? (
          <ListRowsSkeleton rows={5} />
        ) : comparisons.length === 0 ? (
          <EmptyState
            icon={Scale}
            title="Nenhuma comparação salva"
            message="Salve seus conjuntos de comparação no comparador de preços para vê-los aqui."
            action={
              <Button asChild>
                <Link to="/comparador">Ir para o Comparador</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4">
            {comparisons.map((basket) => (
              <SectionCard
                key={basket.id}
                className="hover:border-primary/40 transition-all group"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Scale className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-lg truncate group-hover:text-primary transition-colors">
                        {basket.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(basket.createdAt), "dd 'de' MMMM", { locale: ptBR })}
                        </div>
                        {basket.shareToken && (
                          <div className="pc-badge bg-primary/10 text-primary text-[9px] px-2 py-0.5 border border-primary/20">
                            COMPARTILHADA
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button asChild variant="outline" size="sm" className="h-9 px-4 rounded-full font-bold">
                      <Link 
                        to="/comparador" 
                        search={{ 
                          sel: (basket.filters as any)?.storeIds?.join(",") || "" 
                        }}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Abrir
                      </Link>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 rounded-full text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(basket.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </SectionCard>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
