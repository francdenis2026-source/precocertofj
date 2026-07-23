import { useState } from "react";
import { Download, FileText, Loader2, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  exportRowsToCSV,
  exportRowsToPDF,
  stampedFilename,
  type ExportColumn,
  type ExportMeta,
} from "@/lib/export";
import { toast } from "sonner";

type ExportMenuProps<T> = {
  /** Kebab-case context for the filename, e.g. "meus-scans". */
  context: string;
  columns: ExportColumn<T>[];
  /** Sync or async rows provider — async lets you fetch the full unpaged list on demand. */
  getRows: () => T[] | Promise<T[]>;
  meta: ExportMeta;
  disabled?: boolean;
  label?: string;
  size?: "sm" | "default";
};

export function ExportMenu<T>({
  context,
  columns,
  getRows,
  meta,
  disabled,
  label = "Exportar",
  size = "sm",
}: ExportMenuProps<T>) {
  const [busy, setBusy] = useState<"csv" | "pdf" | null>(null);
  const filename = stampedFilename(context);

  async function run(kind: "csv" | "pdf") {
    if (busy) return;
    setBusy(kind);
    try {
      const rows = await getRows();
      if (rows.length === 0) {
        toast.info("Nada para exportar com os filtros atuais.");
        return;
      }
      if (kind === "csv") {
        exportRowsToCSV(filename, columns, rows);
      } else {
        await exportRowsToPDF(filename, columns, rows, meta);
      }
      toast.success(`Exportação ${kind.toUpperCase()} gerada.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Falha ao exportar: ${msg}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={size} disabled={disabled || !!busy} className="press-sm">
          {busy ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-1.5 h-4 w-4 icon-nudge" />
          )}
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs uppercase tracking-widest text-muted-foreground">
          Formato
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void run("csv")} disabled={!!busy}>
          <Table2 className="mr-2 h-4 w-4" />
          CSV (planilha)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void run("pdf")} disabled={!!busy}>
          <FileText className="mr-2 h-4 w-4" />
          PDF (relatório)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
