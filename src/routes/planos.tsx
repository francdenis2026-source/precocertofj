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
  Minus,
  ShieldCheck,
  ArrowRight,
  ChevronDown,
  Sparkles,
} from "lucide-react";

import { toast } from "sonner";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PageShell, PageShellContent } from "@/components/layout/PageShell";
import { InternalPageHeader } from "@/components/layout/InternalPageHeader";
import { ds, dsx } from "@/lib/ds";
import { usePromptSignIn } from "@/components/auth/usePromptSignIn";

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
    a: "Escolha o plano, entre com sua conta e pague pelo Mercado Pago — Pix aprova em segundos e também aceitamos cartão de crédito. Assim que o pagamento é confirmado, o código de licença aparece na tela e vai para o seu e-mail.",
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
  const promptSignIn = usePromptSignIn();
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
        await promptSignIn({
          intent: "checkout-plan",
          payload: { planId: plan.id },
          returnTo: "/planos",
        });
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
    <PageShell>
      <SiteHeader />

      <PageShellContent>
        {/* Cabeçalho compacto — mesmo padrão das páginas internas */}
        <section className={dsx(ds.container, "pt-3 pb-3 md:pt-4")}>
          <InternalPageHeader
            title="Planos e preços"
            highlight="preços"
            showBack={false}
            breadcrumbs={[{ label: "Início", to: "/" }, { label: "Planos" }]}
            description={
              <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>Escolha o plano que combina com sua rotina — 7 dias grátis, sem cartão.</span>
                <span className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-brand-gold" aria-hidden />
                  Ativação imediata · Pix ou cartão
                </span>
              </span>
            }
            className="mb-0"
          />
        </section>

        {/* Plans grid — compact */}
        <section className={dsx(ds.container, "pb-5 md:pb-7")} aria-label="Planos disponíveis">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-52 animate-pulse rounded-xl border border-border bg-muted/40"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {plans.map((plan) => {
                const isRecommended = plan.slug === recommendedSlug;
                const perMonth = pricePerMonth(plan.price_cents, plan.days);
                const isFounder = plan.slug.includes("fundador");
                const isFree = plan.price_cents === 0;

                return (
                  <article
                    key={plan.id}
                    className={dsx(
                      "relative flex flex-col rounded-xl border border-border bg-card p-3.5 shadow-elev-1 transition-shadow hover:shadow-elev-2 sm:p-4",
                      isRecommended && "border-brand-gold ring-1 ring-brand-gold/30",
                      isFounder && "border-brand-gold/70 ring-1 ring-brand-gold/20",
                    )}
                  >
                    {(isRecommended || isFounder) && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                        <span
                          className={dsx(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.14em] shadow-elev-1",
                            isRecommended
                              ? "bg-brand-gold text-brand-navy"
                              : "border border-brand-gold/60 bg-card text-brand-gold",
                          )}
                        >
                          {isRecommended ? "Mais escolhido" : "Limitado"}
                        </span>
                      </div>
                    )}

                    <header>
                      <h2 className="font-display text-[15.5px] font-semibold tracking-tight text-foreground">
                        {plan.name}
                      </h2>
                      {plan.description && (
                        <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
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
                      <p className="mt-1.5 text-[11.5px] leading-snug text-muted-foreground">
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
                      {planHighlights(plan.slug).slice(0, 2).map((h) => (
                        <li key={h} className="flex items-start gap-1.5">
                          <Check
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-gold"
                            aria-hidden
                          />
                          <span className="text-foreground/90">{h}</span>
                        </li>
                      ))}
                    </ul>


                    <button
                      type="button"
                      onClick={() => handleBuy(plan)}
                      disabled={buying === plan.id}
                      className={dsx(
                        ds.btn.base,
                        "mt-3.5 h-11 w-full px-3 text-[12.5px] font-semibold uppercase tracking-[0.06em] focus-visible:ring-2 focus-visible:ring-brand-gold",
                        isRecommended || isFounder
                          ? "bg-brand-gold text-brand-navy shadow-elev-1 hover:brightness-105 hover:shadow-elev-2"
                          : "border border-border bg-card text-foreground hover:border-brand-gold hover:text-brand-gold",
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


        {/* Comparativo — matriz de recursos com plano ideal destacado */}
        <section className={dsx(ds.container, "pb-6 md:pb-8")} aria-label="Comparativo de planos">
          <div className="mx-auto max-w-5xl">
            <div className="mb-3 text-center">
              <p className={ds.type.overline}>Compare lado a lado</p>
              <h2 className="mt-1 font-display text-[17px] font-semibold tracking-tight text-foreground sm:text-[18px]">
                O que está incluído em cada plano
              </h2>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Destaque em dourado no plano ideal para a maioria dos assinantes.
              </p>
            </div>
            <ComparisonMatrix
              plans={plans}
              recommendedSlug={recommendedSlug}
              onBuy={handleBuy}
              buying={buying}
            />
          </div>
        </section>


        {/* FAQ — compact */}
        <section
          className="mx-auto max-w-2xl px-4 pb-10 sm:px-6"
          aria-labelledby="faq-title"
        >
          <h2
            id="faq-title"
            className="mb-3 text-center font-display text-[17px] font-semibold tracking-tight text-foreground sm:text-[18px]"
          >
            Perguntas frequentes
          </h2>
          <div className="space-y-2">
            {FAQ.map((item, i) => (
              <details
                key={i}
                className="group rounded-lg border border-border bg-card px-3.5 py-2.5 open:shadow-elev-1"
              >
                <summary className="flex min-h-9 cursor-pointer items-center justify-between gap-3 text-[13px] font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold">
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
          <div className="mt-5 text-center">
            <p className="text-[12px] text-muted-foreground">
              Já comprou e recebeu um código?{" "}
              <Link
                to="/resgatar"
                className="font-semibold text-brand-gold hover:underline"
              >
                Ativar meu código
              </Link>

            </p>
          </div>
        </section>
      </PageShellContent>
    </PageShell>
  );
}

// ============================================================================
// ComparisonMatrix — tabela comparativa lado a lado com plano ideal destacado
// ============================================================================

type ComparisonRow = {
  label: string;
  values: Partial<Record<string, string | boolean>>;
};

function planFeatureMatrix(plans: PublicPlan[]): ComparisonRow[] {
  const bySlug = Object.fromEntries(plans.map((p) => [p.slug, p]));
  const val = (slug: string, v: string | boolean) => (bySlug[slug] ? { [slug]: v } : {});

  return [
    {
      label: "Duração",
      values: Object.fromEntries(
        plans.map((p) => [
          p.slug,
          p.days >= 365 * 5 ? "Vitalício" : `${p.days} dias`,
        ]),
      ),
    },
    {
      label: "Preço total",
      values: Object.fromEntries(
        plans.map((p) => [
          p.slug,
          p.price_cents === 0 ? "Grátis" : centsToBRL(p.price_cents),
        ]),
      ),
    },
    {
      label: "Equivalente por mês",
      values: Object.fromEntries(
        plans.map((p) => [p.slug, pricePerMonth(p.price_cents, p.days) ?? "—"]),
      ),
    },
    {
      label: "Comparador ilimitado",
      values: {
        ...val("degustacao", true),
        ...val("mensal", true),
        ...val("trimestral", true),
        ...val("anual", true),
        ...val("fundador-feijo", true),
        ...val("fundador", true),
      },
    },
    {
      label: "Alertas de queda de preço",
      values: {
        ...val("degustacao", "Prévia"),
        ...val("mensal", true),
        ...val("trimestral", true),
        ...val("anual", true),
        ...val("fundador-feijo", true),
        ...val("fundador", true),
      },
    },
    {
      label: "Listas inteligentes",
      values: {
        ...val("degustacao", true),
        ...val("mensal", true),
        ...val("trimestral", true),
        ...val("anual", true),
        ...val("fundador-feijo", true),
        ...val("fundador", true),
      },
    },
    {
      label: "Histórico completo",
      values: {
        ...val("degustacao", false),
        ...val("mensal", true),
        ...val("trimestral", true),
        ...val("anual", true),
        ...val("fundador-feijo", true),
        ...val("fundador", true),
      },
    },
    {
      label: "Suporte prioritário",
      values: {
        ...val("degustacao", false),
        ...val("mensal", false),
        ...val("trimestral", true),
        ...val("anual", true),
        ...val("fundador-feijo", true),
        ...val("fundador", true),
      },
    },
    {
      label: "Selo de apoiador",
      values: {
        ...val("fundador-feijo", true),
        ...val("fundador", true),
      },
    },
  ];
}

function ComparisonCell({ value }: { value: string | boolean | undefined }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center justify-center">
        <Check className="h-4 w-4 text-brand-gold" strokeWidth={2.5} aria-label="Incluído" />
      </span>
    );
  }
  if (value === false || value === undefined) {
    return (
      <span className="inline-flex items-center justify-center text-muted-foreground/50">
        <Minus className="h-3.5 w-3.5" aria-label="Não incluído" />
      </span>
    );
  }
  return <span className="text-[12.5px] font-semibold text-foreground">{value}</span>;
}

function ComparisonMatrix({
  plans,
  recommendedSlug,
  onBuy,
  buying,
}: {
  plans: PublicPlan[];
  recommendedSlug: string;
  onBuy: (p: PublicPlan) => void;
  buying: string | null;
}) {
  if (plans.length === 0) return null;
  const rows = planFeatureMatrix(plans);

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-elev-1">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="border-b border-border">
            <th
              scope="col"
              className="sticky left-0 z-[1] w-[38%] bg-card px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground"
            >
              Recursos
            </th>
            {plans.map((p) => {
              const isRec = p.slug === recommendedSlug;
              return (
                <th
                  key={p.id}
                  scope="col"
                  className={dsx(
                    "px-3 py-3 text-center align-top",
                    isRec && "relative bg-brand-gold/[0.08]",
                  )}
                >
                  {isRec && (
                    <span
                      aria-hidden
                      className="absolute inset-x-0 top-0 h-[3px] bg-brand-gold"
                    />
                  )}
                  {isRec && (
                    <span className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-brand-gold px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-navy">
                      <Sparkles className="h-2.5 w-2.5" aria-hidden /> Ideal
                    </span>
                  )}
                  <div className="font-display text-[13.5px] font-semibold text-foreground">
                    {p.name}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {p.price_cents === 0
                      ? "Grátis"
                      : `${centsToBRL(p.price_cents)}${
                          p.days >= 60
                            ? ` · ${pricePerMonth(p.price_cents, p.days)}/mês`
                            : ""
                        }`}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.label}
              className={i % 2 === 0 ? "bg-muted/25" : "bg-transparent"}
            >
              <th
                scope="row"
                className="sticky left-0 z-[1] whitespace-normal bg-inherit px-4 py-2.5 text-left text-[12.5px] font-medium text-foreground"
              >
                {row.label}
              </th>
              {plans.map((p) => {
                const isRec = p.slug === recommendedSlug;
                return (
                  <td
                    key={p.id}
                    className={dsx(
                      "px-3 py-2.5 text-center",
                      isRec && "bg-brand-gold/[0.06]",
                    )}
                  >
                    <ComparisonCell value={row.values[p.slug]} />
                  </td>
                );
              })}
            </tr>
          ))}
          {/* Linha final: CTAs */}
          <tr className="border-t border-border">
            <th scope="row" className="sticky left-0 z-[1] bg-card px-4 py-3" />
            {plans.map((p) => {
              const isRec = p.slug === recommendedSlug;
              const isFree = p.price_cents === 0;
              return (
                <td
                  key={p.id}
                  className={dsx("px-2 py-3 align-top", isRec && "bg-brand-gold/[0.08]")}
                >
                  <button
                    type="button"
                    onClick={() => onBuy(p)}
                    disabled={buying === p.id}
                    className={dsx(
                      "inline-flex min-h-10 w-full items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] font-bold uppercase tracking-[0.08em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold disabled:cursor-wait disabled:opacity-70",
                      isRec
                        ? "bg-brand-gold text-brand-navy shadow-elev-1 hover:brightness-105"
                        : "border border-border bg-background text-foreground hover:border-brand-gold hover:text-brand-gold",
                    )}
                  >
                    {buying === p.id
                      ? "…"
                      : isFree
                        ? "Testar grátis"
                        : isRec
                          ? "Assinar agora"
                          : "Escolher"}
                    <ArrowRight className="h-3 w-3" aria-hidden />
                  </button>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

