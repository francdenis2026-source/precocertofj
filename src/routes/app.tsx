import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, ShoppingCart, Star, TrendingDown } from "lucide-react";

import { AppShell } from "@/components/brand/AppShell";
import { PageHeader, StatGrid } from "@/components/layout";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { StoreDetailsDrawer } from "@/components/stores/StoreDetailsDrawer";
import type { PublicStore } from "@/lib/stores-public.functions";

import { SectionKicker } from "@/components/dashboard/SectionKicker";
import { AppHero } from "@/components/app/AppHero";
import { ExperimentalBanner } from "@/components/app/ExperimentalBanner";
import { FavoriteItemsPanel } from "@/components/app/FavoriteItemsPanel";
import { FavoriteMarketsPanel } from "@/components/app/FavoriteMarketsPanel";
import { BestMarketCard } from "@/components/app/BestMarketCard";
import { ListsPanel } from "@/components/app/ListsPanel";
import { CheapestStoresRanking } from "@/components/app/CheapestStoresRanking";
import { QuickToolsPanel } from "@/components/app/QuickToolsPanel";
import { AdvancedProductSearch } from "@/components/app/AdvancedProductSearch";
import { useAppHomeData } from "@/hooks/useAppHomeData";
import { getAccessStatus, daysRemaining } from "@/lib/paywall";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Início — PreçoCerto" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AppHome,
});

function AppHome() {
  return (
    <ProtectedGate>
      <AppHomeContent />
    </ProtectedGate>
  );
}

function AppHomeContent() {
  const {
    summaryQuery,
    accountQuery,
    listsQuery,
    storesByName,
    mutations: { removeItem, removeMarket, reorderItems, reorderMarkets, addToList },
  } = useAppHomeData();

  const [selectedStore, setSelectedStore] = useState<PublicStore | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openStoreByName = (name: string) => {
    const store = storesByName.get(name.trim().toLowerCase());
    if (!store) return;
    setSelectedStore(store);
    setDrawerOpen(true);
  };

  const firstName =
    (accountQuery.data?.fullName ?? "").split(" ")[0] || "cliente";
  const status = getAccessStatus(
    accountQuery.data
      ? {
          trial_ends_at: accountQuery.data.trialEndsAt,
          paid_until: accountQuery.data.paidUntil,
        }
      : null,
  );
  const trialDays =
    status === "trial" ? daysRemaining(accountQuery.data?.trialEndsAt ?? null) : 0;
  const paidDays =
    status === "active" ? daysRemaining(accountQuery.data?.paidUntil ?? null) : 0;

  const summary = summaryQuery.data;
  const loading = summaryQuery.isLoading;

  const statusLine =
    status === "trial"
      ? `${trialDays} ${trialDays === 1 ? "dia" : "dias"} de teste grátis — aproveite`
      : status === "active"
        ? `Assinatura ativa · renova em ${paidDays} ${paidDays === 1 ? "dia" : "dias"}`
        : status === "expired"
          ? "Sua assinatura venceu — reative para continuar economizando"
          : "Que bom te ver de novo";

  const moveItem = (ids: string[], idx: number, dir: -1 | 1) => {
    const next = swap(ids, idx, dir);
    if (next) reorderItems.mutate(next);
  };
  const moveMarket = (ids: string[], idx: number, dir: -1 | 1) => {
    const next = swap(ids, idx, dir);
    if (next) reorderMarkets.mutate(next);
  };

  const storeNameSet = new Set(storesByName.keys());

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <PageHeader
          breadcrumbs={[{ label: "Meu painel" }]}
          title={`Olá, ${firstName}`}
          description={statusLine}
        />
        <AppHero firstName={firstName} statusLine={statusLine} />

        <div className="mt-5 md:mt-6">
          <ExperimentalBanner />
        </div>


        {loading && (
          <div className="mt-6 flex items-center gap-2 text-[14px] text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Puxando os preços mais recentes...
          </div>
        )}

        {summary && (
          <>
            <div className="mt-6 md:mt-8">
              <SectionKicker eyebrow="Seu resumo" title="Como você está economizando" />
              <div className="mt-3 md:mt-4">
                <StatGrid
                  className="lg:grid-cols-3"
                  stats={[
                    {
                      label: "Suas listas",
                      value: summary.totals.listsCount,
                      icon: ShoppingCart,
                      hint: `${summary.totals.itemsCount} ${summary.totals.itemsCount === 1 ? "item" : "itens"} para comprar`,
                    },
                    {
                      label: "Favoritos",
                      value: summary.totals.favoritesCount,
                      icon: Star,
                      hint: "produtos que você acompanha",
                      tone: "primary",
                    },
                    {
                      label: "Cesta mais barata",
                      value:
                        summary.totals.estimatedCartTotal !== null
                          ? brl(summary.totals.estimatedCartTotal)
                          : "—",
                      icon: TrendingDown,
                      hint: summary.totals.estimatedCartMarket
                        ? `hoje sai melhor em ${summary.totals.estimatedCartMarket}`
                        : "favorite produtos para ver o melhor mercado",
                      tone: summary.totals.estimatedCartMarket ? "success" : "default",
                    },
                  ]}
                />
              </div>
            </div>

            <div className="mt-6 md:mt-8">
              <QuickToolsPanel />
            </div>

            <div className="mt-6 md:mt-8">
              <AdvancedProductSearch />
            </div>

            <div id="ranking-lojas" className="mt-6 scroll-mt-24 md:mt-8">
              <CheapestStoresRanking />
            </div>





            <div className="mt-6 grid gap-4 md:mt-8 lg:grid-cols-3 lg:gap-5">
              <FavoriteItemsPanel
                items={summary.favoriteItems}
                lists={listsQuery.data ?? []}
                onMove={moveItem}
                onRemove={(favoriteId) => removeItem.mutate(favoriteId)}
                onAddToList={(input) => addToList.mutate(input)}
              />

              <aside className="space-y-4">
                <BestMarketCard
                  marketName={summary.totals.estimatedCartMarket}
                  total={summary.totals.estimatedCartTotal}
                  storeNames={storeNameSet}
                  onOpenStore={openStoreByName}
                />
                <FavoriteMarketsPanel
                  markets={summary.favoriteMarkets}
                  storeNames={storeNameSet}
                  onMove={moveMarket}
                  onRemove={(favoriteId) => removeMarket.mutate(favoriteId)}
                  onOpenStore={openStoreByName}
                />
              </aside>
            </div>

            <div className="mt-6 md:mt-8">
              <ListsPanel lists={summary.lists} />
            </div>
          </>
        )}
      </div>
      <StoreDetailsDrawer
        store={selectedStore}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </AppShell>
  );
}

function swap(ids: string[], idx: number, dir: -1 | 1): string[] | null {
  const target = idx + dir;
  if (target < 0 || target >= ids.length) return null;
  const next = ids.slice();
  [next[idx], next[target]] = [next[target], next[idx]];
  return next;
}
