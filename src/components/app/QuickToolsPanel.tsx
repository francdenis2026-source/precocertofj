import { Link } from "@tanstack/react-router";
import { ArrowRight, Search, ShoppingBasket, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { SectionKicker } from "@/components/dashboard/SectionKicker";
import { cn } from "@/lib/utils";

type Tool = {
  title: string;
  description: string;
  cta: string;
  icon: LucideIcon;
  to: string;
  search?: Record<string, string>;
  accent: string;
  badge?: string;
};

const TOOLS: Tool[] = [
  {
    title: "Buscar produtos",
    description:
      "Encontre qualquer produto e veja o preço nos mercados cadastrados, com R$/kg e R$/L.",
    cta: "Pesquisar",
    icon: Search,
    to: "/buscar",
    accent:
      "from-primary/15 via-primary/5 text-primary ring-primary/30 hover:from-primary/25 hover:to-primary/5",
  },
  {
    title: "Cesta manual",
    description:
      "Escolha item por item. O sistema aponta o mercado mais barato para o conjunto.",
    cta: "Montar cesta",
    icon: ShoppingBasket,
    to: "/cesta-basica",
    search: { mode: "manual" },
    accent:
      "from-emerald-500/15 via-emerald-500/5 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30 hover:from-emerald-500/25 hover:to-emerald-500/5",
    badge: "Item a item",
  },
  {
    title: "Cesta por orçamento",
    description:
      "Informe quanto pode gastar. Varremos o catálogo e montamos a cesta mais barata para o valor.",
    cta: "Definir valor",
    icon: Wallet,
    to: "/cesta-basica",
    search: { mode: "budget" },
    accent:
      "from-amber-500/15 via-amber-500/5 text-amber-700 dark:text-amber-300 ring-amber-500/30 hover:from-amber-500/25 hover:to-amber-500/5",
    badge: "Automático",
  },
];

/**
 * Bloco de ferramentas rápidas: busca, cesta manual, cesta por orçamento.
 * Cada card é 100% clicável, com foco visível e hierarquia clara.
 */
export function QuickToolsPanel() {
  return (
    <section aria-label="Ferramentas" className="space-y-3">
      <SectionKicker eyebrow="Ferramentas" title="Compre pagando menos" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.title}
              to={tool.to}
              search={tool.search as never}
              className={cn(
                "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br p-4 transition-all",
                "hover:border-transparent hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                tool.accent,
              )}
              aria-label={`${tool.title} — ${tool.description}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className={cn(
                    "grid h-11 w-11 place-items-center rounded-xl bg-background/80 ring-1 ring-inset backdrop-blur",
                  )}
                  aria-hidden="true"
                >
                  <Icon className="h-5 w-5" />
                </div>
                {tool.badge && (
                  <span className="rounded-full bg-background/70 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] ring-1 ring-inset ring-border/60 backdrop-blur">
                    {tool.badge}
                  </span>
                )}
              </div>

              <h3 className="mt-3 font-display text-base font-semibold text-foreground md:text-lg">
                {tool.title}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground md:text-sm">
                {tool.description}
              </p>

              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-foreground/85 group-hover:gap-2 group-hover:text-foreground transition-all md:text-sm">
                {tool.cta}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
