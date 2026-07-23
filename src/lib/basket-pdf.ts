import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { BasketComparisonResult, EssentialKey } from "./basket.functions";

export type ManualBasketPdfItem = {
  key: EssentialKey;
  label: string;
  quantity: number;
  productName: string | null;
  establishmentName: string | null;
  unitPrice: number | null;
  avgPrice: number | null;
};

export type ManualBasketPerStore = {
  establishmentId: string;
  establishmentName: string;
  selected: number;
  covered: number;
  missing: number;
  missingLabels: string[];
  totalReal: number;
  totalEstimated: number;
  coverage: number;
};

export function exportManualBasketPdf(payload: {
  items: ManualBasketPdfItem[];
  total: number;
  estimatedAvgTotal: number;
  savings: number;
  totalUnits: number;
  missingCount: number;
  city?: string | null;
  perStore?: ManualBasketPerStore[];
}): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(15, 27, 42);
  doc.rect(0, 0, pageW, 26, "F");
  doc.setTextColor(115, 255, 184);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("PreçoCerto", 14, 17);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Minha cesta — seleção manual", 14, 22);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleString("pt-BR"), pageW - 14, 22, { align: "right" });

  let y = 34;
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Total: ${fmt(payload.total)}`, 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const savingsPct =
    payload.estimatedAvgTotal > 0
      ? Math.round((payload.savings / payload.estimatedAvgTotal) * 100)
      : 0;
  doc.text(
    `${payload.items.length} tipo(s) · ${payload.totalUnits} unidade(s) · média do mercado: ${fmt(payload.estimatedAvgTotal)} · economia: ${fmt(payload.savings)}${savingsPct > 0 ? ` (${savingsPct}%)` : ""}`,
    14,
    y,
  );
  y += 4;
  if (payload.missingCount > 0) {
    doc.setTextColor(140, 90, 20);
    doc.text(`${payload.missingCount} item(ns) sem preço registrado.`, 14, y + 4);
    doc.setTextColor(20, 20, 20);
    y += 4;
  }

  autoTable(doc, {
    startY: y + 6,
    head: [["Item", "Qtd.", "Preço unit.", "Subtotal", "Menor preço em", "Produto"]],
    body: payload.items.map((it) => [
      it.label,
      String(it.quantity),
      fmt(it.unitPrice),
      it.unitPrice != null ? fmt(it.unitPrice * it.quantity) : "—",
      it.establishmentName ?? "—",
      it.productName ?? "—",
    ]),
    foot: [
      [
        { content: "Total", colSpan: 3, styles: { halign: "right", fontStyle: "bold" } },
        { content: fmt(payload.total), styles: { fontStyle: "bold" } },
        "",
        "",
      ],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [15, 27, 42], textColor: [115, 255, 184], fontStyle: "bold" },
    footStyles: { fillColor: [235, 245, 240], textColor: [15, 27, 42] },
    alternateRowStyles: { fillColor: [245, 245, 247] },
    theme: "grid",
    margin: { left: 14, right: 14 },
    columnStyles: {
      1: { halign: "center" },
      2: { halign: "right" },
      3: { halign: "right", fontStyle: "bold" },
    },
  });

  // Ranking por estabelecimento (custo total se comprado inteiramente em cada mercado)
  if (payload.perStore && payload.perStore.length > 0) {
    const afterItems =
      (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 100;
    let yr = afterItems + 8;
    // Quebra de página se estiver perto do rodapé
    const pageH = doc.internal.pageSize.getHeight();
    if (yr > pageH - 40) {
      doc.addPage();
      yr = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text("Ranking por estabelecimento — custo total da sua cesta", 14, yr);
    yr += 3;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    doc.text(
      "Estimativa (est.) usa preço médio para itens sem estoque na mercado.",
      14,
      yr + 3,
    );
    doc.setTextColor(20, 20, 20);

    autoTable(doc, {
      startY: yr + 6,
      head: [["#", "Estabelecimento", "Cobertura", "Real", "Est. total", "Faltando"]],
      body: payload.perStore.map((s, i) => [
        String(i + 1),
        s.establishmentName,
        `${s.covered}/${s.selected} (${Math.round(s.coverage * 100)}%)`,
        fmt(s.totalReal),
        s.missing > 0 ? fmt(s.totalEstimated) : "—",
        s.missing === 0
          ? "—"
          : s.missingLabels.slice(0, 4).join(", ") +
            (s.missingLabels.length > 4 ? `… +${s.missingLabels.length - 4}` : ""),
      ]),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [15, 27, 42], textColor: [115, 255, 184], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 245, 247] },
      theme: "grid",
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { halign: "center" },
        2: { halign: "center" },
        3: { halign: "right", fontStyle: "bold", textColor: [30, 90, 60] },
        4: { halign: "right", textColor: [140, 90, 20] },
        5: { fontSize: 7, textColor: [90, 90, 90] },
      },
      didParseCell: (hook) => {
        // Destaca a linha campeã
        if (hook.section === "body" && hook.row.index === 0) {
          hook.cell.styles.fillColor = [230, 250, 240];
          hook.cell.styles.fontStyle = "bold";
        }
      },
    });
  }

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "Gerado por PreçoCerto — precocerto-fj.lovable.app",
    pageW / 2,
    doc.internal.pageSize.getHeight() - 8,
    { align: "center" },
  );

  doc.save(`minha-cesta-${Date.now()}.pdf`);
}


export type BasketPdfOptions = {
  /** Como itens sem preço são tratados no total */
  missingMode?: "zero" | "ignore" | "estimate";
  /** Cobertura mínima aplicada (0-100). Mercados abaixo são omitidas do PDF. */
  minCoverage?: number;
};

const fmt = (n: number | null | undefined) =>
  typeof n === "number" ? `R$ ${n.toFixed(2).replace(".", ",")}` : "—";

function computeRow(
  s: BasketComparisonResult["stores"][number],
  data: BasketComparisonResult,
): { known: number; missingAvg: number; missingWithoutAvg: number; min: number; max: number } {
  let known = 0;
  let missingAvg = 0;
  let missingWithoutAvg = 0;
  s.items.forEach((it, i) => {
    if (it) {
      known += it.price;
    } else {
      const avg = data.averagePrices[data.essentials[i].key];
      if (typeof avg === "number") missingAvg += avg;
      else missingWithoutAvg += 1;
    }
  });
  return {
    known: Number(known.toFixed(2)),
    missingAvg: Number(missingAvg.toFixed(2)),
    missingWithoutAvg,
    min: Number(known.toFixed(2)),
    max: Number((known + missingAvg).toFixed(2)),
  };
}

export function exportBasketPdf(
  data: BasketComparisonResult,
  options: BasketPdfOptions = {},
): void {
  const missingMode = options.missingMode ?? "zero";
  const minCoverage = options.minCoverage ?? 0;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // Filter stores by minimum coverage
  const stores = data.stores.filter((s) => s.coverage * 100 >= minCoverage);

  // Header
  doc.setFillColor(15, 27, 42);
  doc.rect(0, 0, pageW, 26, "F");
  doc.setTextColor(115, 255, 184);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("PreçoCerto", 14, 17);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Comparação de cesta básica", 14, 22);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleString("pt-BR"), pageW - 14, 22, { align: "right" });

  let y = 34;
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Cesta teórica mais barata: ${fmt(data.cheapestBasketTotal)}`, 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `${stores.length}/${data.stores.length} estabelecimentos · ${data.totalEssentials} itens essenciais · últimos ${data.windowDays} dias`,
    14,
    y,
  );
  y += 4;

  if (data.filters.radiusKm && data.filters.originLat != null) {
    y += 4;
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    doc.text(
      `Filtro: raio ${data.filters.radiusKm} km da sua localização${
        data.filters.city ? ` · cidade ${data.filters.city}` : ""
      }`,
      14,
      y,
    );
    doc.setTextColor(20, 20, 20);
  }
  y += 4;

  void missingMode;
  void minCoverage;



  if (stores.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(120, 60, 60);
    doc.text(
      `Nenhum estabelecimento atinge ${minCoverage}% de cobertura mínima.`,
      14,
      y,
    );
    doc.save(`cesta-basica-${Date.now()}.pdf`);
    return;
  }

  // Ranking table
  autoTable(doc, {
    startY: y,
    head: [["#", "Estabelecimento", "Itens", "Cob.", "Mín.", "Máx.", "Faltando"]],
    body: stores.map((s, i) => {
      const est = computeRow(s, data);
      const missingLabels = s.items
        .map((it, idx) => (it ? null : data.essentials[idx].label))
        .filter((x): x is string => Boolean(x));
      return [
        String(i + 1),
        s.establishmentName + (s.city ? ` — ${s.city}` : ""),
        `${s.itemsFound}/${s.totalItems}`,
        `${Math.round(s.coverage * 100)}%`,
        fmt(est.min),
        est.max > est.min ? fmt(est.max) : "—",
        missingLabels.length === 0
          ? "—"
          : missingLabels.slice(0, 4).join(", ") + (missingLabels.length > 4 ? "…" : ""),
      ];
    }),
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [15, 27, 42], textColor: [115, 255, 184], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 245, 247] },
    theme: "grid",
    margin: { left: 14, right: 14 },
    columnStyles: {
      4: { textColor: [30, 90, 60], fontStyle: "bold" },
      5: { textColor: [140, 90, 20] },
      6: { textColor: [90, 90, 90] },
    },
  });

  // Item-by-item cheapest
  const afterRanking = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
  let y2 = afterRanking + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Menor preço por item", 14, y2);
  y2 += 3;

  autoTable(doc, {
    startY: y2 + 2,
    head: [["Item", "Produto", "Estabelecimento", "Preço", "Média"]],
    body: data.cheapest.map((c) => {
      const avg = data.averagePrices[c.key];
      return [
        c.label,
        c.productName,
        c.establishmentName,
        fmt(c.price),
        typeof avg === "number" ? fmt(avg) : "—",
      ];
    }),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [15, 27, 42], textColor: [115, 255, 184], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 245, 247] },
    theme: "grid",
    margin: { left: 14, right: 14 },
  });

  // Missing items
  const missingRows = data.missingByItem.filter((m) => m.missingStores.length > 0);
  if (missingRows.length > 0) {
    const afterCheapest = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y2;
    let y3 = afterCheapest + 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Itens sem preço registrado", 14, y3);
    y3 += 3;
    autoTable(doc, {
      startY: y3 + 2,
      head: [["Item", "Disponível em", "Faltando em"]],
      body: missingRows.map((m) => [
        m.label,
        `${m.availableStores} mercado(s)`,
        m.missingStores.slice(0, 4).join(", ") + (m.missingStores.length > 4 ? "…" : ""),
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [90, 62, 15], textColor: [255, 220, 150], fontStyle: "bold" },
      theme: "grid",
      margin: { left: 14, right: 14 },
    });
  }

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "Gerado por PreçoCerto — precocerto-fj.lovable.app",
    pageW / 2,
    doc.internal.pageSize.getHeight() - 8,
    { align: "center" },
  );

  doc.save(`cesta-basica-${Date.now()}.pdf`);
}
