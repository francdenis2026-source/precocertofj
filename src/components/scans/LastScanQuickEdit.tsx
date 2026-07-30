import { useState, useEffect } from "react";
import { Price } from "@/components/ds/Price";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Pencil, Save, X, History, Check } from "lucide-react";
import { updateLastScan } from "@/lib/scan-quick-edit.functions";
import { brl } from "@/lib/format";
import { PriceHistoryDrawer } from "./PriceHistoryDrawer";

export type LastScanSummary = {
  id: string;
  productName: string;
  priceCaptured: number;
  storeName?: string;
  createdAt?: string;
};

type Props = {
  scan: LastScanSummary | null;
  onUpdated?: (updated: { productName?: string }) => void;
};

/**
 * Cartão de edição rápida do último scan inserido.
 * - Atualiza preço, nome e marca/peso em segundos
 * - Botão para abrir histórico entre mercados
 */
export function LastScanQuickEdit({ scan, onUpdated }: Props) {
  const update = useServerFn(updateLastScan);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(scan?.productName ?? "");
  const [price, setPrice] = useState<number | "">(scan?.priceCaptured ?? "");
  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    if (scan) {
      setName(scan.productName);
      setPrice(scan.priceCaptured);
      setBrand("");
      setSize("");
      setEditing(false);
    }
  }, [scan?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!scan) return null;

  const save = async () => {
    setSaving(true);
    try {
      const res = await update({
        data: {
          id: scan.id,
          patch: {
            productName: name !== scan.productName ? name : undefined,
            priceCaptured:
              typeof price === "number" && price !== scan.priceCaptured
                ? price
                : undefined,
            brand: brand || undefined,
            sizeLabel: size || undefined,
          },
        },
      });
      toast.success(res.unchanged ? "Nada mudou" : "Atualizado");
      setEditing(false);
      onUpdated?.({ productName: res.unchanged ? undefined : res.productName ?? undefined });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-brass/30 bg-gradient-to-br from-brass/5 via-card to-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-brass">
              Último registro
            </p>
            <p className="mt-1 truncate text-sm font-semibold" title={scan.productName}>
              {scan.productName}
            </p>
            <p className="text-xs text-muted-foreground">
              {scan.storeName ? `${scan.storeName} · ` : ""}
              {scan.createdAt
                ? new Date(scan.createdAt).toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })
                : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-xl font-bold text-primary">
              <Price value={scan.priceCaptured} size="md" />
            </p>
          </div>
        </div>

        {editing ? (
          <div className="mt-3 space-y-2">
            <div>
              <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Nome
              </Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Preço
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) =>
                    setPrice(e.target.value ? Number(e.target.value) : "")
                  }
                />
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Marca
                </Label>
                <Input
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="—"
                />
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Peso
                </Label>
                <Input
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  placeholder="500g"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                <X className="mr-1 h-3 w-3" /> Cancelar
              </Button>
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? <Check className="mr-1 h-3 w-3 animate-pulse" /> : <Save className="mr-1 h-3 w-3" />}
                Salvar
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
              <Pencil className="mr-1 h-3 w-3" /> Editar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setHistoryOpen(true)}
            >
              <History className="mr-1 h-3 w-3" /> Comparar mercados
            </Button>
          </div>
        )}
      </div>

      <PriceHistoryDrawer
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        productName={name || scan.productName}
      />
    </>
  );
}
