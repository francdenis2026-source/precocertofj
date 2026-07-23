/**
 * CSV/PDF export helpers — client-side (no server dependency).
 * Uses jspdf + jspdf-autotable dynamically to keep the initial bundle lean.
 */

export type ExportColumn<T> = {
  key: string;
  header: string;
  accessor: (row: T) => string | number | null | undefined;
  align?: "left" | "right" | "center";
};

export type ExportMeta = {
  title: string;
  subtitle?: string;
  /** Human-readable list of active filters (one per line in the PDF header). */
  filters?: string[];
};

/** `precocerto_<context>_<yyyy-mm-dd>` — no extension. */
export function stampedFilename(context: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const safe = context
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `precocerto_${safe}_${date}`;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function escapeCSV(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportRowsToCSV<T>(
  filename: string,
  columns: ExportColumn<T>[],
  rows: T[],
): void {
  const header = columns.map((c) => escapeCSV(c.header)).join(";");
  const body = rows
    .map((row) => columns.map((c) => escapeCSV(c.accessor(row))).join(";"))
    .join("\r\n");
  const csv = `\uFEFF${header}\r\n${body}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, `${filename}.csv`);
}

export async function exportRowsToPDF<T>(
  filename: string,
  columns: ExportColumn<T>[],
  rows: T[],
  meta: ExportMeta,
): Promise<void> {
  const [{ default: jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = (autoTableMod as { default: unknown }).default as (
    doc: unknown,
    opts: Record<string, unknown>,
  ) => void;

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Brand header bar
  doc.setFillColor(37, 99, 235); // primary
  doc.rect(0, 0, pageWidth, 32, "F");
  doc.setTextColor(255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("PreçoCerto", 40, 21);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `Gerado em ${new Date().toLocaleString("pt-BR")}`,
    pageWidth - 40,
    21,
    { align: "right" },
  );

  // Title block
  doc.setTextColor(20);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(meta.title, 40, 58);
  let cursorY = 72;
  if (meta.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.text(meta.subtitle, 40, cursorY);
    cursorY += 14;
  }
  if (meta.filters && meta.filters.length > 0) {
    doc.setFontSize(9);
    doc.setTextColor(110);
    for (const line of meta.filters) {
      doc.text(`• ${line}`, 40, cursorY);
      cursorY += 12;
    }
    cursorY += 4;
  }

  const head = [columns.map((c) => c.header)];
  const body = rows.map((row) =>
    columns.map((c) => {
      const v = c.accessor(row);
      return v == null ? "" : String(v);
    }),
  );

  autoTable(doc, {
    head,
    body,
    startY: cursorY + 4,
    theme: "striped",
    styles: { fontSize: 9, cellPadding: 6, textColor: 30 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: Object.fromEntries(
      columns.map((c, i) => [i, { halign: c.align ?? "left" }]),
    ),
    margin: { left: 40, right: 40, bottom: 40 },
    didDrawPage: () => {
      const pageNumber =
        (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Página ${pageNumber} — precocerto-feijo.app`,
        pageWidth - 40,
        pageHeight - 20,
        { align: "right" },
      );
    },
  });

  doc.save(`${filename}.pdf`);
}
