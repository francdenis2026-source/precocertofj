import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ListingGridProps {
  children: ReactNode;
  className?: string;
  /** Colunas máximas em telas grandes. Default: 3. */
  columns?: 2 | 3 | 4;
  /** Gap entre cards. Default: `md` (0.75rem). */
  gap?: "sm" | "md" | "lg";
  /** Fornecer para melhor semântica assistiva. */
  ariaLabel?: string;
}

const columnsClass: Record<NonNullable<ListingGridProps["columns"]>, string> = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
};

const gapClass: Record<NonNullable<ListingGridProps["gap"]>, string> = {
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4",
};

/** Grid semântico para listas de cards com colunas responsivas. */
export function ListingGrid({
  children,
  className,
  columns = 3,
  gap = "md",
  ariaLabel,
}: ListingGridProps) {
  return (
    <ul
      role="list"
      aria-label={ariaLabel}
      className={cn("grid", columnsClass[columns], gapClass[gap], className)}
    >
      {children}
    </ul>
  );
}
