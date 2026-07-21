import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  StoreQuoteCartItem,
  StoreQuoteComparisonRow,
} from "./store-quotes.functions";

const fmt = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;

export type StoreQuotePdfPayload = {
  storeName: string;
  cart: StoreQuoteCartItem[];
  comparison?: StoreQuoteComparisonRow[] | null;
  shareUrl?: string | null;
};

export function exportStoreQuotePdf(payload: StoreQuotePdfPayload): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 27, 42);
  doc.rect(0, 0, pageW, 26, "F");
  doc.setTextColor(115, 255, 184);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("PreçoCerto", 14, 17);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Cotação de cesta", 14, 22);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleString("pt-BR"), pageW - 14, 22, { align: "right" });

  let y = 34;
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Estabelecimento:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(payload.storeName, 55, y);
  y += 8;

  const total = payload.cart.reduce((s, r) => s + r.price * r.quantity, 0);

  autoTable(doc, {
    startY: y,
    head: [["Produto", "Qtd.", "Preço", "Subtotal"]],
    body: payload.cart.map((it) => [
      it.productName,
      String(it.quantity),
      fmt(it.price),
      fmt(it.price * it.quantity),
    ]),
    foot: [["", "", "Total", fmt(total)]],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [15, 27, 42], textColor: [115, 255, 184], fontStyle: "bold" },
    footStyles: { fillColor: [235, 235, 240], textColor: [15, 27, 42], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 245, 247] },
    theme: "grid",
    margin: { left: 14, right: 14 },
  });

  const finalY =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 20;
  y = finalY + 10;

  if (payload.comparison && payload.comparison.length > 0) {
    const ref = payload.comparison.find((r) => r.isReference);
    const refTotal = ref?.total ?? total;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 20);
    doc.text("Comparação entre mercados", 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [["Estabelecimento", "Itens", "Total", "Diferença"]],
      body: payload.comparison.map((r) => {
        const diff = r.total - refTotal;
        const pct = refTotal > 0 ? (diff / refTotal) * 100 : 0;
        const label =
          diff === 0 ? "—" : `${diff > 0 ? "+" : ""}${fmt(diff)} (${pct.toFixed(1).replace(".", ",")}%)`;
        return [
          `${r.storeName}${r.isReference ? " (referência)" : ""}`,
          `${r.matchedCount}/${r.totalCount}`,
          fmt(r.total),
          label,
        ];
      }),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [15, 27, 42], textColor: [115, 255, 184], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 245, 247] },
      theme: "grid",
      margin: { left: 14, right: 14 },
    });
  }

  const pageH = doc.internal.pageSize.getHeight();
  if (payload.shareUrl) {
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(`Link público: ${payload.shareUrl}`, 14, pageH - 14);
  }
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "Sistema de pesquisa de preços — não realizamos pagamentos.",
    pageW / 2,
    pageH - 8,
    { align: "center" },
  );

  doc.save(`cotacao-${payload.storeName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}.pdf`);
}
