import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  CheckCircle2,
  Globe,
  History,
  ImageIcon,
  Loader2,
  RefreshCw,
  Sparkles,
  Upload,
  X,
  XCircle,
  ClipboardPaste,
} from "lucide-react";
import {
  formatBytesPerSecond,
  formatEta,
  xhrUpload,
  type UploadProgress,
} from "@/lib/xhrUpload";
import {
  UPLOAD_ERRORS,
  inferErrorCode,
  type UploadErrorCode,
} from "@/lib/upload-errors";
import type { CatalogImageHistoryEntry } from "@/lib/catalog-image.functions";

export type UploadStage =
  | "idle"
  | "validating"
  | "uploading"
  | "success"
  | "error";

export type PhotoUploadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  currentImageUrl: string | null;
  /**
   * Token de acesso Supabase do admin logado (Bearer). Se ausente, o dialog
   * tenta seguir mesmo assim (server route retornará 401).
   */
  accessToken: string | null;
  /**
   * Callback disparado após upload bem-sucedido — deve atualizar a linha
   * do catálogo local com a nova imageUrl.
   */
  onUploaded: (imageUrl: string) => void;
  onWebSearchFallback?: () => Promise<void>;
  onFetchHistory?: () => Promise<CatalogImageHistoryEntry[]>;
  maxSizeMb?: number;
};

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function humanBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

function actionLabel(action: string): string {
  switch (action) {
    case "image_upload":
      return "Upload manual";
    case "image_web":
      return "Web";
    case "image_generated":
      return "IA";
    case "image_upload_failed":
      return "Upload (falhou)";
    case "image_web_failed":
      return "Web (falhou)";
    case "image_generated_failed":
      return "IA (falhou)";
    default:
      return action;
  }
}

export function PhotoUploadDialog({
  open,
  onOpenChange,
  productId,
  productName,
  currentImageUrl,
  accessToken,
  onUploaded,
  onWebSearchFallback,
  onFetchHistory,
  maxSizeMb = 5,
}: PhotoUploadDialogProps) {
  const [tab, setTab] = useState<"upload" | "history">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [stage, setStage] = useState<UploadStage>("idle");
  const [errCode, setErrCode] = useState<UploadErrorCode | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [webBusy, setWebBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [history, setHistory] = useState<CatalogImageHistoryEntry[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autoCloseTimer = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setFile(null);
    setPreview(null);
    setStage("idle");
    setErrCode(null);
    setErrMsg(null);
    setProgress(null);
    setAttempt(0);
  }, []);

  useEffect(() => {
    if (!open) {
      if (autoCloseTimer.current) window.clearTimeout(autoCloseTimer.current);
      abortRef.current?.abort();
      reset();
      setHistory(null);
      setTab("upload");
    }
  }, [open, reset]);

  // Carrega histórico ao abrir a aba
  useEffect(() => {
    if (open && tab === "history" && onFetchHistory && history === null && !historyLoading) {
      setHistoryLoading(true);
      onFetchHistory()
        .then((rows) => setHistory(rows))
        .catch(() => setHistory([]))
        .finally(() => setHistoryLoading(false));
    }
  }, [open, tab, onFetchHistory, history, historyLoading]);

  const validate = (f: File): UploadErrorCode | null => {
    if (!ACCEPTED.includes(f.type)) return "BAD_MIME";
    if (f.size > maxSizeMb * 1024 * 1024) return "FILE_TOO_BIG";
    if (f.size < 1024) return "TOO_SMALL";
    return null;
  };

  const acceptFile = async (f: File) => {
    setStage("validating");
    setErrCode(null);
    setErrMsg(null);
    const code = validate(f);
    if (code) {
      setStage("error");
      setErrCode(code);
      setErrMsg(`${f.name} · ${humanBytes(f.size)}`);
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(f);
      setFile(f);
      setPreview(dataUrl);
      setStage("idle");
    } catch (e) {
      setStage("error");
      setErrCode("UNKNOWN");
      setErrMsg(e instanceof Error ? e.message : null);
    }
  };

  const onFilePicked = (fileList: FileList | null) => {
    const f = fileList?.[0];
    if (f) void acceptFile(f);
  };

  // Aceita imagem colada (Ctrl/Cmd+V) ou via botão "Colar".
  const acceptFromClipboardItems = useCallback(
    async (items: DataTransferItemList | ClipboardItems | null): Promise<boolean> => {
      if (!items) return false;
      // DataTransferItemList (evento onPaste)
      if ("length" in items && typeof (items as unknown as { item?: unknown }).item === "function") {
        const list = items as DataTransferItemList;
        for (let i = 0; i < list.length; i++) {
          const it = list[i];
          if (it.kind === "file" && it.type.startsWith("image/")) {
            const f = it.getAsFile();
            if (f) {
              const named =
                f.name && f.name !== "image.png"
                  ? f
                  : new File([f], `colado-${Date.now()}.${f.type.split("/")[1] || "png"}`, {
                      type: f.type,
                    });
              await acceptFile(named);
              return true;
            }
          }
        }
        return false;
      }
      // ClipboardItems (navigator.clipboard.read)
      const arr = items as ClipboardItems;
      for (const ci of arr) {
        const type = ci.types.find((t) => t.startsWith("image/"));
        if (type) {
          const blob = await ci.getType(type);
          const f = new File([blob], `colado-${Date.now()}.${type.split("/")[1] || "png"}`, {
            type,
          });
          await acceptFile(f);
          return true;
        }
      }
      return false;
    },
    // acceptFile é estável o suficiente (usa setState apenas)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const pasteFromClipboardButton = useCallback(async () => {
    try {
      if (!navigator.clipboard || !("read" in navigator.clipboard)) {
        setStage("error");
        setErrCode("UNKNOWN");
        setErrMsg("Seu navegador não permite ler a área de transferência. Use Ctrl+V.");
        return;
      }
      const items = await navigator.clipboard.read();
      const ok = await acceptFromClipboardItems(items);
      if (!ok) {
        setStage("error");
        setErrCode("BAD_MIME");
        setErrMsg("Nenhuma imagem encontrada na área de transferência.");
      }
    } catch (e) {
      setStage("error");
      setErrCode("UNKNOWN");
      setErrMsg(e instanceof Error ? e.message : "Falha ao ler clipboard");
    }
  }, [acceptFromClipboardItems]);

  // Listener global de paste enquanto o dialog está aberto
  useEffect(() => {
    if (!open) return;
    const handler = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      // Ignora se o usuário está colando texto num input focado
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      void acceptFromClipboardItems(e.clipboardData.items).then((ok) => {
        if (ok) e.preventDefault();
      });
    };
    window.addEventListener("paste", handler);
    return () => window.removeEventListener("paste", handler);
  }, [open, acceptFromClipboardItems]);


  const runUpload = useCallback(
    async (currentAttempt: number) => {
      if (!file) return;
      setStage("uploading");
      setErrCode(null);
      setErrMsg(null);
      setProgress(null);

      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const dataUrl = await fileToDataUrl(file);
        const payload = JSON.stringify({
          id: productId,
          filename: file.name,
          mime: file.type,
          size: file.size,
          dataUrl,
        });
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
        const res = await xhrUpload<{ ok?: boolean; imageUrl?: string; error?: { code?: string; message?: string } }>(
          {
            url: "/api/admin/catalog-image",
            method: "POST",
            headers,
            body: payload,
            signal: controller.signal,
            onProgress: (p) => setProgress(p),
          },
        );
        if (!res.ok || !res.data?.ok || !res.data.imageUrl) {
          const code =
            (res.data?.error?.code as UploadErrorCode | undefined) ??
            inferErrorCode(res.data?.error?.message ?? res.rawText);
          throw Object.assign(new Error(res.data?.error?.message ?? `HTTP ${res.status}`), { code });
        }
        onUploaded(res.data.imageUrl);
        setStage("success");
        if (autoCloseTimer.current) window.clearTimeout(autoCloseTimer.current);
        autoCloseTimer.current = window.setTimeout(() => onOpenChange(false), 1600);
      } catch (e) {
        const err = e as { code?: UploadErrorCode; message?: string };
        const code = err.code ?? inferErrorCode(err.message);
        // Retry automático 1x para NETWORK
        if (code === "NETWORK" && currentAttempt < 1) {
          setAttempt(currentAttempt + 1);
          setErrMsg("Falha transitória — tentando novamente…");
          window.setTimeout(() => void runUpload(currentAttempt + 1), 1200);
          return;
        }
        setStage("error");
        setErrCode(code);
        setErrMsg(err.message ?? null);
      }
    },
    [file, productId, accessToken, onUploaded, onOpenChange],
  );

  const handleUploadClick = () => {
    setAttempt(0);
    void runUpload(0);
  };

  const handleRetry = () => {
    setAttempt(0);
    void runUpload(0);
  };

  const handleWebFallback = async () => {
    if (!onWebSearchFallback) return;
    setWebBusy(true);
    try {
      await onWebSearchFallback();
    } catch (e) {
      setStage("error");
      setErrCode(inferErrorCode(e instanceof Error ? e.message : null));
      setErrMsg(e instanceof Error ? e.message : null);
    } finally {
      setWebBusy(false);
    }
  };

  const busy = stage === "uploading" || stage === "validating" || webBusy;
  const errInfo = errCode ? UPLOAD_ERRORS[errCode] : null;

  return (
    <Dialog open={open} onOpenChange={(v) => (!busy || !v ? onOpenChange(v) : null)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" />
            Atualizar foto do produto
          </DialogTitle>
          <DialogDescription className="line-clamp-2">{productName}</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "upload" | "history")}>
          <TabsList className="w-full">
            <TabsTrigger value="upload" className="flex-1">
              <Upload className="mr-1 h-3 w-3" />
              Enviar
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1">
              <History className="mr-1 h-3 w-3" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            {/* Comparação atual / novo */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Foto atual</p>
                <div className="aspect-square overflow-hidden rounded-md border bg-muted">
                  {currentImageUrl ? (
                    <img
                      src={currentImageUrl}
                      alt="Foto atual"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                      sem foto
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Nova foto</p>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    onFilePicked(e.dataTransfer.files);
                  }}
                  className={
                    "relative aspect-square overflow-hidden rounded-md border-2 border-dashed transition-colors " +
                    (dragOver
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/40 hover:border-foreground/40")
                  }
                >
                  {preview ? (
                    <>
                      <img
                        src={preview}
                        alt="Prévia"
                        className="h-full w-full object-cover"
                      />
                      {!busy && stage !== "success" && (
                        <button
                          type="button"
                          onClick={() => {
                            setFile(null);
                            setPreview(null);
                            setStage("idle");
                            setErrCode(null);
                            setErrMsg(null);
                          }}
                          className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-foreground shadow hover:bg-background"
                          aria-label="Remover"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center text-xs text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="flex flex-col items-center gap-1"
                      >
                        <Upload className="h-5 w-5" />
                        <span>Arraste ou clique</span>
                        <span className="text-[12.5px]">
                          JPG · PNG · WEBP · até {maxSizeMb}MB
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void pasteFromClipboardButton()}
                        className="mt-1 inline-flex items-center gap-1 rounded border border-border/60 bg-background px-2 py-0.5 text-[12.5px] hover:border-foreground/40"
                        title="Cole com Ctrl+V ou clique aqui"
                      >
                        <ClipboardPaste className="h-3 w-3" />
                        Colar (Ctrl+V)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED.join(",")}
              className="hidden"
              onChange={(e) => {
                onFilePicked(e.target.files);
                e.target.value = "";
              }}
            />

            {/* Upload em andamento com barra de progresso */}
            {stage === "uploading" && (
              <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="font-medium">
                    {attempt > 0 ? `Tentativa ${attempt + 1} de 2` : "Enviando…"}
                  </span>
                  {progress && progress.total > 0 && (
                    <span className="ml-auto font-mono text-xs">
                      {progress.percent.toFixed(0)}%
                    </span>
                  )}
                </div>
                <Progress value={progress?.percent ?? 0} />
                <div className="flex justify-between text-[12.5px] text-muted-foreground">
                  <span>
                    {progress
                      ? `${humanBytes(progress.loaded)} de ${humanBytes(progress.total)}`
                      : "Iniciando…"}
                  </span>
                  <span>
                    {progress
                      ? `${formatBytesPerSecond(progress.speedBps)} · ${formatEta(progress.etaSeconds)} restante`
                      : ""}
                  </span>
                </div>
              </div>
            )}

            {stage === "success" && (
              <div className="flex items-center gap-2 rounded-md border border-savings/40 bg-savings/10 px-3 py-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-savings" />
                <div className="flex-1">
                  <p className="font-medium text-savings dark:text-savings">
                    Foto atualizada com sucesso
                  </p>
                  <p className="text-xs text-muted-foreground">Fechando…</p>
                </div>
              </div>
            )}

            {stage === "error" && errInfo && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
                  <div className="flex-1">
                    <p className="font-medium text-destructive">{errInfo.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Causa:</span>{" "}
                      {errInfo.cause}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Ação:</span>{" "}
                      {errInfo.action}
                    </p>
                    {errMsg && (
                      <p className="mt-1 font-mono text-[12.5px] text-muted-foreground">
                        {errMsg}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {file && (
                    <Button size="sm" variant="outline" onClick={handleRetry}>
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Tentar novamente
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => inputRef.current?.click()}
                  >
                    <Upload className="mr-1 h-3 w-3" />
                    Escolher outra
                  </Button>
                  {onWebSearchFallback && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleWebFallback()}
                      disabled={webBusy}
                    >
                      {webBusy ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Globe className="mr-1 h-3 w-3" />
                      )}
                      Buscar na web
                    </Button>
                  )}
                </div>
              </div>
            )}

            {file && stage === "idle" && (
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{file.name}</span>
                {" · "}
                {humanBytes(file.size)}
                {" · "}
                {file.type.replace("image/", "").toUpperCase()}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            <HistoryList
              rows={history}
              loading={historyLoading}
              hasFetcher={!!onFetchHistory}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            {stage === "success" ? "Fechar" : "Cancelar"}
          </Button>
          {tab === "upload" && (
            <Button
              type="button"
              onClick={handleUploadClick}
              disabled={!file || busy || stage === "success"}
            >
              {stage === "uploading" ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Enviando…
                </>
              ) : (
                <>
                  <Upload className="mr-1 h-4 w-4" />
                  Enviar foto
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HistoryList({
  rows,
  loading,
  hasFetcher,
}: {
  rows: CatalogImageHistoryEntry[] | null;
  loading: boolean;
  hasFetcher: boolean;
}) {
  if (!hasFetcher) {
    return (
      <p className="py-6 text-center text-xs text-muted-foreground">
        Histórico indisponível.
      </p>
    );
  }
  if (loading || rows === null) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-muted-foreground">
        Nenhuma tentativa registrada para este produto ainda.
      </p>
    );
  }
  return (
    <div className="max-h-[24rem] space-y-2 overflow-y-auto pr-1">
      {rows.map((r) => {
        const isSuccess = r.result === "success";
        return (
          <div
            key={r.auditId}
            className={
              "rounded-md border p-2 text-xs " +
              (isSuccess
                ? "border-savings/30 bg-savings/5"
                : "border-destructive/30 bg-destructive/5")
            }
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {isSuccess ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-savings" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-destructive" />
                )}
                <span className="font-medium">{actionLabel(r.action)}</span>
                {r.errorCode && (
                  <span className="rounded bg-destructive/10 px-1 py-0.5 font-mono text-[12.5px] text-destructive">
                    {r.errorCode}
                  </span>
                )}
              </div>
              <span className="text-[12.5px] text-muted-foreground">
                {new Date(r.createdAt).toLocaleString("pt-BR")}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
              <span>{r.actorEmail ?? "sistema"}</span>
              {r.newImageUrl && (
                <img
                  src={r.newImageUrl}
                  alt="thumb"
                  className="h-8 w-8 rounded object-cover"
                />
              )}
              {r.candidate && (
                <a
                  href={r.candidate}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate hover:text-foreground"
                  title={r.candidate}
                >
                  fonte
                </a>
              )}
            </div>
          </div>
        );
      })}
      <p className="pt-2 text-center text-[12.5px] text-muted-foreground">
        <Sparkles className="mr-1 inline h-3 w-3" />
        Mostrando as {rows.length} tentativas mais recentes.
      </p>
    </div>
  );
}
