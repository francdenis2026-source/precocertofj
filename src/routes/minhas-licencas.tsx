import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/brand/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, Send, Ticket, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { listMyLicenses, requestMyLicenseResend } from "@/lib/licenses.functions";

export const Route = createFileRoute("/minhas-licencas")({
  head: () => ({
    meta: [
      { title: "Minhas licenças — PreçoCerto" },
      { name: "description", content: "Veja e gerencie seus códigos de licença ativos, expirações e planos contratados." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MinhasLicencas,
});

function brl(cents: number | null | undefined) {
  return ((cents ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    paid: "Disponível", redeemed: "Ativa", pending: "Aguardando pgto.",
    revoked: "Revogada", expired: "Expirada",
  };
  return map[s] ?? s;
}

function MinhasLicencas() {
  const navigate = useNavigate();
  const fetchList = useServerFn(listMyLicenses);
  const resendFn = useServerFn(requestMyLicenseResend);
  const qc = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => (await supabase.auth.getSession()).data.session,
  });
  const hasSession = !!sessionQuery.data;

  useEffect(() => {
    if (sessionQuery.isPending) return;
    if (!hasSession) navigate({ to: "/login", search: { redirect: "/minhas-licencas" } as any });
  }, [sessionQuery.isPending, hasSession, navigate]);

  const { data: list, isLoading } = useQuery({
    queryKey: ["my-licenses"],
    queryFn: () => fetchList(),
    enabled: hasSession,
  });

  const resend = useMutation({
    mutationFn: async (licenseId: string) => resendFn({ data: { licenseId } }),
    onSuccess: (r) => {
      toast.success(`Código enviado: ${r.code}`, { duration: 15000 });
      qc.invalidateQueries({ queryKey: ["my-licenses"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao solicitar"),
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Minhas licenças</h1>
            <p className="text-sm text-muted-foreground">
              Códigos que você comprou ou resgatou, plano contratado e validade.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/resgatar">
              <Ticket className="w-4 h-4 mr-1.5" /> Resgatar código
            </Link>
          </Button>
        </header>

        {isLoading ? (
          <div className="text-center py-16"><Loader2 className="w-6 h-6 animate-spin inline text-muted-foreground" /></div>
        ) : (list ?? []).length === 0 ? (
          <Card className="p-10 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Ticket className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="font-medium">Você ainda não tem licenças</div>
            <p className="text-sm text-muted-foreground">
              Ao comprar ou resgatar um plano, seu histórico aparece aqui.
            </p>
            <Button asChild size="sm" className="mt-2">
              <Link to="/resgatar">
                Tenho um código <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </Card>
        ) : (
          <div className="grid gap-3">
            {(list ?? []).map((l) => {
              const expDate = new Date(l.expires_at);
              const active = l.status === "redeemed" && expDate.getTime() > Date.now();
              const available = l.status === "paid";
              return (
                <Card key={l.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{l.code}</span>
                        <Badge variant={active || available ? "default" : "secondary"}>
                          {statusLabel(l.status)}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Plano: <span className="font-medium text-foreground">{l.plan_name ?? "—"}</span>
                        {l.plan_days ? ` · ${l.plan_days} dias` : ""} · {brl(l.price_cents)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {active ? "Válida até " : "Expira em "}
                        <span className="font-medium text-foreground">
                          {expDate.toLocaleDateString("pt-BR")}
                        </span>
                        {l.redeemed_at && (
                          <> · Resgatada em {new Date(l.redeemed_at).toLocaleDateString("pt-BR")}</>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => {
                        navigator.clipboard.writeText(l.code);
                        toast.success("Código copiado");
                      }}>
                        <Copy className="w-3.5 h-3.5 mr-1.5" /> Copiar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={resend.isPending}
                        onClick={() => resend.mutate(l.id)}
                        title="Receber o código por notificação"
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5" /> Reenviar
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
