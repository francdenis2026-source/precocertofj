import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PriceCents } from "@/components/ds/PriceCents";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/brand/AppShell";
import { PageHeader, EmptyState, LoadingSkeleton } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Clock,
  Copy,
  Mail,
  MailCheck,
  MailWarning,
  Receipt,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { listMyOrders, type MyOrder } from "@/lib/email-retry.functions";

export const Route = createFileRoute("/meus-pedidos")({
  head: () => ({
    meta: [
      { title: "Meus pedidos — PreçoCerto" },
      {
        name: "description",
        content:
          "Acompanhe o status do pagamento, aprovação e envio do código de ativação de cada compra.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MeusPedidos,
});

function statusPill(status: string) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    pending: {
      label: "Aguardando pagamento",
      cls: "border-amber-500/40 bg-amber-500/10 text-amber-800",
      icon: <Clock className="h-3.5 w-3.5" />,
    },
    approved: {
      label: "Pago e aprovado",
      cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-800",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
    failed: {
      label: "Pagamento recusado",
      cls: "border-destructive/40 bg-destructive/10 text-destructive",
      icon: <XCircle className="h-3.5 w-3.5" />,
    },
    cancelled: {
      label: "Cancelado",
      cls: "border-border bg-muted text-muted-foreground",
      icon: <XCircle className="h-3.5 w-3.5" />,
    },
  };
  const m = map[status] ?? {
    label: status,
    cls: "border-border bg-muted text-muted-foreground",
    icon: <Clock className="h-3.5 w-3.5" />,
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${m.cls}`}
    >
      {m.icon}
      {m.label}
    </span>
  );
}

function emailPill(delivery: MyOrder["email_delivery"]) {
  if (delivery === "sent")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
        <MailCheck className="h-3.5 w-3.5" /> Código enviado
      </span>
    );
  if (delivery === "pending")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Reenvio em andamento
      </span>
    );
  if (delivery === "failed")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive">
        <MailWarning className="h-3.5 w-3.5" /> Falha no envio — contate o suporte
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Mail className="h-3.5 w-3.5" /> —
    </span>
  );
}

function MeusPedidos() {
  const navigate = useNavigate();
  const fetchOrders = useServerFn(listMyOrders);

  const sessionQuery = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => (await supabase.auth.getSession()).data.session,
  });
  const hasSession = !!sessionQuery.data;

  useEffect(() => {
    if (sessionQuery.isPending) return;
    if (!hasSession) navigate({ to: "/login", search: { redirect: "/meus-pedidos" } as never });
  }, [sessionQuery.isPending, hasSession, navigate]);

  const ordersQ = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => fetchOrders(),
    enabled: hasSession,
    refetchInterval: 15000,
  });

  const orders = ordersQ.data ?? [];

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl px-4 md:px-6">
        <PageHeader
          breadcrumbs={[{ label: "Início", to: "/app" }, { label: "Meus pedidos" }]}
          title="Meus pedidos"
          description="Status de pagamento, aprovação e entrega do código de ativação."
          actions={
            <Button
              size="sm"
              variant="outline"
              onClick={() => ordersQ.refetch()}
              disabled={ordersQ.isFetching}
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${ordersQ.isFetching ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          }
        />

        <div className="space-y-3 pb-8">
          {ordersQ.isLoading ? (
            <LoadingSkeleton rows={4} />
          ) : orders.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Você ainda não tem pedidos"
              description="Assine um plano para começar a acompanhar seus códigos de ativação."
              action={
                <Button asChild size="sm" variant="executive">
                  <Link to="/planos">Ver planos</Link>
                </Button>
              }
            />
          ) : (
          orders.map((o) => (
            <Card key={o.id}>
              <CardHeader className="flex-row items-start justify-between space-y-0 gap-3 pb-3">
                <div>
                  <CardTitle className="text-base font-semibold">
                    {o.plan_name ?? "Plano PreçoCerto"}
                  </CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {o.plan_days ? `${o.plan_days} dias · ` : ""}
                    <PriceCents cents={o.final_cents} size="xs" tone="muted" zeroWhenEmpty /> · pedido{" "}
                    <span className="font-mono">{o.id.slice(0, 8)}</span>
                  </p>
                </div>
                {statusPill(o.status)}
              </CardHeader>
              <CardContent className="space-y-3 pt-0 text-sm">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Criado em
                    </div>
                    <div className="text-sm text-foreground">
                      {new Date(o.created_at).toLocaleString("pt-BR")}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Aprovado em
                    </div>
                    <div className="text-sm text-foreground">
                      {o.approved_at ? new Date(o.approved_at).toLocaleString("pt-BR") : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      E-mail de entrega
                    </div>
                    <div className="truncate text-sm text-foreground">{o.delivery_email ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Entrega do código
                    </div>
                    <div>{emailPill(o.email_delivery)}</div>
                  </div>
                </div>

                {o.status === "approved" && o.license_code && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                    <div className="text-[11px] uppercase tracking-wide text-emerald-800">
                      Código de ativação
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <code className="font-mono text-base font-semibold tracking-tight text-emerald-900">
                        {o.license_code}
                      </code>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost-navy"
                          onClick={() => {
                            navigator.clipboard.writeText(o.license_code!);
                            toast.success("Código copiado");
                          }}
                        >
                          <Copy className="mr-1 h-3.5 w-3.5" /> Copiar
                        </Button>
                        <Button asChild size="sm" variant="executive">
                          <Link to="/resgatar">Resgatar</Link>
                        </Button>
                      </div>
                    </div>
                    {o.license_expires_at && (
                      <p className="mt-1.5 text-[11px] text-muted-foreground">
                        Válido até {new Date(o.license_expires_at).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>
                )}

                {o.status === "approved" && o.email_delivery === "failed" && (
                  <p className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                    Não conseguimos entregar o código no e-mail informado após várias tentativas.
                    Ele está disponível acima — use-o em <Link to="/resgatar" className="underline">/resgatar</Link>
                    {" "}ou entre em contato pelo suporte.
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
        </div>
      </div>
    </AppShell>
  );
}
