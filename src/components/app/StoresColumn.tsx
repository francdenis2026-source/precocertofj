import { useState } from "react";
import { Link } from "@tanstack/react-router";

import { StoresPanel } from "@/components/app/StoresPanel";
import { StoreRankStrip } from "@/components/app/StoreRankStrip";
import type { PublicStore } from "@/lib/stores-public.functions";
import { cn } from "@/lib/utils";
import { tc } from "@/lib/typeclear";

type Tab = "stores" | "rank";

/**
 * Coluna unificada de estabelecimentos: diretório de lojas e ranking dos
 * mercados mais baratos dividem a mesma moldura em abas, economizando
 * espaço vertical no painel do cliente.
 */
export function StoresColumn({
  stores,
  loading,
  onOpenDetails,
  storeNames,
}: {
  stores: PublicStore[];
  loading?: boolean;
  onOpenDetails: (name: string) => void;
  storeNames: Set<string>;
}) {
  const [tab, setTab] = useState<Tab>("stores");

  return (
    <section
      aria-label="Estabelecimentos e ranking"
      data-panel="stores"
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/70 border-l-[3px] border-l-brand bg-card/94 shadow-sm backdrop-blur-md"
    >
      <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-1 border-b border-border/70 bg-brand/[0.09] px-1.5 py-1">
        <div role="tablist" aria-label="Visões de estabelecimentos" className="flex min-w-0 gap-1">
          {(
            [
              {
                id: "stores" as const,
                label: "Lojas",
                icon: Store,
                count: stores.length,
              },
              { id: "rank" as const, label: "Mais baratos", icon: TrendingDown },
            ]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              aria-label={t.id === "stores" ? "Estabelecimentos" : "Mercados mais baratos"}
              title={t.id === "stores" ? "Estabelecimentos" : "Mercados mais baratos"}
              onClick={() => setTab(t.id)}
              className={cn(
                tc.filter,
                "inline-flex h-7 min-w-0 items-center gap-1 rounded-full px-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                tab === t.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
              )}
            >
              <t.icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{t.label}</span>
              {typeof t.count === "number" && (
                <span
                  className={cn(
                    "shrink-0 rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                    tab === t.id ? "bg-primary-foreground/20" : "bg-muted-foreground/15",
                  )}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <Link
          to={tab === "stores" ? "/app/estabelecimentos" : "/melhores-precos"}
          aria-label="Ver todos"
          title="Ver todos"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        >
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>



      <div className="flex min-h-0 flex-1 flex-col">
        {tab === "stores" ? (
          <StoresPanel bare stores={stores} loading={loading} onOpenDetails={onOpenDetails} />
        ) : (
          <StoreRankStrip bare storeNames={storeNames} onOpenStore={onOpenDetails} />
        )}
      </div>
    </section>
  );
}
