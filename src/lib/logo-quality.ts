/**
 * logo-quality.ts — análise de qualidade e apresentação de logomarcas.
 *
 * Roda 100% no navegador (canvas). Serve dois propósitos:
 *
 *  1) Cadastro/edição de mercado: medir tamanho mínimo, nitidez, transparência
 *     e escala (área útil ocupada) para recomendar correções antes de publicar.
 *  2) Homepage: escolher automaticamente o melhor fundo (branco ou suave) e
 *     padronizar recorte/escala de todas as logos sem distorcer nem estourar
 *     bordas.
 *
 * Nunca lança: falhas de CORS/decode retornam `analyzed: false`.
 */

export type LogoMetrics = {
  analyzed: boolean;
  /** Dimensões naturais do arquivo. */
  width: number;
  height: number;
  /** Proporção largura/altura do conteúdo visível. */
  aspect: number;
  /** true se existir pixel com alpha < 250. */
  hasAlpha: boolean;
  /** Fração de pixels totalmente transparentes (0–1). */
  transparentRatio: number;
  /** Variância do laplaciano normalizada (0–1). Baixa = imagem borrada. */
  sharpness: number;
  /** Fração da área da imagem realmente ocupada por conteúdo (0–1). */
  contentRatio: number;
  /** Caixa do conteúdo em coordenadas normalizadas (0–1). */
  contentBox: { x: number; y: number; w: number; h: number };
  /** Luminância média do conteúdo (0–1). */
  contentLuma: number;
  /** Fração do conteúdo que é quase branco/muito claro. */
  lightInkRatio: number;
  /** Fundo já é praticamente branco (logo achatada em fundo branco). */
  whiteBackdrop: boolean;
};

export type LogoBackground = "white" | "soft";

export type LogoPresentation = {
  /** Melhor fundo do tile para contraste. */
  background: LogoBackground;
  /** Fator de escala para normalizar a altura visual entre marcas. */
  scale: number;
  /** Deslocamento (%) para centralizar o conteúdo real. */
  offsetX: number;
  offsetY: number;
};

export type LogoCheckStatus = "ok" | "warn" | "fail";

export type LogoCheck = {
  id: "size" | "sharpness" | "transparency" | "scale";
  label: string;
  status: LogoCheckStatus;
  detail: string;
  /** Recomendação de correção (ausente quando ok). */
  fix?: string;
};

export type LogoQualityReport = {
  analyzed: boolean;
  score: number; // 0–100
  publishable: boolean;
  checks: LogoCheck[];
  metrics: LogoMetrics | null;
};

const MIN_EDGE = 240;
const GOOD_EDGE = 400;

function emptyMetrics(): LogoMetrics {
  return {
    analyzed: false,
    width: 0,
    height: 0,
    aspect: 1,
    hasAlpha: false,
    transparentRatio: 0,
    sharpness: 1,
    contentRatio: 1,
    contentBox: { x: 0, y: 0, w: 1, h: 1 },
    contentLuma: 0.5,
    lightInkRatio: 0,
    whiteBackdrop: false,
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível carregar a imagem"));
    img.src = src;
  });
}

/** Analisa uma logomarca a partir de URL (mesma origem/CORS) ou data URL. */
export async function analyzeLogo(src: string): Promise<LogoMetrics> {
  if (typeof document === "undefined" || !src) return emptyMetrics();
  try {
    const img = await loadImage(src);
    const nw = img.naturalWidth || img.width;
    const nh = img.naturalHeight || img.height;
    if (!nw || !nh) return emptyMetrics();

    const max = 220;
    const s = Math.min(1, max / Math.max(nw, nh));
    const w = Math.max(1, Math.round(nw * s));
    const h = Math.max(1, Math.round(nh * s));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return emptyMetrics();
    ctx.drawImage(img, 0, 0, w, h);

    let data: Uint8ClampedArray;
    try {
      data = ctx.getImageData(0, 0, w, h).data;
    } catch {
      // canvas "tainted" (imagem sem CORS) — devolve o que sabemos.
      return { ...emptyMetrics(), width: nw, height: nh, aspect: nw / nh };
    }

    // Fundo estimado pelas bordas do bitmap.
    let bgR = 0;
    let bgG = 0;
    let bgB = 0;
    let bgA = 0;
    let bgN = 0;
    const sampleEdge = (x: number, y: number) => {
      const i = (y * w + x) * 4;
      bgR += data[i];
      bgG += data[i + 1];
      bgB += data[i + 2];
      bgA += data[i + 3];
      bgN++;
    };
    for (let x = 0; x < w; x++) {
      sampleEdge(x, 0);
      sampleEdge(x, h - 1);
    }
    for (let y = 0; y < h; y++) {
      sampleEdge(0, y);
      sampleEdge(w - 1, y);
    }
    bgR /= bgN;
    bgG /= bgN;
    bgB /= bgN;
    bgA /= bgN;
    const bgTransparent = bgA < 32;
    const bgLuma = (0.299 * bgR + 0.587 * bgG + 0.114 * bgB) / 255;
    const whiteBackdrop = !bgTransparent && bgLuma > 0.9;

    let transparentPx = 0;
    let alphaSoft = false;
    let minX = w;
    let minY = h;
    let maxX = -1;
    let maxY = -1;
    let inkLuma = 0;
    let inkN = 0;
    let lightInk = 0;
    const gray = new Float32Array(w * h);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        if (a === 0) transparentPx++;
        if (a < 250) alphaSoft = true;
        const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        gray[y * w + x] = luma * (a / 255) + (1 - a / 255);

        // "conteúdo" = pixel visível e distinto do fundo estimado
        const visible = a > 24;
        const diff = bgTransparent
          ? 1
          : (Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB)) / 765;
        if (visible && diff > 0.06) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
          inkLuma += luma;
          inkN++;
          if (luma > 0.82) lightInk++;
        }
      }
    }

    if (maxX < 0) {
      minX = 0;
      minY = 0;
      maxX = w - 1;
      maxY = h - 1;
    }

    const boxW = (maxX - minX + 1) / w;
    const boxH = (maxY - minY + 1) / h;

    // Nitidez: variância do laplaciano na região do conteúdo.
    let lapMean = 0;
    let lapSq = 0;
    let lapN = 0;
    for (let y = Math.max(1, minY); y < Math.min(h - 1, maxY); y++) {
      for (let x = Math.max(1, minX); x < Math.min(w - 1, maxX); x++) {
        const c = gray[y * w + x];
        const lap =
          4 * c -
          gray[(y - 1) * w + x] -
          gray[(y + 1) * w + x] -
          gray[y * w + (x - 1)] -
          gray[y * w + (x + 1)];
        lapMean += lap;
        lapSq += lap * lap;
        lapN++;
      }
    }
    const variance = lapN > 0 ? lapSq / lapN - (lapMean / lapN) ** 2 : 0;
    const sharpness = Math.max(0, Math.min(1, variance / 0.02));

    return {
      analyzed: true,
      width: nw,
      height: nh,
      aspect: boxH > 0 ? (boxW * w) / (boxH * h) : nw / nh,
      hasAlpha: alphaSoft,
      transparentRatio: transparentPx / (w * h),
      sharpness,
      contentRatio: boxW * boxH,
      contentBox: { x: minX / w, y: minY / h, w: boxW, h: boxH },
      contentLuma: inkN > 0 ? inkLuma / inkN : 0.5,
      lightInkRatio: inkN > 0 ? lightInk / inkN : 0,
      whiteBackdrop,
    };
  } catch {
    return emptyMetrics();
  }
}

/** Monta o laudo com recomendações de correção antes de publicar. */
export function buildLogoQualityReport(metrics: LogoMetrics | null): LogoQualityReport {
  if (!metrics || !metrics.analyzed) {
    return {
      analyzed: false,
      score: 0,
      publishable: true,
      checks: [],
      metrics,
    };
  }

  const checks: LogoCheck[] = [];
  const minEdge = Math.min(metrics.width, metrics.height);

  // 1. Tamanho mínimo
  if (minEdge < MIN_EDGE) {
    checks.push({
      id: "size",
      label: "Tamanho",
      status: "fail",
      detail: `${metrics.width}×${metrics.height}px — abaixo do mínimo de ${MIN_EDGE}px`,
      fix: `Envie um arquivo com pelo menos ${GOOD_EDGE}px no menor lado (PNG ou SVG exportado em alta).`,
    });
  } else if (minEdge < GOOD_EDGE) {
    checks.push({
      id: "size",
      label: "Tamanho",
      status: "warn",
      detail: `${metrics.width}×${metrics.height}px — aceitável, ideal ≥ ${GOOD_EDGE}px`,
      fix: `Prefira ${GOOD_EDGE}px ou mais para telas de alta densidade.`,
    });
  } else {
    checks.push({
      id: "size",
      label: "Tamanho",
      status: "ok",
      detail: `${metrics.width}×${metrics.height}px`,
    });
  }

  // 2. Nitidez
  if (metrics.sharpness < 0.16) {
    checks.push({
      id: "sharpness",
      label: "Nitidez",
      status: "fail",
      detail: `Bordas muito suaves (${Math.round(metrics.sharpness * 100)}%)`,
      fix: "Exporte novamente a partir do arquivo original (vetor/PSD). Evite prints ou fotos da fachada.",
    });
  } else if (metrics.sharpness < 0.32) {
    checks.push({
      id: "sharpness",
      label: "Nitidez",
      status: "warn",
      detail: `Nitidez moderada (${Math.round(metrics.sharpness * 100)}%)`,
      fix: "Se possível, use o arquivo vetorial para manter os traços limpos.",
    });
  } else {
    checks.push({
      id: "sharpness",
      label: "Nitidez",
      status: "ok",
      detail: `Traços definidos (${Math.round(metrics.sharpness * 100)}%)`,
    });
  }

  // 3. Transparência
  if (!metrics.hasAlpha && metrics.whiteBackdrop) {
    checks.push({
      id: "transparency",
      label: "Transparência",
      status: "warn",
      detail: "Fundo branco embutido no arquivo",
      fix: "Salve em PNG com fundo transparente para a marca se adaptar a qualquer tema.",
    });
  } else if (!metrics.hasAlpha) {
    checks.push({
      id: "transparency",
      label: "Transparência",
      status: "fail",
      detail: "Sem canal alfa — fundo colorido sólido",
      fix: "Recorte o fundo e exporte em PNG transparente; fundos sólidos criam moldura indesejada nos cards.",
    });
  } else {
    checks.push({
      id: "transparency",
      label: "Transparência",
      status: "ok",
      detail: `PNG transparente (${Math.round(metrics.transparentRatio * 100)}% livre)`,
    });
  }

  // 4. Escala / margens
  const box = metrics.contentBox;
  const longest = Math.max(box.w, box.h);
  if (longest < 0.55) {
    checks.push({
      id: "scale",
      label: "Escala",
      status: "warn",
      detail: `Marca ocupa só ${Math.round(longest * 100)}% do arquivo`,
      fix: "Recorte as margens vazias para a logo ocupar 85–95% da arte (a plataforma normaliza o resto).",
    });
  } else if (longest > 0.995 && metrics.contentRatio > 0.9) {
    checks.push({
      id: "scale",
      label: "Escala",
      status: "warn",
      detail: "Conteúdo encostado nas bordas",
      fix: "Deixe uma folga de 4–8% ao redor para a logo não estourar as bordas do card.",
    });
  } else {
    checks.push({
      id: "scale",
      label: "Escala",
      status: "ok",
      detail: `Área útil em ${Math.round(longest * 100)}%`,
    });
  }

  const weights: Record<LogoCheckStatus, number> = { ok: 1, warn: 0.6, fail: 0.15 };
  const score = Math.round(
    (checks.reduce((acc, c) => acc + weights[c.status], 0) / checks.length) * 100,
  );

  return {
    analyzed: true,
    score,
    publishable: !checks.some((c) => c.status === "fail"),
    checks,
    metrics,
  };
}

/**
 * Decide fundo, escala e centralização do tile a partir das métricas.
 * Mantém a mesma altura visual entre marcas sem distorcer a imagem.
 */
export function computeLogoPresentation(
  metrics: LogoMetrics | null,
  opts: { targetFill?: number } = {},
): LogoPresentation {
  const targetFill = opts.targetFill ?? 0.94;
  if (!metrics || !metrics.analyzed) {
    return { background: "white", scale: 1, offsetX: 0, offsetY: 0 };
  }

  // Fundo: branco quando a marca é escura ou já vem achatada em branco;
  // suave (claro-neutro) quando a tinta é muito clara e sumiria no branco.
  const light = metrics.lightInkRatio > 0.55 || metrics.contentLuma > 0.78;
  const background: LogoBackground = light && metrics.hasAlpha ? "soft" : "white";

  const box = metrics.contentBox;
  const longest = Math.max(box.w, box.h, 0.05);
  const scale = Math.min(1.6, Math.max(1, targetFill / longest));

  // Centro do conteúdo vs centro da arte → corrige logos descentralizadas.
  const cx = box.x + box.w / 2 - 0.5;
  const cy = box.y + box.h / 2 - 0.5;

  return {
    background,
    scale: Number(scale.toFixed(3)),
    offsetX: Number((-cx * 100 * scale).toFixed(2)),
    offsetY: Number((-cy * 100 * scale).toFixed(2)),
  };
}
