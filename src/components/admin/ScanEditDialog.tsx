import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import type { AdminScanRow } from "@/lib/admin-price.functions";
import {
  detectPackageFromImage,
  type PackageDetection,
} from "@/lib/package-detect.functions";

export function ScanEditDialog({
  open,
  onOpenChange,
  scan,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  scan: AdminScanRow | null;
  onSubmit: (args: { scanId: string; newPrice: number; notes: string }) => Promise<void>;
}) {
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detection, setDetection] = useState<PackageDetection | null>(null);
  const detect = useServerFn(detectPackageFromImage);

  // Initialize when scan changes
  useState(() => {
    if (scan) setPrice((scan.price_captured ?? 0).toFixed(2).replace(".", ","));
  });

  async function handleDetect() {
    if (!scan?.image_url) return;
    setDetecting(true);
    setDetection(null);
    try {
      const parsedPrice = Number(price.replace(",", "."));
      const res = await detect({
        data: {
          image: scan.image_url,
          price: Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : null,
        },
      });
      setDetection(res);
      if (!res.size_value || !res.size_unit) {
        toast.warning("Não foi possível detectar o tamanho na imagem.");
      } else {
        toast.success(
          `Detectado: ${res.size_value}${res.size_unit}${res.confidence !== "high" ? " (confiança " + res.confidence + ")" : ""}`,
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na IA");
    } finally {
      setDetecting(false);
    }
  }

  async function handleSave() {
    if (!scan) return;
    const parsed = Number(price.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Preço inválido");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ scanId: scan.id, newPrice: parsed, notes: notes.trim() });
      onOpenChange(false);
      setNotes("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (v && scan) setPrice((scan.price_captured ?? 0).toFixed(2).replace(".", ","));
        if (!v) setNotes("");
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar preço</DialogTitle>
          <DialogDescription>
            A alteração fica registrada na trilha de auditoria com data, hora e responsável.
          </DialogDescription>
        </DialogHeader>
        {scan && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <div className="font-medium">{scan.product_name ?? "—"}</div>
              <div className="text-xs text-muted-foreground">
                {scan.market_name ?? "—"} · leitura em{" "}
                {new Date(scan.created_at).toLocaleString("pt-BR")}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Preço atual:{" "}
                <span className="tabular-nums">
                  R$ {(scan.price_captured ?? 0).toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>
            <div>
              <Label htmlFor="new-price">Novo preço (R$)</Label>
              <Input
                id="new-price"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div>
              <Label htmlFor="notes">Motivo / observação</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex.: correção conforme etiqueta atual da estabelecimento."
                rows={3}
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar alteração"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
