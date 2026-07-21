import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { getMyAccount } from "@/lib/account.functions";
import { daysRemaining } from "@/lib/paywall";
import { CheckCircle2, Clock, Sparkles, ArrowRight, Loader2 } from "lucide-react";

/**
 * Card exibido no perfil do usuário com o status da assinatura/trial,
 * data de renovação e CTA para renovar/atualizar plano.
 */
export function SubscriptionStatusCard() {
  const fetchAccount = useServerFn(getMyAccount);
  const { data: acc, isLoading } = useQuery({
    queryKey: ["my-account"],
    queryFn: () => fetchAccount(),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 flex items-center gap-3">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Carregando assinatura…</span>
      </div>
    );
  }
  if (!acc) return null;

  const paidUntilLabel = acc.paidUntil
    ? new Date(acc.paidUntil).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  if (acc.status === "active") {
    const daysLeft = daysRemaining(acc.paidUntil);
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">
              Assinatura ativa
            </p>
            <p className="font-display text-xl text-foreground mt-1">
              Você tem acesso premium
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Renova em <strong className="text-foreground">{paidUntilLabel}</strong>
              {daysLeft > 0 && (
                <> — <span className="text-foreground">{daysLeft} {daysLeft === 1 ? "dia" : "dias"}</span> restantes</>
              )}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to="/comprar-licenca"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium hover:bg-muted"
          >
            Adicionar mais tempo <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    );
  }

  if (acc.status === "trial") {
    const trialLeft = daysRemaining(acc.trialEndsAt);
    const trialLabel = acc.trialEndsAt
      ? new Date(acc.trialEndsAt).toLocaleDateString("pt-BR", {
          day: "2-digit", month: "long", year: "numeric",
        })
      : null;
    return (
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary/15 text-primary">
            <Clock className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wider text-primary font-semibold">
              Período grátis
            </p>
            <p className="font-display text-xl text-foreground mt-1">
              {trialLeft} {trialLeft === 1 ? "dia" : "dias"} de teste restantes
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Seu trial termina em <strong className="text-foreground">{trialLabel}</strong>.
              Assine antes para continuar sem interrupção.
            </p>
          </div>
        </div>
        <div className="mt-4">
          <Link
            to="/comprar-licenca"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Ver planos e assinar
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    );
  }

  // expired
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-full bg-destructive/15 text-destructive">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wider text-destructive font-semibold">
            Sem plano ativo
          </p>
          <p className="font-display text-xl text-foreground mt-1">
            Ative sua assinatura
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Seu período grátis terminou. Assine para voltar a usar assistente IA,
            alertas de preço e cesta ilimitada.
          </p>
        </div>
      </div>
      <div className="mt-4">
        <Link
          to="/comprar-licenca"
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Ver planos
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
