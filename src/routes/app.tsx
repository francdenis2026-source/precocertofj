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
import { ForceUpdateButton } from "@/components/app/ForceUpdateButton";
import { Price } from "@/components/ds/Price";
import { useAppHomeData } from "@/hooks/useAppHomeData";
import { getAccessStatus, daysRemaining } from "@/lib/paywall";
import { cn } from "@/lib/utils";
import { tc } from "@/lib/typeclear";

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
      { property: "og:title", content: "Meu painel — PreçoCerto Feijó" },
      {
        property: "og:description",
        content: "Compare preços, acompanhe favoritos e organize suas listas no painel PreçoCerto.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
      <div className="app-dashboard mx-auto flex w-full max-w-[1540px] flex-col gap-2 px-3 py-2 md:px-4 lg:h-[calc(100dvh-3.5rem)] lg:overflow-hidden">
        {/* Cabeçalho compacto */}
        <header className="relative shrink-0 overflow-hidden rounded-lg border border-primary/30 bg-primary/95 px-3 py-2 text-primary-foreground shadow-sm backdrop-blur-md md:px-3.5">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-brand/20 blur-3xl"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-brand/60"
          />
          <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <div className="min-w-0">
              <p className={cn(tc.eyebrow, "text-brand")}>
                Meu painel
              </p>
              <h1 className="truncate font-display text-[18px] font-semibold leading-tight md:text-[20px]">
                Olá, {firstName}
              </h1>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
              <Link
                to="/lista/nova"
                className="inline-flex h-7 items-center gap-1 rounded-md bg-brand px-2.5 text-[11px] font-semibold text-brand-foreground transition hover:bg-brand-strong"
              >
                Nova lista <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
              <ForceUpdateButton />
              <Link
                to="/alertas"
                aria-label="Alertas de preço"
                className="inline-flex h-7 items-center gap-1 rounded-md border border-primary-foreground/30 bg-primary-foreground/10 px-2 text-[11px] font-medium text-primary-foreground transition hover:bg-primary-foreground/20"
              >
                <Bell className="h-3 w-3" aria-hidden />
                <span className="hidden md:inline">Alertas</span>
              </Link>
            </div>
          </div>
        </header>


        {/* Métricas do banco */}
        <div className="grid shrink-0 grid-cols-2 gap-1.5 xl:grid-cols-4">
          <Metric
            icon={ShoppingCart}
            label="Suas listas"
            value={summary ? String(summary.totals.listsCount) : "—"}
            hint={
              summary
                ? `${summary.totals.itemsCount} ${summary.totals.itemsCount === 1 ? "item" : "itens"} para comprar`
                : "carregando"
            }
            tone="primary"
          />
          <Metric
            icon={Star}
            label="Produtos favoritos"
            value={summary ? String(summary.totals.favoritesCount) : "—"}
            hint="preços acompanhados por você"
            tone="brand"
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
            tone="savings"
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
            tone="warning"
          />
        </div>


        {loading && (
          <div className={cn(tc.meta, "flex items-center gap-2")}>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Puxando os
            preços mais recentes…
          </div>
        )}

        <div className="grid min-h-0 flex-1 gap-2.5 lg:grid-cols-[minmax(0,1.42fr)_minmax(320px,0.86fr)]">
          <div className="flex h-[62vh] min-h-[380px] flex-col lg:h-auto lg:min-h-0">
            <DashboardSearch />
          </div>
          <div className="grid min-h-0 gap-2.5 lg:grid-rows-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
            <StoreRankStrip
              storeNames={storeNameSet}
              onOpenStore={openStoreByName}
            />
            {summary ? (
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
            ) : (
               <div className="min-h-0 animate-pulse rounded-lg border border-border bg-card/80 backdrop-blur-md" />
            )}
          </div>
        </div>

      </div>

      <StoreDetailsDrawer
        store={selectedStore}
        open={drawerOpen}
        onOpenChange={handleDrawerOpenChange}
      />
    </AppShell>
  );
}

type MetricTone = "primary" | "brand" | "savings" | "warning";

const METRIC_TONES: Record<
  MetricTone,
  { card: string; chip: string; rail: string }
> = {
  primary: {
    card: "border-primary/25 bg-primary/[0.06]",
    chip: "bg-primary/12 text-primary",
    rail: "bg-primary",
  },
  brand: {
    card: "border-brand/35 bg-brand/[0.10]",
    chip: "bg-brand/20 text-brand-soft",
    rail: "bg-brand",
  },
  savings: {
    card: "border-savings/30 bg-savings/[0.08]",
    chip: "bg-savings/15 text-savings",
    rail: "bg-savings",
  },
  warning: {
    card: "border-warning/35 bg-warning/[0.10]",
    chip: "bg-warning/20 text-accent-ink",
    rail: "bg-warning",
  },
};

function Metric({
  icon: Icon,
  label,
  value,
  hint,
  tone = "primary",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  hint: string;
  tone?: MetricTone;
}) {
  const t = METRIC_TONES[tone];
  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-lg border px-3 py-2 shadow-sm backdrop-blur-md transition-colors",
        t.card,
      )}
    >
      <span
        aria-hidden
        className={cn("absolute inset-y-0 left-0 w-[3px]", t.rail)}
      />
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
        <span
          className={cn(
            "grid h-6 w-6 shrink-0 place-items-center rounded-md",
            t.chip,
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>
      <p className="pc-num mt-0.5 text-[22px] font-semibold leading-none text-foreground">
        {value}
      </p>
      <p className="mt-0.5 truncate text-[11px] leading-snug text-muted-foreground">{hint}</p>

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
