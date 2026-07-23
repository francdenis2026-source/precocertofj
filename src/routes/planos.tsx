import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  listPublicPlans,
  createCheckoutOrder,
  type PublicPlan,
} from "@/lib/checkout.functions";
import {
  Check,
  ShieldCheck,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ds, dsx } from "@/lib/ds";

const PALETTE = {
  gold: "#b58a3c",
  goldSoft: "#f2dfa8",
} as const;

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: "Planos e preços — PreçoCerto Feijó" },
      {
        name: "description",
        content:
          "Escolha o plano ideal para acompanhar preços em Feijó/AC. Degustação grátis, mensal, trimestral e anual.",
      },
      { property: "og:title", content: "Planos e preços — PreçoCerto Feijó" },
      {
        property: "og:description",
        content:
          "Preços justos para o mercado local. Ativação imediata após pagamento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlansPage,
});

function centsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function pricePerMonth(cents: number, days: number): string | null {
  if (days < 60) return null;
  const months = days / 30;
  return centsToBRL(Math.round(cents / months));
}

function planHighlights(slug: string): string[] {
  switch (slug) {
    case "degustacao":
      return [
        "7 dias com tudo liberado",
        "Sem cartão de crédito",
        "Encerra sozinho — sem cobrança surpresa",
      ];
    case "mensal":
      return [
        "Acesso completo por 30 dias",
        "Cancele quando quiser, sem multa",
        "Ideal para testar antes de anual",
      ];
    case "trimestral":
      return [
        "3 meses de acesso contínuo",
        "Economia sobre 3 mensais",
        "Boa opção para famílias que fazem feira grande",
      ];
    case "anual":
      return [
        "12 meses ininterruptos",
        "O menor valor por mês da plataforma",
        "A escolha da maioria dos assinantes",
      ];
    case "fundador-feijo":
    case "fundador":
      return [
        "Acesso vitalício — pague uma única vez",
        "Vagas limitadas para apoiadores locais",
        "Seu nome ajuda o projeto a crescer em Feijó",
      ];
    default:
      return [
        "Acesso completo à plataforma",
        "Suporte por e-mail em até 24h",
        "Novas funcionalidades incluídas",
      ];
  }
}

const FAQ = [
  {
    q: "Preciso de cartão de crédito para começar?",
    a: "Não. O plano de degustação libera 7 dias sem cartão e encerra sozinho. Só cobramos se você escolher um plano pago depois.",
  },
  {
    q: "Como funciona o pagamento?",
    a: "Escolha o plano, entre com sua conta e pague pelo Mercado Pago — Pix aprova em segundos, também aceita cartão e boleto. Assim que o pagamento é confirmado, o código de licença aparece na tela e vai para o seu e-mail.",
  },
  {
    q: "Tenho um cupom. Onde aplico?",
    a: "Insira o código no checkout, antes de finalizar. O desconto aparece na hora e já entra no total.",
  },
  {
    q: "E se eu quiser cancelar?",
    a: "Pode cancelar quando quiser, direto no seu perfil. O acesso segue até o fim do período pago — sem multa, sem burocracia.",
  },
  {
    q: "Posso trocar de plano depois?",
    a: "Sim. Ative um novo código a qualquer momento e o novo período soma ao acesso atual.",
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
        navigate({ to: "/login", search: { next: "/planos" } as any });
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
    <div className="min-h-dvh bg-background">
      <SiteHeader variant="solid" />

      <main>
        {/* Hero — compact */}
        <section className={dsx(ds.container, "pt-8 pb-5 md:pt-10 md:pb-6 text-center")}>
          <p className={ds.type.overline}>Planos · Feijó/AC</p>
          <h1 className="mt-2 font-display text-[26px] font-semibold tracking-tight text-foreground sm:text-[30px] md:text-[34px]">
            Economize todo mês na sua feira
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-[14px] leading-snug text-muted-foreground sm:text-[15px]">
            Escolha o plano que combina com sua rotina. 7 dias grátis, sem cartão.
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
            Ativação imediata · Pix, cartão ou boleto
          </div>
        </section>

        {/* Plans grid — compact */}
        <section className={dsx(ds.container, "pb-8 md:pb-10")}>
          {isLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-60 animate-pulse rounded-xl border border-border/60 bg-muted/30"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {plans.map((plan) => {
                const isRecommended = plan.slug === recommendedSlug;
                const perMonth = pricePerMonth(plan.price_cents, plan.days);
                const isFounder = plan.slug.includes("fundador");
                const isFree = plan.price_cents === 0;

                return (
                  <article
                    key={plan.id}
                    className={dsx(
                      "relative flex flex-col rounded-xl border border-border/60 bg-card p-4 shadow-elev-1 transition-shadow hover:shadow-elev-2",
                      isRecommended && "border-primary/60 ring-1 ring-primary/25",
                      isFounder && "ring-1",
                    )}
                    style={
                      isFounder
                        ? {
                            borderColor: PALETTE.gold,
                            boxShadow: `0 0 0 1px ${PALETTE.gold}44`,
                          }
                        : undefined
                    }
                  >
                    {(isRecommended || isFounder) && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.14em] shadow-sm"
                          style={
                            isRecommended
                              ? { background: "var(--color-primary)", color: "var(--color-primary-foreground)" }
                              : { background: PALETTE.gold, color: "#0f1b3d" }
                          }
                        >
                          {isRecommended ? "★ Mais escolhido" : "Limitado"}
                        </span>
                      </div>
                    )}

                    <header className="min-h-[42px]">
                      <h2 className="font-display text-[16px] font-semibold tracking-tight text-foreground">
                        {plan.name}
                      </h2>
                      {plan.description && (
                        <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-muted-foreground">
                          {plan.description}
                        </p>
                      )}
                    </header>

                    <div className="mt-3">
                      <div className="flex items-baseline gap-1">
                        <span className="font-display text-[24px] font-semibold leading-none tracking-tight text-foreground">
                          {isFree ? "Grátis" : centsToBRL(plan.price_cents)}
                        </span>
                      </div>
                      <p className="mt-1 text-[11.5px] leading-snug text-muted-foreground">
                        {isFounder
                          ? "Pagamento único · vitalício"
                          : isFree
                            ? "7 dias · sem cartão"
                            : perMonth
                              ? `≈ ${perMonth}/mês · ${plan.days} dias`
                              : `${plan.days} dias de acesso`}
                      </p>
                    </div>

                    <ul className="mt-3 flex-1 space-y-1.5 text-[12.5px] leading-snug">
                      {planHighlights(plan.slug).slice(0, 3).map((h) => (
                        <li key={h} className="flex items-start gap-1.5">
                          <Check
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
                            aria-hidden
                          />
                          <span className="text-foreground/85">{h}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      onClick={() => handleBuy(plan)}
                      disabled={buying === plan.id}
                      className={dsx(
                        ds.btn.base,
                        "mt-4 h-9 w-full px-3 text-[13px]",
                        isRecommended
                          ? ds.btn.variants.primary
                          : isFounder
                            ? ds.btn.variants.accent
                            : ds.btn.variants.ghost,
                      )}
                    >
                      {buying === plan.id
                        ? "Iniciando…"
                        : isFree
                          ? "Começar grátis"
                          : "Assinar"}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Comparativo — slim */}
        <section className={dsx(ds.container, "pb-8 md:pb-10")}>
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <div className="border-b border-border/60 px-4 py-2.5">
              <h2 className="font-display text-[14px] font-semibold tracking-tight text-foreground">
                Quanto custa cada plano
              </h2>
              <p className="text-[11.5px] text-muted-foreground">
                Duração, preço total e equivalente mensal.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead className="bg-muted/40 text-[10.5px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Plano</th>
                    <th className="px-3 py-2 text-left font-semibold">Duração</th>
                    <th className="px-3 py-2 text-left font-semibold">Preço</th>
                    <th className="px-3 py-2 text-left font-semibold">Equiv./mês</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((p) => (
                    <tr key={p.id} className="border-t border-border/50">
                      <td className="px-3 py-2 font-medium text-foreground">{p.name}</td>
                      <td className="px-3 py-2 text-foreground/80">
                        {p.days >= 365 * 5 ? "Vitalício" : `${p.days} dias`}
                      </td>
                      <td className="px-3 py-2 text-foreground/80">
                        {p.price_cents === 0 ? "Grátis" : centsToBRL(p.price_cents)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {pricePerMonth(p.price_cents, p.days) ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ — compact */}
        <section
          className="mx-auto max-w-2xl px-4 pb-14 sm:px-6"
          aria-labelledby="faq-title"
        >
          <h2
            id="faq-title"
            className="mb-4 text-center font-display text-[18px] font-semibold tracking-tight text-foreground sm:text-[20px]"
          >
            Perguntas frequentes
          </h2>
          <div className="space-y-2">
            {FAQ.map((item, i) => (
              <details
                key={i}
                className="group rounded-lg border border-border/60 bg-card px-3.5 py-2.5 open:shadow-sm"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-3 text-[13.5px] font-medium text-foreground">
                  <span>{item.q}</span>
                  <ChevronDown
                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
          <div className="mt-6 text-center">
            <p className="text-[12px] text-muted-foreground">
              Já comprou e recebeu um código?{" "}
              <Link
                to="/resgatar"
                className="font-medium text-primary hover:underline"
              >
                Ativar meu código
              </Link>
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
