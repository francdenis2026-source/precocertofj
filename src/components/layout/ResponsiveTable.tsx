import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  hideOnMobile?: boolean;
  /** Label shown on the mobile card view. Defaults to `header`. */
  mobileLabel?: ReactNode;
};

interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  keyFn: (row: T, i: number) => string;
  empty?: ReactNode;
  className?: string;
  onRowClick?: (row: T) => void;
}

export function ResponsiveTable<T>({
  columns,
  rows,
  keyFn,
  empty,
  className,
  onRowClick,
}: ResponsiveTableProps<T>) {
  if (rows.length === 0 && empty) return <>{empty}</>;

  return (
    <div className={cn("w-full", className)}>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-border/60 bg-card md:block">
        <table className="w-full text-[14px]">
          <thead className="bg-muted/40 text-[12.5px] uppercase tracking-wide text-muted-foreground">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={cn("px-4 py-2.5 text-left font-medium", c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={keyFn(row, i)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-t border-border/50 transition-colors hover:bg-muted/40",
                  onRowClick && "cursor-pointer",
                )}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-2.5 align-middle", c.className)}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="grid gap-2 md:hidden">
        {rows.map((row, i) => (
          <button
            type="button"
            key={keyFn(row, i)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cn(
              "rounded-xl border border-border/60 bg-card p-3 text-left shadow-sm",
              onRowClick && "active:scale-[0.99]",
            )}
          >
            <dl className="grid gap-1.5">
              {columns
                .filter((c) => !c.hideOnMobile)
                .map((c) => (
                  <div key={c.key} className="grid grid-cols-[minmax(0,110px)_1fr] items-baseline gap-2">
                    <dt className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
                      {c.mobileLabel ?? c.header}
                    </dt>
                    <dd className="min-w-0 text-[14px] text-foreground">{c.cell(row)}</dd>
                  </div>
                ))}
            </dl>
          </button>
        ))}
      </div>
    </div>
  );
}
