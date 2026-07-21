import { Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  MapPin,
  Plus,
  Star,
  Trash2,
  TrendingDown,
} from "lucide-react";
import type { getAppSummary } from "@/lib/favorites.functions";
import { ProductImage } from "@/components/product/ProductImage";
import { PanelCard } from "@/components/dashboard/PanelCard";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { AddToListButton } from "@/components/app/AddToListButton";
import { IconTile } from "@/components/ui/icon-tile";
import { brl } from "@/lib/format";

type Summary = NonNullable<Awaited<ReturnType<typeof getAppSummary>>>;
type FavoriteItem = Summary["favoriteItems"][number];

interface FavoriteItemsPanelProps {
  items: FavoriteItem[];
  lists: Array<{ id: string; name: string }>;
  onMove: (ids: string[], idx: number, dir: -1 | 1) => void;
  onRemove: (favoriteId: string) => void;
  onAddToList: (input: { catalogId: string; listId: string }) => void;
}

export function FavoriteItemsPanel({
  items,
  lists,
  onMove,
  onRemove,
  onAddToList,
}: FavoriteItemsPanelProps) {
  const ids = items.map((x) => x.favoriteId);

  return (
    <PanelCard
      className="lg:col-span-2"
      eyebrow="Acompanhamento"
      title={
        <span className="inline-flex items-center gap-2.5">
          <IconTile icon={Star} size="sm" tone="accent" density="compact" />
          Produtos favoritos
        </span>
      }
      actions={
        <p className="text-xs text-muted-foreground">
          use as setas para reordenar
        </p>
      }
      padded={false}
    >
      {items.length === 0 ? (
        <DashboardEmptyState
          icon={<Star className="h-8 w-8 text-muted-foreground" />}
          title="Nenhum favorito ainda"
          description="Marque produtos com a estrela dentro de uma lista para acompanhá-los aqui."
          action={
            <Link
              to="/lista"
              className="inline-flex h-9 items-center gap-2 rounded-full bg-primary px-4 text-xs text-primary-foreground"
            >
              <Plus className="h-3 w-3" /> Abrir lista
            </Link>
          }
        />
      ) : (
        <ul>
          {items.map((it, idx) => {
            const dropped =
              it.lastPrice !== null &&
              it.best !== null &&
              it.best.price < it.lastPrice;
            return (
              <li
                key={it.favoriteId}
                className="flex items-center gap-3 border-b border-border px-4 py-4 last:border-0"
              >
                <div className="flex flex-col">
                  <button
                    onClick={() => onMove(ids, idx, -1)}
                    disabled={idx === 0}
                    className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
                    aria-label="Mover para cima"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => onMove(ids, idx, 1)}
                    disabled={idx === ids.length - 1}
                    className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
                    aria-label="Mover para baixo"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>
                <ProductImage
                  src={it.imageUrl}
                  alt={it.displayName}
                  width={48}
                  height={48}
                  fallbackLabel={it.displayName}
                  className="h-12 w-12 flex-none rounded-lg bg-muted"
                />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {it.displayName}
                  </p>
                  <p className="mt-0.5 flex items-center gap-2 truncate text-xs text-muted-foreground">
                    {it.best ? (
                      <>
                        <MapPin className="inline h-3 w-3" />
                        melhor em{" "}
                        <span className="text-foreground">
                          {it.best.marketName}
                        </span>
                      </>
                    ) : it.brand ? (
                      it.brand
                    ) : (
                      "sem preços registrados"
                    )}
                    {dropped && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-savings/20 px-2 py-0.5 text-[10px] font-medium text-savings-foreground">
                        <TrendingDown className="h-3 w-3" />
                        caiu de {brl(it.lastPrice!)}
                      </span>
                    )}
                    {it.targetPrice !== null && (
                      <span className="text-[10px] text-muted-foreground">
                        alvo {brl(it.targetPrice)}
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  {it.best ? (
                    <p className="font-mono text-base font-semibold text-foreground">
                      {brl(it.best.price)}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">—</p>
                  )}
                </div>
                <AddToListButton
                  catalogId={it.catalogId}
                  lists={lists}
                  onAdd={(listId) =>
                    onAddToList({ catalogId: it.catalogId, listId })
                  }
                />
                <button
                  onClick={() => onRemove(it.favoriteId)}
                  className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                  aria-label="Remover dos favoritos"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </PanelCard>
  );
}
