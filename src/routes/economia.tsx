import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getPersonalEconomy, getRegionalEconomy } from "@/lib/economy.functions";
import { MobileNav } from "@/components/nav/MobileNav";
import { useSession } from "@/hooks/useSession";
import { ArrowLeft, TrendingDown, Wallet, ShoppingBasket, LogIn } from "lucide-react";

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
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <Link
            to="/"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-base font-semibold text-foreground">Sua economia</h1>
            <p className="text-[11px] text-muted-foreground">Compare o que você pagou com o menor preço da região</p>
          </div>
        </div>
        <div className="mx-auto max-w-4xl px-4">
          <div className="inline-flex rounded-full border border-border bg-card p-1">
            <button
              onClick={() => setTab("pessoal")}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                tab === "pessoal" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Wallet className="h-3.5 w-3.5" />
              Meu histórico
            </button>
            <button
              onClick={() => setTab("regional")}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                tab === "regional" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShoppingBasket className="h-3.5 w-3.5" />
              Cesta regional
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {tab === "pessoal" ? (
          loading ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              Carregando...
            </div>
          ) : user ? (
            <PersonalTab />
          ) : (
            <LoginRequired />
          )
        ) : (
          <RegionalTab />
        )}
      </main>

      <MobileNav />
    </div>
  );
}

function LoginRequired() {
  return (
    <div className="rounded-2xl border border-border bg-card p-8 text-center">
      <LogIn className="mx-auto mb-3 h-10 w-10 text-primary" />
      <h2 className="text-base font-semibold text-foreground">Entre para ver sua economia</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Precisamos do seu histórico de scans para calcular quanto você economizou.
      </p>
      <Link
        to="/login"
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
      >
        Fazer login
      </Link>
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

  if (isLoading)
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Analisando seus últimos scans...
      </div>
    );
  if (error)
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        Erro: {(error as Error).message}
      </div>
    );
  if (!data) return null;

  if (data.itemsAnalyzed === 0)
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <h2 className="text-base font-semibold text-foreground">Sem histórico ainda</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Faça alguns scans nos últimos 30 dias para gerar seu relatório personalizado.
        </p>
        <Link
          to="/buscar"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          Começar a pesquisar preços
        </Link>
      </div>
    );

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Você já economizou" value={BRL(data.totalSavings)} tone="positive" />
        <SummaryCard label="Poderia ter economizado" value={BRL(data.totalPotential)} tone="warning" />
        <SummaryCard label="Itens analisados" value={data.itemsAnalyzed.toString()} tone="neutral" />
      </div>

      <section className="rounded-2xl border border-border bg-card">
        <header className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">Onde há mais oportunidade</h2>
          <p className="text-[11px] text-muted-foreground">Últimos 30 dias · ordenado por potencial de economia</p>
        </header>
        <ul className="divide-y divide-border">
          {data.items.map((it) => {
            const overpaid = it.userPaid - it.minPrice;
            const positive = overpaid > 0.01;
            return (
              <li key={`${it.productKey}-${it.scannedAt}`} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{it.displayName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Você pagou {BRL(it.userPaid)}
                    {it.storeName ? ` em ${it.storeName}` : ""} · menor {BRL(it.minPrice)}
                  </p>
                </div>
                <div className={`text-right text-sm font-semibold ${positive ? "text-amber-600" : "text-emerald-600"}`}>
                  {positive ? `+${BRL(overpaid)}` : BRL(Math.abs(overpaid))}
                  <p className="text-[10px] font-normal text-muted-foreground">
                    {positive ? "acima" : "abaixo da média"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
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

  if (isLoading)
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Calculando cesta regional...
      </div>
    );
  if (error)
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        Erro: {(error as Error).message}
      </div>
    );
  if (!data) return null;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Cesta pelo preço médio" value={BRL(data.totalAvg)} tone="neutral" />
        <SummaryCard label="Cesta pelo menor preço" value={BRL(data.totalMin)} tone="positive" />
        <SummaryCard label="Economia potencial" value={BRL(data.totalSavings)} tone="positive" />
      </div>

      <section className="rounded-2xl border border-border bg-card">
        <header className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">Produtos mais comparados na região</h2>
          <p className="text-[11px] text-muted-foreground">
            Baseado em produtos com preço em 2 ou mais estabelecimentos
          </p>
        </header>
        <ul className="divide-y divide-border">
          {data.items.map((it) => (
            <li key={it.productKey} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{it.displayName}</p>
                <p className="text-[11px] text-muted-foreground">
                  Menor: {BRL(it.minPrice)} · Médio: {BRL(it.avgPrice)} · Maior: {BRL(it.maxPrice)}
                  {it.cheapestStore ? ` · em ${it.cheapestStore}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-emerald-600">-{it.savingsPct.toFixed(1)}%</p>
                <p className="text-[10px] text-muted-foreground">{BRL(it.savings)} / un</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "positive" | "warning" | "neutral";
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600"
      : tone === "warning"
      ? "text-amber-600"
      : "text-foreground";
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <TrendingDown className="h-4 w-4" />
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}
