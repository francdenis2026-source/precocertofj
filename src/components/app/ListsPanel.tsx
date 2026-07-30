import { Link } from "@tanstack/react-router";
import { Plus, ShoppingCart, Star, TrendingDown } from "lucide-react";
import type { getAppSummary } from "@/lib/favorites.functions";
import { PanelCard } from "@/components/dashboard/PanelCard";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { IconTile } from "@/components/ui/icon-tile";
import { brl } from "@/lib/format";
import { Price } from "@/components/ds/Price";

type Summary = NonNullable<Awaited<ReturnType<typeof getAppSummary>>>;
type SummaryList = Summary["lists"][number];

interface ListsPanelProps {
  lists: SummaryList[];
}

export function ListsPanel({ lists }: ListsPanelProps) {
  return (
    <PanelCard
      className="mt-10"
      eyebrow="Sua rotina"
      title={
        <span className="inline-flex items-center gap-2.5">
          <IconTile icon={ShoppingCart} size="sm" tone="primary" density="compact" /> Suas listas
        </span>
      }
      actions={
        <Link
          to="/lista"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ver todas →
        </Link>
      }
      padded={false}
    >
      {lists.length === 0 ? (
        <DashboardEmptyState
          icon={<ShoppingCart className="h-8 w-8 text-muted-foreground" />}
          title="Nenhuma lista ainda"
          description="Crie sua primeira lista para descobrir o melhor mercado do carrinho."
          action={
            <Link
              to="/lista"
              className="inline-flex h-9 items-center gap-2 rounded-full bg-primary px-4 text-xs text-primary-foreground"
            >
              <Plus className="h-3 w-3" /> Criar lista
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-border">
          {lists.map((l) => (
            <li key={l.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    to="/lista"
                    className="font-medium text-foreground hover:text-primary"
                  >
                    {l.name}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {l.itemCount} {l.itemCount === 1 ? "item" : "itens"}
                    {l.recommendedMarket && (
                      <>
                        {" · melhor em "}
                        <span className="text-foreground">
                          {l.recommendedMarket}
                        </span>{" "}
                        por{" "}
                        <Price value={l.recommendedTotal ?? 0} size="xs" />
                      </>
                    )}
                  </p>
                </div>
                {l.potentialSavings !== null && l.potentialSavings > 0 && (
                  <div className="inline-flex items-center gap-2 rounded-full bg-savings/20 px-3 py-1 text-xs text-savings-foreground">
                    <TrendingDown className="h-3 w-3" />
                    economia até <Price value={l.potentialSavings} size="xs" tone="savings" />
                  </div>
                )}
              </div>
              {l.favoriteItems.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {l.favoriteItems.map((f) => (
                    <span
                      key={f.catalogId}
                      className="inline-flex items-center gap-1 rounded-full border border-savings/40 bg-savings/10 px-2 py-0.5 text-[11px] text-foreground"
                      title={`${f.displayName} — melhor em ${f.bestMarket}`}
                    >
                      <Star className="h-3 w-3 fill-current text-warning" />
                      {f.displayName}
                      <Price value={f.bestPrice} size="xs" tone="muted" />
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </PanelCard>
  );
}
