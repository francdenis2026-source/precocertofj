import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Check, Sparkles, PackageOpen, ArrowRight, ShieldCheck, RefreshCw, CreditCard, Ban } from "lucide-react";
import { AppShell } from "@/components/brand/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listActivePlans, type PlanRow, type BillingCycle } from "@/lib/plans.functions";

const plansQuery = queryOptions({
  queryKey: ["public-plans-active"],
  queryFn: () => listActivePlans(),
  staleTime: 60_000,
});

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: "Planos e preços — PreçoCerto" },
      {
        name: "description",
        content:
          "Conheça os planos do PreçoCerto e escolha o que melhor se encaixa no seu ritmo de compras. Cancele quando quiser.",
      },
      { property: "og:title", content: "Planos e preços — PreçoCerto" },
      {
        property: "og:description",
        content: "Escolha o plano ideal para economizar no supermercado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(plansQuery),
  component: PlanosPage,
  errorComponent: ({ error }) => (
    <AppShell>
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-serif text-2xl">Não foi possível carregar os planos</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      </div>
    </AppShell>
  ),
});

const CYCLE_LABEL: Record<BillingCycle, string> = {
  trial: "grátis",
  monthly: "/mês",
  semester: "/semestre",
  yearly: "/ano",
};

const fmtBRL = (v: number) =>
  v === 0 ? "Grátis" : `R$ ${v.toFixed(2).replace(".", ",")}`;

function PlanosPage() {
  const { data: plans } = useSuspenseQuery(plansQuery);

  return (
    <AppShell>
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <header className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-4 gap-1">
            <Sparkles className="h-3 w-3" /> Planos e preços
          </Badge>
          <h1 className="font-serif text-3xl sm:text-4xl">
            Escolha o plano que combina com você
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Comece grátis e evolua quando quiser. Sem multa, sem letras miúdas.
          </p>
        </header>

        {plans.length === 0 ? (
          <EmptyPlans />
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((p) => (
              <PlanCard key={p.id} plan={p} />
            ))}
          </div>
        )}

        <p className="mx-auto mt-10 max-w-xl text-center text-xs text-muted-foreground">
          Pagamento seguro processado pelo Mercado Pago. A ativação é automática
          após a confirmação do pagamento.
        </p>

        <BillingPolicies hasActivePlans={plans.length > 0} />
        <PlansFAQ />
      </section>
    </AppShell>
  );
}

function BillingPolicies({ hasActivePlans }: { hasActivePlans: boolean }) {
  const items = [
    {
      icon: <RefreshCw className="h-4 w-4" />,
      title: "Duração fixa por período",
      body:
        "Cada plano garante acesso premium pelo número de dias contratado (mensal 30, semestral 180, anual 365). Não há renovação automática — você decide quando renovar.",
    },
    {
      icon: <Ban className="h-4 w-4" />,
      title: "Cancelamento sem multa",
      body:
        "Como não há renovação automática, não existe rescisão. Basta não renovar quando o período terminar. Enquanto o prazo estiver ativo, você mantém todos os recursos.",
    },
    {
      icon: <CreditCard className="h-4 w-4" />,
      title: "Pagamento único por período",
      body:
        "Cobrança única no início de cada período via Mercado Pago (PIX ou cartão). Preços em BRL, com nota fiscal enviada por e-mail após a confirmação.",
    },
    {
      icon: <ShieldCheck className="h-4 w-4" />,
      title: "Se não houver planos ativos",
      body: hasActivePlans
        ? "Novos planos podem ser adicionados a qualquer momento. Assinantes atuais mantêm o prazo já pago."
        : "Nenhuma cobrança é feita e o acesso segue disponível como visitante ou período de teste. Assinaturas anteriores permanecem válidas até o vencimento.",
    },
  ];
  return (
    <section aria-label="Políticas de cobrança" className="mx-auto mt-14 max-w-4xl">
      <h2 className="text-center font-serif text-2xl">Políticas de cobrança</h2>
      <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground">
        Regras claras — sem letras miúdas.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {items.map((it) => (
          <Card key={it.title}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
                  {it.icon}
                </span>
                {it.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{it.body}</CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function PlansFAQ() {
  const faq: Array<{ q: string; a: string }> = [
    {
      q: "Como funciona o período grátis?",
      a: "Ao criar sua conta, você ganha o período de teste indicado no plano gratuito (quando disponível). Não pedimos cartão de crédito para iniciar o teste.",
    },
    {
      q: "Como cancelo minha assinatura?",
      a: "Não é necessário cancelar: como cada plano é um pagamento único por período, basta não renovar. Seu acesso continua ativo até a data final do plano contratado.",
    },
    {
      q: "Recebo reembolso se não usar?",
      a: "Como o acesso é liberado imediatamente após a confirmação do pagamento, não há reembolso automático. Em casos excepcionais (cobrança duplicada, falha de acesso), fale conosco pelo e-mail de suporte.",
    },
    {
      q: "Posso trocar de plano?",
      a: "Sim. Você pode contratar um novo plano a qualquer momento — o novo período soma-se ao saldo restante do plano atual.",
    },
    {
      q: "Quais formas de pagamento vocês aceitam?",
      a: "PIX e cartão de crédito, processados pelo Mercado Pago. A ativação é automática após a confirmação do pagamento.",
    },
    {
      q: "E se nenhum plano estiver ativo?",
      a: "Não conseguimos processar novas assinaturas até que planos sejam publicados novamente. Enquanto isso, o acesso público e o período de teste continuam funcionando normalmente.",
    },
  ];
  return (
    <section aria-label="Perguntas frequentes" className="mx-auto mt-14 max-w-3xl">
      <h2 className="text-center font-serif text-2xl">Perguntas frequentes</h2>
      <div className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card">
        {faq.map((f) => (
          <details key={f.q} className="group px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-foreground">
              <span>{f.q}</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Ainda com dúvidas? Escreva para{" "}
        <a href="mailto:economizafeijo@gmail.com" className="text-primary hover:underline">
          economizafeijo@gmail.com
        </a>
        .
      </p>
    </section>
  );
}

function EmptyPlans() {
  return (
    <Card className="mx-auto mt-10 max-w-xl border-dashed">
      <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
        <div className="rounded-2xl bg-muted p-4 text-muted-foreground">
          <PackageOpen className="h-8 w-8" />
        </div>
        <div>
          <h2 className="font-serif text-xl">
            Nenhum plano disponível no momento
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Estamos ajustando nossas ofertas. Volte em breve — em instantes teremos
            novidades para você.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/">Voltar para o início</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function PlanCard({ plan }: { plan: PlanRow }) {
  const highlight = plan.highlight;
  const hasDiscount =
    plan.original_price != null && plan.original_price > plan.price;

  return (
    <Card
      className={`relative flex flex-col overflow-hidden transition ${
        highlight
          ? "border-primary shadow-lg ring-1 ring-primary/40"
          : "hover:border-primary/40"
      }`}
    >
      {highlight && (
        <div className="absolute right-3 top-3">
          <Badge className="gap-1 bg-primary text-primary-foreground">
            <Sparkles className="h-3 w-3" /> Mais popular
          </Badge>
        </div>
      )}
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{plan.name}</CardTitle>
        {plan.description && (
          <CardDescription className="line-clamp-2">
            {plan.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div>
          {hasDiscount && (
            <p className="text-xs text-muted-foreground line-through">
              {fmtBRL(plan.original_price!)}
            </p>
          )}
          <div className="flex items-baseline gap-1">
            <span className="font-display text-3xl font-bold text-foreground">
              {fmtBRL(plan.price)}
            </span>
            {plan.price > 0 && (
              <span className="text-xs text-muted-foreground">
                {CYCLE_LABEL[plan.cycle]}
              </span>
            )}
          </div>
          {plan.days > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {plan.days} dias de acesso
            </p>
          )}
        </div>

        {plan.features.length > 0 && (
          <ul className="space-y-2 text-sm text-foreground">
            {plan.features.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 flex-none text-savings" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        )}

        <Button
          asChild
          className="mt-auto w-full gap-2"
          variant={highlight ? "default" : "outline"}
        >
          {plan.cycle === "trial" ? (
            <Link to="/cadastro">
              Começar grátis
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link to="/assinar" search={{ planId: plan.id }}>
              Assinar {plan.name}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
