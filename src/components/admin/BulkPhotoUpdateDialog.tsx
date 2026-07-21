import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Globe, PackageSearch } from "lucide-react";

export type BulkPhotoUpdateConfig = {
  scope: "missing" | "refresh";
  method: "web_only" | "web_with_ai";
  limit: number;
  olderThanDays: number;
};

export type BulkPhotoUpdateDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultScope?: "missing" | "refresh";
  onConfirm: (cfg: BulkPhotoUpdateConfig) => Promise<{ enqueued: number }>;
};

export function BulkPhotoUpdateDialog({
  open,
  onOpenChange,
  defaultScope = "missing",
  onConfirm,
}: BulkPhotoUpdateDialogProps) {
  const [scope, setScope] = useState<"missing" | "refresh">(defaultScope);
  const [method, setMethod] = useState<"web_only" | "web_with_ai">("web_with_ai");
  const [limit, setLimit] = useState(100);
  const [olderThanDays, setOlderThanDays] = useState(30);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    setErr(null);
    try {
      await onConfirm({ scope, method, limit, olderThanDays });
      onOpenChange(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha ao enfileirar lote");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (!busy || !v ? onOpenChange(v) : null)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageSearch className="h-4 w-4 text-primary" />
            Atualizar fotos em lote na web
          </DialogTitle>
          <DialogDescription>
            Cria jobs para o worker buscar fotos automaticamente. Você pode acompanhar
            o progresso na fila em lote.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Escopo</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScope("missing")}
                className={
                  "rounded-md border-2 p-3 text-left text-xs transition-colors " +
                  (scope === "missing"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-foreground/40")
                }
              >
                <p className="font-medium">Somente sem foto</p>
                <p className="mt-1 text-muted-foreground">
                  Enfileira apenas produtos que ainda não têm imagem.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setScope("refresh")}
                className={
                  "rounded-md border-2 p-3 text-left text-xs transition-colors " +
                  (scope === "refresh"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-foreground/40")
                }
              >
                <p className="font-medium">Forçar re-busca</p>
                <p className="mt-1 text-muted-foreground">
                  Inclui produtos com foto antiga (segundo &quot;dias&quot; abaixo).
                </p>
              </button>
            </div>
            {scope === "refresh" && (
              <div className="mt-2 flex items-center gap-2">
                <Label htmlFor="days" className="text-xs">
                  Fotos com mais de
                </Label>
                <input
                  id="days"
                  type="number"
                  min={0}
                  max={365}
                  value={olderThanDays}
                  onChange={(e) => setOlderThanDays(Number(e.target.value) || 0)}
                  className="w-20 rounded-md border bg-background px-2 py-1 text-sm"
                />
                <span className="text-xs text-muted-foreground">dias</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Método por produto</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMethod("web_only")}
                className={
                  "rounded-md border-2 p-3 text-left text-xs transition-colors " +
                  (method === "web_only"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-foreground/40")
                }
              >
                <div className="flex items-center gap-1 font-medium">
                  <Globe className="h-3 w-3" /> Somente web
                </div>
                <p className="mt-1 text-muted-foreground">
                  Rápido. Deixa sem foto se a web não retornar nada.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setMethod("web_with_ai")}
                className={
                  "rounded-md border-2 p-3 text-left text-xs transition-colors " +
                  (method === "web_with_ai"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-foreground/40")
                }
              >
                <div className="flex items-center gap-1 font-medium">
                  <Sparkles className="h-3 w-3" /> Web + IA fallback
                </div>
                <p className="mt-1 text-muted-foreground">
                  Padrão. Gera com IA quando não achar na web.
                </p>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="lim" className="text-xs font-medium">
                Limite por rodada
              </Label>
              <span className="text-xs font-medium text-primary">{limit}</span>
            </div>
            <input
              id="lim"
              type="range"
              min={10}
              max={500}
              step={10}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>10</span>
              <span>500</span>
            </div>
          </div>

          {err && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {err}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={confirm} disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Enfileirando…
              </>
            ) : (
              "Enfileirar lote"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
