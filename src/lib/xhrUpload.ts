/**
 * Upload via XMLHttpRequest com callback de progresso, velocidade estimada e ETA.
 * Server functions do TanStack não expõem progresso do body enviado; para o
 * uploader de foto de produto usamos uma server route dedicada
 * (`/api/admin/catalog-image`) que aceita JSON com dataUrl.
 */

export type UploadProgress = {
  loaded: number; // bytes enviados
  total: number; // bytes totais (0 se desconhecido)
  percent: number; // 0-100 (100 se total desconhecido no fim)
  speedBps: number; // bytes/segundo (média móvel)
  etaSeconds: number; // segundos restantes estimados
  elapsedSeconds: number;
};

export type XhrUploadOptions = {
  url: string;
  method?: "POST" | "PUT";
  headers?: Record<string, string>;
  body: string | Blob | FormData | URLSearchParams | ArrayBuffer;
  onProgress?: (p: UploadProgress) => void;
  signal?: AbortSignal;
  timeoutMs?: number;
};

export type XhrUploadResponse<T = unknown> = {
  status: number;
  ok: boolean;
  data: T | null;
  rawText: string;
};

/**
 * Envia via XHR e reporta progresso em tempo real. Retorna a resposta
 * como JSON quando possível.
 */
export function xhrUpload<T = unknown>(
  opts: XhrUploadOptions,
): Promise<XhrUploadResponse<T>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const start = performance.now();
    const samples: Array<{ t: number; loaded: number }> = [];
    const SAMPLE_CAP = 5;

    xhr.open(opts.method ?? "POST", opts.url, true);
    if (opts.headers) {
      for (const [k, v] of Object.entries(opts.headers)) xhr.setRequestHeader(k, v);
    }
    if (opts.timeoutMs) xhr.timeout = opts.timeoutMs;

    xhr.upload.onprogress = (e) => {
      if (!opts.onProgress) return;
      const now = performance.now();
      samples.push({ t: now, loaded: e.loaded });
      while (samples.length > SAMPLE_CAP) samples.shift();
      const first = samples[0];
      const last = samples[samples.length - 1];
      const dt = Math.max(1, last.t - first.t) / 1000;
      const db = Math.max(0, last.loaded - first.loaded);
      const speedBps = samples.length >= 2 ? db / dt : e.loaded / Math.max(0.001, (now - start) / 1000);
      const total = e.lengthComputable ? e.total : 0;
      const percent = total > 0 ? (e.loaded / total) * 100 : 0;
      const etaSeconds =
        total > 0 && speedBps > 0 ? (total - e.loaded) / speedBps : 0;
      opts.onProgress({
        loaded: e.loaded,
        total,
        percent,
        speedBps,
        etaSeconds,
        elapsedSeconds: (now - start) / 1000,
      });
    };

    xhr.onload = () => {
      const rawText = xhr.responseText ?? "";
      let data: T | null = null;
      try {
        data = rawText ? (JSON.parse(rawText) as T) : null;
      } catch {
        data = null;
      }
      if (opts.onProgress) {
        // Emit final 100% event to close out speed calculation.
        opts.onProgress({
          loaded: 1,
          total: 1,
          percent: 100,
          speedBps: 0,
          etaSeconds: 0,
          elapsedSeconds: (performance.now() - start) / 1000,
        });
      }
      resolve({ status: xhr.status, ok: xhr.status >= 200 && xhr.status < 300, data, rawText });
    };

    xhr.onerror = () => reject(new Error("NETWORK: falha de rede durante upload"));
    xhr.ontimeout = () => reject(new Error("NETWORK: timeout do upload"));
    xhr.onabort = () => reject(new Error("NETWORK: upload cancelado"));

    if (opts.signal) {
      if (opts.signal.aborted) {
        xhr.abort();
        return;
      }
      opts.signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }

    xhr.send(opts.body);
  });
}

export function formatBytesPerSecond(bps: number): string {
  if (!Number.isFinite(bps) || bps <= 0) return "—";
  if (bps < 1024) return `${bps.toFixed(0)} B/s`;
  if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
  return `${(bps / (1024 * 1024)).toFixed(2)} MB/s`;
}

export function formatEta(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.ceil(seconds % 60);
  return `${m}m ${s}s`;
}
