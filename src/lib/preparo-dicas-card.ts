import type { Dica } from "./preparo-dicas-data";

// Portrait card, IG-friendly proportion
const W = 1080;
const H = 1350;

const PALETTE = {
  bg: "#f8fafc",
  panel: "#ffffff",
  border: "#e2e8f0",
  primary: "#2563eb",
  primarySoft: "#dbeafe",
  text: "#0f172a",
  muted: "#475569",
  accent: "#f59e0b",
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function chip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  value: string,
): number {
  ctx.font = "600 22px system-ui, sans-serif";
  const labelW = ctx.measureText(label).width;
  ctx.font = "400 22px system-ui, sans-serif";
  const valueW = ctx.measureText(value).width;
  const padX = 18;
  const gap = 8;
  const w = padX * 2 + labelW + gap + valueW;
  const h = 44;

  ctx.fillStyle = PALETTE.primarySoft;
  roundRect(ctx, x, y, w, h, 22);
  ctx.fill();

  ctx.fillStyle = PALETTE.primary;
  ctx.font = "600 22px system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + padX, y + h / 2);

  ctx.fillStyle = PALETTE.text;
  ctx.font = "400 22px system-ui, sans-serif";
  ctx.fillText(value, x + padX + labelW + gap, y + h / 2);

  return w;
}

export function renderPreparoCard(dica: Dica): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // background
  ctx.fillStyle = PALETTE.bg;
  ctx.fillRect(0, 0, W, H);

  // top accent bar
  ctx.fillStyle = PALETTE.primary;
  ctx.fillRect(0, 0, W, 12);

  // header
  const padX = 64;
  let y = 68;

  ctx.fillStyle = PALETTE.muted;
  ctx.font = "600 22px system-ui, sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText("GUIA DE PREPARO", padX, y);
  y += 32;

  ctx.fillStyle = PALETTE.text;
  ctx.font = "800 68px system-ui, sans-serif";
  ctx.fillText(dica.titulo.toUpperCase(), padX, y);
  y += 88;

  // Descrição (wrap)
  ctx.fillStyle = PALETTE.muted;
  ctx.font = "400 26px system-ui, sans-serif";
  const descLines = wrap(ctx, dica.descricao, W - padX * 2).slice(0, 3);
  for (const l of descLines) {
    ctx.fillText(l, padX, y);
    y += 36;
  }
  y += 12;

  // Chips (tempo/modo) — wrap onto multiple rows if needed
  let cx = padX;
  let cy = y;
  const rowGap = 12;
  const chipGap = 12;
  const chipsData = [
    { label: "Tempo", value: dica.tempo },
    { label: "Modo", value: dica.modo },
  ];
  for (const c of chipsData) {
    ctx.save();
    ctx.font = "600 22px system-ui, sans-serif";
    const lw = ctx.measureText(c.label).width;
    ctx.font = "400 22px system-ui, sans-serif";
    const vw = ctx.measureText(c.value).width;
    const width = 18 * 2 + lw + 8 + vw;
    ctx.restore();

    if (cx + width > W - padX) {
      cx = padX;
      cy += 44 + rowGap;
    }
    const w = chip(ctx, cx, cy, c.label, c.value);
    cx += w + chipGap;
  }
  y = cy + 44 + 28;

  // Panel: Cortes recomendados
  const panelX = padX;
  const panelY = y;
  const panelW = W - padX * 2;
  const panelH = H - panelY - 120;

  ctx.fillStyle = PALETTE.panel;
  roundRect(ctx, panelX, panelY, panelW, panelH, 24);
  ctx.fill();
  ctx.strokeStyle = PALETTE.border;
  ctx.lineWidth = 2;
  ctx.stroke();

  let py = panelY + 32;
  ctx.fillStyle = PALETTE.primary;
  ctx.font = "700 24px system-ui, sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText("CORTES RECOMENDADOS", panelX + 28, py);
  py += 44;

  const maxTextW = panelW - 28 * 2 - 24; // bullet gap
  const maxBottom = panelY + panelH - 24;

  let shown = 0;
  for (const c of dica.cortes) {
    // Bullet
    ctx.fillStyle = PALETTE.primary;
    ctx.beginPath();
    ctx.arc(panelX + 28 + 6, py + 14, 5, 0, Math.PI * 2);
    ctx.fill();

    // Nome
    ctx.fillStyle = PALETTE.text;
    ctx.font = "700 26px system-ui, sans-serif";
    ctx.fillText(c.nome, panelX + 28 + 24, py);

    let itemH = 34;
    if (c.nota) {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = "400 22px system-ui, sans-serif";
      const notaLines = wrap(ctx, c.nota, maxTextW).slice(0, 2);
      let ny = py + 34;
      for (const l of notaLines) {
        ctx.fillText(l, panelX + 28 + 24, ny);
        ny += 28;
      }
      itemH = 34 + notaLines.length * 28;
    }
    itemH += 10;

    if (py + itemH > maxBottom - 40) {
      // sinaliza mais itens
      ctx.fillStyle = PALETTE.muted;
      ctx.font = "italic 22px system-ui, sans-serif";
      ctx.fillText(
        `+ ${dica.cortes.length - shown} outros cortes no app`,
        panelX + 28,
        py + 4,
      );
      break;
    }
    py += itemH;
    shown++;
  }

  // Footer
  ctx.fillStyle = PALETTE.muted;
  ctx.font = "600 22px system-ui, sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("Preço Certo · Recanto da Carne", padX, H - 56);

  ctx.fillStyle = PALETTE.primary;
  ctx.font = "700 22px system-ui, sans-serif";
  const url = "precocertofj.lovable.app";
  const urlW = ctx.measureText(url).width;
  ctx.fillText(url, W - padX - urlW, H - 56);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error("Falha ao gerar imagem"));
    }, "image/png");
  });
}

export async function shareOrDownloadPreparoCard(dica: Dica): Promise<"shared" | "downloaded"> {
  const blob = await renderPreparoCard(dica);
  const filename = `preparo-${dica.key}.png`;
  const file = new File([blob], filename, { type: "image/png" });

  const nav = navigator as Navigator & {
    canShare?: (data: { files?: File[] }) => boolean;
    share?: (data: { files?: File[]; title?: string; text?: string }) => Promise<void>;
  };

  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({
        files: [file],
        title: `${dica.titulo} — Guia de Preparo`,
        text: `${dica.titulo} · ${dica.tempo} · ${dica.modo}`,
      });
      return "shared";
    } catch (err) {
      const e = err as { name?: string };
      if (e?.name === "AbortError") return "shared";
      // cai para download
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return "downloaded";
}
