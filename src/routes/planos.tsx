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
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
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
      { title: "Escolha sua Economia — PreçoCerto" },
      {
        name: "description",
        content:
          "Planos flexíveis para consumidores que buscam poupar e lojistas que buscam crescer em Feijó/AC.",
      },
      { property: "og:title", content: "Escolha sua Economia — PreçoCerto" },
      {
        property: "og:description",
        content:
          "Inteligência de preços para você e para o seu negócio.",
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

function planHighlights(plan: PublicPlan): string[] {
  return (plan.features as string[]) || [];
}

function buildFaq(trialDays: number) {
  return [
    {
      q: "Preciso de cartão de crédito para o PreçoCerto+?",
      a: `Não. Você pode testar os recursos premium ou usar créditos avulsos sem compromisso.`,
    },
    {
      q: "Como os lojistas se beneficiam?",
      a: "Parceiros têm acesso a painéis de analytics, monitoramento de concorrência em tempo real e destaque nas buscas dos usuários.",
    },
    {
      q: "Como funciona o sistema de créditos?",
      a: "Além dos planos, você pode adquirir pacotes de créditos para consultas específicas de IA ou exportações de relatórios detalhados.",
    },
    {
      q: "Posso cancelar minha assinatura a qualquer momento?",
      a: "Sim, você tem total controle sobre sua assinatura direto no painel do usuário, sem taxas de cancelamento.",
    },
  ];
}

function PlansPage() {
  const navigate = useNavigate();
  const fetchPlans = useServerFn(listPublicPlans);
  const create = useServerFn(createCheckoutOrder);
  const promptSignIn = usePromptSignIn();
  const [buying, setBuying] = useState<string | null>(null);
  const [type, setType] = useState<"consumer" | "merchant">("consumer");
  const [openSheet, setOpenSheet] = useState<"compare" | "faq" | null>(null);

  const { data: plans = [], isLoading: loading } = useQuery({
    queryKey: ["public-plans"],
    queryFn: () => fetchPlans(),
  });
  usePlansRealtime();

  const filtered = plans.filter((p) => {
    const slug = p.slug.toLowerCase();
    const isMerchant = ["parceiro", "pro", "business", "enterprise", "local"].some(k => slug.includes(k));
    return type === "merchant" ? isMerchant : !isMerchant;
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
        toast.success("Plano ativado com sucesso!");
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <SiteHeader variant="solid" />

      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h1 className="text-4xl font-black tracking-tight text-[#0F172A] sm:text-5xl uppercase">
            Escolha sua <span className="text-[#2563EB]">Economia</span>
          </h1>
          <p className="mt-4 text-lg font-medium text-[#64748B]">
            Planos flexíveis para consumidores que buscam poupar e lojistas que buscam crescer.
          </p>
          
          <div className="mt-10 flex justify-center">
            <div className="inline-flex p-1 bg-white border border-[#E5EAF1] rounded-2xl shadow-sm">
              <button 
                onClick={() => setType("consumer")}
                className={cn(
                  "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                  type === "consumer" ? "bg-[#2563EB] text-white shadow-md" : "text-[#64748B] hover:text-[#0F172A]"
                )}
              >
                Para Você
              </button>
              <button 
                onClick={() => setType("merchant")}
                className={cn(
                  "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                  type === "merchant" ? "bg-[#2563EB] text-white shadow-md" : "text-[#64748B] hover:text-[#0F172A]"
                )}
              >
                Para sua Loja
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[500px] animate-pulse rounded-3xl bg-white border border-[#E5EAF1]"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((p) => (
              <PlanCard
                key={p.id}
                plan={p}
                onBuy={handleBuy}
                buying={buying === p.id}
                recommended={p.slug === "trimestral" || p.slug === "business"}
              />
            ))}
          </div>
        )}

        <div className="mt-24">
          <h2 className="text-center text-2xl font-black uppercase tracking-widest text-[#0F172A] mb-12">Comparativo de Recursos</h2>
          <ComparisonMatrix
            plans={filtered}
            onBuy={handleBuy}
            buying={buying}
            recommendedSlug={type === "consumer" ? "trimestral" : "business"}
          />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function PlanCard({
  plan,
  onBuy,
  buying,
  recommended,
}: {
  plan: PublicPlan;
  onBuy: (p: PublicPlan) => void;
  buying: boolean;
  recommended?: boolean;
}) {
  const isFree = plan.price_cents === 0;
  
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-3xl border p-8 transition-all duration-300 bg-white",
        recommended
          ? "border-[#2563EB] shadow-xl shadow-[#2563EB]/5 scale-105 z-10"
          : "border-[#E5EAF1] hover:border-[#CBD5E1] shadow-sm"
      )}
    >
      {recommended && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#2563EB] text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-lg">
          Recomendado
        </div>
      )}

      <div className="mb-8">
        <h3 className="text-xl font-black text-[#0F172A] uppercase tracking-tight">{plan.name}</h3>
        <p className="mt-2 text-sm font-medium text-[#64748B] min-h-[40px]">{plan.description}</p>
      </div>

      <div className="mb-8 flex items-baseline gap-1">
        <span className="text-4xl font-black tracking-tighter text-[#0F172A]">
          {isFree ? "Grátis" : centsToBRL(plan.price_cents)}
        </span>
        {!isFree && (
          <span className="text-sm font-bold text-[#94A3B8]">/{plan.days} dias</span>
        )}
      </div>

      <div className="flex-1">
        <ul className="space-y-4 mb-8">
          {planHighlights(plan).map((feature, i) => (
            <li key={i} className="flex items-start gap-3 text-sm font-bold text-[#64748B]">
              <Check className="h-5 w-5 shrink-0 text-[#2563EB]" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <Button
        onClick={() => onBuy(plan)}
        disabled={buying}
        className={cn(
          "w-full h-12 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
          recommended 
            ? "bg-[#2563EB] text-white hover:bg-[#1D4ED8] shadow-lg shadow-[#2563EB]/20" 
            : "bg-[#F8FAFC] border border-[#E5EAF1] text-[#0F172A] hover:bg-[#F1F5F9]"
        )}
      >
        {buying ? "Processando..." : isFree ? "Testar agora" : "Assinar plano"}
      </Button>
    </div>
  );
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
  const bySlug = Object.fromEntries(plans.map((p) => [p.slug, p]));
  const val = (slug: string, v: string | boolean) => (bySlug[slug] ? { [slug]: v } : {});

  const matrix = [
    {
      label: "Duração",
      values: Object.fromEntries(plans.map((p) => [p.slug, `${p.days} dias`])),
    },
    {
      label: "Consultas Ilimitadas",
      values: Object.fromEntries(plans.map((p) => [p.slug, true])),
    },
    {
      label: "Histórico de Preços",
      values: Object.fromEntries(plans.map((p) => [p.slug, true])),
    },
    {
      label: "Exportação de Dados",
      values: Object.fromEntries(plans.map((p) => [p.slug, !p.slug.includes("degustacao")])),
    }
  ];

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
                const v = row.values[p.slug];
                return (
                  <td key={p.id} className="py-4 px-4 text-center text-sm font-medium">
                    {typeof v === "boolean" ? (
                      v ? <Check className="mx-auto w-5 h-5 text-[#2563EB]" /> : <Minus className="mx-auto w-5 h-5 text-[#94A3B8]/30" />
                    ) : (
                      v || "—"
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
