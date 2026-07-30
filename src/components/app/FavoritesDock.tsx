import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
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


type Summary = NonNullable<Awaited<ReturnType<typeof getAppSummary>>>;

type Tab = "items" | "markets" | "lists";

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
  const tabIndex = TABS.findIndex((t) => t.id === tab);
  const roving = useRovingFocus(TABS.length, tabIndex, (i) =>
    setTab(TABS[i].id),
  );

  const itemIds = summary.favoriteItems.map((x) => x.favoriteId);
  const marketIds = summary.favoriteMarkets.map((x) => x.favoriteId);

  const counts: Record<Tab, number> = {
    items: summary.favoriteItems.length,
    markets: summary.favoriteMarkets.length,
    lists: summary.lists.length,
  };

  return (
    <section
      aria-label="Seus favoritos e listas"
      className="flex h-[52vh] min-h-[300px] min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card lg:h-auto lg:min-h-0"
    >
      <div
        role="tablist"
        aria-label="Seções do painel"
        aria-orientation="horizontal"
        className="flex shrink-0 gap-1 border-b border-border/70 p-2"
      >
        {TABS.map((t, i) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`dock-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`dock-panel-${t.id}`}
            onClick={() => setTab(t.id)}
            {...roving.itemProps(i)}
            className={cn(
              "h-7 rounded-full px-3 text-[12.5px] font-semibold transition-colors",
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
              {summary.favoriteItems.map((f, idx) => (
                <li
                  key={f.favoriteId}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-foreground">
                      {f.displayName}
                    </p>
                    <p className="truncate text-[12px] text-muted-foreground">
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
              ))}
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
              {summary.favoriteMarkets.map((m, idx) => {
                const clickable = storeNames.has(
                  m.marketName.trim().toLowerCase(),
                );
                return (
                  <li
                    key={m.favoriteId}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <button
                        type="button"
                        disabled={!clickable}
                        onClick={() => onOpenStore(m.marketName)}
                        className="block max-w-full truncate text-left text-[13px] font-semibold text-foreground enabled:hover:text-primary disabled:cursor-default"
                      >
                        {m.marketName}
                      </button>
                      <p className="truncate text-[12px] text-muted-foreground">
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
              {summary.lists.map((l) => (
                <li key={l.id} className="px-3 py-2">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                    <div className="min-w-0">
                      <Link
                        to="/lista"
                        className="block truncate text-[13px] font-semibold text-foreground hover:text-primary"
                      >
                        {l.name}
                      </Link>
                      <p className="truncate text-[12px] text-muted-foreground">
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
}: {
  label: string;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "grid h-7 w-7 place-items-center rounded-md transition-colors",
        danger
          ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
