import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listPublicPlans, createCheckoutOrder, type PublicPlan } from "@/lib/checkout.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, ShieldCheck, Ticket, ArrowRight, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: "Planos e preços — PreçoCerto Feijó" },
      { name: "description", content: "Escolha o plano ideal para acompanhar preços em Feijó/AC. Degustação grátis, mensal, trimestral, anual e Fundador vitalício." },
      { property: "og:title", content: "Planos e preços — PreçoCerto Feijó" },
      { property: "og:description", content: "Do teste grátis ao plano vitalício Fundador Feijó. Preços justos para o mercado local." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlansPage,
});

function centsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function pricePerMonth(cents: number, days: number): string | null {
  if (days < 60) return null;
  const months = days / 30;
  return centsToBRL(Math.round(cents / months));
}

function planHighlights(slug: string): string[] {
  switch (slug) {
    case "degustacao":
      return ["Acesso completo por 7 dias", "Sem cartão de crédito", "Cancelamento automático"];
    case "mensal":
      return ["Acesso completo", "Cancele quando quiser", "Ideal para testar"];
    case "trimestral":
      return ["3 meses de acesso", "Economia sobre o mensal", "Bom para famílias"];
    case "anual":
      return ["12 meses de acesso", "Maior economia mensal", "Recomendado"];
    case "fundador-feijo":
    case "fundador":
      return ["Acesso vitalício", "Edição limitada", "Apoie o projeto local"];
    default:
      return ["Acesso completo à plataforma", "Suporte por email", "Atualizações incluídas"];
  }
}

const FAQ = [
  {
    q: "Como funciona o pagamento?",
    a: "Escolha o plano, entre com sua conta e vá para o checkout. O pagamento é processado pelo Mercado Pago com Pix (aprovação em segundos), cartão de crédito ou boleto. Assim que o pagamento é aprovado, seu código de licença é gerado automaticamente.",
  },
  {
    q: "Posso usar um cupom de desconto?",
    a: "Sim. Se você tem um código promocional, aplique no checkout. O desconto é calculado imediatamente sobre o preço do plano.",
  },
  {
    q: "Como recebo meu código de licença?",
    a: "Assim que o pagamento é aprovado, o código aparece na tela de sucesso e fica salvo em Minhas Licenças. Você pode copiá-lo a qualquer momento.",
  },
  {
    q: "O plano Fundador Feijó é realmente vitalício?",
    a: "Sim. Edição limitada para os primeiros apoiadores do projeto — um pagamento único e acesso permanente à plataforma.",
  },
  {
    q: "Posso trocar de plano depois?",
    a: "Sim. Basta ativar um novo código de licença a qualquer momento — o novo período é somado ao seu acesso atual.",
  },
];

function PlansPage() {
  const navigate = useNavigate();
  const fetchPlans = useServerFn(listPublicPlans);
  const create = useServerFn(createCheckoutOrder);
  const [buying, setBuying] = useState<string | null>(null);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["public-plans"],
    queryFn: () => fetchPlans(),
  });

  async function handleBuy(plan: PublicPlan) {
    setBuying(plan.id);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast.info("Faça login para continuar");
        navigate({ to: "/login", search: { next: `/planos` } as any });
        return;
      }
      if (plan.price_cents === 0) {
        toast.success("Seu período de degustação está ativo. Aproveite!");
        navigate({ to: "/app" });
        return;
      }
      const { orderId } = await create({ data: { planId: plan.id } });
      navigate({ to: "/checkout/$id", params: { id: orderId } });
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao iniciar checkout");
    } finally {
      setBuying(null);
    }
  }

  const recommendedSlug = "anual";

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="h-8 w-auto" />
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link to="/resgatar" className="hidden sm:inline text-muted-foreground hover:text-foreground">
              <span className="inline-flex items-center gap-1"><Ticket className="h-4 w-4" /> Tenho um código</span>
            </Link>
            <Button asChild variant="ghost-navy" size="sm">
              <Link to="/login">Entrar</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-14 text-center">
        <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
          <Sparkles className="mr-1 h-3 w-3" /> Planos para Feijó/AC
        </Badge>
        <h1 className="font-serif text-4xl leading-tight md:text-5xl">
          Preços justos para acompanhar o mercado local
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Escolha o plano ideal para você, sua família ou o seu comércio. Comece grátis por 7 dias ou garanta o
          plano <strong>Fundador Feijó</strong> vitalício por um preço único.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Ativação imediata após pagamento aprovado
        </div>
      </section>

      {/* Plans grid */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-80 animate-pulse rounded-xl border border-border/60 bg-muted/30" />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {plans.map((plan) => {
              const isRecommended = plan.slug === recommendedSlug;
              const perMonth = pricePerMonth(plan.price_cents, plan.days);
              const isFounder = plan.slug.includes("fundador");
              const isFree = plan.price_cents === 0;
              return (
                <Card
                  key={plan.id}
                  className={`relative flex flex-col ${
                    isRecommended
                      ? "border-primary/60 shadow-lg ring-1 ring-primary/30"
                      : isFounder
                      ? "border-[hsl(var(--gold))]/60 ring-1 ring-[hsl(var(--gold))]/30"
                      : "border-border/60"
                  }`}
                >
                  {isRecommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground shadow-md">
                        ⭐ MAIS ESCOLHIDO
                      </Badge>
                    </div>
                  )}

                  {isFounder && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))]">Edição limitada</Badge>
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    {plan.description && (
                      <CardDescription className="text-xs">{plan.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-4">
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-serif text-3xl">
                          {isFree ? "Grátis" : centsToBRL(plan.price_cents)}
                        </span>
                      </div>
                      {perMonth && !isFounder && (
                        <p className="text-xs text-muted-foreground">
                          equivalente a {perMonth}/mês
                        </p>
                      )}
                      {isFounder && (
                        <p className="text-xs text-muted-foreground">Pagamento único · Acesso vitalício</p>
                      )}
                      {!isFounder && !isFree && (
                        <p className="text-xs text-muted-foreground">{plan.days} dias de acesso</p>
                      )}
                    </div>
                    <ul className="flex-1 space-y-2 text-sm">
                      {planHighlights(plan.slug).map((h) => (
                        <li key={h} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={isRecommended ? "executive" : isFounder ? "gold" : "outline"}
                      onClick={() => handleBuy(plan)}
                      disabled={buying === plan.id}
                    >
                      {buying === plan.id ? "Iniciando…" : isFree ? "Começar grátis" : "Assinar plano"}
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Comparativo simples */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Comparativo rápido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-muted-foreground">
                    <th className="py-2 pr-4">Plano</th>
                    <th className="py-2 pr-4">Duração</th>
                    <th className="py-2 pr-4">Preço</th>
                    <th className="py-2 pr-4">Equivalente/mês</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((p) => (
                    <tr key={p.id} className="border-b border-border/40">
                      <td className="py-2 pr-4 font-medium">{p.name}</td>
                      <td className="py-2 pr-4">
                        {p.days >= 365 * 5 ? "Vitalício" : `${p.days} dias`}
                      </td>
                      <td className="py-2 pr-4">
                        {p.price_cents === 0 ? "Grátis" : centsToBRL(p.price_cents)}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {pricePerMonth(p.price_cents, p.days) ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-20">
        <h2 className="mb-6 text-center font-serif text-3xl">Perguntas frequentes</h2>
        <div className="space-y-2">
          {FAQ.map((item, i) => (
            <details
              key={i}
              className="group rounded-lg border border-border/60 bg-card px-4 py-3 open:shadow-sm"
            >
              <summary className="flex cursor-pointer items-center justify-between font-medium">
                {item.q}
                <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-10 text-center">
          <p className="text-sm text-muted-foreground">
            Já tem um código?{" "}
            <Link to="/resgatar" className="font-medium text-primary hover:underline">
              Ativar agora
            </Link>
          </p>
        </div>
      </section>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} PreçoCerto Feijó · Preços justos para o comércio local
      </footer>
    </div>
  );
}
