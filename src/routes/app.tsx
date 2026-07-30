import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  ArrowRight,
  Bell,
  Loader2,
  ShoppingCart,
  Star,
  TrendingDown,
  Wallet,
} from "lucide-react";

import { AppShell } from "@/components/brand/AppShell";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { StoreDetailsDrawer } from "@/components/stores/StoreDetailsDrawer";
import type { PublicStore } from "@/lib/stores-public.functions";

import { DashboardSearch } from "@/components/app/DashboardSearch";
import { StoreRankStrip } from "@/components/app/StoreRankStrip";
import { FavoritesDock } from "@/components/app/FavoritesDock";
import { Price } from "@/components/ds/Price";
import { useAppHomeData } from "@/hooks/useAppHomeData";
import { getAccessStatus, daysRemaining } from "@/lib/paywall";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Meu painel — PreçoCerto Feijó" },
      {
        name: "description",
        content:
          "Painel do cliente PreçoCerto: compare preços dos mercados de Feijó, acompanhe favoritos e monte listas mais baratas.",
      },
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
    mutations: {
      removeItem,
      removeMarket,
      reorderItems,
      reorderMarkets,
      addToList,
    },
  } = useAppHomeData();

  const [selectedStore, setSelectedStore] = useState<PublicStore | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Guarda o gatilho para devolver o foco ao fechar o drawer (WCAG 2.4.3).
  const drawerTriggerRef = useRef<HTMLElement | null>(null);

  const openStoreByName = (name: string) => {
    const store = storesByName.get(name.trim().toLowerCase());
    if (!store) return;
    drawerTriggerRef.current = document.activeElement as HTMLElement | null;
    setSelectedStore(store);
    setDrawerOpen(true);
  };

  const handleDrawerOpenChange = (open: boolean) => {
    setDrawerOpen(open);
    if (!open) drawerTriggerRef.current?.focus?.();
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

  const statusLine =
    status === "trial"
      ? `Teste grátis · ${trialDays} ${trialDays === 1 ? "dia" : "dias"} restantes`
      : status === "active"
        ? `Assinatura ativa · renova em ${paidDays} ${paidDays === 1 ? "dia" : "dias"}`
        : status === "expired"
          ? "Assinatura vencida · reative para continuar"
          : "Acesso liberado";

  const summary = summaryQuery.data;
  const loading = summaryQuery.isLoading;

  const potentialSavings = (summary?.lists ?? []).reduce(
    (acc, l) => acc + (l.potentialSavings ?? 0),
    0,
  );

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
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 px-3 py-3 md:px-5 lg:h-[calc(100dvh-3.5rem)] lg:overflow-hidden">
        {/* Cabeçalho compacto: saudação + status + ações */}
        <header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Meu painel
            </p>
            <h1 className="truncate font-display text-[22px] font-extrabold leading-tight tracking-tight text-foreground md:text-[26px]">
              Olá, {firstName}
            </h1>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <span
              className={cn(
                "hidden rounded-full border px-2.5 py-1 text-[12px] font-semibold sm:inline-flex",
                status === "expired"
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-border bg-background text-muted-foreground",
              )}
            >
              {statusLine}
            </span>
            <Link
              to="/lista/nova"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Nova lista <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
            <Link
              to="/alertas"
              aria-label="Alertas de preço"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-[13px] font-semibold text-foreground transition hover:border-primary/50 hover:text-primary"
            >
              <Bell className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden md:inline">Alertas</span>
            </Link>
          </div>
        </header>

        {/* Métricas do banco */}
        <div className="grid shrink-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            icon={ShoppingCart}
            label="Suas listas"
            value={summary ? String(summary.totals.listsCount) : "—"}
            hint={
              summary
                ? `${summary.totals.itemsCount} ${summary.totals.itemsCount === 1 ? "item" : "itens"} para comprar`
                : "carregando"
            }
          />
          <Metric
            icon={Star}
            label="Produtos favoritos"
            value={summary ? String(summary.totals.favoritesCount) : "—"}
            hint="preços acompanhados por você"
          />
          <Metric
            icon={TrendingDown}
            label="Cesta mais barata"
            value={
              summary?.totals.estimatedCartTotal != null ? (
                <Price value={summary.totals.estimatedCartTotal} size="lg" />
              ) : (
                "—"
              )
            }
            hint={
              summary?.totals.estimatedCartMarket
                ? `hoje em ${summary.totals.estimatedCartMarket}`
                : "favorite produtos para calcular"
            }
            tone="success"
          />
          <Metric
            icon={Wallet}
            label="Economia potencial"
            value={
              potentialSavings > 0 ? (
                <Price value={potentialSavings} size="lg" tone="savings" />
              ) : (
                "—"
              )
            }
            hint="somando suas listas ativas"
          />
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Puxando os
            preços mais recentes…
          </div>
        )}

        {summary && (
          <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="flex min-h-0 flex-col">
              <DashboardSearch />
            </div>
            <div className="grid min-h-0 gap-3 lg:grid-rows-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <StoreRankStrip
                storeNames={storeNameSet}
                onOpenStore={openStoreByName}
              />
              <FavoritesDock
                summary={summary}
                lists={listsQuery.data ?? []}
                storeNames={storeNameSet}
                onOpenStore={openStoreByName}
                onMoveItem={moveItem}
                onRemoveItem={(id) => removeItem.mutate(id)}
                onAddToList={(input) => addToList.mutate(input)}
                onMoveMarket={moveMarket}
                onRemoveMarket={(id) => removeMarket.mutate(id)}
              />
            </div>
          </div>
        )}
      </div>

      <StoreDetailsDrawer
        store={selectedStore}
        open={drawerOpen}
        onOpenChange={handleDrawerOpenChange}
      />
    </AppShell>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  hint: string;
  tone?: "success";
}) {
  return (
    <article className="rounded-2xl border border-border/70 bg-card px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            tone === "success" ? "text-savings-foreground" : "text-muted-foreground",
          )}
          aria-hidden
        />
      </div>
      <p className="pc-num mt-1 text-[26px] font-semibold leading-none text-foreground">
        {value}
      </p>
      <p className="mt-1 truncate text-[12px] text-muted-foreground">{hint}</p>
    </article>
  );
}

function swap(ids: string[], idx: number, dir: -1 | 1): string[] | null {
  const target = idx + dir;
  if (target < 0 || target >= ids.length) return null;
  const next = ids.slice();
  [next[idx], next[target]] = [next[target], next[idx]];
  return next;
}
