import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Loader2, Pause, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  listMyAlertSubscriptions,
  updateAlertSubscription,
  deleteAlertSubscription,
} from "@/lib/price-alerts.functions";
import { Button } from "@/components/ui/button";

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Painel de assinaturas de alerta de variação de preço no /alertas.
 */
export function PriceAlertSubscriptions() {
  const listFn = useServerFn(listMyAlertSubscriptions);
  const updateFn = useServerFn(updateAlertSubscription);
  const deleteFn = useServerFn(deleteAlertSubscription);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["price-alert-subs"],
    queryFn: () => listFn(),
    staleTime: 30_000,
  });

  const toggleMut = useMutation({
    mutationFn: (v: { id: string; active: boolean }) =>
      updateFn({ data: { id: v.id, active: v.active } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["price-alert-subs"] }),
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Falha ao atualizar"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Alerta removido");
      qc.invalidateQueries({ queryKey: ["price-alert-subs"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Falha ao remover"),
  });

  const subs = query.data ?? [];

  return (
    <section className="mt-10">
      <header className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary" />
        <h2 className="font-serif text-lg">Assinaturas de variação</h2>
      </header>
      <p className="mt-1 text-xs text-muted-foreground">
        Definimos alertas quando o preço destes produtos cair/subir acima do limite.
      </p>

      {query.isLoading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </div>
      )}

      {!query.isLoading && subs.length === 0 && (
        <div className="mt-4 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhuma assinatura ainda. Abra o histórico de um produto e clique em
          <strong className="mx-1">Criar alerta</strong>.
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {subs.map((s) => (
          <li
            key={s.id}
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {s.displayName ?? s.productKey}
              </p>
              <p className="mt-0.5 text-[11px] uppercase tracking-widest text-muted-foreground">
                {s.direction === "drop"
                  ? "Só quedas"
                  : s.direction === "rise"
                    ? "Só altas"
                    : "Cair ou subir"}{" "}
                • ±{s.thresholdPct}%
                {s.targetPrice !== null && ` • alvo ${brl(s.targetPrice)}`}
                {(s.scopeNeighborhood || s.scopeCity) &&
                  ` • ${[s.scopeNeighborhood, s.scopeCity].filter(Boolean).join(" / ")}`}
                {!s.active && " • pausado"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  toggleMut.mutate({ id: s.id, active: !s.active })
                }
              >
                {s.active ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteMut.mutate(s.id)}
                disabled={deleteMut.isPending}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
