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
import { InternalPageHeader } from "@/components/layout/InternalPageHeader";
import { cn } from "@/lib/utils";
import { usePromptSignIn } from "@/components/auth/usePromptSignIn";
import { usePlansRealtime } from "@/hooks/usePlansRealtime";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";



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

/** Fallback highlights when the admin hasn't filled `features` in the DB. */
function fallbackHighlights(slug: string, days: number): string[] {
  switch (slug) {
    case "degustacao":
      return [
        `${days} dias com tudo liberado`,
        "Sem cartão de crédito",
        "Encerra sozinho — sem cobrança surpresa",
      ];
    case "mensal":
      return [
        `Acesso completo por ${days} dias`,
        "Cancele quando quiser, sem multa",
        "Ideal para testar antes de anual",
      ];
    case "trimestral":
      return [
        `${days} dias de acesso contínuo`,
        "Economia sobre 3 mensais",
        "Boa opção para famílias que fazem feira grande",
      ];
    case "anual":
      return [
        `${days} meses ininterruptos`,
        "O menor valor por mês da plataforma",
        "A escolha da maioria dos assinantes",
      ];
    default:
      return [
        `Acesso completo por ${days} dias`,
        "Suporte por e-mail em até 24h",
        "Novas funcionalidades incluídas",
      ];
  }
}

function planHighlights(plan: PublicPlan): string[] {
  if (plan.features && plan.features.length > 0) return plan.features;
  return fallbackHighlights(plan.slug, plan.days);
}

function buildFaq(trialDays: number) {
  return [
    {
      q: "Preciso de cartão de crédito para começar?",
      a: `Não. O plano de degustação libera ${trialDays} dias sem cartão e encerra sozinho. Só cobramos se você escolher um plano pago depois.`,
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
    {
      q: "Quem pode usar a IA e quantas análises tenho por mês?",
      a: `Na degustação (${trialDays} dias) você tem 1 análise de IA no período total — ideal para experimentar a cesta inteligente uma vez. Nos planos pagos a cota é mensal e renova todo mês: Mensal 30, Trimestral 40 e Anual 60 análises por mês. O saldo aparece no seu perfil.`,
    },
    {
      q: "E se eu precisar de mais análises?",
      a: "Você compra um pacote avulso de 50 análises por R$ 9,90, válido por 12 meses e cumulativo com a cota do plano.",
    },
  ];
}


function PlansPage() {
  const navigate = useNavigate();
  const fetchPlans = useServerFn(listPublicPlans);
  const create = useServerFn(createCheckoutOrder);
  const promptSignIn = usePromptSignIn();
  const [buying, setBuying] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openSheet, setOpenSheet] = useState<"compare" | "faq" | null>(null);
  



  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["public-plans"],
    queryFn: () => fetchPlans(),
  });
  usePlansRealtime();

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

  const trialPlan = plans.find((p) => p.slug === "degustacao" || p.price_cents === 0);
  const trialDays = trialPlan?.days ?? 7;


  return (
    <div
      data-planos-shell
      className="flex h-[calc(100svh-64px)] flex-col overflow-hidden overscroll-none bg-base text-primary md:h-[100svh]"
    >
      <main className="flex min-h-0 flex-1 flex-col">
        {/* Cabeçalho compacto com atalhos à direita */}
        <section className="pc-shell shrink-0 pt-2 pb-1.5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <InternalPageHeader
              title="Planos e preços"
              highlight="preços"
              showBack={false}
              breadcrumbs={[{ label: "Início", to: "/" }, { label: "Planos" }]}
              description={
                <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>Assinatura mensal a partir de <strong className="text-primary">R$ 29,90</strong> — economize até 30% no anual.</span>
                  <span className="inline-flex items-center gap-1 text-[11.5px] text-secondary">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-brand-accent" aria-hidden />
                    Pix instantâneo · Ativação imediata
                  </span>
                </span>
              }
              className="mb-0 flex-1 min-w-[240px]"
            />
            <div className="hidden items-center gap-1.5 md:flex">
              <button
                type="button"
                onClick={() => setOpenSheet("compare")}
                className="pc-focus inline-flex h-8 items-center gap-1.5 rounded-full border border-subtle bg-surface px-3 text-[12px] font-semibold text-secondary transition-colors hover:border-brand-accent hover:text-brand-accent"
              >
                <Sparkles className="h-3.5 w-3.5 text-brand-accent" aria-hidden />
                Comparar
              </button>
              <button
                type="button"
                onClick={() => setOpenSheet("faq")}
                className="pc-focus inline-flex h-8 items-center gap-1.5 rounded-full border border-subtle bg-surface px-3 text-[12px] font-semibold text-secondary transition-colors hover:border-brand-accent hover:text-brand-accent"
              >
                <ChevronDown className="h-3.5 w-3.5 text-brand-accent" aria-hidden />
                Perguntas
              </button>
              <Link
                to="/resgatar"
                className="pc-focus inline-flex h-8 items-center rounded-full px-3 text-[12px] font-semibold text-brand-accent hover:underline"
              >
                Já tenho código →
              </Link>
            </div>
          </div>
        </section>

        {/* Planos — ocupam toda a altura disponível */}
        <section
          id="detalhes"
          className="pc-shell min-h-0 flex-1 overflow-hidden pb-1.5"
          aria-label="Planos disponíveis"
        >
          {isLoading ? (
            <div className="flex h-full gap-3 overflow-hidden pt-1 lg:grid lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  data-planos-card
                  className="h-full w-[78%] shrink-0 animate-pulse rounded-[var(--radius-2xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]/40 lg:w-auto"
                />
              ))}
            </div>
          ) : (
            <div className="pc-rail flex h-full snap-x snap-mandatory gap-3 overflow-x-auto pb-1 pt-1 lg:grid lg:grid-cols-4 lg:gap-4 lg:overflow-visible">
              {plans.map((plan) => {
                const isRecommended = plan.slug === recommendedSlug;
                const perMonth = pricePerMonth(plan.price_cents, plan.days);
                
                const isFree = plan.price_cents === 0;
                const isSelected = selectedPlan?.id === plan.id;
                const savings =
                  plan.original_price_cents && plan.original_price_cents > plan.price_cents
                    ? Math.round(((plan.original_price_cents - plan.price_cents) / plan.original_price_cents) * 100)
                    : null;

                return (
                  <article
                    key={plan.id}
                    data-planos-card
                    onClick={() => setSelectedId(plan.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId(plan.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={`${plan.name}${isRecommended ? " · recomendado" : ""}${isFree ? " · grátis" : ` · ${centsToBRL(plan.price_cents)}`}`}
                    className={cn(
                      "pc-lift pc-focus relative flex h-full w-[78%] shrink-0 snap-start cursor-pointer flex-col p-4 sm:w-[48%] lg:h-auto lg:w-auto lg:p-5 rounded-3xl",
                      isRecommended ? "bg-surface-elevated border-brand-accent/30" : "bg-surface border-subtle",
                      isSelected && "ring-2 ring-brand-accent/50",
                    )}
                  >
                    {(isRecommended || savings) && (
                      <span
                        className={cn(
                          "absolute right-3 top-3 inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                          isRecommended
                            ? "bg-brand-accent text-bg-base"
                            : "border border-brand-accent/40 bg-brand-accent/10 text-brand-accent",
                        )}
                      >
                        {isRecommended ? "Recomendado" : `-${savings}%`}
                      </span>
                    )}

                    <span className={cn("text-[10px] font-bold uppercase tracking-widest text-tertiary mb-1 block", (isRecommended || savings) && "pr-24")}>
                      {isRecommended ? "Mais escolhido" : isFree ? "Comece por aqui" : "Plano"}
                    </span>
                    <h2 className={cn("text-xl font-black text-primary pr-24 leading-tight")}>{plan.name}</h2>

                    <div className="mt-3">
                      <div className="flex items-baseline gap-2">
                        <span
                          className={cn(
                            "font-display leading-none tracking-tight text-primary",
                            isRecommended
                              ? "text-[34px] font-bold lg:text-[40px]"
                              : "text-[30px] font-bold lg:text-[34px]",
                          )}
                        >
                          {isFree ? "Grátis" : centsToBRL(plan.price_cents)}
                        </span>
                        {plan.original_price_cents != null &&
                          plan.original_price_cents > plan.price_cents && (
                            <span className="text-[12px] text-secondary line-through">
                              {centsToBRL(plan.original_price_cents)}
                            </span>
                          )}
                      </div>
                      <p className="text-[12px] text-tertiary font-bold uppercase tracking-wider mt-1.5">
                        {isFree
                          ? `${plan.days} dias · sem cartão`
                          : perMonth
                            ? `≈ ${perMonth}/mês · ${plan.days} dias`
                            : `${plan.days} dias de acesso`}
                      </p>
                    </div>

                    <hr className="pc-rule my-3" />

                    <ul className="min-h-0 flex-1 space-y-2 overflow-hidden text-[12.5px] leading-snug">
                      {planHighlights(plan).slice(0, 4).map((h) => (
                        <li key={h} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-accent" aria-hidden />
                          <span className="text-secondary">{h}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(plan.id);
                        handleBuy(plan);
                      }}
                      disabled={buying === plan.id}
                      data-loading={buying === plan.id ? "true" : undefined}
                      className={cn(
                        "inline-flex items-center justify-center gap-2 pc-focus mt-3 h-11 w-full px-3 rounded-xl transition-all font-bold text-sm",
                        isRecommended
                          ? "bg-brand-accent text-bg-base hover:bg-brand-accent-soft shadow-lg shadow-brand-accent/10"
                          : "border border-subtle bg-surface text-primary hover:border-brand-accent hover:text-brand-accent",
                      )}
                    >
                      {buying === plan.id
                        ? "Iniciando…"
                        : isFree
                          ? "Começar grátis"
                          : "Assinar agora"}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Modal: Comparar recursos */}
        <Dialog open={openSheet === "compare"} onOpenChange={(v) => !v && setOpenSheet(null)}>
          <DialogContent className="max-w-3xl border-subtle/70 bg-surface p-0">
            <DialogHeader className="border-b border-subtle/70 px-5 py-3">
              <span className={"text-[10px] font-bold uppercase tracking-widest text-tertiary"}>Documento oficial</span>
              <DialogTitle className={cn("text-2xl font-black text-primary", "mt-0.5")}>
                Comparar <span className="italic text-brand-accent">recursos</span>
              </DialogTitle>
              <DialogDescription className={"text-sm text-secondary"}>
                Diferenças reais entre a degustação e os planos pagos.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[70svh] overflow-y-auto px-5 py-3">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-subtle/70">
                    <th className={cn("text-[11px] font-bold uppercase tracking-wider text-tertiary", "py-2 text-left")}>Recurso</th>
                    <th className={cn("text-[11px] font-bold uppercase tracking-wider text-tertiary", "py-2 text-center")}>Degustação</th>
                    <th className={cn("text-[11px] font-bold uppercase tracking-wider text-tertiary", "py-2 text-center")}>Mensal</th>
                    <th className={cn("text-[11px] font-bold uppercase tracking-wider text-tertiary", "py-2 text-center")}>Trimestral</th>
                    <th className={cn("text-[11px] font-bold uppercase tracking-wider text-tertiary", "py-2 text-center text-brand-accent")}>Anual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {[
                    ["Busca de preços", true, true, true, true],
                    ["Comparador entre mercados", true, true, true, true],
                    ["Alertas de preço", false, true, true, true],
                    ["Análises de IA / mês", "1", "30", "150", "150"],
                    ["Ranking de bairros", true, true, true, true],
                    ["Exportar CSV/PDF", false, true, true, true],
                    ["Prioridade de suporte", false, false, true, true],
                  ].map(([label, ...cols], i) => (
                    <tr key={i}>
                      <th className={cn("text-sm", "py-2 text-left font-medium text-primary")}>
                        {label as string}
                      </th>
                      {cols.map((c, j) => (
                        <td key={j} className="py-2 text-center">
                          {typeof c === "boolean" ? (
                            c ? (
                              <Check className="mx-auto h-4 w-4 text-brand-accent" aria-label="Incluído" />
                            ) : (
                              <Minus className="mx-auto h-4 w-4 text-secondary/60" aria-label="Não incluído" />
                            )
                          ) : (
                            <span className={cn("font-bold text-brand-accent", "tabular-nums")}>{c}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className={cn("text-sm text-secondary", "mt-3 flex items-center gap-1.5")}>
                <ShieldCheck className="h-3.5 w-3.5 text-brand-accent" aria-hidden />
                Ativação imediata após confirmação de pagamento pelo Mercado Pago.
              </p>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal: Perguntas frequentes */}
        <Dialog open={openSheet === "faq"} onOpenChange={(v) => !v && setOpenSheet(null)}>
          <DialogContent className="max-w-2xl border-subtle/70 bg-surface p-0">
            <DialogHeader className="border-b border-subtle/70 px-5 py-3">
              <span className={"text-[10px] font-bold uppercase tracking-widest text-tertiary"}>Ajuda rápida</span>
              <DialogTitle className={cn("text-2xl font-black text-primary", "mt-0.5")}>
                Perguntas <span className="italic text-brand-accent">frequentes</span>
              </DialogTitle>
              <DialogDescription className={"text-sm text-secondary"}>
                As dúvidas que mais recebemos sobre planos, pagamento e cota de IA.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[70svh] overflow-y-auto px-5 py-2">
              <Accordion type="single" collapsible className="w-full">
                {buildFaq(trialDays).map((f, i) => (
                  <AccordionItem key={i} value={`q-${i}`} className="border-subtle/60">
                    <AccordionTrigger className={cn("text-sm font-semibold text-primary", "text-left hover:no-underline")}>
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent className={cn("text-sm text-secondary", "leading-relaxed text-primary/85")}>
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              <div className="mt-2 flex items-center justify-between border-t border-subtle/60 py-2">
                <p className={"text-sm text-secondary"}>Não encontrou sua resposta?</p>
                <Link
                  to="/fale-conosco"
                  className={cn(
                    "text-xs font-bold",
                    "pc-focus inline-flex items-center gap-1.5 rounded-full border border-subtle px-3 py-1 text-secondary hover:border-brand-accent hover:text-brand-accent",
                  )}
                >
                  Fale conosco →
                </Link>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Barra inferior: confiança + atalhos mobile (em fluxo, sempre visível) */}
        <div
          data-testid="planos-cta-bar"
          className={cn(
            "pc-shell",
            "shrink-0 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] pt-1",
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-subtle bg-surface px-3.5 py-2 shadow-elev-1">
            <p className="inline-flex items-center gap-1.5 text-[11.5px] text-secondary">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-accent" aria-hidden />
              Pagamento seguro Mercado Pago · Cancele quando quiser
            </p>
            <div className="flex items-center gap-1.5 md:hidden">
              <button
                type="button"
                onClick={() => setOpenSheet("compare")}
                className="pc-focus inline-flex h-8 items-center gap-1 rounded-full border border-subtle bg-base px-2.5 text-[11.5px] font-semibold text-secondary hover:border-brand-accent hover:text-brand-accent"
              >
                <Sparkles className="h-3 w-3 text-brand-accent" aria-hidden />
                Comparar
              </button>
              <button
                type="button"
                onClick={() => setOpenSheet("faq")}
                className="pc-focus inline-flex h-8 items-center gap-1 rounded-full border border-subtle bg-base px-2.5 text-[11.5px] font-semibold text-secondary hover:border-brand-accent hover:text-brand-accent"
              >
                FAQ
              </button>
              <Link
                to="/resgatar"
                className="pc-focus inline-flex h-8 items-center rounded-full px-2.5 text-[11.5px] font-semibold text-brand-accent hover:underline"
              >
                Código →
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
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
        plans.map((p) => [p.slug, `${p.days} dias`]),
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
      },
    },
    {
      label: "Alertas de queda de preço",
      values: {
        ...val("degustacao", "Prévia"),
        ...val("mensal", true),
        ...val("trimestral", true),
        ...val("anual", true),
      },
    },
    {
      label: "Listas inteligentes",
      values: {
        ...val("degustacao", true),
        ...val("mensal", true),
        ...val("trimestral", true),
        ...val("anual", true),
      },
    },
    {
      label: "Histórico completo",
      values: {
        ...val("degustacao", false),
        ...val("mensal", true),
        ...val("trimestral", true),
        ...val("anual", true),
      },
    },
    {
      label: "Suporte prioritário",
      values: {
        ...val("degustacao", false),
        ...val("mensal", false),
        ...val("trimestral", true),
        ...val("anual", true),
      },
    },
    {
      label: "Scan Inteligente (IA) / mês",
      values: {
        ...val("degustacao", "1 análise (única)"),
        ...val("mensal", "30 análises/mês"),
        ...val("trimestral", "40 análises/mês"),
        ...val("anual", "60 análises/mês"),
      },
    },
    {
      label: "Cataloga\u00e7\u00e3o por foto (lote)",
      values: {
        ...val("degustacao", false),
        ...val("mensal", false),
        ...val("trimestral", true),
        ...val("anual", true),
      },
    },
    {
      label: "Pacote extra de IA (avulso)",
      values: {
        ...val("degustacao", false),
        ...val("mensal", "R$ 9,90 / 50"),
        ...val("trimestral", "R$ 9,90 / 50"),
        ...val("anual", "R$ 9,90 / 50"),
      },
    },
  ];
}


function ComparisonCell({ value }: { value: string | boolean | undefined }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center justify-center">
        <Check className="h-4 w-4 text-brand-accent" strokeWidth={2.5} aria-label="Incluído" />
      </span>
    );
  }
  if (value === false || value === undefined) {
    return (
      <span className="inline-flex items-center justify-center text-secondary/50">
        <Minus className="h-3.5 w-3.5" aria-label="Não incluído" />
      </span>
    );
  }
  return <span className="text-[13px] font-semibold text-primary">{value}</span>;
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
    <div className="overflow-x-auto rounded-xl border border-subtle bg-surface shadow-elev-1">
      <table className="w-full min-w-[580px] border-collapse text-left">
        <thead>
          <tr className="border-b border-subtle">
            <th
              scope="col"
              className="sticky left-0 z-[1] w-[34%] bg-surface px-4 py-3.5 text-[11.5px] font-bold uppercase tracking-[0.14em] text-secondary"
            >
              Recursos
            </th>
            {plans.map((p) => {
              const isRec = p.slug === recommendedSlug;
              return (
                <th
                  key={p.id}
                  scope="col"
                  className={cn(
                    "px-3 py-3.5 text-center align-top",
                    isRec && "relative bg-brand-accent/[0.08]",
                  )}
                >
                  {isRec && (
                    <span
                      aria-hidden
                      className="absolute inset-x-0 top-0 h-[3px] bg-brand-accent"
                    />
                  )}
                  {isRec && (
                    <span className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-brand-accent px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-navy">
                      <Sparkles className="h-2.5 w-2.5" aria-hidden /> Ideal
                    </span>
                  )}
                  <div className="font-display text-[14px] font-semibold text-primary">
                    {p.name}
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-secondary">
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
                className="sticky left-0 z-[1] whitespace-normal bg-inherit px-4 py-3 text-left text-[13px] font-medium text-primary"
              >
                {row.label}
              </th>
              {plans.map((p) => {
                const isRec = p.slug === recommendedSlug;
                return (
                  <td
                    key={p.id}
                    className={cn(
                      "px-3 py-2.5 text-center",
                      isRec && "bg-brand-accent/[0.06]",
                    )}
                  >
                    <ComparisonCell value={row.values[p.slug]} />
                  </td>
                );
              })}
            </tr>
          ))}
          {/* Linha final: CTAs */}
          <tr className="border-t border-subtle">
            <th scope="row" className="sticky left-0 z-[1] bg-surface px-4 py-3" />
            {plans.map((p) => {
              const isRec = p.slug === recommendedSlug;
              const isFree = p.price_cents === 0;
              return (
                <td
                  key={p.id}
                  className={cn("px-2 py-3 align-top", isRec && "bg-brand-accent/[0.08]")}
                >
                  <button
                    type="button"
                    onClick={() => onBuy(p)}
                    disabled={buying === p.id}
                    className={cn(
                      "inline-flex min-h-10 w-full items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] font-bold uppercase tracking-[0.08em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent disabled:cursor-wait disabled:opacity-70",
                      isRec
                        ? "bg-brand-accent text-brand-navy shadow-elev-1 hover:brightness-105"
                        : "border border-subtle bg-base text-primary hover:border-brand-accent hover:text-brand-accent",
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

