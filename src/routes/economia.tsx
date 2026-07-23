import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getPersonalEconomy, getRegionalEconomy } from "@/lib/economy.functions";
import { MobileNav } from "@/components/nav/MobileNav";
import { useSession } from "@/hooks/useSession";
import {
  PageHeader,
  SectionCard,
  StatGrid,
  EmptyState,
  LoadingSkeleton,
} from "@/components/layout";
import { TrendingDown, Wallet, ShoppingBasket, LogIn, ReceiptText } from "lucide-react";

export const Route = createFileRoute("/economia")({
  head: () => ({
    meta: [
      { title: "Relatório de economia — PreçoCerto" },
      {
        name: "description",
        content:
          "Descubra quanto você economizou (ou poderia economizar) comparando seus preços pagos com os menores preços da região.",
      },
      { property: "og:title", content: "Sua economia — PreçoCerto" },
      { property: "og:description", content: "Relatório personalizado de economia com base em preços reais." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EconomyPage,
});

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

function EconomyPage() {
  const { user, loading } = useSession();
  const [tab, setTab] = useState<"pessoal" | "regional">("pessoal");

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <main className="mx-auto w-full max-w-5xl px-4 md:px-6">
        <PageHeader
          breadcrumbs={[{ label: "Início", to: "/" }, { label: "Economia" }]}
          title="Sua economia"
          description="Compare o que você pagou com o menor preço da região e descubra oportunidades."
          actions={
            <div className="inline-flex rounded-full border border-border bg-card p-1">
              <button
                onClick={() => setTab("pessoal")}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ${
                  tab === "pessoal" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Wallet className="h-3.5 w-3.5" /> Meu histórico
              </button>
              <button
                onClick={() => setTab("regional")}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ${
                  tab === "regional" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ShoppingBasket className="h-3.5 w-3.5" /> Cesta regional
              </button>
            </div>
          }
        />

        {tab === "pessoal" ? (
          loading ? (
            <LoadingSkeleton rows={4} />
          ) : user ? (
            <PersonalTab />
          ) : (
            <EmptyState
              icon={LogIn}
              title="Entre para ver sua economia"
              description="Precisamos do seu histórico de scans para calcular quanto você economizou."
              action={
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground"
                >
                  Fazer login
                </Link>
              }
            />
          )
        ) : (
          <RegionalTab />
        )}
      </main>

      <MobileNav />
    </div>
  );
}

function PersonalTab() {
  const fetchPersonal = useServerFn(getPersonalEconomy);
  const { data, isLoading, error } = useQuery({
    queryKey: ["personal-economy"],
    queryFn: () => fetchPersonal({}),
    staleTime: 30_000,
  });

  if (isLoading) return <LoadingSkeleton rows={4} />;
  if (error)
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-[14px] text-destructive">
        Erro: {(error as Error).message}
      </div>
    );
  if (!data) return null;

  if (data.itemsAnalyzed === 0)
    return (
      <EmptyState
        icon={ReceiptText}
        title="Sem histórico ainda"
        description="Faça alguns scans nos últimos 30 dias para gerar seu relatório personalizado."
        action={
          <Link
            to="/buscar"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground"
          >
            Começar a pesquisar preços
          </Link>
        }
      />
    );

  return (
    <div className="space-y-5">
      <StatGrid
        className="lg:grid-cols-3"
        stats={[
          { label: "Você já economizou", value: BRL(data.totalSavings), icon: TrendingDown, tone: "success" },
          { label: "Poderia ter economizado", value: BRL(data.totalPotential), icon: Wallet, tone: "warning" },
          { label: "Itens analisados", value: data.itemsAnalyzed, icon: ShoppingBasket },
        ]}
      />

      <SectionCard
        title="Onde há mais oportunidade"
        description="Últimos 30 dias · ordenado por potencial de economia"
        bodyClassName="p-0"
      >
        <ul className="divide-y divide-border">
          {data.items.map((it) => {
            const overpaid = it.userPaid - it.minPrice;
            const positive = overpaid > 0.01;
            return (
              <li
                key={`${it.productKey}-${it.scannedAt}`}
                className="flex items-center gap-3 px-4 py-3 md:px-5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-foreground">{it.displayName}</p>
                  <p className="text-[13px] text-muted-foreground">
                    Você pagou {BRL(it.userPaid)}
                    {it.storeName ? ` em ${it.storeName}` : ""} · menor {BRL(it.minPrice)}
                  </p>
                </div>
                <div
                  className={`text-right text-[14px] font-semibold ${
                    positive ? "text-amber-600" : "text-emerald-600"
                  }`}
                >
                  {positive ? `+${BRL(overpaid)}` : BRL(Math.abs(overpaid))}
                  <p className="text-[13px] font-normal text-muted-foreground">
                    {positive ? "acima" : "abaixo da média"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </SectionCard>
    </div>
  );
}

function RegionalTab() {
  const fetchRegional = useServerFn(getRegionalEconomy);
  const { data, isLoading, error } = useQuery({
    queryKey: ["regional-economy"],
    queryFn: () => fetchRegional({}),
    staleTime: 60_000,
  });

  if (isLoading) return <LoadingSkeleton rows={4} />;
  if (error)
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-[14px] text-destructive">
        Erro: {(error as Error).message}
      </div>
    );
  if (!data) return null;

  return (
    <div className="space-y-5">
      <StatGrid
        className="lg:grid-cols-3"
        stats={[
          { label: "Cesta pelo preço médio", value: BRL(data.totalAvg), icon: ShoppingBasket },
          { label: "Cesta pelo menor preço", value: BRL(data.totalMin), icon: TrendingDown, tone: "success" },
          { label: "Economia potencial", value: BRL(data.totalSavings), icon: Wallet, tone: "success" },
        ]}
      />

      <SectionCard
        title="Produtos mais comparados na região"
        description="Baseado em produtos com preço em 2 ou mais estabelecimentos"
        bodyClassName="p-0"
      >
        <ul className="divide-y divide-border">
          {data.items.map((it) => (
            <li key={it.productKey} className="flex items-center gap-3 px-4 py-3 md:px-5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-foreground">{it.displayName}</p>
                <p className="text-[13px] text-muted-foreground">
                  Menor: {BRL(it.minPrice)} · Médio: {BRL(it.avgPrice)} · Maior: {BRL(it.maxPrice)}
                  {it.cheapestStore ? ` · em ${it.cheapestStore}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[14px] font-semibold text-emerald-600">-{it.savingsPct.toFixed(1)}%</p>
                <p className="text-[13px] text-muted-foreground">{BRL(it.savings)} / un</p>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
