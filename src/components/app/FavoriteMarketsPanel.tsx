import { ArrowDown, ArrowUp, Store, Trash2 } from "lucide-react";
import type { getAppSummary } from "@/lib/favorites.functions";
import { PanelCard } from "@/components/dashboard/PanelCard";
import { IconTile } from "@/components/ui/icon-tile";
import { brl } from "@/lib/format";

type Summary = NonNullable<Awaited<ReturnType<typeof getAppSummary>>>;
type FavoriteMarket = Summary["favoriteMarkets"][number];

interface FavoriteMarketsPanelProps {
  markets: FavoriteMarket[];
  storeNames: Set<string>;
  onMove: (ids: string[], idx: number, dir: -1 | 1) => void;
  onRemove: (favoriteId: string) => void;
  onOpenStore: (name: string) => void;
}

export function FavoriteMarketsPanel({
  markets,
  storeNames,
  onMove,
  onRemove,
  onOpenStore,
}: FavoriteMarketsPanelProps) {
  const ids = markets.map((x) => x.favoriteId);

  return (
    <PanelCard
      title={
        <span className="inline-flex items-center gap-2.5">
          <IconTile icon={Store} size="sm" tone="primary" density="compact" /> Seus mercados
        </span>
      }
      padded={false}
    >
      {markets.length === 0 ? (
        <div className="px-6 py-6 text-sm text-muted-foreground">
          Favorite um mercado na tela da lista para vê-lo aqui.
        </div>
      ) : (
        <ul>
          {markets.map((m, idx) => {
            const key = m.marketName.trim().toLowerCase();
            const hasStore = storeNames.has(key);
            return (
              <li
                key={m.favoriteId}
                className="hairline-gold flex items-center gap-2 rounded-xl px-4 py-3 text-sm transition hover:bg-muted/40"
              >
                <div className="flex flex-col">
                  <button
                    onClick={() => onMove(ids, idx, -1)}
                    disabled={idx === 0}
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                    aria-label="Mover para cima"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => onMove(ids, idx, 1)}
                    disabled={idx === ids.length - 1}
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                    aria-label="Mover para baixo"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  {hasStore ? (
                    <button
                      type="button"
                      onClick={() => onOpenStore(m.marketName)}
                      className="block w-full truncate text-left text-foreground hover:text-primary"
                      aria-label={`Abrir detalhes de ${m.marketName}`}
                    >
                      {m.marketName}
                    </button>
                  ) : (
                    <p className="truncate text-foreground">{m.marketName}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {m.itemsCovered} favoritos
                  </p>
                </div>

                <p className="font-mono text-sm text-foreground">
                  {m.total > 0 ? brl(m.total) : "—"}
                </p>
                <button
                  onClick={() => onRemove(m.favoriteId)}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                  aria-label="Remover mercado"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </PanelCard>
  );
}
