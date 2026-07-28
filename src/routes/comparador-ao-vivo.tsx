import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Loader2, Lock, ArrowRight } from "lucide-react";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { AppShell } from "@/components/brand/AppShell";
import { PageHeader } from "@/components/layout";
import {
  LiveBasketRanking,
  type LiveBasketFilters,
} from "@/components/basket/LiveBasketRanking";
import { useAppHomeData } from "@/hooks/useAppHomeData";
import { getAccessStatus } from "@/lib/paywall";

const searchSchema = z.object({
  cat: fallback(z.string(), "all").default("all"),
  city: fallback(z.string(), "all").default("all"),
  bairro: fallback(z.string(), "all").default("all"),
});

export const Route = createFileRoute("/comparador-ao-vivo")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Comparador ao vivo — PreçoCerto" },
      {
        name: "description",
        content:
          "Ranking em tempo real dos supermercados com a cesta básica mais barata do bairro.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ProtectedGate>
      <LiveComparatorPage />
    </ProtectedGate>
  ),
});

function LiveComparatorPage() {
  const { accountQuery } = useAppHomeData();
  const status = getAccessStatus(
    accountQuery.data
      ? {
          trial_ends_at: accountQuery.data.trialEndsAt,
          paid_until: accountQuery.data.paidUntil,
        }
      : null,
  );

  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/comparador-ao-vivo" });

  const filters: LiveBasketFilters = {
    category: search.cat as LiveBasketFilters["category"],
    city: search.city,
    neighborhood: search.bairro,
  };

  const onFiltersChange = (next: LiveBasketFilters) => {
    navigate({
      search: (prev: z.infer<typeof searchSchema>) => ({
        ...prev,
        cat: next.category,
        city: next.city,
        bairro: next.neighborhood,
      }),
      replace: true,
    });
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6">
        <PageHeader
          breadcrumbs={[{ label: "Meu painel", to: "/app" }, { label: "Comparador ao vivo" }]}
          title="Comparador ao vivo"
          description="Ranking em tempo real com a cesta básica mais barata da sua região."
        />

        {accountQuery.isLoading ? (
          <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Verificando sua assinatura…
          </div>
        ) : status === "active" ? (
          <div className="mt-6">
            <LiveBasketRanking value={filters} onChange={onFiltersChange} />
          </div>
        ) : (
          <PaywallPrompt trial={status === "trial"} />
        )}
      </div>
    </AppShell>
  );
}

function PaywallPrompt({ trial }: { trial: boolean }) {
  return (
    <div className="pc-elite-frame mt-6 rounded-2xl border bg-card p-6 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-gold/15 text-brand-gold">
        <Lock className="h-5 w-5" aria-hidden />
      </div>
      <h2 className="mt-3 text-lg font-semibold text-foreground">
        Recurso exclusivo dos planos pagos
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {trial
          ? "Você ainda está no teste grátis. Assine um plano para desbloquear o comparador em tempo real."
          : "Assine um plano para desbloquear o ranking em tempo real dos mercados com a cesta mais barata."}
      </p>
      <Link
        to="/planos"
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-gold px-4 py-2 text-sm font-bold uppercase tracking-wide text-brand-navy transition-transform hover:-translate-y-0.5"
      >
        Ver planos <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
}
