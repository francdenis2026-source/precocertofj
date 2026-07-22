import * as React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Loader2, Inbox, AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/**
 * DataTable — tabela padronizada Navy Trust Executive
 * -----------------------------------------------------
 * Cobre: ordenação client-side, paginação, empty/loading/error e estilos
 * consistentes entre /admin e /app. Uso mínimo:
 *
 *   const cols: DataTableColumn<Row>[] = [
 *     { key: "name", header: "Nome", sortable: true, accessor: (r) => r.name },
 *     { key: "price", header: "Preço", align: "right", sortable: true,
 *       accessor: (r) => r.price, cell: (r) => brl(r.price) },
 *   ];
 *   <DataTable data={rows} columns={cols} pageSize={10} />
 */

export type SortDir = "asc" | "desc";

export type DataTableColumn<T> = {
  /** Chave única — usada em sort state e como React key. */
  key: string;
  header: React.ReactNode;
  /** Valor bruto usado para ordenação. */
  accessor?: (row: T) => string | number | Date | null | undefined;
  /** Renderização da célula. Se ausente, usa o valor do accessor. */
  cell?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  /** Largura fixa (ex: "120px" ou "20%"). */
  width?: string;
  className?: string;
  headerClassName?: string;
};

export type DataTableProps<T> = {
  data: T[] | undefined;
  columns: DataTableColumn<T>[];
  /** Chave estável por linha; default = index. */
  rowKey?: (row: T, index: number) => string;
  /** Estados. */
  loading?: boolean;
  error?: Error | string | null;
  onRetry?: () => void;
  /** Texto do estado vazio. */
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  emptyAction?: React.ReactNode;
  /** Paginação client-side. 0 ou undefined = sem paginação. */
  pageSize?: number;
  /** Opções de tamanho de página exibidas em seletor. */
  pageSizeOptions?: number[];
  /** Sort inicial. */
  defaultSort?: { key: string; dir: SortDir };
  onRowClick?: (row: T, index: number) => void;
  className?: string;
  /** Densidade das linhas. */
  density?: "compact" | "regular";
  /** Caption/legend opcional abaixo do rodapé. */
  caption?: React.ReactNode;
  /**
   * Chave para persistir preferências (sort, page, pageSize) em localStorage.
   * Inclua o id do usuário para escopo por conta, ex.: `admin.catalog.items:${userId}`.
   */
  persistKey?: string;
};

export function DataTable<T>({
  data,
  columns,
  rowKey,
  loading = false,
  error = null,
  onRetry,
  emptyTitle = "Nada por aqui ainda",
  emptyDescription = "Assim que houver dados, eles aparecerão nesta tabela.",
  emptyIcon,
  emptyAction,
  pageSize,
  defaultSort,
  onRowClick,
  className,
  density = "regular",
  caption,
}: DataTableProps<T>) {
  const [sort, setSort] = React.useState<{ key: string; dir: SortDir } | null>(
    defaultSort ?? null,
  );
  const [page, setPage] = React.useState(0);

  const sorted = React.useMemo(() => {
    if (!data || !sort) return data ?? [];
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.accessor) return data;
    const dirMul = sort.dir === "asc" ? 1 : -1;
    return [...data].sort((a, b) => {
      const av = col.accessor!(a);
      const bv = col.accessor!(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av instanceof Date && bv instanceof Date) {
        return (av.getTime() - bv.getTime()) * dirMul;
      }
      if (typeof av === "number" && typeof bv === "number") {
        return (av - bv) * dirMul;
      }
      return String(av).localeCompare(String(bv), "pt-BR", { numeric: true }) * dirMul;
    });
  }, [data, sort, columns]);

  const total = sorted.length;
  const pageCount = pageSize && pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  const safePage = Math.min(page, pageCount - 1);
  const paged = React.useMemo(() => {
    if (!pageSize || pageSize <= 0) return sorted;
    const start = safePage * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, safePage, pageSize]);

  React.useEffect(() => {
    // Reset page when data shrinks
    if (safePage !== page) setPage(safePage);
  }, [safePage, page]);

  const toggleSort = (col: DataTableColumn<T>) => {
    if (!col.sortable) return;
    setSort((prev) => {
      if (!prev || prev.key !== col.key) return { key: col.key, dir: "asc" };
      if (prev.dir === "asc") return { key: col.key, dir: "desc" };
      return null; // third click = clear
    });
  };

  const colCount = columns.length;
  const cellPad = density === "compact" ? "py-2" : "py-3";

  return (
    <div className={cn("rounded-xl border border-border bg-card overflow-hidden", className)}>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
            {columns.map((col) => {
              const active = sort?.key === col.key;
              return (
                <TableHead
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                    "h-10 px-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    col.headerClassName,
                  )}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col)}
                      className={cn(
                        "inline-flex items-center gap-1.5 uppercase tracking-[0.14em] transition-colors",
                        "hover:text-foreground",
                        active && "text-foreground",
                        col.align === "right" && "flex-row-reverse",
                      )}
                    >
                      <span>{col.header}</span>
                      {active ? (
                        sort!.dir === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                      )}
                    </button>
                  ) : (
                    <span>{col.header}</span>
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={colCount} className="p-0">
                <SkeletonRows rows={Math.min(pageSize || 6, 8)} cols={colCount} />
              </TableCell>
            </TableRow>
          ) : error ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={colCount} className="py-12">
                <StateBlock
                  icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
                  title="Não conseguimos carregar"
                  description={typeof error === "string" ? error : error.message}
                  action={
                    onRetry ? (
                      <Button size="sm" variant="outline" onClick={onRetry}>
                        Tentar novamente
                      </Button>
                    ) : null
                  }
                />
              </TableCell>
            </TableRow>
          ) : total === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={colCount} className="py-12">
                <StateBlock
                  icon={emptyIcon ?? <Inbox className="h-5 w-5 text-muted-foreground" />}
                  title={emptyTitle}
                  description={emptyDescription}
                  action={emptyAction}
                />
              </TableCell>
            </TableRow>
          ) : (
            paged.map((row, i) => {
              const key = rowKey ? rowKey(row, i) : String(i);
              return (
                <TableRow
                  key={key}
                  onClick={onRowClick ? () => onRowClick(row, i) : undefined}
                  className={cn(
                    "border-b border-border last:border-0 transition-colors",
                    onRowClick && "cursor-pointer hover:bg-muted/40",
                  )}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn(
                        "px-3 align-middle text-[13px] text-foreground",
                        cellPad,
                        col.align === "right" && "text-right tabular-nums",
                        col.align === "center" && "text-center",
                        col.className,
                      )}
                    >
                      {col.cell
                        ? col.cell(row, i)
                        : col.accessor
                          ? String(col.accessor(row) ?? "")
                          : null}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {(pageSize && pageSize > 0 && total > pageSize) || caption ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-3 py-2">
          <div className="text-[11px] text-muted-foreground">
            {caption ??
              (total > 0
                ? `Mostrando ${safePage * (pageSize || 0) + 1}–${Math.min(
                    (safePage + 1) * (pageSize || 0),
                    total,
                  )} de ${total}`
                : null)}
          </div>
          {pageSize && pageSize > 0 && total > pageSize ? (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="px-2 text-[11px] font-medium tabular-nums text-muted-foreground">
                {safePage + 1} / {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={safePage >= pageCount - 1}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ---------- helpers ---------- */

function SkeletonRows({ rows, cols }: { rows: number; cols: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-3 px-3 py-3">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className="h-3 flex-1 animate-pulse rounded bg-muted"
              style={{ animationDelay: `${(r * cols + c) * 30}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function StateBlock({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-2 text-center">
      {icon ? (
        <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background">
          {icon}
        </div>
      ) : null}
      <div className="text-sm font-semibold text-foreground">{title}</div>
      {description ? (
        <div className="text-[12px] leading-relaxed text-muted-foreground">{description}</div>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function TableLoading({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-[12px] text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      {label}
    </div>
  );
}
