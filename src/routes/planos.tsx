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
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Footer } from "@/components/brand/Footer";
import { Button } from "@/components/ui/button";
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
    <div className="min-h-screen bg-[#F7F9FC]">
      <SiteHeader variant="solid" />

      <main className="mx-auto max-w-[1280px] px-4 py-12 md:px-8">
        <section className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <h1 className="text-4xl font-black text-[#0F172A] tracking-tight mb-3">Planos e preços</h1>
              <p className="text-lg text-[#64748B] font-medium">Assinatura mensal a partir de <strong className="text-[#2563EB]">R$ 29,90</strong> — economize até 30% no anual.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button onClick={() => setOpenSheet("compare")} variant="outline" className="rounded-full border-[#E5EAF1] bg-white text-[#64748B] h-12 px-6 shadow-sm hover:text-[#2563EB] font-bold">
                <Sparkles className="w-4 h-4 mr-2 text-[#EAB308]" />
                Comparar recursos
              </Button>
              <Button onClick={() => setOpenSheet("faq")} variant="ghost" className="rounded-full text-[#64748B] h-12 px-6 font-bold hover:text-[#2563EB]">
                Perguntas frequentes
              </Button>
            </div>
          </div>
        </section>

        <section className="mb-12">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-96 rounded-[32px] border border-[#E5EAF1] bg-white animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map((plan) => {
                const isRecommended = plan.slug === recommendedSlug;
                const perMonth = pricePerMonth(plan.price_cents, plan.days);
                const isFree = plan.price_cents === 0;
                const savings = plan.original_price_cents && plan.original_price_cents > plan.price_cents
                    ? Math.round(((plan.original_price_cents - plan.price_cents) / plan.original_price_cents) * 100)
                    : null;

                return (
                  <article
                    key={plan.id}
                    className={cn(
                      "relative flex flex-col p-8 rounded-[40px] transition-all duration-500",
                      isRecommended 
                        ? "bg-white border-2 border-[#2563EB] shadow-[0_20px_40px_-15px_rgba(37,99,235,0.1)] scale-105 z-10" 
                        : "bg-white border border-[#E5EAF1] hover:border-[#2563EB]/30 shadow-sm"
                    )}
                  >
                    {(isRecommended || savings) && (
                      <span
                        className={cn(
                          "absolute right-3 top-3 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] shadow-sm",
                          isRecommended
                            ? "bg-brand-accent text-bg-base"
                            : "border border-brand-accent/30 bg-brand-accent/5 text-brand-accent",
                        )}
                      >
                        {isRecommended ? (
                          <>
                            <Sparkles className="h-3 w-3" />
                            Recomendado
                          </>
                        ) : `-${savings}%`}
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

        <section className="mb-24">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-[#0F172A] tracking-tight">Perguntas frequentes</h2>
            <Link to="/ajuda" className="text-sm font-bold text-[#2563EB] hover:underline">Ver central de ajuda →</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {buildFaq(trialDays).map((item, idx) => (
              <div key={idx} className="bg-white rounded-[32px] p-8 border border-[#E5EAF1] shadow-sm">
                <h3 className="text-lg font-black text-[#0F172A] mb-3">{item.q}</h3>
                <p className="text-[#64748B] font-medium leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Modal: Comparar recursos */}
        <Dialog open={openSheet === "compare"} onOpenChange={(v) => !v && setOpenSheet(null)}>
          <DialogContent className="max-w-4xl border-[#E5EAF1] bg-white p-0 rounded-[40px] overflow-hidden">
            <DialogHeader className="border-b border-[#E5EAF1] px-8 py-6 bg-[#F8FAFC]">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2563EB] mb-2 block">Comparativo oficial</span>
              <DialogTitle className="text-2xl font-black text-[#0F172A]">
                Recursos do <span className="text-[#2563EB]">PreçoCerto</span>
              </DialogTitle>
              <DialogDescription className="text-[#64748B] font-medium">
                Confira o que está incluso em cada modalidade de acesso.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto p-8">
              <ComparisonMatrix plans={plans} onBuy={handleBuy} buying={buying} recommendedSlug={recommendedSlug} />
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal: Perguntas */}
        <Dialog open={openSheet === "faq"} onOpenChange={(v) => !v && setOpenSheet(null)}>
          <DialogContent className="max-w-2xl border-[#E5EAF1] bg-white p-8 rounded-[40px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-[#0F172A]">FAQ</DialogTitle>
            </DialogHeader>
            <Accordion type="single" collapsible className="w-full mt-4">
              {buildFaq(trialDays).map((item, idx) => (
                <AccordionItem key={idx} value={`item-${idx}`} className="border-[#E5EAF1]">
                  <AccordionTrigger className="text-left font-bold text-[#0F172A] hover:text-[#2563EB]">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-[#64748B] font-medium leading-relaxed">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </DialogContent>
        </Dialog>
      </main>

      <Footer />
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
  onBuy, 
  buying,
  recommendedSlug 
}: { 
  plans: PublicPlan[]; 
  onBuy: (p: PublicPlan) => void;
  buying: string | null;
  recommendedSlug: string;
}) {
  const matrix = planFeatureMatrix(plans);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="py-4 text-left text-[11px] font-black uppercase tracking-[0.2em] text-[#94A3B8]">Recurso</th>
            {plans.map((p) => (
              <th key={p.id} className="py-4 px-4 text-center">
                <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[#0F172A] mb-1">{p.name}</div>
                {p.slug === recommendedSlug && (
                  <span className="bg-[#2563EB] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full">Popular</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5EAF1]">
          {matrix.map((row, i) => (
            <tr key={i}>
              <td className="py-4 text-sm font-bold text-[#64748B]">{row.label}</td>
              {plans.map((p) => {
                const val = row.values[p.slug];
                return (
                  <td key={p.id} className="py-4 px-4 text-center text-sm font-medium">
                    {typeof val === "boolean" ? (
                      val ? <Check className="mx-auto w-5 h-5 text-[#2563EB]" /> : <Minus className="mx-auto w-5 h-5 text-[#94A3B8]/30" />
                    ) : (
                      val || "—"
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr>
            <td className="py-6"></td>
            {plans.map((p) => (
              <td key={p.id} className="py-6 px-4">
                <Button 
                  onClick={() => onBuy(p)}
                  disabled={buying === p.id}
                  className={cn(
                    "w-full rounded-2xl h-10 font-black text-xs uppercase tracking-widest",
                    p.slug === recommendedSlug 
                      ? "bg-[#2563EB] text-white hover:bg-[#1D4ED8]" 
                      : "bg-[#F8FAFC] border border-[#E5EAF1] text-[#0F172A] hover:bg-[#F1F5F9]"
                  )}
                >
                  {buying === p.id ? "..." : (p.price_cents === 0 ? "Testar" : "Assinar")}
                </Button>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

