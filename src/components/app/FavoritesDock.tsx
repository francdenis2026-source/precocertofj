import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
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
import { cn } from "@/lib/utils";
import { tc } from "@/lib/typeclear";


type Summary = NonNullable<Awaited<ReturnType<typeof getAppSummary>>>;

type Tab = "items" | "markets" | "lists";

/** Itens exibidos por página em cada aba da dock. */
const PAGE_SIZE = 6;

const TABS: { id: Tab; label: string }[] = [
  { id: "items", label: "Favoritos" },
  { id: "markets", label: "Mercados" },
  { id: "lists", label: "Listas" },
];

/**
 * Dock unificada do painel: favoritos, mercados favoritos e listas em
 * abas — substitui três painéis empilhados que ocupavam a página inteira.
 */
export function FavoritesDock({
  summary,
  lists,
  storeNames,
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
  onOpenStore: (name: string) => void;
  onMoveItem: (ids: string[], idx: number, dir: -1 | 1) => void;
  onRemoveItem: (favoriteId: string) => void;
  onAddToList: (input: { catalogId: string; listId: string }) => void;
  onMoveMarket: (ids: string[], idx: number, dir: -1 | 1) => void;
  onRemoveMarket: (favoriteId: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("items");
  const [page, setPage] = useState(0);
  const changeTab = (id: Tab) => {
    setTab(id);
    setPage(0);
  };
  const tabIndex = TABS.findIndex((t) => t.id === tab);
  const roving = useRovingFocus(TABS.length, tabIndex, (i) => changeTab(TABS[i].id));

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

  return (
    <section
      aria-label="Seus favoritos e listas"
       className="flex h-[42vh] min-h-[240px] flex-1 flex-col overflow-hidden rounded-lg border border-border/70 bg-card/94 shadow-sm backdrop-blur-md lg:h-full lg:min-h-0"
    >
      <div
        role="tablist"
        aria-label="Seções do painel"
        aria-orientation="horizontal"
        className="flex shrink-0 gap-1 border-b border-border/70 px-2 py-1.5"
      >
        {TABS.map((t, i) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`dock-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`dock-panel-${t.id}`}
            onClick={() => changeTab(t.id)}
            {...roving.itemProps(i)}
            className={cn(
               "h-7 rounded-md px-2.5 text-[12px] font-medium transition-colors",
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {t.label}
            <span className="ml-1 opacity-75">{counts[t.id]}</span>
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`dock-panel-${tab}`}
        aria-labelledby={`dock-tab-${tab}`}
        tabIndex={0}
        className="min-h-0 flex-1 overflow-y-auto"
      >

        {tab === "items" &&
          (summary.favoriteItems.length === 0 ? (
            <Empty
              text="Favorite produtos na busca para acompanhar o menor preço aqui."
              icon={Star}
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {pagedItems.map((f, i) => {
                const idx = start + i;
                return (
                <li
                  key={f.favoriteId}
                     className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2.5 py-1"
                >
                  <div className="min-w-0">
                     <p className={cn(tc.itemTitle, "truncate")} title={f.displayName}>
                      {f.displayName}
                    </p>
                     <p className={cn(tc.metaMuted, "truncate")}>
                      {f.best ? (
                        <>
                          melhor em{" "}
                          <span className="text-foreground">
                            {f.best.marketName}
                          </span>{" "}
                          · <Price value={f.best.price} size="xs" />
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
                      onAdd={(listId) =>
                        onAddToList({ catalogId: f.catalogId, listId })
                      }
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
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {pagedMarkets.map((m, i) => {
                const idx = start + i;
                const clickable = storeNames.has(
                  m.marketName.trim().toLowerCase(),
                );
                return (
                  <li
                    key={m.favoriteId}
                     className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2.5 py-1"
                  >
                    <div className="min-w-0">
                      <button
                        type="button"
                        disabled={!clickable}
                        onClick={() => onOpenStore(m.marketName)}
                        title={m.marketName}
                         className={cn(tc.storeName, "block max-w-full truncate text-left enabled:hover:text-primary disabled:cursor-default")}
                      >
                        {m.marketName}
                      </button>
                       <p className={cn(tc.metaMuted, "truncate")}>
                        {m.itemsCovered} itens · total{" "}
                        <Price value={m.total} size="xs" />
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
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {pagedLists.map((l) => (
                 <li key={l.id} className="px-2.5 py-1">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                    <div className="min-w-0">
                      <Link
                        to="/lista"
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
                            <span className="text-foreground">
                              {l.recommendedMarket}
                            </span>{" "}
                            <Price
                              value={l.recommendedTotal ?? 0}
                              size="xs"
                              tone="muted"
                            />
                          </>
                        )}
                      </p>
                    </div>
                    {l.potentialSavings !== null && l.potentialSavings > 0 && (
                      <span className="shrink-0 rounded-full bg-savings/15 px-2 py-0.5 text-[11.5px] font-semibold text-savings-foreground">
                        economize{" "}
                        <Price
                          value={l.potentialSavings}
                          size="xs"
                          tone="savings"
                        />
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ))}
      </div>

      {total > PAGE_SIZE && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border/70 px-2 py-1">
          <p className="truncate text-[11px] text-muted-foreground">
            {start + 1}–{Math.min(end, total)} de {total}
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
              icon={ChevronRight}
              disabled={safePage >= pageCount - 1}
            />
          </div>
        </div>
      )}
    </section>

  );
}

function Empty({
  text,
  icon: Icon,
}: {
  text: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <Icon className="h-6 w-6 text-muted-foreground" aria-hidden />
      <p className="max-w-xs text-[12.5px] text-muted-foreground">{text}</p>
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  icon: Icon,
  danger,
  disabled,
}: {
  label: string;
  onClick: () => void;
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
