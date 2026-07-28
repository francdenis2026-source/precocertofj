import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export type AdminTabItem = {
  key: string;
  label: string;
};

type Props = {
  to: string;
  items: AdminTabItem[];
  active: string;
  className?: string;
};

/**
 * Barra de abas compacta para páginas admin consolidadas.
 * Usa Link com ?tab= para permitir bookmarks e navegação por teclado.
 */
export function AdminTabs({ to, items, active, className }: Props) {
  return (
    <nav
      aria-label="Abas da seção"
      className={cn(
        "sticky top-0 z-20 -mx-4 mb-4 flex gap-1 overflow-x-auto border-b border-border/60 bg-background/95 px-4 py-2 backdrop-blur",
        className,
      )}
    >
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <Link
            key={item.key}
            to={to}
            search={{ tab: item.key } as never}
            replace
            className={cn(
              "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
