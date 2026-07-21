import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { verdictLabel, type Verdict } from "./scan-utils";

export type PdfItem = {
  productName: string;
  price: number;
  average?: number | null;
  verdict?: string | null;
  cheaperElsewhere?: { marketName: string; price: number } | null;
};

export type PdfPayload = {
  marketName?: string | null;
  imageUrl?: string | null;
  items: PdfItem[];
};

const fmt = (n: number | null | undefined) =>
  typeof n === "number" ? `R$ ${n.toFixed(2).replace(".", ",")}` : "—";

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(typeof r.result === "string" ? r.result : null);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportComparisonPdf(payload: PdfPayload): Promise<void> {
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
  doc.text("Comparação de preços", 14, 22);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleString("pt-BR"), pageW - 14, 22, { align: "right" });

  let y = 34;
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(11);
  if (payload.marketName) {
    doc.setFont("helvetica", "bold");
    doc.text("Estabelecimento: ", 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(payload.marketName, 55, y);
    y += 7;
  }

  // Image
  if (payload.imageUrl) {
    const dataUrl = payload.imageUrl.startsWith("data:")
      ? payload.imageUrl
      : await urlToDataUrl(payload.imageUrl);
    if (dataUrl) {
      try {
        doc.addImage(dataUrl, "WEBP", 14, y, 60, 60, undefined, "FAST");
      } catch {
        try {
          doc.addImage(dataUrl, "JPEG", 14, y, 60, 60, undefined, "FAST");
        } catch {
          /* skip */
        }
      }
    }
    y += 66;
  }

  autoTable(doc, {
    startY: y,
    head: [["Produto", "Preço", "Média", "Veredito", "Alternativa"]],
    body: payload.items.map((it) => [
      it.productName,
      fmt(it.price),
      fmt(it.average ?? null),
      it.verdict ? verdictLabel[it.verdict as Verdict] ?? it.verdict : "—",
      it.cheaperElsewhere
        ? `${it.cheaperElsewhere.marketName} · ${fmt(it.cheaperElsewhere.price)}`
        : "—",
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: {
      fillColor: [15, 27, 42],
      textColor: [115, 255, 184],
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [245, 245, 247] },
    theme: "grid",
    margin: { left: 14, right: 14 },
  });

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "Gerado por PreçoCerto — precocerto-fj.lovable.app",
    pageW / 2,
    doc.internal.pageSize.getHeight() - 8,
    { align: "center" },
  );

  const filename = `precocerto-${Date.now()}.pdf`;
  doc.save(filename);
}
