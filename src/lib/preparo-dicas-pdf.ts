import { jsPDF } from "jspdf";
import { PREPARO_DICAS, favoriteKey, type Dica } from "./preparo-dicas-data";

type Options = {
  favorites?: Set<string>;
  filename?: string;
};

/**
 * Gera um PDF compacto do Guia de Preparo do Recanto da Carne.
 * - Layout de 2 colunas para caber tudo em poucas páginas
 * - Destaca cortes favoritos (se fornecidos)
 * - Compressão ativada para menor tamanho de arquivo
 */
export function gerarGuiaPreparoPDF(opts: Options = {}): void {
  const favorites = opts.favorites ?? new Set<string>();
  const filename = opts.filename ?? "guia-preparo-carnes-recanto-da-carne.pdf";

  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "portrait",
    compress: true,
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const gutter = 6;
  const colW = (pageW - margin * 2 - gutter) / 2;

  const primary: [number, number, number] = [245, 158, 11]; // amber
  const ink: [number, number, number] = [24, 24, 27];
  const muted: [number, number, number] = [100, 116, 139];

  // ---------- Cabeçalho ----------
  doc.setFillColor(...primary);
  doc.rect(0, 0, pageW, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Guia de Preparo — Qual corte usar", margin, 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    "Recanto da Carne · Feijó/AC · precocertofj.lovable.app",
    margin,
    16,
  );

  let cursorY = 30;
  let column: 0 | 1 = 0;

  const colX = (c: 0 | 1) => margin + c * (colW + gutter);

  const ensureSpace = (needed: number) => {
    if (cursorY + needed <= pageH - 18) return;
    if (column === 0) {
      column = 1;
      cursorY = 30;
      return;
    }
    // nova página
    doc.addPage();
    doc.setFillColor(...primary);
    doc.rect(0, 0, pageW, 6, "F");
    column = 0;
    cursorY = 14;
  };

  const drawDica = (d: Dica) => {
    const favCortes = d.cortes.filter((c) => favorites.has(favoriteKey(d.key, c.nome)));
    const hasFavs = favCortes.length > 0;

    // altura estimada
    const linhas = d.cortes.length + (d.variacoes?.length ? 1 : 0) + 4;
    ensureSpace(Math.min(linhas * 4.2 + 12, 90));

    const x = colX(column);
    const startY = cursorY;

    // faixa do título
    doc.setFillColor(...primary);
    doc.rect(x, startY, colW, 6, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(d.titulo.toUpperCase(), x + 2.5, startY + 4.2);
    if (hasFavs) {
      const badge = `★ ${favCortes.length}`;
      doc.setFontSize(8.5);
      const bw = doc.getTextWidth(badge) + 3;
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x + colW - bw - 2, startY + 1.2, bw, 3.6, 0.8, 0.8, "F");
      doc.setTextColor(...primary);
      doc.text(badge, x + colW - bw - 0.5, startY + 4);
    }
    cursorY = startY + 8;

    // descrição
    doc.setTextColor(...ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const desc = doc.splitTextToSize(d.descricao, colW - 2);
    doc.text(desc, x, cursorY);
    cursorY += desc.length * 3.4 + 2;

    // tempo & modo
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...primary);
    doc.text("TEMPO", x, cursorY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...ink);
    const tempoLinhas = doc.splitTextToSize(d.tempo, colW - 14);
    doc.text(tempoLinhas, x + 12, cursorY);
    cursorY += Math.max(3.4, tempoLinhas.length * 3.2);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...primary);
    doc.text("MODO", x, cursorY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...ink);
    const modoLinhas = doc.splitTextToSize(d.modo, colW - 14);
    doc.text(modoLinhas, x + 12, cursorY);
    cursorY += Math.max(3.4, modoLinhas.length * 3.2) + 2;

    // cortes
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...muted);
    doc.text("CORTES RECOMENDADOS", x, cursorY);
    cursorY += 3.2;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...ink);
    d.cortes.forEach((c) => {
      const isFav = favorites.has(favoriteKey(d.key, c.nome));
      const prefix = isFav ? "★ " : "• ";
      const linha = c.nota ? `${prefix}${c.nome} — ${c.nota}` : `${prefix}${c.nome}`;
      const wrap = doc.splitTextToSize(linha, colW - 3);
      ensureSpace(wrap.length * 3.2 + 2);
      if (isFav) {
        doc.setTextColor(...primary);
        doc.setFont("helvetica", "bold");
      } else {
        doc.setTextColor(...ink);
        doc.setFont("helvetica", "normal");
      }
      doc.text(wrap, x, cursorY);
      cursorY += wrap.length * 3.2 + 0.6;
    });

    // variações
    if (d.variacoes && d.variacoes.length) {
      cursorY += 1;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...muted);
      doc.text("VARIAÇÕES", x, cursorY);
      cursorY += 3.2;
      d.variacoes.forEach((v) => {
        const linha = `• ${v.nome} — ⏱ ${v.tempo} · 🔥 ${v.modo}`;
        const wrap = doc.splitTextToSize(linha, colW - 3);
        ensureSpace(wrap.length * 3.2 + 1);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...ink);
        doc.text(wrap, x, cursorY);
        cursorY += wrap.length * 3.2 + 0.4;
      });
    }

    cursorY += 5;
  };

  // seção de favoritos (resumo no topo)
  if (favorites.size > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...primary);
    doc.text(`★ Meus cortes favoritos (${favorites.size})`, margin, cursorY);
    cursorY += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...ink);
    const linhas: string[] = [];
    PREPARO_DICAS.forEach((d) => {
      const favs = d.cortes.filter((c) => favorites.has(favoriteKey(d.key, c.nome)));
      if (favs.length) linhas.push(`${d.titulo}: ${favs.map((c) => c.nome).join(", ")}`);
    });
    const wrap = doc.splitTextToSize(linhas.join("  ·  "), pageW - margin * 2);
    doc.text(wrap, margin, cursorY);
    cursorY += wrap.length * 3.4 + 4;
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, cursorY, pageW - margin, cursorY);
    cursorY += 4;
  }

  PREPARO_DICAS.forEach(drawDica);

  // rodapé em todas as páginas
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    doc.text(
      "Conteúdo cedido por Recanto da Carne — todos os direitos reservados. Reprodução apenas com autorização.",
      margin,
      pageH - 8,
    );
    doc.text(`${i}/${total}`, pageW - margin, pageH - 8, { align: "right" });
  }

  doc.save(filename);
}
