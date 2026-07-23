import { createFileRoute, Link } from "@tanstack/react-router";
import { adminBeforeLoad } from "@/lib/route-guards";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  listMercadoPagoWebhookEvents,
  getMercadoPagoStatus,
} from "@/lib/mercadopago.functions";
import { adminResendActivationForWebhook } from "@/lib/email-retry.functions";
import { AppShell } from "@/components/brand/AppShell";
import { PageHeader } from "@/components/brand/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, RefreshCw, ShieldCheck, ShieldAlert, Search, Send } from "lucide-react";
import { toast } from "sonner";


export const Route = createFileRoute("/admin_/webhooks")({
  head: () => ({
    meta: [
      { title: "Webhooks Mercado Pago — Admin" },
      { name: "description", content: "Logs, assinaturas e status dos webhooks do Mercado Pago." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WebhooksPage,
});

type EventRow = Awaited<ReturnType<typeof listMercadoPagoWebhookEvents>>[number];

function statusBadge(status: string) {
  const cls =
    status === "processed"
      ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
      : status === "skipped" || status === "skipped_duplicate"
        ? "bg-muted text-muted-foreground border-border"
        : status === "failed"
          ? "bg-destructive/15 text-destructive border-destructive/30"
          : "bg-amber-500/15 text-amber-700 border-amber-500/30";
  return (
    <Badge variant="outline" className={cls}>
      {status}
    </Badge>
  );
}

function WebhooksPage() {
  const list = useServerFn(listMercadoPagoWebhookEvents);
  const status = useServerFn(getMercadoPagoStatus);
  const resendFn = useServerFn(adminResendActivationForWebhook);
  const qc = useQueryClient();
  const [selected, setSelected] = useState<EventRow | null>(null);
  const [filter, setFilter] = useState("");

  const statusQ = useQuery({
    queryKey: ["mp-status"],
    queryFn: () => status(),
  });

  const eventsQ = useQuery({
    queryKey: ["mp-webhooks"],
    queryFn: () => list({ data: { limit: 200 } }),
    refetchInterval: 15000,
  });

  const resend = useMutation({
    mutationFn: (webhookEventId: string) => resendFn({ data: { webhookEventId } }),
    onSuccess: (r) => {
      if (r.sent) toast.success(`Código reenviado para ${r.to}`);
      else toast.error(`Falha: ${r.error ?? "erro"} — enfileirado para retry`);
      qc.invalidateQueries({ queryKey: ["mp-webhooks"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao reenviar"),
  });


  const filtered = useMemo(() => {
    const rows = eventsQ.data ?? [];
    const f = filter.trim().toLowerCase();
    if (!f) return rows;
    return rows.filter(
      (r) =>
        r.event_type?.toLowerCase().includes(f) ||
        (r.external_id ?? "").toLowerCase().includes(f) ||
        (r.status ?? "").toLowerCase().includes(f) ||
        (r.error ?? "").toLowerCase().includes(f),
    );
  }, [eventsQ.data, filter]);

  const stats = useMemo(() => {
    const rows = eventsQ.data ?? [];
    return {
      total: rows.length,
      processed: rows.filter((r) => r.status === "processed").length,
      failed: rows.filter((r) => r.status === "failed").length,
      skipped: rows.filter((r) => (r.status ?? "").startsWith("skipped")).length,
    };
  }, [eventsQ.data]);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
        <PageHeader
          title="Webhooks Mercado Pago"
          description="Log detalhado das notificações recebidas, com status e validação de assinatura."
          breadcrumbs={[
            { label: "Admin", to: "/admin" },
            { label: "Webhooks MP" },
          ]}
          actions={
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                eventsQ.refetch();
                statusQ.refetch();
              }}
              disabled={eventsQ.isFetching}
            >
              {eventsQ.isFetching ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-4 w-4" />
              )}
              Atualizar
            </Button>
          }
        />

        <div className="grid gap-3 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
                Ambiente
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {statusQ.data?.tokenError ? (
                <span className="text-sm text-destructive">
                  <ShieldAlert className="mr-1 inline h-4 w-4" />
                  {statusQ.data.tokenError}
                </span>
              ) : statusQ.data?.env ? (
                <div className="flex items-center gap-2">
                  <Badge variant={statusQ.data.env === "prod" ? "default" : "outline"}>
                    {statusQ.data.env === "prod" ? "Produção" : "Sandbox"}
                  </Badge>
                  <span className="font-mono text-xs text-muted-foreground">
                    {statusQ.data.tokenMasked}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Carregando…</span>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
                Assinatura
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm">
              {statusQ.data?.webhookSecretConfigured ? (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <ShieldCheck className="h-4 w-4" /> Segredo configurado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-destructive">
                  <ShieldAlert className="h-4 w-4" /> MP_WEBHOOK_SECRET ausente
                </span>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
                Processados
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 font-serif text-2xl">
              {stats.processed}
              <span className="ml-1 text-xs text-muted-foreground">/ {stats.total}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
                Falhas / Ignorados
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 font-serif text-2xl">
              <span className="text-destructive">{stats.failed}</span>
              <span className="mx-1 text-muted-foreground">/</span>
              <span className="text-muted-foreground">{stats.skipped}</span>
            </CardContent>
          </Card>
        </div>

        {statusQ.data?.webhookUrl && (
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-2 p-3 text-xs">
              <div>
                <span className="text-muted-foreground">URL do webhook: </span>
                <code className="font-mono">{statusQ.data.webhookUrl}</code>
              </div>
              <Button
                size="sm"
                variant="ghost-navy"
                onClick={() => navigator.clipboard.writeText(statusQ.data!.webhookUrl!)}
              >
                Copiar
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Últimos eventos</CardTitle>
            <div className="relative w-64">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Filtrar por tipo, id, status…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Pagamento MP</TableHead>
                  <TableHead>Assinatura</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Erro</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventsQ.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      Nenhum evento registrado ainda.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.event_type}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {r.external_id ?? "—"}
                      </TableCell>
                      <TableCell>
                        {r.signature_valid ? (
                          <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>{statusBadge(r.status ?? "?")}</TableCell>
                      <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                        {(() => {
                          const es = (r as any).email_status as
                            | { email_error?: string; email_sent?: boolean }
                            | null;
                          if (es?.email_error) return `email: ${es.email_error}`;
                          return r.error ?? "—";
                        })()}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1.5">
                          {(() => {
                            const es = (r as any).email_status as
                              | { email_error?: string; email_sent?: boolean }
                              | null;
                            const hasEmailError = !!es?.email_error;
                            if (!hasEmailError) return null;
                            return (
                              <Button
                                size="sm"
                                variant="executive"
                                disabled={resend.isPending}
                                onClick={() => resend.mutate(r.id)}
                                title="Reenviar código para o mesmo pagamento"
                              >
                                <Send className="mr-1 h-3.5 w-3.5" /> Reenviar
                              </Button>
                            );
                          })()}
                          <Button size="sm" variant="ghost-navy" onClick={() => setSelected(r)}>
                            Ver
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))

                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground">
          <Link to="/admin" className="underline">
            ← Voltar ao painel
          </Link>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">
              Evento {selected?.event_type} · {selected?.external_id ?? "—"}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-muted-foreground">Status</div>
                  <div>{statusBadge(selected.status ?? "?")}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Assinatura</div>
                  <div>{selected.signature_valid ? "válida" : "inválida / ausente"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Tentativas</div>
                  <div>{selected.attempts ?? 0}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Último processamento</div>
                  <div>
                    {selected.last_processed_at
                      ? new Date(selected.last_processed_at).toLocaleString("pt-BR")
                      : "—"}
                  </div>
                </div>
              </div>
              {selected.error && (
                <div>
                  <div className="text-muted-foreground">Erro</div>
                  <div className="rounded border border-destructive/30 bg-destructive/10 p-2 text-destructive">
                    {selected.error}
                  </div>
                </div>
              )}
              <div>
                <div className="mb-1 text-muted-foreground">Payload</div>
                <pre className="max-h-72 overflow-auto rounded border bg-muted/40 p-2 font-mono text-[11px]">
                  {JSON.stringify(selected.payload, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
