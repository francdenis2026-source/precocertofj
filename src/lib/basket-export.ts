import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { BasketStore } from "@/lib/basket.functions";
import { brl } from "@/lib/format";

export type RankingExportRow = {
  position: number;
  store: BasketStore & {
    scopedTotal: number;
    scopedFound: number;
    scopedTotalItems: number;
    scopedItems: BasketStore["items"];
  };
  diffToLeader: number;
  isFavorite: boolean;
};

type Meta = {
  categoryLabel: string;
  cityLabel: string;
  neighborhoodLabel: string;
  generatedAt: Date;
};

function fmtDateSuffix(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

function slug(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "todos";
}

function csvEscape(v: string | number | null | undefined) {
  const s = v == null ? "" : String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function download(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ============================================================
// CSV — ranking geral
// ============================================================

export function exportRankingCsv(rows: RankingExportRow[], meta: Meta) {
  const header = [
    "Posição",
    "Estabelecimento",
    "Favorito",
    "Bairro",
    "Cidade",
    "Itens encontrados",
    "Total (R$)",
    "Diferença vs líder (R$)",
    "Categoria",
  ];
  const lines: string[] = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.position,
        row.store.establishmentName,
        row.isFavorite ? "sim" : "não",
        row.store.neighborhood ?? "",
        row.store.city ?? "",
        `${row.store.scopedFound}/${row.store.scopedTotalItems}`,
        row.store.scopedTotal.toFixed(2).replace(".", ","),
        row.diffToLeader > 0 ? row.diffToLeader.toFixed(2).replace(".", ",") : "0,00",
        meta.categoryLabel,
      ]
        .map(csvEscape)
        .join(","),
    );
  }
  const filename = `ranking-cesta-${slug(meta.categoryLabel)}-${slug(meta.cityLabel)}-${fmtDateSuffix(meta.generatedAt)}.csv`;
  download(filename, new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" }));
}

// ============================================================
// CSV — detalhes de um estabelecimento
// ============================================================

export function exportStoreDetailsCsv(
  store: RankingExportRow["store"],
  deltas: Map<string, number>,
  meta: Meta,
) {
  const header = [
    "Estabelecimento",
    "Item",
    "Produto",
    "Preço (R$)",
    "Data",
    "Variação (R$)",
  ];
  const lines: string[] = [header.join(",")];
  for (const it of store.scopedItems) {
    if (!it) continue;
    const delta = deltas.get(`${store.establishmentId}::${it.key}`) ?? 0;
    lines.push(
      [
        store.establishmentName,
        it.label,
        it.productName,
        it.price.toFixed(2).replace(".", ","),
        new Date(it.when).toLocaleDateString("pt-BR"),
        delta === 0 ? "" : `${delta > 0 ? "+" : ""}${delta.toFixed(2).replace(".", ",")}`,
      ]
        .map(csvEscape)
        .join(","),
    );
  }
  const filename = `detalhes-${slug(store.establishmentName)}-${fmtDateSuffix(meta.generatedAt)}.csv`;
  download(filename, new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" }));
}

// ============================================================
// PDF — ranking
// ============================================================

function pdfHeader(doc: jsPDF, title: string, subtitle: string) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(15, 27, 42); // brand navy
  doc.rect(0, 0, pageW, 26, "F");
  doc.setTextColor(255, 205, 105); // brand gold
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("PreçoCerto — Cesta ao vivo", 14, 12);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(title, 14, 18);
  doc.setFontSize(8);
  doc.text(subtitle, 14, 22.5);
  doc.setTextColor(0, 0, 0);
}

export function exportRankingPdf(rows: RankingExportRow[], meta: Meta) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const subtitle = `Categoria: ${meta.categoryLabel} · Cidade: ${meta.cityLabel} · Bairro: ${meta.neighborhoodLabel} · Gerado em ${meta.generatedAt.toLocaleString("pt-BR")}`;
  pdfHeader(doc, "Ranking de estabelecimentos", subtitle);

  autoTable(doc, {
    startY: 32,
    head: [["#", "Estabelecimento", "Bairro / Cidade", "Itens", "Total", "vs líder"]],
    body: rows.map((r) => [
      String(r.position),
      `${r.isFavorite ? "★ " : ""}${r.store.establishmentName}`,
      [r.store.neighborhood, r.store.city].filter(Boolean).join(" / ") || "—",
      `${r.store.scopedFound}/${r.store.scopedTotalItems}`,
      brl(r.store.scopedTotal),
      r.position === 1 ? "líder" : `+${brl(r.diffToLeader)}`,
    ]),
    styles: { font: "helvetica", fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [15, 27, 42], textColor: [255, 205, 105] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      3: { halign: "center", cellWidth: 18 },
      4: { halign: "right", cellWidth: 24 },
      5: { halign: "right", cellWidth: 24 },
    },
  });

  const filename = `ranking-cesta-${slug(meta.categoryLabel)}-${slug(meta.cityLabel)}-${fmtDateSuffix(meta.generatedAt)}.pdf`;
  doc.save(filename);
}

// ============================================================
// PDF — detalhes de um estabelecimento
// ============================================================

export function exportStoreDetailsPdf(
  store: RankingExportRow["store"],
  deltas: Map<string, number>,
  meta: Meta,
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const subtitle = `${store.establishmentName} · ${[store.neighborhood, store.city].filter(Boolean).join(" / ") || "—"} · ${meta.generatedAt.toLocaleString("pt-BR")}`;
  pdfHeader(doc, `Detalhes — ${meta.categoryLabel}`, subtitle);

  autoTable(doc, {
    startY: 32,
    head: [["Item", "Produto", "Preço", "Data", "Variação"]],
    body: store.scopedItems
      .filter((it): it is NonNullable<typeof it> => it != null)
      .map((it) => {
        const delta = deltas.get(`${store.establishmentId}::${it.key}`) ?? 0;
        return [
          it.label,
          it.productName,
          brl(it.price),
          new Date(it.when).toLocaleDateString("pt-BR"),
          delta === 0
            ? "—"
            : `${delta > 0 ? "+" : ""}${brl(delta)}`,
        ];
      }),
    styles: { font: "helvetica", fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [15, 27, 42], textColor: [255, 205, 105] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      2: { halign: "right", cellWidth: 24 },
      3: { halign: "center", cellWidth: 26 },
      4: { halign: "right", cellWidth: 24 },
    },
  });

  const totalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Total: ${brl(store.scopedTotal)}`, 14, totalY);

  const filename = `detalhes-${slug(store.establishmentName)}-${fmtDateSuffix(meta.generatedAt)}.pdf`;
  doc.save(filename);
}
