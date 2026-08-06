import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowRight, Bell, Loader2, ShoppingCart, Star, TrendingDown, Wallet } from "lucide-react";

import { AppShell } from "@/components/brand/AppShell";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { StoreDetailsDrawer } from "@/components/stores/StoreDetailsDrawer";
import type { PublicStore } from "@/lib/stores-public.functions";

import { DashboardSearch } from "@/components/app/DashboardSearch";
import { StoresColumn } from "@/components/app/StoresColumn";
import { FavoritesDock } from "@/components/app/FavoritesDock";

import { ForceUpdateButton } from "@/components/app/ForceUpdateButton";
import { MetricRailSkeleton, PanelBlockSkeleton, StalledNotice } from "@/components/app/PanelSkeletons";
import { ErrorState } from "@/components/feedback";
import { Price } from "@/components/ds/Price";
import { useAppHomeData } from "@/hooks/useAppHomeData";
import { useMeasuredBar } from "@/hooks/use-measured-bar";
import { useStalled } from "@/hooks/use-stalled";
import { useWheelScrollForward } from "@/hooks/use-wheel-scroll-forward";
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
    publicStoresQuery,
    mutations: { removeItem, removeMarket, reorderItems, reorderMarkets, addToList },
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

  const firstName = (accountQuery.data?.fullName ?? "").split(" ")[0] || "cliente";
  // Altura real da faixa "Meu painel" publicada em --pc-panelbar-h, para que
  // a grade abaixo se ajuste sem sobreposição em qualquer largura.
  const panelBarRef = useMeasuredBar<HTMLElement>("--pc-panelbar-h");

  const summary = summaryQuery.data;
  const loading = summaryQuery.isLoading;
  const summaryStalled = useStalled(loading && !summaryQuery.data);


  const potentialSavings = (summary?.lists ?? []).reduce(
    (acc, l) => acc + (l.potentialSavings ?? 0),
    0,
  );
  const estimatedTotal = summary?.totals.estimatedCartTotal ?? 0;
  const savingsRate = estimatedTotal > 0 ? Math.min(100, (potentialSavings / estimatedTotal) * 100) : 0;
  const savingsHint =
    potentialSavings <= 0
      ? "adicione itens para estimar"
      : savingsRate >= 20
        ? `até ${Math.round(savingsRate)}% nas listas ativas`
        : savingsRate >= 5
          ? `${Math.round(savingsRate)}% estimados nas listas`
          : "estimativa das listas ativas";

  const moveItem = (ids: string[], idx: number, dir: -1 | 1) => {
    const next = swap(ids, idx, dir);
    if (next) reorderItems.mutate(next);
  };
  const moveMarket = (ids: string[], idx: number, dir: -1 | 1) => {
    const next = swap(ids, idx, dir);
    if (next) reorderMarkets.mutate(next);
  };

  const storeNameSet = new Set(storesByName.keys());

  /** Roda do mouse sobre cabeçalhos/cards rola o painel interno mais próximo. */
  const wheelRootRef = useWheelScrollForward<HTMLDivElement>();

  return (
    <AppShell>
      <div className="relative z-10 app-dashboard pc-page" ref={wheelRootRef}>
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-[var(--bg-base)]" />
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center opacity-[0.05] mix-blend-luminosity" />
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-base)] via-[var(--bg-base)]/90 to-[var(--bg-base)]" />
        </div>
        <p className="sr-only">
          Atalhos do painel: Alt mais B foca a busca, Alt mais O troca a ordenação, Alt mais L limpa
          os filtros, Alt mais E busca estabelecimentos, Alt mais Shift mais F, M ou L alterna as
          abas de favoritos, Alt mais setas troca de página e Esc fecha menus e painéis abertos.
        </p>
        {/* Bloco único: saudação + ações + métricas */}

        <header
          ref={panelBarRef}
          data-testid="panel-band"
          className="overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[var(--bg-surface)]/80 shadow-2xl backdrop-blur-xl"
        >
          <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-[var(--border-subtle)] bg-gradient-to-r from-[var(--brand-primary)] to-[#B8860B] px-3 py-2 text-black md:px-4 md:py-2.5">
            <span
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-white/10 blur-3xl"
            />
            <div className="relative flex min-w-0 items-baseline gap-2">
              <p className={cn(tc.eyebrow, "hidden shrink-0 text-black/60 sm:block")}>Meu painel</p>
              <h1 className="font-display truncate whitespace-nowrap text-[16px] font-bold leading-tight tracking-[-0.02em] text-black md:text-[18px]">
                Olá, {firstName}
              </h1>
            </div>
            <div className="relative flex shrink-0 items-center gap-1.5">

              {loading && (
                <Loader2
                  className="h-4 w-4 animate-spin text-primary-foreground/70"
                  aria-label="Atualizando preços"
                />
              )}
              <Link
                to="/alertas"
                aria-label="Alertas de preço"
                className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-black/30 bg-black/10 px-3 text-[12.5px] font-medium text-black transition hover:bg-black/20"
              >
                <Bell className="h-4 w-4" aria-hidden />
                <span className="hidden md:inline">Alertas</span>
              </Link>
              <Link
                to="/lista/nova"
                className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-black px-3.5 text-[12.5px] font-semibold text-[var(--brand-primary)] transition hover:bg-black/90"
              >
                Nova lista <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <span className="hidden lg:inline-flex">
                <ForceUpdateButton />
              </span>
            </div>
          </div>

          {/* Métricas do banco */}
          {summaryQuery.isError ? (
            <div className="p-3.5 md:p-4">
              <ErrorState
                title="Não foi possível carregar seu painel"
                message="A conexão falhou ao buscar suas listas e favoritos."
                onRetry={() => void summaryQuery.refetch()}
              />
            </div>
          ) : !summary && loading ? (
            <>
              <MetricRailSkeleton />
              {summaryStalled && (
                <div className="px-3.5 pb-3 md:px-4">
                  <StalledNotice onRetry={() => void summaryQuery.refetch()} />
                </div>
              )}
            </>
          ) : (
            <div className="grid grid-cols-1 divide-y divide-[var(--border-subtle)] min-[420px]:grid-cols-2 min-[420px]:divide-x sm:grid-cols-4 sm:divide-y-0">
              <Metric
                icon={ShoppingCart}
                label="Suas listas"
                value={summary ? String(summary.totals.listsCount) : "—"}
                hint={
                  !summary
                    ? "sem dados por enquanto"
                    : summary.totals.listsCount === 0
                      ? "crie sua primeira lista"
                      : `${summary.totals.itemsCount} ${summary.totals.itemsCount === 1 ? "item" : "itens"} · abrir listas`
                }
                tone="primary"
                to="/lista"
              />
              <Metric
                icon={Star}
                label="Favoritos"
                value={summary ? String(summary.totals.favoritesCount) : "—"}
                hint={
                  summary && summary.totals.favoritesCount === 0
                    ? "favorite produtos para acompanhar"
                    : "preços acompanhados por você"
                }
                tone="brand"
                to="/favoritos"
              />
              <Metric
                icon={TrendingDown}
                label="Cesta mais barata"
                value={
                  summary?.totals.estimatedCartTotal ? (
                    <Price value={summary.totals.estimatedCartTotal} size="sm" />
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
                to="/app/produtos"
              />

              <Metric
                icon={Wallet}
                label="Economia potencial"
                value={
                  potentialSavings > 0 ? (
                    <Price value={potentialSavings} size="sm" tone="savings" />
                  ) : (
                    "—"
                  )
                }
                hint={savingsHint}
                tone="savings"
              />
            </div>
          )}

        </header>

        {/* Grade responsiva: busca | lojas | favoritos.
            Mobile: 1 coluna · Tablet: 2 colunas (busca ocupa a linha toda)
            Desktop: 12 colunas — todas com a mesma altura e rolagem interna. */}
        <div className="pc-grid">
          <div className="pc-col md:col-span-2 xl:col-span-6">
            <DashboardSearch />
          </div>

          <div className="pc-col xl:col-span-3">
            <StoresColumn
              stores={publicStoresQuery.data ?? []}
              loading={publicStoresQuery.isLoading}
              onOpenDetails={openStoreByName}
              storeNames={storeNameSet}
            />
          </div>

          <div className="pc-col xl:col-span-3">
            {summary ? (
              <FavoritesDock
                summary={summary}
                lists={listsQuery.data ?? []}
                storeNames={storeNameSet}
                loading={loading}
                onOpenStore={openStoreByName}
                onMoveItem={moveItem}
                onRemoveItem={(id) => removeItem.mutate(id)}
                onAddToList={(input) => addToList.mutate(input)}
                onMoveMarket={moveMarket}
                onRemoveMarket={(id) => removeMarket.mutate(id)}
              />
            ) : summaryQuery.isError ? (
              <ErrorState
                title="Favoritos indisponíveis"
                message="Não conseguimos carregar seus favoritos agora."
                onRetry={() => void summaryQuery.refetch()}
                className="h-full"
              />
            ) : (
              <PanelBlockSkeleton label="Carregando favoritos" />
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

const METRIC_TONES: Record<MetricTone, { chip: string; rail: string }> = {
  primary: { chip: "bg-[var(--brand-primary)]/12 text-[var(--brand-primary)]", rail: "bg-[var(--brand-primary)]" },
  brand: { chip: "bg-[var(--brand-primary)]/15 text-[var(--brand-primary)]", rail: "bg-[var(--brand-primary)]" },
  savings: { chip: "bg-[var(--success)]/15 text-[var(--success)]", rail: "bg-[var(--success)]" },
  warning: { chip: "bg-[var(--warning)]/20 text-[var(--warning)]", rail: "bg-[var(--warning)]" },
};

/**
 * Célula de métrica dentro da faixa única do topo do painel.
 * Proporção: rótulo pequeno, número em destaque, apoio discreto.
 */
function Metric({
  icon: Icon,
  label,
  value,
  hint,
  tone = "primary",
  to,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  hint: string;
  tone?: MetricTone;
  to?: string;
}) {
  const t = METRIC_TONES[tone];
  const body = (
    <>
      <span aria-hidden className={cn("absolute inset-y-2 left-0 w-[3px] rounded-full", t.rail)} />
      <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-md", t.chip)}>
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <div className="grid min-w-0 flex-1 gap-px">
        <p
          className="truncate text-[11px] font-semibold uppercase leading-none tracking-[0.08em] text-muted-foreground"
          title={label}
        >
          {label}
        </p>
        <p className="pc-price font-display min-w-0 truncate text-[19px] font-bold leading-tight text-[var(--text-primary)] sm:text-[21px]">
          {value}
        </p>
        <p className="line-clamp-1 text-[12px] leading-tight text-[var(--text-tertiary)]" title={hint}>
          {hint}
        </p>
      </div>
    </>
  );
  const shell =
    "relative flex min-h-[3.1rem] min-w-0 items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2";
  if (to) {
    return (
      <Link
        to={to}
        className={cn(
          shell,
          "transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60",
        )}
      >
        {body}
      </Link>
    );
  }
  return <article className={shell}>{body}</article>;
}



function swap(ids: string[], idx: number, dir: -1 | 1): string[] | null {
  const target = idx + dir;
  if (target < 0 || target >= ids.length) return null;
  const next = ids.slice();
  [next[idx], next[target]] = [next[target], next[idx]];
  return next;
}
