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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { z } from "zod";
import {
  createProduct,
  updateProduct,
  registerPrice,
  productSchema,
  REASON_LABELS,
  fileToAttachment,
  getAlertRule,
  saveAlertRule,
  type Product,
  type PriceEntry,
  type Attachment,
} from "@/lib/lojista-store";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { TrendingDown, TrendingUp, Minus, Paperclip, X, FileText, Bell } from "lucide-react";


// ---- Product dialog (create / edit) --------------------------------------

const categories = [
  "Arroz e feijão", "Carnes", "Hortifruti", "Laticínios", "Padaria",
  "Bebidas", "Higiene", "Limpeza", "Pet", "Bebê", "Mercearia", "Outros",
];

const productFormSchema = productSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export function ProductDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Product | null;
}) {
  const isEdit = !!editing;
  const [form, setForm] = useState({
    name: editing?.name ?? "",
    ean: editing?.ean ?? "",
    category: editing?.category ?? "",
    unit: editing?.unit ?? "un",
    currentPrice: editing?.currentPrice?.toString() ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // reset when opening for a new record
  const key = editing?.id ?? "new";
  const [activeKey, setActiveKey] = useState(key);
  if (activeKey !== key) {
    setActiveKey(key);
    setForm({
      name: editing?.name ?? "",
      ean: editing?.ean ?? "",
      category: editing?.category ?? "",
      unit: editing?.unit ?? "un",
      currentPrice: editing?.currentPrice?.toString() ?? "",
    });
    setErrors({});
  }

  function submit() {
    const parsed = productFormSchema.safeParse({
      name: form.name,
      ean: form.ean,
      category: form.category,
      unit: form.unit,
      currentPrice: Number(form.currentPrice.replace(",", ".")),
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[issue.path[0] as string] = issue.message;
      setErrors(errs);
      return;
    }
    try {
      if (isEdit && editing) {
        updateProduct(editing.id, parsed.data);
        toast.success("Produto atualizado");
      } else {
        createProduct(parsed.data);
        toast.success("Produto cadastrado", {
          description: "Preço inicial registrado no histórico.",
        });
      }
      onOpenChange(false);
    } catch (e) {
      toast.error("Não foi possível salvar", {
        description: e instanceof Error ? e.message : "Tente novamente",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {isEdit ? "Editar produto" : "Novo produto"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Alterações no cadastro não geram histórico de preços."
              : "O preço inicial será registrado como primeira entrada no histórico."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Nome" error={errors.name}>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Arroz Tio João 5kg"
              maxLength={120}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="EAN (código de barras)" error={errors.ean}>
              <Input
                value={form.ean}
                inputMode="numeric"
                onChange={(e) =>
                  setForm({ ...form, ean: e.target.value.replace(/\D/g, "").slice(0, 14) })
                }
                placeholder="7896006711124"
              />
            </Field>
            <Field label="Unidade" error={errors.unit}>
              <Input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="un, kg, L…"
                maxLength={20}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoria" error={errors.category}>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Preço (R$)" error={errors.currentPrice}>
              <Input
                value={form.currentPrice}
                inputMode="decimal"
                onChange={(e) =>
                  setForm({ ...form, currentPrice: e.target.value.replace(/[^\d.,]/g, "") })
                }
                placeholder="27,90"
                disabled={isEdit}
              />
              {isEdit && (
                <p className="text-[11px] text-muted-foreground">
                  Use "Registrar preço" para atualizar o valor.
                </p>
              )}
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit}>{isEdit ? "Salvar" : "Cadastrar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Register price dialog -----------------------------------------------

const priceFormSchema = z.object({
  price: z.number().positive("Preço deve ser positivo").max(99999),
  reason: z.enum(["ajuste", "promocao", "correcao", "reajuste_fornecedor", "outro"]),
  note: z.string().trim().max(240, "Máx. 240 caracteres").optional(),
});

export function RegisterPriceDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product: Product | null;
}) {
  const [form, setForm] = useState<{
    price: string;
    reason: PriceEntry["reason"];
    note: string;
    attachment: Attachment | null;
  }>({
    price: "",
    reason: "ajuste",
    note: "",
    attachment: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

  const key = product?.id ?? "none";
  const [activeKey, setActiveKey] = useState(key);
  if (activeKey !== key) {
    setActiveKey(key);
    setForm({ price: "", reason: "ajuste", note: "", attachment: null });
    setErrors({});
  }

  async function onFile(file: File | null) {
    if (!file) return;
    try {
      setUploading(true);
      const att = await fileToAttachment(file);
      setForm((s) => ({ ...s, attachment: att }));
    } catch (e) {
      toast.error("Anexo inválido", {
        description: e instanceof Error ? e.message : "Tente outro arquivo",
      });
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    if (!product) return;
    const parsed = priceFormSchema.safeParse({
      price: Number(form.price.replace(",", ".")),
      reason: form.reason,
      note: form.note.trim() || undefined,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[issue.path[0] as string] = issue.message;
      setErrors(errs);
      return;
    }
    try {
      const entry = registerPrice({
        productId: product.id,
        price: parsed.data.price,
        reason: parsed.data.reason,
        note: parsed.data.note,
        attachment: form.attachment ?? undefined,
      });
      const delta = entry.previousPrice
        ? ((entry.price - entry.previousPrice) / entry.previousPrice) * 100
        : 0;
      toast.success("Preço atualizado", {
        description: `De R$ ${entry.previousPrice?.toFixed(2)} para R$ ${entry.price.toFixed(2)} (${delta > 0 ? "+" : ""}${delta.toFixed(1)}%)`,
      });
      onOpenChange(false);
    } catch (e) {
      toast.error("Falha ao registrar preço", {
        description: e instanceof Error ? e.message : "Tente novamente",
      });
    }
  }

  const current = product?.currentPrice ?? 0;
  const next = Number(form.price.replace(",", ".") || 0);
  const delta = current > 0 && next > 0 ? ((next - current) / current) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Registrar novo preço</DialogTitle>
          <DialogDescription>
            {product?.name} · atual{" "}
            <span className="font-mono text-foreground">R$ {current.toFixed(2)}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Novo preço (R$)" error={errors.price}>
            <Input
              autoFocus
              value={form.price}
              inputMode="decimal"
              onChange={(e) =>
                setForm({ ...form, price: e.target.value.replace(/[^\d.,]/g, "") })
              }
              placeholder="0,00"
            />
            {next > 0 && current > 0 && (
              <p
                className={
                  "font-mono text-xs " +
                  (delta < 0
                    ? "text-savings-foreground"
                    : delta > 0
                      ? "text-destructive"
                      : "text-muted-foreground")
                }
              >
                {delta > 0 ? "+" : ""}
                {delta.toFixed(1)}% vs preço atual
              </p>
            )}
          </Field>
          <Field label="Motivo" error={errors.reason}>
            <Select
              value={form.reason}
              onValueChange={(v) => setForm({ ...form, reason: v as PriceEntry["reason"] })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(REASON_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Observação (opcional)" error={errors.note}>
            <Textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              maxLength={240}
              rows={3}
              placeholder="Ex.: encarte quinzenal, ação relâmpago…"
            />
          </Field>
          <Field label="Comprovante (opcional, até 2MB)">
            {form.attachment ? (
              <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
                <div className="flex items-center gap-2 text-xs">
                  <Paperclip className="h-3.5 w-3.5" />
                  <span className="truncate max-w-[220px]">{form.attachment.name}</span>
                  <span className="text-muted-foreground">
                    {(form.attachment.size / 1024).toFixed(0)} KB
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((s) => ({ ...s, attachment: null }))}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Remover anexo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <Input
                type="file"
                accept="image/*,application/pdf"
                disabled={uploading}
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              />
            )}
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={uploading}>Registrar preço</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


// ---- History sheet -------------------------------------------------------

export function HistorySheet({
  open,
  onOpenChange,
  product,
  history,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product: Product | null;
  history: PriceEntry[];
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = history.filter((h) => {
    const t = new Date(h.createdAt).getTime();
    if (from) {
      const f = new Date(from).getTime();
      if (t < f) return false;
    }
    if (to) {
      const tt = new Date(to).getTime() + 24 * 60 * 60 * 1000 - 1;
      if (t > tt) return false;
    }
    return true;
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">Histórico de preços</SheetTitle>
          <SheetDescription>
            {product?.name} · {filtered.length} de {history.length} alteraç{history.length === 1 ? "ão" : "ões"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex flex-wrap items-end gap-2 rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex-1 min-w-[130px]">
            <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">De</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="flex-1 min-w-[130px]">
            <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">Até</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          {(from || to) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFrom("");
                setTo("");
              }}
            >
              Limpar
            </Button>
          )}
        </div>

        <ol className="mt-6 space-y-4">
          {filtered.map((h, i) => {
            const delta =
              h.previousPrice != null
                ? ((h.price - h.previousPrice) / h.previousPrice) * 100
                : null;
            const Icon = delta == null ? Minus : delta < 0 ? TrendingDown : delta > 0 ? TrendingUp : Minus;
            const tone =
              delta == null
                ? "bg-muted text-muted-foreground"
                : delta < 0
                  ? "bg-savings/15 text-savings-foreground"
                  : delta > 0
                    ? "bg-destructive/15 text-destructive"
                    : "bg-muted text-muted-foreground";
            return (
              <li key={h.id} className="relative pl-6">
                <span
                  className={
                    "absolute left-0 top-1 flex h-5 w-5 items-center justify-center rounded-full " +
                    tone
                  }
                >
                  <Icon className="h-3 w-3" />
                </span>
                {i < filtered.length - 1 && (
                  <span className="absolute left-[9px] top-6 h-full w-px bg-border" />
                )}
                <div className="flex items-baseline justify-between gap-4">
                  <p className="font-mono text-lg font-semibold text-foreground">
                    R$ {h.price.toFixed(2)}
                  </p>
                  {delta != null && (
                    <span
                      className={
                        "font-mono text-xs " +
                        (delta < 0
                          ? "text-savings-foreground"
                          : delta > 0
                            ? "text-destructive"
                            : "text-muted-foreground")
                      }
                    >
                      {delta > 0 ? "+" : ""}
                      {delta.toFixed(1)}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {REASON_LABELS[h.reason]}
                  {h.previousPrice != null && (
                    <> · era R$ {h.previousPrice.toFixed(2)}</>
                  )}
                </p>
                {h.note && (
                  <p className="mt-1 rounded-md bg-muted/40 px-2 py-1 text-xs text-foreground">
                    {h.note}
                  </p>
                )}
                {h.attachment && (
                  <a
                    href={h.attachment.dataUrl}
                    target="_blank"
                    rel="noreferrer"
                    download={h.attachment.name}
                    className="mt-2 inline-flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5 text-xs hover:bg-muted"
                  >
                    {h.attachment.type.startsWith("image/") ? (
                      <img
                        src={h.attachment.dataUrl}
                        alt={h.attachment.name}
                        className="h-8 w-8 rounded object-cover"
                      />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="truncate max-w-[220px]">{h.attachment.name}</span>
                    <span className="text-muted-foreground">
                      {(h.attachment.size / 1024).toFixed(0)} KB
                    </span>
                  </a>
                )}
                <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  {new Date(h.createdAt).toLocaleString("pt-BR")} · {h.author}
                </p>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="text-sm text-muted-foreground">
              {history.length === 0
                ? "Nenhum registro de preço ainda."
                : "Nenhum registro no intervalo selecionado."}
            </li>
          )}
        </ol>
      </SheetContent>
    </Sheet>
  );
}

// ---- Alert rule dialog ---------------------------------------------------

export function AlertRuleDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product: Product | null;
}) {
  const existing = product ? getAlertRule(product.id) : undefined;
  const [form, setForm] = useState({
    percent: existing?.percentThreshold?.toString() ?? "",
    min: existing?.minPrice?.toString() ?? "",
    max: existing?.maxPrice?.toString() ?? "",
  });

  const key = product?.id ?? "none";
  const [activeKey, setActiveKey] = useState(key);
  if (activeKey !== key) {
    setActiveKey(key);
    const r = product ? getAlertRule(product.id) : undefined;
    setForm({
      percent: r?.percentThreshold?.toString() ?? "",
      min: r?.minPrice?.toString() ?? "",
      max: r?.maxPrice?.toString() ?? "",
    });
  }

  function submit() {
    if (!product) return;
    const percent = form.percent ? Number(form.percent.replace(",", ".")) : null;
    const min = form.min ? Number(form.min.replace(",", ".")) : null;
    const max = form.max ? Number(form.max.replace(",", ".")) : null;
    try {
      saveAlertRule({
        productId: product.id,
        percentThreshold: percent,
        minPrice: min,
        maxPrice: max,
      });
      toast.success("Regras de alerta salvas");
      onOpenChange(false);
    } catch (e) {
      toast.error("Falha ao salvar", {
        description: e instanceof Error ? e.message : "Verifique os valores",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl flex items-center gap-2">
            <Bell className="h-5 w-5" /> Regras de alerta
          </DialogTitle>
          <DialogDescription>
            {product?.name} · você será notificado quando o próximo preço cruzar uma destas regras.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Variação percentual mínima (%)">
            <Input
              value={form.percent}
              inputMode="decimal"
              onChange={(e) =>
                setForm({ ...form, percent: e.target.value.replace(/[^\d.,]/g, "") })
              }
              placeholder="Ex.: 5"
            />
            <p className="text-[11px] text-muted-foreground">
              Alerta ao registrar preço com variação (para cima ou baixo) ≥ este percentual.
            </p>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Preço-limite mínimo (R$)">
              <Input
                value={form.min}
                inputMode="decimal"
                onChange={(e) =>
                  setForm({ ...form, min: e.target.value.replace(/[^\d.,]/g, "") })
                }
                placeholder="0,00"
              />
            </Field>
            <Field label="Preço-limite máximo (R$)">
              <Input
                value={form.max}
                inputMode="decimal"
                onChange={(e) =>
                  setForm({ ...form, max: e.target.value.replace(/[^\d.,]/g, "") })
                }
                placeholder="0,00"
              />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">
            Deixe vazio para desabilitar uma regra. Alertas aparecem em Visão geral.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit}>Salvar regras</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


// ---- shared field --------------------------------------------------------

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
