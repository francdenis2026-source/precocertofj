import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { adminCreateManualProduct } from "@/lib/admin-manual-product.functions";
import { listEstablishments } from "@/lib/establishments.functions";
import { cn } from "@/lib/utils";

/** Preço mínimo aceitável (abaixo disso alerta o admin). */
const MIN_PRICE = 0.05;
/** Preço acima disso pede confirmação (evita casos como 15000 em vez de 15,00). */
const HIGH_PRICE_WARN = 1000;

const UNIT_OPTIONS = [
  "un", "kg", "g", "L", "mL", "cx", "pct", "dz", "m", "cm",
] as const;

/** Normaliza o nome exibido (colapsa espaços, mantém acentuação e capitalização). */
function normalizeDisplayName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

/** Chave de comparação (sem acento, maiúsculas) — usada para dedup no catálogo. */
function normalizeKey(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/**
 * Valida checksum de EAN-8, EAN-12 (UPC-A), EAN-13 ou EAN-14/GTIN-14.
 * Retorna `null` se vazio; `true` se válido; `false` se inválido.
 */
function validateEAN(raw: string): { ok: boolean | null; format: string | null; reason?: string } {
  const digits = raw.replace(/\D/g, "");
  if (!raw.trim()) return { ok: null, format: null };
  if (![8, 12, 13, 14].includes(digits.length)) {
    return { ok: false, format: null, reason: `Deve ter 8, 12, 13 ou 14 dígitos (tem ${digits.length}).` };
  }
  const check = Number(digits[digits.length - 1]);
  const body = digits.slice(0, -1);
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const d = Number(body[body.length - 1 - i]);
    sum += d * (i % 2 === 0 ? 3 : 1);
  }
  const expected = (10 - (sum % 10)) % 10;
  const format = { 8: "EAN-8", 12: "UPC-A", 13: "EAN-13", 14: "GTIN-14" }[digits.length] ?? null;
  return { ok: check === expected, format, reason: check === expected ? undefined : "Dígito verificador inválido." };
}

function parsePriceBR(raw: string): number {
  const cleaned = raw.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  return Number(cleaned);
}

export function NewProductDialog({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [brand, setBrand] = useState("");
  const [unit, setUnit] = useState("");
  const [barcode, setBarcode] = useState("");
  const [establishmentId, setEstablishmentId] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [forceHighPrice, setForceHighPrice] = useState(false);

  const listFn = useServerFn(listEstablishments);
  const createFn = useServerFn(adminCreateManualProduct);
  const ests = useQuery({
    queryKey: ["admin", "establishments", "for-new-product"],
    queryFn: () => listFn(),
    staleTime: 60_000,
    enabled: open,
  });

  const reset = () => {
    setDisplayName(""); setBrand(""); setUnit("");
    setBarcode(""); setEstablishmentId(""); setPrice(""); setQuantity("");
    setForceHighPrice(false);
  };

  const normalizedName = useMemo(() => normalizeDisplayName(displayName), [displayName]);
  const normalizedKey = useMemo(() => normalizeKey(displayName), [displayName]);
  const ean = useMemo(() => validateEAN(barcode), [barcode]);
  const priceNum = useMemo(() => parsePriceBR(price), [price]);
  const qtyNum = useMemo(() => (quantity ? parsePriceBR(quantity) : NaN), [quantity]);

  const priceIsLow = Number.isFinite(priceNum) && priceNum > 0 && priceNum < MIN_PRICE;
  const priceIsHigh = Number.isFinite(priceNum) && priceNum >= HIGH_PRICE_WARN;

  const canSubmit =
    normalizedName.length >= 2 &&
    establishmentId !== "" &&
    Number.isFinite(priceNum) && priceNum > 0 &&
    !priceIsLow &&
    (!priceIsHigh || forceHighPrice) &&
    (ean.ok !== false); // vazio ou válido

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await createFn({
        data: {
          displayName: normalizedName,
          brand: brand.trim() || null,
          unit: unit.trim() || null,
          barcode: barcode.replace(/\D/g, "") || null,
          establishmentId,
          price: priceNum,
          quantity: Number.isFinite(qtyNum) ? qtyNum : null,
        },
      });
      toast.success("Produto cadastrado", { description: normalizedName });
      setOpen(false);
      reset();
      onCreated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao cadastrar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Novo produto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cadastrar produto manual</DialogTitle>
          <DialogDescription>
            Insere no catálogo (dedup por nome normalizado) e grava o preço inicial vinculado ao estabelecimento.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="np-name">Nome do produto <span className="text-destructive">*</span></Label>
            <Input
              id="np-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ex.: Arroz Camil 5kg"
              autoFocus
              maxLength={200}
              aria-invalid={displayName.length > 0 && normalizedName.length < 2}
            />
            {displayName && normalizedKey && (
              <p className="flex items-center gap-1 text-[12.5px] text-muted-foreground">
                <Info className="h-3 w-3" />
                Chave de catálogo: <span className="font-mono text-foreground">{normalizedKey}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="np-brand">Marca</Label>
              <Input id="np-brand" value={brand} onChange={(e) => setBrand(e.target.value)} maxLength={100} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="np-unit">Unidade</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger id="np-unit"><SelectValue placeholder="Selecione…" /></SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="np-barcode">Código de barras (EAN/UPC/GTIN)</Label>
            <Input
              id="np-barcode"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Somente números"
              inputMode="numeric"
              maxLength={20}
              aria-invalid={ean.ok === false}
              className={cn(ean.ok === false && "border-destructive focus-visible:ring-destructive")}
            />
            {ean.ok === true && (
              <p className="flex items-center gap-1 text-[12.5px] text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" /> {ean.format} válido
              </p>
            )}
            {ean.ok === false && (
              <p className="flex items-center gap-1 text-[12.5px] text-destructive">
                <AlertTriangle className="h-3 w-3" /> {ean.reason}
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label>Estabelecimento <span className="text-destructive">*</span></Label>
            <Select value={establishmentId} onValueChange={setEstablishmentId}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {(ests.data ?? []).map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="np-price">Preço (R$) <span className="text-destructive">*</span></Label>
              <Input
                id="np-price"
                inputMode="decimal"
                value={price}
                onChange={(e) => { setPrice(e.target.value); setForceHighPrice(false); }}
                placeholder="0,00"
                aria-invalid={priceIsLow || (priceIsHigh && !forceHighPrice)}
                className={cn((priceIsLow || (priceIsHigh && !forceHighPrice)) && "border-amber-500")}
              />
              {priceIsLow && (
                <p className="flex items-center gap-1 text-[12.5px] text-destructive">
                  <AlertTriangle className="h-3 w-3" /> Preço mínimo R$ {MIN_PRICE.toFixed(2).replace(".", ",")}
                </p>
              )}
              {priceIsHigh && (
                <label className="flex items-start gap-1.5 text-[12.5px] text-amber-700 dark:text-amber-400">
                  <input
                    type="checkbox"
                    checked={forceHighPrice}
                    onChange={(e) => setForceHighPrice(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    Preço alto (R$ {priceNum.toFixed(2).replace(".", ",")}). Confirmo que está correto.
                  </span>
                </label>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="np-qty">Quantidade</Label>
              <Input id="np-qty" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="1" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={submit} disabled={saving || !canSubmit}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cadastrar produto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
