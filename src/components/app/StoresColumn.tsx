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
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/70 bg-card/94 shadow-sm backdrop-blur-md"
    >
      <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border/70 px-2 py-1.5">
        <div role="tablist" aria-label="Visões de estabelecimentos" className="flex min-w-0 gap-1">
          {(
            [
              { id: "stores" as const, label: "Estabelecimentos", count: stores.length },
              { id: "rank" as const, label: "Mais baratos" },
            ]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                tc.filter,
                "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 transition-colors duration-150",
                tab === t.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
              )}
            >
              {t.label}
              {typeof t.count === "number" && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
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
          className={cn(
            tc.filter,
            "shrink-0 rounded-md border border-border px-2.5 py-1 text-primary transition-colors hover:border-primary/50 hover:bg-primary/10",
          )}
        >
          Ver todos
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
