import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { AlertTriangle, Loader2, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { clearAdminLogs, LOG_SCOPES, type ClearLogsResult, type LogScope } from "@/lib/admin-maintenance.functions";

export function ClearLogsPanel() {
  const qc = useQueryClient();
  const fn = useServerFn(clearAdminLogs);
  const [selected, setSelected] = useState<Set<LogScope>>(new Set(["login_events"]));
  const [olderThan, setOlderThan] = useState<string>("");
  const [confirmText, setConfirmText] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastResults, setLastResults] = useState<ClearLogsResult[] | null>(null);

  const toggle = (k: LogScope) => {
    const next = new Set(selected);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setSelected(next);
  };

  const clearAll = () => setSelected(new Set(LOG_SCOPES.map((s) => s.key)));
  const clearNone = () => setSelected(new Set());

  const mut = useMutation({
    mutationFn: () =>
      fn({
        data: {
          scopes: Array.from(selected),
          olderThan: olderThan ? new Date(olderThan).toISOString() : null,
        },
      }),
    onSuccess: ({ results }) => {
      setLastResults(results);
      const ok = results.filter((r) => r.ok);
      const total = ok.reduce((n, r) => n + r.deleted, 0);
      const failed = results.filter((r) => !r.ok);
      if (failed.length === 0) {
        toast.success(`Logs limpos: ${total.toLocaleString("pt-BR")} registro(s) removido(s).`);
      } else {
        toast.warning(`Removidos ${total.toLocaleString("pt-BR")}, mas ${failed.length} escopo(s) falharam.`);
      }
      qc.invalidateQueries({ queryKey: ["admin-audit"] });
      qc.invalidateQueries({ queryKey: ["catalog-audit"] });
      qc.invalidateQueries({ queryKey: ["login-events"] });
      setConfirmOpen(false);
      setConfirmText("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao limpar logs"),
  });

  const scopeLabels = Array.from(selected)
    .map((s) => LOG_SCOPES.find((x) => x.key === s)?.label ?? s)
    .join(", ");

  const canConfirm = confirmText.trim().toUpperCase() === "LIMPAR" && selected.size > 0 && !mut.isPending;

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Trash2 className="h-4 w-4" /> Limpar logs definitivamente
        </CardTitle>
        <CardDescription>
          Zera métricas de logins de usuários, auditoria administrativa e outros históricos. A ação é
          <strong className="mx-1">permanente</strong> e não pode ser desfeita — os dados são apagados do banco.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-300">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              Antes de limpar, considere exportar CSV das tabelas que quiser preservar. A limpeza é registrada em
              <code className="mx-1 rounded bg-background px-1">admin_audit_log</code> com o timestamp e escopos.
            </div>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Escopos</p>
            <div className="flex gap-2 text-xs">
              <button className="text-primary hover:underline" onClick={clearAll} type="button">
                Selecionar todos
              </button>
              <span className="text-muted-foreground">·</span>
              <button className="text-muted-foreground hover:underline" onClick={clearNone} type="button">
                Nenhum
              </button>
            </div>
          </div>
          <ul className="grid gap-2 md:grid-cols-2">
            {LOG_SCOPES.map((s) => {
              const active = selected.has(s.key);
              return (
                <li
                  key={s.key}
                  className={`flex items-start gap-2 rounded border p-2 text-xs ${
                    active ? "border-destructive/50 bg-destructive/5" : ""
                  }`}
                >
                  <Checkbox
                    id={`scope-${s.key}`}
                    checked={active}
                    onCheckedChange={() => toggle(s.key)}
                    className="mt-0.5"
                  />
                  <Label htmlFor={`scope-${s.key}`} className="cursor-pointer">
                    <span className="font-medium">{s.label}</span>
                    <span className="ml-2 font-mono text-[11px] text-muted-foreground">{s.key}</span>
                    <p className="mt-0.5 text-muted-foreground">{s.description}</p>
                  </Label>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label htmlFor="older-than" className="text-xs">
              Apagar somente registros anteriores a (opcional)
            </Label>
            <Input
              id="older-than"
              type="datetime-local"
              value={olderThan}
              onChange={(e) => setOlderThan(e.target.value)}
              className="mt-1"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Deixe vazio para apagar <strong>todos</strong> os registros dos escopos selecionados.
            </p>
          </div>
          <div className="flex items-end">
            <Button
              variant="destructive"
              disabled={selected.size === 0 || mut.isPending}
              onClick={() => setConfirmOpen(true)}
              className="w-full"
            >
              {mut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Limpar logs selecionados
            </Button>
          </div>
        </div>

        {lastResults && (
          <div className="rounded border">
            <div className="border-b px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Última execução
            </div>
            <ul className="divide-y">
              {lastResults.map((r) => (
                <li key={r.scope} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                  <span className="font-mono">{r.scope}</span>
                  {r.ok ? (
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      {r.deleted.toLocaleString("pt-BR")} removido(s)
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="mr-1 h-3 w-3" /> {r.error ?? "falha"}
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Confirmar limpeza permanente</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Você vai apagar registros dos escopos: <strong>{scopeLabels}</strong>
                  {olderThan ? (
                    <>
                      {" "}
                      criados antes de <strong>{new Date(olderThan).toLocaleString("pt-BR")}</strong>.
                    </>
                  ) : (
                    <>
                      . <strong>Todos</strong> os registros dessas tabelas serão apagados.
                    </>
                  )}
                </p>
                <p>Esta ação é irreversível.</p>
                <p>
                  Para confirmar, digite <code className="rounded bg-muted px-1 font-semibold">LIMPAR</code>:
                </p>
                <Input
                  autoFocus
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="LIMPAR"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={!canConfirm}
              onClick={(e) => {
                e.preventDefault();
                mut.mutate();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {mut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Confirmar e apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
