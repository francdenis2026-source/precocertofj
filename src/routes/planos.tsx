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
  const [selectedId, setSelectedId] = useState<string | null>(null);


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

  const selectedPlan =
    plans.find((p) => p.id === selectedId) ??
    plans.find((p) => p.slug === recommendedSlug) ??
    plans[0];


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

        {/* Plans grid — hierarquia clara */}
        <section
          id="planos"
          className={dsx(ds.container, "scroll-mt-24 pb-5 md:pb-7")}
          aria-label="Planos disponíveis"
        >
          <nav
            aria-label="Navegação da página de planos"
            className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground"
          >
            <span className="text-foreground">Planos</span>
            <span aria-hidden className="text-border">·</span>
            <a href="#comparativo" className="transition hover:text-brand-gold">
              Comparativo
            </a>
            <span aria-hidden className="text-border">·</span>
            <a href="#faq" className="transition hover:text-brand-gold">
              Dúvidas
            </a>
          </nav>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-52 animate-pulse rounded-xl border border-border bg-muted/40"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 pt-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {plans.map((plan) => {
                const isRecommended = plan.slug === recommendedSlug;
                const perMonth = pricePerMonth(plan.price_cents, plan.days);
                const isFounder = plan.slug.includes("fundador");
                const isFree = plan.price_cents === 0;
                const isSelected = selectedPlan?.id === plan.id;

                return (
                  <article
                    key={plan.id}
                    onClick={() => setSelectedId(plan.id)}
                    className={dsx(
                      "relative flex cursor-pointer flex-col rounded-xl border border-border bg-card p-4 shadow-elev-1 transition-all hover:shadow-elev-2 sm:p-[18px]",
                      isRecommended && "border-brand-gold/70",
                      isFounder && "border-brand-gold/50",
                      isSelected && "border-brand-gold ring-2 ring-brand-gold/35",
                    )}
                  >
                    {(isRecommended || isFounder) && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                        <span
                          className={dsx(
                            "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.14em] shadow-elev-1",
                            isRecommended
                              ? "bg-brand-gold text-brand-navy"
                              : "border border-brand-gold/60 bg-card text-brand-gold",
                          )}
                        >
                          {isRecommended ? "Mais escolhido" : "Limitado"}
                        </span>
                      </div>
                    )}

                    {/* 1. Identidade */}
                    <h2 className="font-display text-[16px] font-semibold leading-tight tracking-tight text-foreground">
                      {plan.name}
                    </h2>

                    {/* 2. Preço — âncora visual */}
                    <div className="mt-3.5">
                      <span className="font-display text-[27px] font-semibold leading-none tracking-tight text-foreground">
                        {isFree ? "Grátis" : centsToBRL(plan.price_cents)}
                      </span>
                      <p className="mt-2 text-[11.5px] leading-snug text-muted-foreground">
                        {isFounder
                          ? "Pagamento único · vitalício"
                          : isFree
                            ? "7 dias · sem cartão"
                            : perMonth
                              ? `≈ ${perMonth}/mês · ${plan.days} dias`
                              : `${plan.days} dias de acesso`}
                      </p>
                    </div>

                    <div className="my-4 h-px bg-border/70" aria-hidden />

                    {/* 3. Benefícios */}
                    <ul className="flex-1 space-y-2 text-[12.5px] leading-snug">
                      {planHighlights(plan.slug).slice(0, 2).map((h) => (
                        <li key={h} className="flex items-start gap-2">
                          <Check
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-gold"
                            aria-hidden
                          />
                          <span className="text-foreground/85">{h}</span>
                        </li>
                      ))}
                    </ul>

                    {/* 4. Ação */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(plan.id);
                        handleBuy(plan);
                      }}
                      disabled={buying === plan.id}
                      className={dsx(
                        ds.btn.base,
                        "mt-4 h-11 w-full px-3 text-[12.5px] font-semibold uppercase tracking-[0.06em] focus-visible:ring-2 focus-visible:ring-brand-gold",
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

        {/* Comparativo — recolhido para manter a página única */}
        <section
          id="comparativo"
          className={dsx(ds.container, "pb-4 scroll-mt-24")}
          aria-label="Comparativo de planos"
        >
          <details className="group rounded-xl border border-border bg-card px-4 py-3 open:shadow-elev-1">
            <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-3 text-[13px] font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold">
              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-brand-gold" aria-hidden />
                Comparar recursos de cada plano
              </span>
              <ChevronDown
                className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="mt-3">
              <ComparisonMatrix
                plans={plans}
                recommendedSlug={recommendedSlug}
                onBuy={handleBuy}
                buying={buying}
              />
            </div>
          </details>
        </section>

        {/* FAQ — acordeão recolhível */}
        <section
          id="faq"
          className={dsx(ds.container, "scroll-mt-24 pb-28 md:pb-24")}
          aria-labelledby="faq-title"
        >
          <div className="mb-2.5 flex items-baseline justify-between gap-3">
            <h2
              id="faq-title"
              className="font-display text-[15.5px] font-semibold tracking-tight text-foreground"
            >
              Perguntas frequentes
            </h2>
            <a
              href="#planos"
              className="text-[11.5px] font-semibold text-brand-gold hover:underline"
            >
              Voltar aos planos
            </a>
          </div>

          <div className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border bg-card">
            {FAQ.map((item, i) => (
              <details
                key={item.q}
                name="planos-faq"
                open={i === 0}
                className="group px-4"
              >
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-2.5 text-[12.5px] font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold">
                  <span>{item.q}</span>
                  <ChevronDown
                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <p className="pb-3 pr-6 text-[12px] leading-relaxed text-muted-foreground">
                  {item.a}
                </p>
              </details>
            ))}
          </div>

          <p className="mt-3 text-center text-[12px] text-muted-foreground">
            Já comprou e recebeu um código?{" "}
            <Link
              to="/resgatar"
              className="font-semibold text-brand-gold hover:underline"
            >
              Ativar meu código
            </Link>
          </p>
        </section>

        {/* CTA sticky — conversão sem poluir o conteúdo */}
        {selectedPlan && (
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
            <div
              className={dsx(
                ds.container,
                "pointer-events-auto pb-3 pt-2",
              )}
            >
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/95 px-3.5 py-2.5 shadow-elev-2 backdrop-blur supports-[backdrop-filter]:bg-card/80">
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-semibold text-foreground">
                    {selectedPlan.name}
                  </p>
                  <p className="truncate text-[11.5px] text-muted-foreground">
                    {selectedPlan.price_cents === 0
                      ? "7 dias grátis · sem cartão"
                      : `${centsToBRL(selectedPlan.price_cents)} · ${selectedPlan.days} dias`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleBuy(selectedPlan)}
                  disabled={buying === selectedPlan.id}
                  className={dsx(
                    ds.btn.base,
                    "h-10 shrink-0 bg-brand-gold px-4 text-[12px] font-bold uppercase tracking-[0.08em] text-brand-navy shadow-elev-1 hover:brightness-105 focus-visible:ring-2 focus-visible:ring-brand-gold",
                  )}
                >
                  {buying === selectedPlan.id
                    ? "Iniciando…"
                    : selectedPlan.price_cents === 0
                      ? "Começar grátis"
                      : "Assinar"}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </div>
          </div>
        )}

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

