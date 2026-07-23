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
  Sparkles,
  ShieldCheck,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SectionCard } from "@/components/layout";
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
        {/* Hero */}
        <section className={dsx(ds.container, ds.sectionY.md, "text-center")}>
          <p className={ds.type.overline}>Planos · Feijó/AC</p>
          <h1 className={dsx(ds.type.h1, "mx-auto mt-3 max-w-3xl")}>
            Economize todo mês na sua feira
          </h1>
          <p className={dsx(ds.type.subtitle, "mx-auto mt-4 max-w-2xl")}>
            Escolha o plano que combina com sua rotina. Comece grátis por 7 dias —
            sem cartão, sem cobrança automática.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
            Ativação imediata · Pix, cartão ou boleto
          </div>
        </section>

        {/* Plans grid */}
        <section className={dsx(ds.container, "pb-12 md:pb-16")}>
          {isLoading ? (
            <div className={ds.grid.cols3}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-80 animate-pulse rounded-2xl border border-border/60 bg-muted/30"
                />
              ))}
            </div>
          ) : (
            <div className={ds.grid.cols3}>
              {plans.map((plan) => {
                const isRecommended = plan.slug === recommendedSlug;
                const perMonth = pricePerMonth(plan.price_cents, plan.days);
                const isFounder = plan.slug.includes("fundador");
                const isFree = plan.price_cents === 0;

                return (
                  <article
                    key={plan.id}
                    className={dsx(
                      "relative flex flex-col",
                      ds.card.paddedHover,
                      isRecommended && "border-primary/60 shadow-lg ring-1 ring-primary/30",
                      isFounder && "ring-1",
                    )}
                    style={
                      isFounder
                        ? {
                            borderColor: PALETTE.gold,
                            boxShadow: `0 0 0 1px ${PALETTE.gold}55`,
                          }
                        : undefined
                    }
                  >
                    {(isRecommended || isFounder) && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] shadow-md"
                          style={
                            isRecommended
                              ? { background: "var(--color-primary)", color: "var(--color-primary-foreground)" }
                              : { background: PALETTE.gold, color: "#0f1b3d" }
                          }
                        >
                          {isRecommended ? "★ Mais escolhido" : "Edição limitada"}
                        </span>
                      </div>
                    )}

                    <header>
                      <h2 className={ds.type.h3}>{plan.name}</h2>
                      {plan.description && (
                        <p className={dsx(ds.type.caption, "mt-1")}>
                          {plan.description}
                        </p>
                      )}
                    </header>

                    <div className="mt-4">
                      <div className="flex items-baseline gap-1">
                        <span className="font-display text-3xl leading-none">
                          {isFree ? "Grátis" : centsToBRL(plan.price_cents)}
                        </span>
                      </div>
                      {perMonth && !isFounder && (
                        <p className={dsx(ds.type.caption, "mt-1")}>
                          equivalente a {perMonth}/mês
                        </p>
                      )}
                      {isFounder && (
                        <p className={dsx(ds.type.caption, "mt-1")}>
                          Pagamento único · Acesso vitalício
                        </p>
                      )}
                      {!isFounder && !isFree && (
                        <p className={dsx(ds.type.caption, "mt-1")}>
                          {plan.days} dias de acesso
                        </p>
                      )}
                    </div>

                    <ul className="mt-5 flex-1 space-y-2 text-sm">
                      {planHighlights(plan.slug).map((h) => (
                        <li key={h} className="flex items-start gap-2">
                          <Check
                            className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                            aria-hidden
                          />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      onClick={() => handleBuy(plan)}
                      disabled={buying === plan.id}
                      className={dsx(
                        ds.btn.base,
                        ds.btn.sizes.lg,
                        "mt-6 w-full",
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
                          : "Assinar plano"}
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Comparativo simples */}
        <section className={dsx(ds.container, "pb-12 md:pb-16")}>
          <SectionCard
            title="Quanto custa cada plano"
            description="Duração, preço total e o quanto sai por mês em cada opção."
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-[14px]">
                <thead className="bg-muted/40 text-[13px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium">Plano</th>
                    <th className="px-4 py-2.5 text-left font-medium">Duração</th>
                    <th className="px-4 py-2.5 text-left font-medium">Preço</th>
                    <th className="px-4 py-2.5 text-left font-medium">Equivalente/mês</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((p) => (
                    <tr key={p.id} className="border-t border-border/50">
                      <td className="px-4 py-2.5 font-medium">{p.name}</td>
                      <td className="px-4 py-2.5">
                        {p.days >= 365 * 5 ? "Vitalício" : `${p.days} dias`}
                      </td>
                      <td className="px-4 py-2.5">
                        {p.price_cents === 0 ? "Grátis" : centsToBRL(p.price_cents)}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {pricePerMonth(p.price_cents, p.days) ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </section>

        {/* FAQ */}
        <section
          className={dsx("mx-auto max-w-3xl px-4 pb-20 sm:px-6", ds.stack.sm)}
          aria-labelledby="faq-title"
        >
          <h2
            id="faq-title"
            className={dsx(ds.type.h2, "mb-6 text-center font-display")}
          >
            Perguntas frequentes
          </h2>
          {FAQ.map((item, i) => (
            <details
              key={i}
              className="group rounded-xl border border-border/60 bg-card px-4 py-3 open:shadow-sm"
            >
              <summary className="flex cursor-pointer items-center justify-between font-medium">
                {item.q}
                <ChevronDown
                  className="h-4 w-4 transition group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <p className={dsx(ds.type.body, "mt-2 text-muted-foreground")}>
                {item.a}
              </p>
            </details>
          ))}
          <div className="mt-10 text-center">
            <p className={ds.type.caption}>
              Já tem um código?{" "}
              <Link
                to="/resgatar"
                className="font-medium text-primary hover:underline"
              >
                Ativar agora
              </Link>
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
