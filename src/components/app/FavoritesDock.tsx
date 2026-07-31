import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Star,
  Store,
  Trash2,
} from "lucide-react";

import { Price } from "@/components/ds/Price";
import type { getAppSummary } from "@/lib/favorites.functions";
import { AddToListButton } from "@/components/app/AddToListButton";
import { useRovingFocus } from "@/hooks/use-roving-focus";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { useVirtualRows } from "@/hooks/use-virtual-rows";
import { useLocalStorageState } from "@/hooks/use-local-storage";
import { useScrollMemory } from "@/hooks/use-scroll-memory";
import { cn } from "@/lib/utils";
import { tc } from "@/lib/typeclear";

type Summary = NonNullable<Awaited<ReturnType<typeof getAppSummary>>>;

type Tab = "items" | "markets" | "lists";

/** Itens por página em cada aba (dentro da página as linhas são virtualizadas). */
const PAGE_SIZE = 24;
/** Altura fixa de cada linha — base da virtualização. */
const ROW_H = 36;

const TABS: { id: Tab; label: string }[] = [
  { id: "items", label: "Favoritos" },
  { id: "markets", label: "Mercados" },
  { id: "lists", label: "Listas" },
];

const isTab = (v: unknown): v is Tab => TABS.some((t) => t.id === v);

/**
 * Dock unificada do painel: favoritos, mercados favoritos e listas em
 * abas. A aba fica persistida entre recarregamentos e trocas de rota, e
 * cada página renderiza apenas as linhas visíveis (lazy-render).
 */
export function FavoritesDock({
  summary,
  lists,
  storeNames,
  loading,
  onOpenStore,
  onMoveItem,
  onRemoveItem,
  onAddToList,
  onMoveMarket,
  onRemoveMarket,
}: {
  summary: Summary;
  lists: Array<{ id: string; name: string }>;
  storeNames: Set<string>;
  loading?: boolean;
  onOpenStore: (name: string) => void;
  onMoveItem: (ids: string[], idx: number, dir: -1 | 1) => void;
  onRemoveItem: (favoriteId: string) => void;
  onAddToList: (input: { catalogId: string; listId: string }) => void;
  onMoveMarket: (ids: string[], idx: number, dir: -1 | 1) => void;
  onRemoveMarket: (favoriteId: string) => void;
}) {
  const [tab, setTab] = useLocalStorageState<Tab>("app:dock:tab", "items", {
    validate: isTab,
  });
  // Página corrente por aba: voltar para uma aba devolve o usuário ao ponto
  // exato onde ele parou (página + rolagem).
  const [pages, setPages] = useState<Record<Tab, number>>({ items: 0, markets: 0, lists: 0 });
  const page = pages[tab];
  const setPage = useCallback(
    (next: number) => setPages((prev) => ({ ...prev, [tab]: Math.max(0, next) })),
    [tab],
  );
  const changeTab = (id: Tab) => setTab(id);
  const tabIndex = TABS.findIndex((t) => t.id === tab);
  const roving = useRovingFocus(TABS.length, Math.max(0, tabIndex), (i) =>
    changeTab(TABS[i].id),
  );

  const itemIds = summary.favoriteItems.map((x) => x.favoriteId);
  const marketIds = summary.favoriteMarkets.map((x) => x.favoriteId);

  const counts: Record<Tab, number> = {
    items: summary.favoriteItems.length,
    markets: summary.favoriteMarkets.length,
    lists: summary.lists.length,
  };

  // Paginação: mantém a altura da dock estável, sem estourar a janela.
  const total = counts[tab];
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pagedItems = useMemo(
    () => summary.favoriteItems.slice(start, end),
    [summary.favoriteItems, start, end],
  );
  const pagedMarkets = useMemo(
    () => summary.favoriteMarkets.slice(start, end),
    [summary.favoriteMarkets, start, end],
  );
  const pagedLists = useMemo(() => summary.lists.slice(start, end), [summary.lists, start, end]);

  const pageLength =
    tab === "items" ? pagedItems.length : tab === "markets" ? pagedMarkets.length : pagedLists.length;

  // Lazy-render por viewport dentro da página atual.
  const virtual = useVirtualRows({ count: pageLength, rowHeight: ROW_H, overscan: 4 });
  const vStart = virtual.start;
  const vEnd = virtual.end;

  // Memória de rolagem por aba/página (sobrevive a troca de rota e reload).
  const scroll = useScrollMemory<HTMLDivElement>(`${tab}:${safePage}`, "app:dock:scroll");
  const setPanelRef = useCallback(
    (node: HTMLDivElement | null) => {
      virtual.setRef(node);
      scroll.setRef(node);
    },
    [virtual, scroll],
  );

  // Mantém a página dentro do intervalo válido quando a lista encolhe.
  useEffect(() => {
    if (page > pageCount - 1) setPage(pageCount - 1);
  }, [page, pageCount, setPage]);

  // Pré-carrega a próxima página: as linhas seguintes já ficam materializadas
  // e as rotas de destino são pré-buscadas no ocioso, cortando a espera.
  const router = useRouter();
  const nextStart = end;
  const nextItems = useMemo(
    () => summary.favoriteItems.slice(nextStart, nextStart + PAGE_SIZE),
    [summary.favoriteItems, nextStart],
  );
  const nextMarkets = useMemo(
    () => summary.favoriteMarkets.slice(nextStart, nextStart + PAGE_SIZE),
    [summary.favoriteMarkets, nextStart],
  );
  const nextLists = useMemo(
    () => summary.lists.slice(nextStart, nextStart + PAGE_SIZE),
    [summary.lists, nextStart],
  );
  const prefetchedCount =
    tab === "items" ? nextItems.length : tab === "markets" ? nextMarkets.length : nextLists.length;

  const prefetchRoutes = useCallback(() => {
    const targets = ["/app/produtos", "/app/estabelecimentos", "/lista"] as const;
    for (const to of targets) void router.preloadRoute({ to }).catch(() => {});
  }, [router]);

  useEffect(() => {
    if (loading) return;
    const idle = window.setTimeout(prefetchRoutes, 400);
    return () => window.clearTimeout(idle);
  }, [loading, prefetchRoutes]);


  // Atalhos: alternar abas e paginar sem tirar as mãos do teclado.
  useHotkeys({
    "alt+shift+f": () => changeTab("items"),
    "alt+shift+m": () => changeTab("markets"),
    "alt+shift+l": () => changeTab("lists"),
    "alt+arrowright": () => setPage(Math.min(pageCount - 1, safePage + 1)),
    "alt+arrowleft": () => setPage(Math.max(0, safePage - 1)),
  });

  return (
    <section
      aria-label="Seus favoritos e listas"
      aria-busy={loading || undefined}
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/70 bg-card/94 shadow-sm backdrop-blur-md"
    >
      <div
        role="tablist"
        aria-label="Seções do painel"
        aria-orientation="horizontal"
        className="flex shrink-0 gap-1 border-b border-border/70 px-1.5 py-1"
      >
        {TABS.map((t, i) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`dock-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`dock-panel-${t.id}`}
            title={`${t.label} (Alt + Shift + ${t.id === "items" ? "F" : t.id === "markets" ? "M" : "L"})`}
            onClick={() => changeTab(t.id)}
            {...roving.itemProps(i)}
            className={cn(
              tc.filter,
              "inline-flex h-6.5 items-center gap-1.5 rounded-full px-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
            )}
          >
            {t.label}
            <span
              className={cn(
                "rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                tab === t.id ? "bg-primary-foreground/20" : "bg-muted-foreground/15",
              )}
            >
              {counts[t.id]}
            </span>
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`dock-panel-${tab}`}
        aria-labelledby={`dock-tab-${tab}`}
        tabIndex={0}
        ref={setPanelRef}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        {loading && total === 0 ? (
          <RowsSkeleton />
        ) : (
          <>
            {tab === "items" &&
              (summary.favoriteItems.length === 0 ? (
                <Empty
                  text="Favorite produtos na busca para acompanhar o menor preço aqui."
                  icon={Star}
                  actionLabel="Buscar produtos"
                  to="/app/produtos"
                />
              ) : (
                <ul className="divide-y divide-border/60" style={{ paddingTop: virtual.padTop, paddingBottom: virtual.padBottom }}>
                  {pagedItems.slice(vStart, vEnd).map((f, i) => {
                    const idx = start + vStart + i;
                    return (
                      <li
                        key={f.favoriteId}
                        style={{ height: ROW_H }}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2"
                      >
                        <div className="min-w-0">
                          <p className={cn(tc.itemTitle, "truncate")} title={f.displayName}>
                            {f.displayName}
                          </p>
                          <p className={cn(tc.metaMuted, "truncate")}>
                            {f.best ? (
                              <>
                                melhor em{" "}
                                <span className="text-foreground">{f.best.marketName}</span> ·{" "}
                                <Price value={f.best.price} size="xs" />
                              </>
                            ) : (
                              "sem preço recente"
                            )}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <AddToListButton
                            catalogId={f.catalogId}
                            lists={lists}
                            onAdd={(listId) => onAddToList({ catalogId: f.catalogId, listId })}
                          />
                          <IconBtn
                            label="Subir"
                            onClick={() => onMoveItem(itemIds, idx, -1)}
                            icon={ArrowUp}
                          />
                          <IconBtn
                            label="Descer"
                            onClick={() => onMoveItem(itemIds, idx, 1)}
                            icon={ArrowDown}
                          />
                          <IconBtn
                            label="Remover favorito"
                            onClick={() => onRemoveItem(f.favoriteId)}
                            icon={Trash2}
                            danger
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ))}

            {tab === "markets" &&
              (summary.favoriteMarkets.length === 0 ? (
                <Empty
                  text="Favorite mercados para comparar o total da sua cesta entre eles."
                  icon={Store}
                  actionLabel="Ver estabelecimentos"
                  to="/app/estabelecimentos"
                />
              ) : (
                <ul className="divide-y divide-border/60" style={{ paddingTop: virtual.padTop, paddingBottom: virtual.padBottom }}>
                  {pagedMarkets.slice(vStart, vEnd).map((m, i) => {
                    const idx = start + vStart + i;
                    const clickable = storeNames.has(m.marketName.trim().toLowerCase());
                    return (
                      <li
                        key={m.favoriteId}
                        style={{ height: ROW_H }}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2"
                      >
                        <div className="min-w-0">
                          <button
                            type="button"
                            disabled={!clickable}
                            onClick={() => onOpenStore(m.marketName)}
                            title={m.marketName}
                            className={cn(
                              tc.storeName,
                              "block max-w-full truncate text-left enabled:hover:text-primary disabled:cursor-default",
                            )}
                          >
                            {m.marketName}
                          </button>
                          <p className={cn(tc.metaMuted, "truncate")}>
                            {m.itemsCovered} itens · total <Price value={m.total} size="xs" />
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <IconBtn
                            label="Subir"
                            onClick={() => onMoveMarket(marketIds, idx, -1)}
                            icon={ArrowUp}
                          />
                          <IconBtn
                            label="Descer"
                            onClick={() => onMoveMarket(marketIds, idx, 1)}
                            icon={ArrowDown}
                          />
                          <IconBtn
                            label="Remover mercado"
                            onClick={() => onRemoveMarket(m.favoriteId)}
                            icon={Trash2}
                            danger
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ))}

            {tab === "lists" &&
              (summary.lists.length === 0 ? (
                <Empty
                  text="Crie sua primeira lista para descobrir o mercado mais barato do carrinho."
                  icon={ShoppingCart}
                  actionLabel="Criar minha lista"
                  to="/lista"
                />
              ) : (
                <ul className="divide-y divide-border/60" style={{ paddingTop: virtual.padTop, paddingBottom: virtual.padBottom }}>
                  {pagedLists.slice(vStart, vEnd).map((l) => (
                    <li key={l.id} style={{ height: ROW_H }} className="px-2">
                      <div className="grid h-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                        <div className="min-w-0">
                          <Link
                            to="/lista"
                            search={{ id: l.id }}
                            title={l.name}
                            className={cn(tc.itemTitle, "block truncate hover:text-primary")}
                          >
                            {l.name}
                          </Link>
                          <p className={cn(tc.metaMuted, "truncate")}>
                            {l.itemCount} {l.itemCount === 1 ? "item" : "itens"}
                            {l.recommendedMarket && (
                              <>
                                {" · melhor em "}
                                <span className="text-foreground">{l.recommendedMarket}</span>{" "}
                                <Price value={l.recommendedTotal ?? 0} size="xs" tone="muted" />
                              </>
                            )}
                          </p>
                        </div>
                        {l.potentialSavings !== null && l.potentialSavings > 0 && (
                          <span className="shrink-0 rounded-full bg-savings/15 px-2 py-0.5 text-[11.5px] font-semibold text-savings-foreground">
                            economize{" "}
                            <Price value={l.potentialSavings} size="xs" tone="savings" />
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ))}
          </>
        )}
      </div>

      {total > PAGE_SIZE && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border/70 px-2 py-0.5">
          <p className="truncate text-[11px] text-muted-foreground">
            {start + 1}–{Math.min(end, total)} de {total}
            {prefetchedCount > 0 && (
              <span className="ml-1 opacity-70">· próxima pronta</span>
            )}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            <IconBtn
              label="Página anterior"
              onClick={() => setPage(Math.max(0, safePage - 1))}
              icon={ChevronLeft}
              disabled={safePage === 0}
            />
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {safePage + 1}/{pageCount}
            </span>
            <IconBtn
              label="Próxima página"
              onClick={() => setPage(Math.min(pageCount - 1, safePage + 1))}
              onHoverPrefetch={prefetchRoutes}
              icon={ChevronRight}
              disabled={safePage >= pageCount - 1}
            />
          </div>
        </div>
      )}
    </section>
  );
}

/** Skeleton de linhas — mantém a altura estável durante o carregamento. */
function RowsSkeleton() {
  return (
    <ul className="divide-y divide-border/60" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} style={{ height: ROW_H }} className="flex items-center gap-2 px-2.5">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="h-2.5 w-2/5 animate-pulse rounded bg-muted" />
            <div className="h-2 w-3/5 animate-pulse rounded bg-muted/70" />
          </div>
          <div className="h-5 w-16 shrink-0 animate-pulse rounded bg-muted/70" />
        </li>
      ))}
    </ul>
  );
}

function Empty({
  text,
  icon: Icon,
  actionLabel,
  to,
}: {
  text: string;
  icon: React.ComponentType<{ className?: string }>;
  actionLabel?: string;
  to?: "/app/produtos" | "/app/estabelecimentos" | "/lista";
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 px-3 py-3 text-center">
      <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
      <p className="max-w-[15rem] text-[12px] leading-snug text-muted-foreground">{text}</p>
      {actionLabel && to && (
        <Link
          to={to}
          className="rounded-md border border-border bg-background px-2.5 py-1 text-[12px] font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  onHoverPrefetch,
  icon: Icon,
  danger,
  disabled,
}: {
  label: string;
  onClick: () => void;
  onHoverPrefetch?: () => void;
  icon: React.ComponentType<{ className?: string }>;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      onMouseEnter={onHoverPrefetch}
      onFocus={onHoverPrefetch}
      disabled={disabled}
      className={cn(
        "grid h-7 w-7 place-items-center rounded-md transition-colors disabled:pointer-events-none disabled:text-muted-foreground/50",
        danger
          ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
