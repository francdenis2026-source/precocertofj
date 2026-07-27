import { useState } from "react";
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
import { Plus, Loader2 } from "lucide-react";
import { adminCreateManualProduct } from "@/lib/admin-manual-product.functions";
import { listEstablishments } from "@/lib/establishments.functions";

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
  };

  const submit = async () => {
    if (!displayName.trim()) return toast.error("Informe o nome do produto");
    if (!establishmentId) return toast.error("Selecione o estabelecimento");
    const priceNum = Number(price.replace(",", "."));
    if (!priceNum || priceNum <= 0) return toast.error("Preço inválido");

    setSaving(true);
    try {
      await createFn({
        data: {
          displayName: displayName.trim(),
          brand: brand.trim() || null,
          unit: unit.trim() || null,
          barcode: barcode.trim() || null,
          establishmentId,
          price: priceNum,
          quantity: quantity ? Number(quantity.replace(",", ".")) : null,
        },
      });
      toast.success("Produto cadastrado com sucesso");
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
            Insere no catálogo e grava o preço inicial vinculado ao estabelecimento.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="np-name">Nome do produto *</Label>
            <Input id="np-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ex: Arroz Camil 5kg" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="np-brand">Marca</Label>
              <Input id="np-brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="np-unit">Unidade</Label>
              <Input id="np-unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="kg, un, L" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="np-barcode">Código de barras</Label>
            <Input id="np-barcode" value={barcode} onChange={(e) => setBarcode(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Estabelecimento *</Label>
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
              <Label htmlFor="np-price">Preço (R$) *</Label>
              <Input id="np-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0,00" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="np-qty">Quantidade</Label>
              <Input id="np-qty" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="1" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cadastrar produto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
