import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMyAccount } from "@/lib/account.functions";
import { listMyReceipts } from "@/lib/receipts.functions";
import {
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  ShieldCheck,
  Ban,
  Calendar,
  Receipt,
  Download,
} from "lucide-react";

type MpStatus = "success" | "pending" | "failure" | null;

export const Route = createFileRoute("/assinatura")({
  head: () => ({
    meta: [
      { title: "Status da assinatura — PreçoCerto" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { status?: MpStatus } => {
    const raw = typeof s.status === "string" ? s.status : null;
    const status: MpStatus =
      raw === "success" || raw === "pending" || raw === "failure" ? raw : null;
    return { status };
  },
  component: SubscriptionStatusPage,
});

function SubscriptionStatusPage() {
  const navigate = useNavigate();
  const { status } = Route.useSearch();
  const fetchAccount = useServerFn(getMyAccount);

  const sessionQuery = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => (await supabase.auth.getSession()).data.session ?? null,
    staleTime: 30_000,
  });
  const hasSession = !!sessionQuery.data;

  useEffect(() => {
    if (sessionQuery.isPending) return;
    if (!hasSession) {
      navigate({ to: "/login", replace: true });
    }
  }, [sessionQuery.isPending, hasSession, navigate]);

  const accountQuery = useQuery({
    queryKey: ["my-account"],
    queryFn: () => fetchAccount(),
    enabled: hasSession,
    refetchInterval: status === "success" ? 4_000 : false,
  });

  const fetchReceipts = useServerFn(listMyReceipts);
  const receiptsQuery = useQuery({
    queryKey: ["my-receipts"],
    queryFn: () => fetchReceipts(),
    enabled: hasSession,
    refetchInterval: status === "success" ? 4_000 : false,
  });
  const receipts = receiptsQuery.data ?? [];

  const acc = accountQuery.data;
  const isActive = acc?.status === "active";

  const header = (() => {
    if (status === "failure") {
      return {
        icon: <XCircle className="h-6 w-6 text-destructive" />,
        title: "Pagamento não concluído",
        body: "Nenhum valor foi cobrado. Você pode tentar novamente quando quiser.",
        tone: "error" as const,
      };
    }
    if (status === "pending") {
      return {
        icon: <Clock className="h-6 w-6 text-primary" />,
        title: "Pagamento em análise",
        body: "Assim que o Mercado Pago aprovar (boleto/pix), sua assinatura é ativada automaticamente.",
        tone: "info" as const,
      };
    }
    if (status === "success" && !isActive) {
      return {
        icon: <Clock className="h-6 w-6 text-primary" />,
        title: "Confirmando pagamento…",
        body: "Pode levar até 1 minuto. Deixe esta aba aberta — atualiza sozinha.",
        tone: "info" as const,
      };
    }
    if (isActive) {
      return {
        icon: <CheckCircle2 className="h-6 w-6 text-savings" />,
        title: "Sua assinatura está ativa",
        body: acc?.paidUntil
          ? `Válida até ${new Date(acc.paidUntil).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}.`
          : "Aproveite todos os recursos do PreçoCerto.",
        tone: "success" as const,
      };
    }
    return {
      icon: <Calendar className="h-6 w-6 text-primary" />,
      title: "Status da sua assinatura",
      body: "Acompanhe abaixo o que está ativo em sua conta.",
      tone: "info" as const,
    };
  })();

  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <div
        className={`flex items-start gap-4 rounded-3xl border p-5 ${
          header.tone === "success"
            ? "border-savings/30 bg-savings/10"
            : header.tone === "error"
              ? "border-destructive/30 bg-destructive/10"
              : "border-primary/30 bg-primary/5"
        }`}
      >
        <span className="mt-0.5 flex-none">{header.icon}</span>
        <div>
          <h1 className="font-display text-2xl leading-tight text-foreground">
            {header.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{header.body}</p>
        </div>
      </div>

      <div className="mt-8 space-y-6 rounded-3xl border border-border bg-card p-6">
        <section>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            O que está incluso
          </h2>
          <ul className="mt-3 space-y-1.5 text-sm text-foreground">
            <li>• Comparador de preços entre mercados</li>
            <li>• Lista de compras com melhor preço automático</li>
            <li>• Alertas de queda de preço nos favoritos</li>
            <li>• Assistente IA de cesta</li>
          </ul>
        </section>

        {receipts.length > 0 && (
          <section>
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <Receipt className="h-4 w-4 text-primary" />
              Comprovantes
            </h2>
            <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
              {receipts.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {r.planName ?? "Assinatura PreçoCerto"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(r.paidAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                      {r.amount != null && (
                        <>
                          {" · "}
                          <span className="font-semibold tabular-nums text-foreground">
                            {r.amount.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: r.currency || "BRL",
                            })}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <Link
                    to="/comprovante/$id"
                    params={{ id: r.id }}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-xs font-semibold text-foreground hover:bg-muted"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Comprovante
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Ban className="h-4 w-4 text-primary" />
            Cancelamento
          </h2>
          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            <p>
              Não há renovação automática — o PreçoCerto é{" "}
              <strong className="text-foreground">pagamento único</strong>{" "}
              por período (mensal, semestral ou anual). Não há multa nem
              débito recorrente.
            </p>
            <p>
              Se você{" "}
              <strong className="text-foreground">
                não renovar quando o período terminar
              </strong>
              , seu acesso premium é desativado automaticamente e sua conta
              volta para o modo gratuito, preservando todo o histórico e
              cestas salvas.
            </p>
            <p>
              Quer parar antes do fim? Basta não renovar — nenhum novo valor
              será cobrado.
            </p>
          </div>
        </section>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={() => navigate({ to: "/app" })}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground"
          >
            Ir para o app <ArrowRight className="h-4 w-4" />
          </button>
          <Link
            to="/planos"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-4 text-sm text-foreground hover:bg-muted"
          >
            Ver todos os planos
          </Link>
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-muted-foreground">
        <Link to="/perfil" className="hover:text-foreground">
          Gerenciar minha conta →
        </Link>
      </div>
    </div>
  );
}
