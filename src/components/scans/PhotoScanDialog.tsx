import { useCallback, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Camera, Upload, Loader2, Trash2, Check } from "lucide-react";
import { analyzeProductImage, type VisionProduct } from "@/lib/vision.functions";
import {
  insertScanWithDedupe,
} from "@/lib/scan-quick-edit.functions";
import { brl } from "@/lib/format";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  establishmentId: string;
  storeName?: string;
  onInserted?: (info: { productName: string; scanId: string; price: number }) => void;
};

type Row = VisionProduct & {
  status: "pending" | "saving" | "saved" | "duplicate" | "error";
  message?: string;
  duplicateExistingId?: string;
};

/**
 * Fluxo foto → produto. Suporta 1 ou vários produtos por foto (Vision já detecta os dois modos).
 * Insere no banco via `insertScanWithDedupe`; duplicatas bloqueiam silenciosamente (badge amarelo).
 */
export function PhotoScanDialog({
  open,
  onOpenChange,
  establishmentId,
  storeName,
  onInserted,
}: Props) {
  const analyze = useServerFn(analyzeProductImage);
  const insertOne = useServerFn(insertScanWithDedupe);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setAnalyzing(true);
      try {
        for (const file of Array.from(files)) {
          const dataUrl = await fileToDataUrl(file);
          const result = await analyze({ data: { image: dataUrl } });
          if (result.products.length === 0) {
            toast.warning(`Nenhum produto detectado em ${file.name}`);
            continue;
          }
          setRows((prev) => [
            ...prev,
            ...result.products.map((p) => ({ ...p, status: "pending" as const })),
          ]);
        }
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Falha ao analisar imagem");
      } finally {
        setAnalyzing(false);
        if (inputRef.current) inputRef.current.value = "";
        if (cameraRef.current) cameraRef.current.value = "";
      }
    },
    [analyze],
  );

  const patchRow = (idx: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const removeRow = (idx: number) =>
    setRows((prev) => prev.filter((_, i) => i !== idx));

  const insertRow = async (i: number, force: boolean) => {
    const r = rows[i];
    if (!r) return null;
    if (!r.productName || !r.price || r.price <= 0) {
      patchRow(i, { status: "error", message: "Nome e preço obrigatórios" });
      return null;
    }
    patchRow(i, { status: "saving" });
    try {
      const name = [r.productName, r.unit, r.brand].filter(Boolean).join(" ");
      const res = await insertOne({
        data: {
          productName: name,
          priceCaptured: r.price,
          establishmentId,
          barcode: r.barcode,
          brand: r.brand,
          marketName: storeName,
          force,
        },
      });
      if (res.status === "inserted") {
        patchRow(i, { status: "saved", message: undefined, duplicateExistingId: undefined });
        onInserted?.({ productName: res.productName, scanId: res.id, price: r.price! });
        return "inserted" as const;
      }
      patchRow(i, {
        status: "duplicate",
        duplicateExistingId: res.existingId,
        message: `Já existe: ${res.existingName} · ${brl(res.existingPrice)}`,
      });
      return "duplicate" as const;
    } catch (e: unknown) {
      patchRow(i, {
        status: "error",
        message: e instanceof Error ? e.message : "Falha",
      });
      return "error" as const;
    }
  };

  const saveAll = async () => {
    setSaving(true);
    let saved = 0;
    let dup = 0;
    try {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (r.status === "saved") continue;
        const result = await insertRow(i, false);
        if (result === "inserted") saved += 1;
        else if (result === "duplicate") dup += 1;
      }
      if (saved > 0) toast.success(`${saved} produto(s) inseridos`);
      if (dup > 0) toast.warning(`${dup} possível(is) duplicata(s) — confirme abaixo`);
    } finally {
      setSaving(false);
    }
  };

  const confirmDuplicate = async (idx: number) => {
    setSaving(true);
    try {
      const result = await insertRow(idx, true);
      if (result === "inserted") toast.success("Inserido mesmo com duplicata");
    } finally {
      setSaving(false);
    }
  };

  const close = () => {
    if (analyzing || saving) return;
    setRows([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Foto → produto</DialogTitle>
          <DialogDescription>
            Fotografe uma prateleira, etiqueta ou um único item. A IA identifica cada
            produto e o preço; você revisa antes de salvar em {storeName ?? "este mercado"}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => cameraRef.current?.click()}
            disabled={analyzing || saving}
          >
            <Camera className="mr-2 h-4 w-4" />
            Câmera
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => inputRef.current?.click()}
            disabled={analyzing || saving}
          >
            <Upload className="mr-2 h-4 w-4" />
            Enviar fotos
          </Button>
          {analyzing && (
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Analisando…
            </span>
          )}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {rows.length > 0 && (
          <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
            {rows.map((r, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-border bg-card p-3"
              >
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px_auto]">
                  <div>
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Produto
                    </Label>
                    <Input
                      value={r.productName ?? ""}
                      onChange={(e) => patchRow(idx, { productName: e.target.value })}
                      placeholder="Nome do produto"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Preço R$
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={r.price ?? ""}
                      onChange={(e) =>
                        patchRow(idx, {
                          price: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRow(idx)}
                      disabled={saving}
                      aria-label={`Remover produto ${idx + 1}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Input
                    value={r.brand ?? ""}
                    onChange={(e) => patchRow(idx, { brand: e.target.value })}
                    placeholder="Marca"
                    className="h-8 text-xs"
                  />
                  <Input
                    value={r.unit ?? ""}
                    onChange={(e) => patchRow(idx, { unit: e.target.value })}
                    placeholder="Peso/tamanho (500g, 1L…)"
                    className="h-8 text-xs"
                  />
                </div>
                {r.status !== "pending" && (
                  <div className="mt-2 space-y-1">
                    <p
                      className={`flex items-center gap-1 text-[11px] ${
                        r.status === "saved"
                          ? "text-savings"
                          : r.status === "duplicate"
                            ? "text-warning"
                            : r.status === "error"
                              ? "text-destructive"
                              : "text-muted-foreground"
                      }`}
                    >
                      {r.status === "saved" && <Check className="h-3 w-3" />}
                      {r.status === "saving" && <Loader2 className="h-3 w-3 animate-spin" />}
                      {r.status === "saved"
                        ? "Salvo"
                        : r.status === "duplicate"
                          ? `Possível duplicata · ${r.message ?? ""}`
                          : r.status === "saving"
                            ? "Salvando…"
                            : r.message ?? "Erro"}
                    </p>
                    {r.status === "duplicate" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px]"
                          onClick={() => confirmDuplicate(idx)}
                          disabled={saving}
                        >
                          Inserir mesmo assim
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px]"
                          onClick={() => removeRow(idx)}
                          disabled={saving}
                        >
                          Descartar
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={close} disabled={analyzing || saving}>
            Fechar
          </Button>
          <Button
            onClick={saveAll}
            disabled={rows.length === 0 || saving || analyzing}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar {rows.length > 0 ? `(${rows.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
