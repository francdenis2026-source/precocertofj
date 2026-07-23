import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ListingShellProps {
  children: ReactNode;
  className?: string;
  /** Vertical density. `md` = padrão para páginas com header próprio. */
  density?: "sm" | "md" | "lg";
}

/**
 * Contêiner base para páginas de listagem.
 * Aplica espaçamentos verticais consistentes entre header de filtros,
 * toolbar, contadores e o grid de resultados.
 */
export function ListingShell({ children, className, density = "md" }: ListingShellProps) {
  return (
    <section
      className={cn(
        "flex flex-col",
        density === "sm" && "gap-3",
        density === "md" && "gap-4",
        density === "lg" && "gap-6",
        className,
      )}
    >
      {children}
    </section>
  );
}
