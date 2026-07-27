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
  {
    q: "Quem pode usar a IA e quantas análises tenho por mês?",
    a: "O Scan Inteligente (leitura de nota, etiqueta e embalagem por foto) é exclusivo dos planos pagos: 30 análises/mês no Essencial, 150 no Trimestral e Anual e 600 no plano Comércio/Fundador. O plano de degustação não inclui IA. A cota renova todo mês e o saldo aparece no seu perfil.",
  },
  {
    q: "E se eu precisar de mais análises?",
    a: "Você compra um pacote avulso de 50 análises por R$ 9,90, válido por 12 meses e cumulativo com a cota do plano. Mercados parceiros que catalogam vitrine inteira usam o plano Comércio, com cataloga\u00e7\u00e3o em lote e prioridade de processamento.",
  },
];


function PlansPage() {
  const navigate = useNavigate();
  const fetchPlans = useServerFn(listPublicPlans);
  const create = useServerFn(createCheckoutOrder);
  const promptSignIn = usePromptSignIn();
  const [buying, setBuying] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"comparativo" | "faq">("comparativo");



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
    <div data-planos-shell className="flex h-[calc(100svh-64px)] flex-col overflow-hidden overscroll-none bg-background text-foreground md:h-[100svh]">
      <main className="flex min-h-0 flex-1 flex-col">
        {/* Cabeçalho compacto — altura fixa */}
        <section className={dsx(ds.container, "shrink-0 pt-2 pb-2 md:pt-3")}>
          <InternalPageHeader
            title="Planos e preços"
            highlight="preços"
            showBack={false}
            breadcrumbs={[{ label: "Início", to: "/" }, { label: "Planos" }]}
            description={
              <span data-short-hide className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
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

        {/* Planos — carrossel com snap no mobile, grade no desktop.
            Altura reservada: nunca empurra o restante da tela. */}
        <section
          id="planos"
          className={dsx(ds.container, "shrink-0 pb-2")}
          aria-label="Planos disponíveis"
        >
          {isLoading ? (
            <div className="flex gap-3 overflow-hidden pt-2 lg:grid lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  data-planos-card
                  className="h-[clamp(190px,26vh,238px)] w-[76%] shrink-0 animate-pulse rounded-xl border border-border bg-muted/40 lg:w-auto"
                />
              ))}
            </div>
          ) : (
            <div className="pc-rail flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 pt-2.5 lg:grid lg:grid-cols-4 lg:overflow-visible">
              {plans.map((plan) => {
                const isRecommended = plan.slug === recommendedSlug;
                const perMonth = pricePerMonth(plan.price_cents, plan.days);
                const isFounder = plan.slug.includes("fundador");
                const isFree = plan.price_cents === 0;
                const isSelected = selectedPlan?.id === plan.id;

                return (
                  <article
                    key={plan.id}
                    data-planos-card
                    onClick={() => setSelectedId(plan.id)}
                    className={dsx(
                      "pc-lift relative flex h-[clamp(190px,26vh,238px)] w-[76%] shrink-0 snap-start cursor-pointer flex-col rounded-xl border border-border bg-card p-3.5 shadow-elev-1 sm:w-[46%] lg:h-auto lg:min-h-[214px] lg:w-auto lg:p-4",
                      isRecommended && "border-brand-gold/70",
                      isFounder && "border-brand-gold/50",
                      isSelected && "border-brand-gold ring-2 ring-brand-gold/35",
                    )}
                  >
                    {(isRecommended || isFounder) && (
                      <span
                        className={dsx(
                          "absolute right-3 top-3 inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em]",
                          isRecommended ? "badge-gold" : "badge-gold-outline",
                        )}
                      >
                        {isRecommended ? "Mais escolhido" : "Limitado"}
                      </span>
                    )}

                    <h2 className="pr-24 font-display text-[15px] font-semibold leading-tight tracking-tight text-foreground">
                      {plan.name}
                    </h2>

                    <div className="mt-2">
                      <span className="font-display text-[25px] font-semibold leading-none tracking-tight text-foreground">
                        {isFree ? "Grátis" : centsToBRL(plan.price_cents)}
                      </span>
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

                    <div className="my-2.5 h-px bg-border/70" aria-hidden />

                    <ul className="min-h-0 flex-1 space-y-1.5 overflow-hidden text-[12px] leading-snug">
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

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(plan.id);
                        handleBuy(plan);
                      }}
                      disabled={buying === plan.id}
                      data-loading={buying === plan.id ? "true" : undefined}
                      className={dsx(
                        ds.btn.base,
                        "btn-state-safe mt-2.5 h-10 w-full px-3 text-[12px] font-semibold uppercase tracking-[0.06em]",
                        isRecommended || isFounder
                          ? "btn-gold shadow-elev-1"
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

        {/* Detalhes — ocupa a altura restante; a rolagem acontece AQUI dentro. */}
        <section
          id="detalhes"
          className={dsx(ds.container, "flex min-h-0 flex-1 flex-col pb-2")}
          aria-label="Detalhes dos planos"
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
            <div
              role="tablist"
              aria-label="Detalhes"
              className="flex shrink-0 items-center gap-1 border-b border-border/70 px-2"
            >
              {([
                { id: "comparativo", label: "Comparar recursos", Icon: Sparkles },
                { id: "faq", label: "Perguntas frequentes", Icon: ChevronDown },
              ] as const).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`tab-${t.id}`}
                  aria-selected={tab === t.id}
                  aria-controls="detalhes-panel"
                  onClick={() => setTab(t.id)}
                  className={dsx(
                    "relative -mb-px min-h-10 px-3 text-[12.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold",
                    tab === t.id
                      ? "text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-brand-gold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div
              id="detalhes-panel"
              role="tabpanel"
              aria-labelledby={`tab-${tab}`}
              className="pc-rail min-h-0 flex-1 overflow-y-auto px-4 py-3"
            >
              {tab === "comparativo" ? (
                <ComparisonMatrix
                  plans={plans}
                  recommendedSlug={recommendedSlug}
                  onBuy={handleBuy}
                  buying={buying}
                />
              ) : (
                <div className="divide-y divide-border/70">
                  {FAQ.map((item, i) => (
                    <details key={item.q} name="planos-faq" open={i === 0} className="group">
                      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 py-2 text-[12.5px] font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold">
                        <span>{item.q}</span>
                        <ChevronDown
                          className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-open:rotate-180"
                          aria-hidden
                        />
                      </summary>
                      <p className="pb-2.5 pr-6 text-[12px] leading-relaxed text-muted-foreground">
                        {item.a}
                      </p>
                    </details>
                  ))}
                  <p className="pt-2.5 text-[12px] text-muted-foreground">
                    Já comprou e recebeu um código?{" "}
                    <Link
                      to="/resgatar"
                      className="font-semibold text-brand-gold hover:underline"
                    >
                      Ativar meu código
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Barra de ação — em fluxo, sempre visível, nunca sobreposta. */}
        <div
          data-testid="planos-cta-bar"
          className={dsx(
            ds.container,
            "shrink-0 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] pt-1",
          )}
        >
          <div className="flex min-h-[54px] items-center justify-between gap-3 rounded-xl border border-border bg-card px-3.5 py-2 shadow-elev-2">

            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-semibold text-foreground">
                {selectedPlan?.name ?? "Escolha um plano"}
              </p>
              <p className="truncate text-[11.5px] text-muted-foreground">
                {!selectedPlan
                  ? "7 dias grátis, sem cartão"
                  : selectedPlan.price_cents === 0
                    ? "7 dias grátis · sem cartão"
                    : `${centsToBRL(selectedPlan.price_cents)} · ${selectedPlan.days} dias`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => selectedPlan && handleBuy(selectedPlan)}
              disabled={!selectedPlan || buying === selectedPlan.id}
              data-loading={selectedPlan && buying === selectedPlan.id ? "true" : undefined}
              className={dsx(
                ds.btn.base,
                "btn-gold btn-state-safe h-10 min-w-[8.5rem] shrink-0 px-4 text-[12px] font-bold uppercase tracking-[0.08em] shadow-elev-1 sm:min-w-[9.5rem]",
              )}
            >
              {selectedPlan && buying === selectedPlan.id
                ? "Iniciando…"
                : selectedPlan?.price_cents === 0
                  ? "Começar grátis"
                  : "Assinar"}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </button>
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
      label: "Scan Inteligente (IA) / mês",
      values: {
        ...val("degustacao", "—"),
        ...val("mensal", "30 análises"),
        ...val("trimestral", "150 análises"),
        ...val("anual", "150 análises"),
        ...val("fundador-feijo", "600 análises"),
        ...val("fundador", "600 análises"),
      },
    },
    {
      label: "Cataloga\u00e7\u00e3o por foto (lote)",
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
      label: "Pacote extra de IA (avulso)",
      values: {
        ...val("degustacao", false),
        ...val("mensal", "R$ 9,90 / 50"),
        ...val("trimestral", "R$ 9,90 / 50"),
        ...val("anual", "R$ 9,90 / 50"),
        ...val("fundador-feijo", "R$ 9,90 / 50"),
        ...val("fundador", "R$ 9,90 / 50"),
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

