import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ListingToolbarProps {
  /** Slot de busca. Fornecer `search` renderiza um Input com ícone. */
  search?: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    ariaLabel?: string;
  };
  /** Slot de filtros à esquerda (badges/pills, QuickFilterBar etc.). */
  filters?: ReactNode;
  /** Slot de ordenação (normalmente um <select>). */
  sort?: ReactNode;
  /** Slot de ações à direita (botões). */
  actions?: ReactNode;
  className?: string;
}

/**
 * Barra reutilizável de busca + filtros + ordenação + ações para páginas
 * de listagem. Layout responsivo: empilha em mobile, alinha em linha em
 * desktop. Herda os anéis de foco padrão dos primitivos.
 */
export function ListingToolbar({
  search,
  filters,
  sort,
  actions,
  className,
}: ListingToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-3 shadow-elev-1",
        "sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        {search && (
          <div className="relative flex-1 min-w-0 sm:max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              placeholder={search.placeholder ?? "Buscar..."}
              className="h-10 pl-9"
              inputMode="search"
              aria-label={search.ariaLabel ?? search.placeholder ?? "Buscar"}
            />
          </div>
        )}
        {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
      </div>
      {(sort || actions) && (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {sort}
          {actions}
        </div>
      )}
    </div>
  );
}
