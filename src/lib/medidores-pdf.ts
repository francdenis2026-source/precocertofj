import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { FinanceTransaction } from "./finance.functions";

type UtilKey = "energia" | "agua" | "gas" | "combustivel";

type UtilCfg = {
  key: UtilKey;
  categorySlug: string;
  label: string;
  unit: string;
  accent: string;
};

type SeriesEntry = {
  month: string;
  total: number;
  consumption: number;
  entries: FinanceTransaction[];
};

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const nf = (v: number, d = 1) => v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/**
 * Renders a compact SVG-style sparkline directly on the PDF canvas.
 */
function drawSparkline(
  doc: jsPDF,
  values: number[],
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  if (!values.length) return;
  const max = Math.max(...values, 1);
  const min = 0;
  const step = w / Math.max(values.length - 1, 1);
  const [r, g, b] = hexToRgb(color);
  doc.setDrawColor(r, g, b);
  doc.setLineWidth(1.2);
  let prev: [number, number] | null = null;
  values.forEach((v, i) => {
    const px = x + step * i;
    const py = y + h - ((v - min) / (max - min || 1)) * h;
    if (prev) doc.line(prev[0], prev[1], px, py);
    prev = [px, py];
  });
  // Baseline
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(x, y + h, x + w, y + h);
}

export async function exportMedidoresPdf(params: {
  month: string;
  monthList: string[];
  byUtil: Record<UtilKey, SeriesEntry[]>;
  utils: Record<UtilKey, UtilCfg>;
}) {
  const { month, monthList, byUtil, utils } = params;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório de Medidores", margin, 60);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  const [y, m] = month.split("-").map(Number);
  const monthLabel = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  doc.text(`Mês de referência: ${monthLabel}`, margin, 78);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, margin, 92);
  doc.setTextColor(0);

  // Resumo por categoria + sparkline
  let cursorY = 120;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo por categoria", margin, cursorY);
  cursorY += 8;

  const colW = (pageW - margin * 2 - 20) / 2;
  const rowH = 70;
  const items = Object.values(utils);
  items.forEach((cfg, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = margin + col * (colW + 20);
    const yy = cursorY + row * (rowH + 12);
    const series = byUtil[cfg.key] ?? [];
    const cur = series[series.length - 1];
    const prior = series.slice(0, -1).map((s) => s.consumption).filter((v) => v > 0);
    const avg = prior.length ? prior.reduce((a, b) => a + b, 0) / prior.length : 0;
    const consumption = cur?.consumption ?? 0;
    const total = cur?.total ?? 0;
    const overAvg = avg > 0 && consumption > avg * 1.1;

    // Card
    const [r, g, b] = hexToRgb(cfg.accent);
    doc.setDrawColor(230);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(x, yy, colW, rowH, 6, 6, "FD");
    // Accent bar
    doc.setFillColor(r, g, b);
    doc.rect(x, yy, 4, rowH, "F");

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(r, g, b);
    doc.text(cfg.label.toUpperCase(), x + 14, yy + 16);
    doc.setTextColor(0);
    doc.setFontSize(14);
    doc.text(BRL(total), x + 14, yy + 34);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(90);
    doc.text(`Consumo: ${nf(consumption, 1)} ${cfg.unit}`, x + 14, yy + 48);
    if (avg > 0) {
      doc.setTextColor(overAvg ? 180 : 90, overAvg ? 60 : 90, 60);
      doc.text(
        `Média histórica: ${nf(avg, 1)} ${cfg.unit}${overAvg ? "  ⚠ acima" : ""}`,
        x + 14,
        yy + 60,
      );
      doc.setTextColor(0);
    }
    // Sparkline
    drawSparkline(
      doc,
      series.map((s) => s.consumption),
      x + colW - 110,
      yy + 20,
      95,
      35,
      cfg.accent,
    );
  });

  cursorY += Math.ceil(items.length / 2) * (rowH + 12) + 8;

  // Tabela de tendência
  const monthLabels = monthList.map((mm) => `${mm.slice(5, 7)}/${mm.slice(2, 4)}`);
  autoTable(doc, {
    startY: cursorY,
    head: [["Categoria", ...monthLabels, "Unidade"]],
    body: items.map((cfg) => [
      cfg.label,
      ...monthList.map((_, i) => nf(byUtil[cfg.key][i]?.consumption ?? 0, 1)),
      cfg.unit,
    ]),
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    theme: "grid",
    margin: { left: margin, right: margin },
  });

  // Lançamentos detalhados do mês
  for (const cfg of items) {
    const entries = byUtil[cfg.key][byUtil[cfg.key].length - 1]?.entries ?? [];
    if (entries.length === 0) continue;
    const startY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY;
    if (startY > 700) doc.addPage();

    autoTable(doc, {
      startY: (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
        ? (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18
        : cursorY + 20,
      head: [[`${cfg.label} — lançamentos`, "Data", `Consumo (${cfg.unit})`, "R$/un.", "Valor"]],
      body: entries.map((t) => {
        const meta = (t.metadata ?? {}) as Record<string, unknown>;
        const cons =
          typeof meta.consumption === "number"
            ? (meta.consumption as number)
            : typeof meta.liters === "number"
            ? (meta.liters as number)
            : typeof meta.currentReading === "number" && typeof meta.previousReading === "number"
            ? (meta.currentReading as number) - (meta.previousReading as number)
            : 0;
        const unitP = cons > 0 ? t.amount / cons : 0;
        return [
          t.description || `Leitura ${cfg.label.toLowerCase()}`,
          t.occurredOn.split("-").reverse().join("/"),
          cons ? nf(cons, 2) : "—",
          unitP ? BRL(unitP) : "—",
          BRL(t.amount),
        ];
      }),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: hexToRgb(cfg.accent), textColor: 255 },
      theme: "striped",
      margin: { left: margin, right: margin },
    });
  }

  // Footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `PreçoCerto · Página ${i} de ${pages}`,
      pageW - margin,
      doc.internal.pageSize.getHeight() - 20,
      { align: "right" },
    );
  }

  doc.save(`medidores-${month}.pdf`);
}
