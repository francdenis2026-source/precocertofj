import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/brand/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, History } from "lucide-react";
import { listBasketAudit, type BasketAuditEntry } from "@/lib/basket-audit.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin_/cesta-auditoria")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Auditoria da Cesta Básica — Admin" },
      { name: "description", content: "Histórico de alterações na Cesta Básica: versões, ativações e edição de itens." },
    ],
  }),
  component: BasketAuditPage,
});

const ACTION_OPTIONS: Array<{ value: string; label: string; tone: string }> = [
  { value: "all", label: "Todas as ações", tone: "muted" },
  { value: "basket_set.create", label: "Criação de versão", tone: "info" },
  { value: "basket_set.activate", label: "Ativação de versão", tone: "success" },
  { value: "basket_set.delete", label: "Exclusão de versão", tone: "danger" },
  { value: "basket_item.update", label: "Edição de item", tone: "warn" },
];

function toneClass(tone: string) {
  switch (tone) {
    case "success": return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    case "danger": return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
    case "warn": return "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30";
    case "info": return "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" });
}

function actionLabel(action: string) {
  return ACTION_OPTIONS.find((o) => o.value === action)?.label ?? action;
}

function actionTone(action: string) {
  return ACTION_OPTIONS.find((o) => o.value === action)?.tone ?? "muted";
}

function BasketAuditPage() {
  const listFn = useServerFn(listBasketAudit);
  const [action, setAction] = useState<string>("all");

  const filters = useMemo(
    () => ({ action: action === "all" ? null : action, limit: 200 }),
    [action],
  );

  const query = useQuery<BasketAuditEntry[]>({
    queryKey: ["basket-audit", filters],
    queryFn: () => listFn({ data: filters }),
    staleTime: 15_000,
  });

  return (
    <AppShell scope="admin">
      <section className="mx-auto max-w-6xl space-y-4 p-3 md:p-4">

        <header className="space-y-1">
          <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <History className="h-5 w-5 text-gold-ink" aria-hidden /> Auditoria da Cesta Básica
          </h1>
          <p className="text-sm text-muted-foreground">
            Histórico de criações, ativações e edições dos itens da cesta. Somente admins.
          </p>
        </header>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">Registros recentes</CardTitle>
                <CardDescription className="text-xs">
                  {query.data?.length ?? 0} evento(s){query.isFetching ? " · atualizando…" : ""}
                </CardDescription>
              </div>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger className="h-8 w-[220px] text-xs" aria-label="Filtrar por ação">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {query.isLoading ? (
              <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
              </div>
            ) : query.isError ? (
              <p className="p-4 text-sm text-destructive">Falha ao carregar auditoria.</p>
            ) : !query.data || query.data.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                Nenhum registro para o filtro atual.
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {query.data.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-start gap-3 p-3 hover:bg-muted/30">
                    <Badge variant="outline" className={cn("shrink-0 text-[12.5px] uppercase", toneClass(actionTone(r.action)))}>
                      {actionLabel(r.action)}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {r.adminEmail ?? r.adminUserId.slice(0, 8) + "…"}
                      </p>
                      <p className="text-[12.5px] text-muted-foreground">
                        {formatDate(r.createdAt)}
                        {r.targetId ? ` · alvo ${r.targetId.slice(0, 8)}…` : ""}
                        {r.notes ? ` · ${r.notes}` : ""}
                      </p>
                      {(r.before || r.after) && (
                        <details className="mt-1.5">
                          <summary className="cursor-pointer text-[12.5px] text-muted-foreground hover:text-foreground">
                            Ver diff (before/after)
                          </summary>
                          <div className="mt-1 grid gap-2 sm:grid-cols-2">
                            <pre className="max-h-40 overflow-auto rounded border border-border/50 bg-muted/40 p-2 text-[12.5px]">
                              {JSON.stringify(r.before ?? null, null, 2)}
                            </pre>
                            <pre className="max-h-40 overflow-auto rounded border border-border/50 bg-muted/40 p-2 text-[12.5px]">
                              {JSON.stringify(r.after ?? null, null, 2)}
                            </pre>
                          </div>
                        </details>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
