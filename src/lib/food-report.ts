import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { FinanceTransaction } from "./finance.functions";

const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const FOOD_SLUGS = ["alimentacao", "acougue", "padaria", "hortifruti", "feira"] as const;
export type FoodMode = "cesta" | "compra" | "itens" | "outro";

export function isFoodTx(t: FinanceTransaction, foodCategoryIds: Set<string>): boolean {
  return !!t.categoryId && foodCategoryIds.has(t.categoryId);
}

export function txMode(t: FinanceTransaction): FoodMode {
  const raw = String(t.metadata?.mode ?? "").toLowerCase();
  if (raw === "cesta" || raw === "compra" || raw === "itens") return raw;
  return "outro";
}

function monthLabel(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

/* ---------------- CSV ---------------- */

function csvEscape(v: string | number | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  if (/[";,\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportFoodReportCSV(params: {
  month: string;
  transactions: FinanceTransaction[];
  foodCategoryIds: Set<string>;
}): void {
  const { month, transactions, foodCategoryIds } = params;
  const rows = transactions.filter((t) => isFoodTx(t, foodCategoryIds));

  const lines: string[] = [];
  lines.push(`Relatório de Alimentação - ${monthLabel(month)}`);
  lines.push("");

  // Detalhado
  lines.push("Detalhado");
  lines.push(["Data", "Categoria", "Modo", "Descrição", "Estabelecimento", "Pagamento", "Valor (R$)"].map(csvEscape).join(","));
  for (const t of rows) {
    lines.push(
      [
        t.occurredOn,
        t.categoryName ?? "",
        txMode(t),
        t.description ?? "",
        t.establishmentName ?? "",
        t.paymentMethod ?? "",
        t.amount.toFixed(2).replace(".", ","),
      ].map(csvEscape).join(",")
    );
  }
  lines.push("");

  // Por categoria
  const byCat = new Map<string, { total: number; count: number }>();
  for (const t of rows) {
    const k = t.categoryName ?? "Sem categoria";
    const cur = byCat.get(k) ?? { total: 0, count: 0 };
    cur.total += t.amount;
    cur.count += 1;
    byCat.set(k, cur);
  }
  lines.push("Resumo por categoria");
  lines.push(["Categoria", "Lançamentos", "Total (R$)"].map(csvEscape).join(","));
  for (const [name, v] of [...byCat.entries()].sort((a, b) => b[1].total - a[1].total)) {
    lines.push([name, v.count, v.total.toFixed(2).replace(".", ",")].map(csvEscape).join(","));
  }
  lines.push("");

  // Por estabelecimento
  const byEst = new Map<string, { total: number; count: number }>();
  for (const t of rows) {
    const k = t.establishmentName ?? "Não informado";
    const cur = byEst.get(k) ?? { total: 0, count: 0 };
    cur.total += t.amount;
    cur.count += 1;
    byEst.set(k, cur);
  }
  lines.push("Resumo por estabelecimento");
  lines.push(["Estabelecimento", "Lançamentos", "Total (R$)"].map(csvEscape).join(","));
  for (const [name, v] of [...byEst.entries()].sort((a, b) => b[1].total - a[1].total)) {
    lines.push([name, v.count, v.total.toFixed(2).replace(".", ",")].map(csvEscape).join(","));
  }

  const total = rows.reduce((s, t) => s + t.amount, 0);
  lines.push("");
  lines.push(`Total geral,${total.toFixed(2).replace(".", ",")}`);

  const csv = "\uFEFF" + lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `alimentacao-${month.slice(0, 7)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ---------------- PDF ---------------- */

export function exportFoodReportPDF(params: {
  month: string;
  transactions: FinanceTransaction[];
  foodCategoryIds: Set<string>;
  prevTotal?: number;
}): void {
  const { month, transactions, foodCategoryIds, prevTotal = 0 } = params;
  const rows = transactions.filter((t) => isFoodTx(t, foodCategoryIds));
  const total = rows.reduce((s, t) => s + t.amount, 0);
  const delta = total - prevTotal;
  const deltaPct = prevTotal > 0 ? (delta / prevTotal) * 100 : 0;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // Cabeçalho
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 80, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Relatório de Alimentação", 40, 38);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(monthLabel(month), 40, 58);
  doc.setFontSize(9);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, pageW - 40, 58, { align: "right" });

  // Resumo
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Resumo geral", 40, 110);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`Lançamentos: ${rows.length}`, 40, 128);
  doc.text(`Total: ${BRL(total)}`, 40, 144);
  doc.text(
    prevTotal > 0
      ? `Mês anterior: ${BRL(prevTotal)}  (${delta >= 0 ? "+" : ""}${deltaPct.toFixed(1)}%)`
      : "Mês anterior: sem dados",
    40, 160
  );

  // Por modo
  const byMode = new Map<FoodMode, number>();
  for (const t of rows) {
    const m = txMode(t);
    byMode.set(m, (byMode.get(m) ?? 0) + t.amount);
  }
  const modeRows = (["cesta", "compra", "itens", "outro"] as FoodMode[])
    .map((m) => [
      m === "cesta" ? "Cesta do mês" : m === "compra" ? "Compra do dia" : m === "itens" ? "Itens avulsos" : "Outro",
      BRL(byMode.get(m) ?? 0),
      total > 0 ? `${(((byMode.get(m) ?? 0) / total) * 100).toFixed(1)}%` : "0%",
    ]);

  autoTable(doc, {
    startY: 180,
    head: [["Modo de registro", "Total", "Participação"]],
    body: modeRows,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [46, 125, 107], textColor: 255 },
  });

  // Por categoria
  const byCat = new Map<string, { total: number; count: number; color: string | null }>();
  for (const t of rows) {
    const k = t.categoryName ?? "Sem categoria";
    const cur = byCat.get(k) ?? { total: 0, count: 0, color: t.categoryColor };
    cur.total += t.amount;
    cur.count += 1;
    byCat.set(k, cur);
  }
  const catRows = [...byCat.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(([name, v]) => [name, String(v.count), BRL(v.total)]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const y1 = (doc as any).lastAutoTable.finalY + 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("Por categoria", 40, y1 - 6);
  autoTable(doc, {
    startY: y1,
    head: [["Categoria", "Lançamentos", "Total"]],
    body: catRows,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [46, 125, 107], textColor: 255 },
  });

  // Por estabelecimento
  const byEst = new Map<string, { total: number; count: number }>();
  for (const t of rows) {
    const k = t.establishmentName ?? "Não informado";
    const cur = byEst.get(k) ?? { total: 0, count: 0 };
    cur.total += t.amount;
    cur.count += 1;
    byEst.set(k, cur);
  }
  const estRows = [...byEst.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(([name, v]) => [name, String(v.count), BRL(v.total)]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const y2 = (doc as any).lastAutoTable.finalY + 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Por estabelecimento", 40, y2 - 6);
  autoTable(doc, {
    startY: y2,
    head: [["Estabelecimento", "Lançamentos", "Total"]],
    body: estRows.length > 0 ? estRows : [["—", "—", "—"]],
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [176, 137, 72], textColor: 255 },
  });

  // Detalhado (nova página se muito longo)
  const detailRows = rows
    .slice()
    .sort((a, b) => (a.occurredOn < b.occurredOn ? 1 : -1))
    .map((t) => [
      t.occurredOn.split("-").reverse().join("/"),
      t.categoryName ?? "—",
      t.description ?? "—",
      t.establishmentName ?? "—",
      BRL(t.amount),
    ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const y3 = (doc as any).lastAutoTable.finalY + 24;
  if (y3 > 700) doc.addPage();
  const yStart = y3 > 700 ? 60 : y3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Lançamentos detalhados", 40, yStart - 6);
  autoTable(doc, {
    startY: yStart,
    head: [["Data", "Categoria", "Descrição", "Local", "Valor"]],
    body: detailRows.length > 0 ? detailRows : [["—", "—", "—", "—", "—"]],
    theme: "striped",
    styles: { fontSize: 8.5, cellPadding: 5 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
    columnStyles: { 4: { halign: "right" } },
  });

  // Rodapé
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Preço Certo · Página ${i} de ${pageCount}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: "center" }
    );
  }

  doc.save(`alimentacao-${month.slice(0, 7)}.pdf`);
}
