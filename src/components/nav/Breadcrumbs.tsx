import { useRouterState } from "@tanstack/react-router";
import { ChevronRight, Home, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type Crumb = {
  label: string;
  to?: string;
};

/**
 * Breadcrumbs simples + link rápido "Voltar para a pesquisa".
 * Uso em páginas de resultado/detalhe (produto, comparador, mercado, etc.).
 *
 * Ex.:
 *  <Breadcrumbs
 *    items={[{ label: "Café Pilão 500g" }]}
 *    searchQuery={q}
 *  />
 */
export function Breadcrumbs({
  items,
  searchQuery,
  className,
  showBackToSearch = true,
}: {
  items: Crumb[];
  /** Se fornecido, o botão "Voltar para a pesquisa" preserva o termo. */
  searchQuery?: string;
  className?: string;
  showBackToSearch?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const backTo = searchQuery
    ? `/buscar?q=${encodeURIComponent(searchQuery)}`
    : "/buscar";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-background/70 px-3 py-2 text-xs backdrop-blur sm:px-4",
        className,
      )}
    >
      <nav aria-label="Navegação" className="flex min-w-0 items-center gap-1.5 overflow-hidden">
        <a
          href="/"
          aria-current={pathname === "/" ? "page" : undefined}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Home className="h-3.5 w-3.5" strokeWidth={2} />
          <span className="hidden sm:inline">Início</span>
        </a>
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <span key={i} className="flex min-w-0 items-center gap-1.5">
              <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
              {isLast || !item.to ? (
                <span
                  className="truncate px-1 font-medium text-foreground"
                  aria-current={isLast ? "page" : undefined}
                  title={item.label}
                >
                  {item.label}
                </span>
              ) : (
                <a
                  href={item.to}
                  className="truncate rounded-full px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  title={item.label}
                >
                  {item.label}
                </a>
              )}
            </span>
          );
        })}
      </nav>

      {showBackToSearch && (
        <a
          href={backTo}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-muted"
        >
          <Search className="h-3.5 w-3.5" strokeWidth={2.2} />
          Voltar para a pesquisa
        </a>
      )}
    </div>
  );
}
