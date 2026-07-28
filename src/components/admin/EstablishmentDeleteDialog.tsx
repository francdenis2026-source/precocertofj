import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, AlertTriangle, Info } from "lucide-react";
import {
  getEstablishmentDeletionImpact,
  type EstablishmentImpact,
} from "@/lib/admin-establishment-impact.functions";
import { cn } from "@/lib/utils";

export function EstablishmentDeleteDialog({
  open,
  establishmentId,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  establishmentId: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const fetchImpact = useServerFn(getEstablishmentDeletionImpact);
  const [loading, setLoading] = useState(false);
  const [impact, setImpact] = useState<EstablishmentImpact | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !establishmentId) return;
    setImpact(null);
    setError(null);
    setLoading(true);
    fetchImpact({ data: { id: establishmentId } })
      .then((r) => setImpact(r))
      .catch((e) => setError(e instanceof Error ? e.message : "Falha ao calcular impacto"))
      .finally(() => setLoading(false));
  }, [open, establishmentId, fetchImpact]);

  const deleteRows = impact?.rows.filter((r) => r.cascade === "delete" && r.count > 0) ?? [];
  const nullRows = impact?.rows.filter((r) => r.cascade === "set_null" && r.count > 0) ?? [];

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Remover estabelecimento?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              {impact?.establishmentName && (
                <p className="text-foreground">
                  <span className="font-medium">{impact.establishmentName}</span> será removido definitivamente.
                </p>
              )}
              <p>Esta ação não pode ser desfeita.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="rounded-md border bg-muted/30 p-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Calculando registros vinculados…
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : impact ? (
            <div className="space-y-3">
              {deleteRows.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-destructive">
                    Serão excluídos ({impact.totalDeleted.toLocaleString("pt-BR")} registros)
                  </p>
                  <ul className="space-y-1">
                    {deleteRows.map((r) => (
                      <li key={r.table} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{r.label}</span>
                        <span className="font-mono text-muted-foreground">
                          {r.count.toLocaleString("pt-BR")}{" "}
                          <span className="text-[10px]">({r.table})</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {nullRows.length > 0 && (
                <div>
                  <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    <Info className="h-3 w-3" /> Serão desvinculados (mantidos sem loja)
                  </p>
                  <ul className="space-y-1">
                    {nullRows.map((r) => (
                      <li key={r.table} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{r.label}</span>
                        <span className="font-mono text-muted-foreground">
                          {r.count.toLocaleString("pt-BR")}{" "}
                          <span className="text-[10px]">({r.table})</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {deleteRows.length === 0 && nullRows.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum registro vinculado — remoção limpa.
                </p>
              )}
            </div>
          ) : null}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className={cn("bg-destructive text-destructive-foreground hover:bg-destructive/90")}
          >
            Remover tudo
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
