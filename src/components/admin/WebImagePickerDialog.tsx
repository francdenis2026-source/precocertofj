import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Globe,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { UPLOAD_ERRORS, inferErrorCode, type UploadErrorCode } from "@/lib/upload-errors";
import type { WebImageCandidate } from "@/lib/catalog-image.functions";

export type WebImagePickerDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productName: string;
  currentImageUrl: string | null;
  onFetchCandidates: () => Promise<WebImageCandidate[]>;
  onSelect: (url: string) => Promise<void>;
  onFallbackAI?: () => Promise<void>;
};

export function WebImagePickerDialog({
  open,
  onOpenChange,
  productName,
  currentImageUrl,
  onFetchCandidates,
  onSelect,
  onFallbackAI,
}: WebImagePickerDialogProps) {
  const [candidates, setCandidates] = useState<WebImageCandidate[] | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [errCode, setErrCode] = useState<UploadErrorCode | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [failedThumbs, setFailedThumbs] = useState<Set<string>>(new Set());
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setCandidates(null);
    setSelected(null);
    setApplying(false);
    setAiBusy(false);
    setErrCode(null);
    setErrMsg(null);
    setFailedThumbs(new Set());
    setSuccess(false);
  };

  const fetchList = async () => {
    setLoadingList(true);
    setErrCode(null);
    setErrMsg(null);
    try {
      const list = await onFetchCandidates();
      setCandidates(list);
      if (list.length === 0) {
        setErrCode("NO_IMAGE_FOUND");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setErrCode(inferErrorCode(msg));
      setErrMsg(msg);
      setCandidates([]);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (open) {
      reset();
      void fetchList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const applySelected = async () => {
    if (!selected) return;
    setApplying(true);
    setErrCode(null);
    setErrMsg(null);
    try {
      await onSelect(selected);
      setSuccess(true);
      window.setTimeout(() => onOpenChange(false), 1400);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setErrCode(inferErrorCode(msg));
      setErrMsg(msg);
    } finally {
      setApplying(false);
    }
  };

  const runAI = async () => {
    if (!onFallbackAI) return;
    setAiBusy(true);
    setErrCode(null);
    setErrMsg(null);
    try {
      await onFallbackAI();
      setSuccess(true);
      window.setTimeout(() => onOpenChange(false), 1400);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setErrCode(inferErrorCode(msg));
      setErrMsg(msg);
    } finally {
      setAiBusy(false);
    }
  };

  const busy = loadingList || applying || aiBusy;
  const errInfo = errCode ? UPLOAD_ERRORS[errCode] : null;

  return (
    <Dialog open={open} onOpenChange={(v) => (!busy || !v ? onOpenChange(v) : null)}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            Buscar foto na web
          </DialogTitle>
          <DialogDescription className="line-clamp-2">{productName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <div>
              A IA sugeriu {candidates?.length ?? "…"} opções. Clique em uma miniatura para
              selecionar e depois em <strong>Usar esta</strong>.
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={fetchList}
              disabled={busy}
            >
              {loadingList ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-3 w-3" />
              )}
              Nova busca
            </Button>
          </div>

          {loadingList && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square animate-pulse rounded-md border bg-muted"
                />
              ))}
            </div>
          )}

          {!loadingList && candidates && candidates.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {candidates.map((c) => {
                const isSelected = selected === c.imageUrl;
                const failed = failedThumbs.has(c.imageUrl);
                return (
                  <button
                    key={c.imageUrl}
                    type="button"
                    onClick={() => setSelected(c.imageUrl)}
                    disabled={failed || applying}
                    className={
                      "group relative overflow-hidden rounded-md border-2 text-left transition-all " +
                      (isSelected
                        ? "border-primary shadow-md ring-2 ring-primary/30"
                        : "border-border hover:border-foreground/40") +
                      (failed ? " opacity-40" : "")
                    }
                  >
                    <div className="aspect-square bg-muted">
                      {failed ? (
                        <div className="flex h-full w-full items-center justify-center p-2 text-center text-[10px] text-muted-foreground">
                          Miniatura indisponível
                        </div>
                      ) : (
                        <img
                          src={c.imageUrl}
                          alt={c.title ?? "candidata"}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          onError={() =>
                            setFailedThumbs((prev) => {
                              const n = new Set(prev);
                              n.add(c.imageUrl);
                              return n;
                            })
                          }
                        />
                      )}
                    </div>
                    {isSelected && (
                      <div className="absolute right-1 top-1 rounded-full bg-primary p-1 text-primary-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                    )}
                    <div className="space-y-1 border-t p-2">
                      {c.title && (
                        <div className="line-clamp-1 text-[11px] font-medium">
                          {c.title}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        {c.confidence && (
                          <Badge variant="outline" className="text-[9px] uppercase">
                            {c.confidence}
                          </Badge>
                        )}
                        {c.sourcePage && (
                          <a
                            href={c.sourcePage}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-0.5 hover:text-foreground"
                          >
                            fonte
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {selected && currentImageUrl && !applying && !success && (
            <div className="grid grid-cols-2 gap-2 rounded-md border bg-muted/30 p-2">
              <div>
                <p className="mb-1 text-[10px] font-medium text-muted-foreground">
                  Foto atual
                </p>
                <img
                  src={currentImageUrl}
                  alt="atual"
                  className="aspect-square w-full rounded object-cover"
                />
              </div>
              <div>
                <p className="mb-1 text-[10px] font-medium text-muted-foreground">
                  Nova foto
                </p>
                <img
                  src={selected}
                  alt="selecionada"
                  className="aspect-square w-full rounded object-cover ring-2 ring-primary"
                />
              </div>
            </div>
          )}

          {applying && (
            <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Baixando e aplicando imagem…</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-md border border-savings/40 bg-savings/10 px-3 py-2 text-sm text-savings dark:text-savings">
              <CheckCircle2 className="h-4 w-4" />
              <span>Imagem aplicada com sucesso.</span>
            </div>
          )}

          {errInfo && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
                <div className="flex-1">
                  <p className="font-medium text-destructive">{errInfo.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Causa:</span> {errInfo.cause}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Ação:</span> {errInfo.action}
                  </p>
                  {errMsg && (
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                      {errMsg}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {onFallbackAI && (
            <Button
              type="button"
              variant="ghost"
              onClick={runAI}
              disabled={busy || success}
              className="mr-auto"
            >
              {aiBusy ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-4 w-4" />
              )}
              Não gostei — gerar via IA
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {success ? "Fechar" : "Cancelar"}
          </Button>
          <Button onClick={applySelected} disabled={!selected || busy || success}>
            {applying ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Aplicando…
              </>
            ) : (
              "Usar esta"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
