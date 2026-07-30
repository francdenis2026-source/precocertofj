import { Link } from "@tanstack/react-router";
import { Beef, Bird, Drumstick, ArrowRight } from "lucide-react";
import type { ButcherProtein } from "@/lib/butcher-cuts";

/**
 * Barra de atalhos por corte de açougue.
 * Uso: hub de categoria `/categoria/acougues` e sidebar de `/buscar`.
 * Cada chip abre o ranking já filtrado pelo corte (bovino / frango / suíno).
 */

type Cut = {
  label: string;
  query: string;
  protein: ButcherProtein;
};

const CUTS: Cut[] = [
  { label: "Bovinos", query: "carne bovina", protein: "bovino" },
  { label: "Frango", query: "frango", protein: "frango" },
  { label: "Suínos", query: "porco", protein: "suino" },
];

const ICON: Record<ButcherProtein, typeof Beef> = {
  bovino: Beef,
  frango: Bird,
  suino: Drumstick,
};

export function AcougueCutsBar({
  variant = "hub",
  className = "",
}: {
  variant?: "hub" | "compact";
  className?: string;
}) {
  const compact = variant === "compact";
  return (
    <section
      aria-label="Atalhos por corte de açougue"
      className={
        (compact
          ? "rounded-lg border border-brand-gold/40 bg-[color-mix(in_oklab,var(--brand-gold)_8%,transparent)] px-2.5 py-2"
          : "rounded-xl border border-brand-gold/50 bg-[color-mix(in_oklab,var(--brand-gold)_10%,transparent)] px-3 py-2.5") +
        " " +
        className
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.18em] text-[var(--pc-gold-ink)]">
          <Beef className="h-3 w-3" aria-hidden /> Açougue — cortes
        </span>
        <ul className="flex flex-wrap gap-1.5" role="list">
          {CUTS.map((c) => {
            const Icon = ICON[c.protein];
            return (
              <li key={c.protein}>
                <Link
                  to="/melhores-precos"
                  search={{ q: c.query, cat: "acougue" } as never}
                  className="inline-flex h-7 items-center gap-1 rounded-full border border-brand-gold/50 bg-background px-2.5 text-[11.5px] font-semibold text-foreground transition-colors hover:border-brand-gold hover:bg-[var(--pc-hover-tint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                >
                  <Icon className="h-3 w-3 text-gold-ink" aria-hidden />
                  {c.label}
                </Link>
              </li>
            );
          })}
          <li className="ml-auto">
            <Link
              to="/melhores-precos"
              search={{ cat: "acougue" } as never}
              className="inline-flex h-7 items-center gap-1 rounded-full border border-border bg-background px-2.5 text-[11.5px] font-semibold text-muted-foreground transition-colors hover:border-brand-gold hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            >
              Ver ranking <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}
