import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMyAccount } from "@/lib/account.functions";
import { createSubscriptionCheckout } from "@/lib/mercadopago-subscription.functions";
import { getActivePlanById } from "@/lib/plans.functions";
import { PRICE_LABEL, daysRemaining } from "@/lib/paywall";
import { Loader2, Check, ArrowRight, CheckCircle2, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";

type MpStatus = "success" | "pending" | "failure" | null;

export const Route = createFileRoute("/assinar")({
  head: () => ({
    meta: [
      { title: "Assinar — PreçoCerto" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { status?: MpStatus; planId?: string } => {
    const raw = typeof s.status === "string" ? s.status : null;
    const status: MpStatus =
      raw === "success" || raw === "pending" || raw === "failure" ? raw : null;
    const planId = typeof s.planId === "string" && s.planId ? s.planId : undefined;
    return { status, planId };
  },
  component: AssinarPage,
});

const fmtBRL = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

function AssinarPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { status: mpStatus, planId } = Route.useSearch();
  const fetchAccount = useServerFn(getMyAccount);
  const createCheckout = useServerFn(createSubscriptionCheckout);
  const fetchPlan = useServerFn(getActivePlanById);
  const [loading, setLoading] = useState(false);

  const sessionQuery = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => (await supabase.auth.getSession()).data.session ?? null,
    staleTime: 30_000,
  });
  const hasSession = !!sessionQuery.data;

  const planQuery = useQuery({
    queryKey: ["active-plan", planId ?? "default"],
    queryFn: () => (planId ? fetchPlan({ data: { id: planId } }) : Promise.resolve(null)),
    enabled: !!planId,
    staleTime: 60_000,
  });
  const selectedPlan = planQuery.data ?? null;

  const [waitingWebhook, setWaitingWebhook] = useState(false);
  const accountQuery = useQuery({
    queryKey: ["my-account"],
    queryFn: () => fetchAccount(),
    enabled: hasSession,
    refetchInterval: waitingWebhook ? 3_000 : false,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (sessionQuery.isPending) return;
    if (!hasSession) {
      navigate({
        to: "/login",
        search: planId ? ({ redirect: `/assinar?planId=${planId}` } as never) : undefined,
        replace: true,
      });
    }
  }, [sessionQuery.isPending, hasSession, navigate, planId]);

  useEffect(() => {
    if (mpStatus !== "success") return;
    if (!hasSession) return;
    if (accountQuery.data?.status === "active") return;
    setWaitingWebhook(true);
    const t = setTimeout(() => setWaitingWebhook(false), 90_000);
    return () => clearTimeout(t);
  }, [mpStatus, hasSession, accountQuery.data?.status]);

  // planId inválido/inexistente → mensagem e redirect para /planos
  useEffect(() => {
    if (!planId) return;
    if (planQuery.isPending) return;
    if (planQuery.data == null) {
      toast.error("Plano não encontrado ou indisponível.");
      navigate({ to: "/planos", replace: true });
    }
  }, [planId, planQuery.isPending, planQuery.data, navigate]);

  useEffect(() => {
    if (!waitingWebhook) return;
    if (accountQuery.data?.status === "active") {
      setWaitingWebhook(false);
      toast.success("Assinatura ativada! Bem-vindo de volta.");
    }
  }, [waitingWebhook, accountQuery.data?.status]);

  const acc = accountQuery.data;
  const isActive = acc?.status === "active";
  const isExpired = acc?.status === "expired";
  const trialLeft = daysRemaining(acc?.trialEndsAt);

  const planPriceLabel = selectedPlan
    ? `${fmtBRL(selectedPlan.price)}${selectedPlan.days ? ` · ${selectedPlan.days} dias` : ""}`
    : PRICE_LABEL;
  const planTitle = selectedPlan?.name ?? "Assinatura mensal";
  const planFeatures = selectedPlan?.features?.length
    ? selectedPlan.features
    : [
        "Comparador de preços entre mercados",
        "Lista de compras com melhor preço automático",
        "Alertas de queda de preço nos favoritos",
        "Acesso ao catálogo completo de produtos",
        "Cancele quando quiser — sem multa",
      ];

  const banner = useMemo(() => {
    if (mpStatus === "success" && waitingWebhook) {
      return {
        icon: <Loader2 className="h-5 w-5 animate-spin text-primary" />,
        title: "Confirmando pagamento com o Mercado Pago…",
        body:
          "Pode levar até 1 minuto. Deixe esta aba aberta — a página avisa quando a assinatura ficar ativa.",
        tone: "info" as const,
      };
    }
    if (mpStatus === "success" && isActive) {
      return {
        icon: <CheckCircle2 className="h-5 w-5 text-savings" />,
        title: "Pagamento confirmado!",
        body: "Sua assinatura está ativa. Aproveite todas as funcionalidades.",
        tone: "success" as const,
      };
    }
    if (mpStatus === "success" && !waitingWebhook && !isActive) {
      return {
        icon: <Clock className="h-5 w-5 text-primary" />,
        title: "Pagamento recebido — aguardando confirmação",
        body:
          "O Mercado Pago ainda não notificou a ativação. Se o valor foi debitado, aguarde alguns minutos e clique em ‘Verificar agora’.",
        tone: "info" as const,
      };
    }
    if (mpStatus === "pending") {
      return {
        icon: <Clock className="h-5 w-5 text-primary" />,
        title: "Pagamento em análise",
        body:
          "Assim que o Mercado Pago aprovar (boleto/pix), sua assinatura é ativada automaticamente.",
        tone: "info" as const,
      };
    }
    if (mpStatus === "failure") {
      return {
        icon: <XCircle className="h-5 w-5 text-destructive" />,
        title: "Pagamento não concluído",
        body: "Nenhum valor foi cobrado. Você pode tentar novamente quando quiser.",
        tone: "error" as const,
      };
    }
    return null;
  }, [mpStatus, waitingWebhook, isActive]);

  async function handleSubscribe() {
    if (loading) return;
    setLoading(true);
    try {
      const { url } = await createCheckout({ data: { planId: planId ?? null } });
      window.location.assign(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao iniciar pagamento";
      toast.error(msg);
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        {planTitle}
      </p>
      <h1 className="mt-2 font-display text-4xl leading-tight text-foreground md:text-5xl">
        {isActive
          ? "Sua assinatura está ativa"
          : isExpired
            ? "Seu período grátis chegou ao fim"
            : `Faltam ${trialLeft} ${trialLeft === 1 ? "dia" : "dias"} do seu teste grátis`}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Ative agora e continue vendo os melhores preços de Feijó por{" "}
        <strong className="text-foreground">{planPriceLabel}</strong>. Sem fidelidade.
      </p>

      {banner && (
        <div
          role="status"
          aria-live="polite"
          className={`mt-6 flex items-start gap-3 rounded-2xl border p-4 text-sm ${
            banner.tone === "success"
              ? "border-savings/30 bg-savings/10 text-foreground"
              : banner.tone === "error"
                ? "border-destructive/30 bg-destructive/10 text-foreground"
                : "border-primary/30 bg-primary/5 text-foreground"
          }`}
        >
          <span className="mt-0.5 flex-none">{banner.icon}</span>
          <div className="min-w-0">
            <p className="font-medium">{banner.title}</p>
            <p className="mt-0.5 text-muted-foreground">{banner.body}</p>
            {mpStatus === "success" && !isActive && (
              <button
                type="button"
                onClick={() => {
                  setWaitingWebhook(true);
                  qc.invalidateQueries({ queryKey: ["my-account"] });
                  setTimeout(() => setWaitingWebhook(false), 30_000);
                }}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-background px-3 py-1 text-xs font-medium text-primary hover:bg-primary/5"
              >
                <Loader2
                  className={`h-3 w-3 ${waitingWebhook ? "animate-spin" : ""}`}
                />
                Verificar agora
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mt-10 rounded-3xl border border-border bg-card p-8 shadow-sm">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-5xl font-bold text-foreground">
            {selectedPlan ? fmtBRL(selectedPlan.price) : "R$ 19,90"}
          </span>
          <span className="text-sm text-muted-foreground">
            {selectedPlan
              ? selectedPlan.days
                ? `/${selectedPlan.days} dias`
                : ""
              : "/mês"}
          </span>
        </div>
        {selectedPlan?.description && (
          <p className="mt-2 text-sm text-muted-foreground">{selectedPlan.description}</p>
        )}
        <ul className="mt-6 space-y-2 text-sm text-foreground">
          {planFeatures.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 flex-none text-savings" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        {isActive ? (
          <div className="mt-8 space-y-3">
            <div className="flex items-center justify-center gap-2 rounded-xl border border-savings/30 bg-savings/10 py-3 text-sm font-medium text-foreground">
              <CheckCircle2 className="h-4 w-4 text-savings" />
              Assinatura ativa
              {acc?.paidUntil && (
                <span className="text-muted-foreground">
                  · até{" "}
                  {new Date(acc.paidUntil).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => navigate({ to: "/app" })}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground transition"
            >
              Ir para o app <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSubscribe}
            disabled={loading || waitingWebhook || (!!planId && planQuery.isPending)}
            className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground transition disabled:opacity-60"
          >
            {loading || waitingWebhook ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Assinar por {planPriceLabel} <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        )}
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Pagamento seguro processado pelo Mercado Pago. A ativação é
          automática após a confirmação do pagamento.
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between text-sm">
        <Link to="/planos" className="text-muted-foreground hover:text-foreground">
          ← Ver todos os planos
        </Link>
        <Link to="/" className="text-muted-foreground hover:text-foreground">
          Voltar para o site
        </Link>
      </div>
    </div>
  );
}
