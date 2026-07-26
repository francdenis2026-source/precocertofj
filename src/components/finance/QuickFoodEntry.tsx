import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ShoppingBasket, Beef, Croissant, Apple, Carrot, ShoppingBag,
  Plus, Trash2, Wallet, CreditCard, Smartphone, Landmark, Ticket,
  Sparkles, ChevronRight, X, Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  upsertTransaction,
  type FinanceCategory,
  type PaymentMethod,
} from "@/lib/finance.functions";

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/* ---------- Presets alimentação ---------- */

type FoodPreset = {
  slug: string;
  name: string;
  icon: LucideIcon;
  color: string; // hex
};

const FOOD_PRESETS: FoodPreset[] = [
  { slug: "alimentacao", name: "Mercado",     icon: ShoppingBasket, color: "#0284C7" },
  { slug: "acougue",     name: "Açougue",     icon: Beef,           color: "#DC2626" },
  { slug: "padaria",     name: "Padaria",     icon: Croissant,      color: "#D97706" },
  { slug: "hortifruti",  name: "Hortifruti",  icon: Apple,          color: "#16A34A" },
  { slug: "feira",       name: "Feira",       icon: Carrot,         color: "#22C55E" },
];

/* ---------- Meios de pagamento ---------- */

const PAY_METHODS: Array<{ id: PaymentMethod; label: string; icon: LucideIcon }> = [
  { id: "pix",      label: "Pix",      icon: Smartphone },
  { id: "debit",    label: "Débito",   icon: CreditCard },
  { id: "credit",   label: "Crédito",  icon: CreditCard },
  { id: "cash",     label: "Dinheiro", icon: Wallet },
  { id: "transfer", label: "Transf.",  icon: Landmark },
  { id: "voucher",  label: "Vale",     icon: Ticket },
];

/* ---------- Modes ---------- */

type Mode = "cesta" | "compra" | "itens";

const MODES: Array<{ id: Mode; label: string; subtitle: string; icon: LucideIcon }> = [
  { id: "cesta",  label: "Cesta",  subtitle: "Compra do mês em um valor", icon: ShoppingBag },
  { id: "compra", label: "Compra", subtitle: "Um valor único por local",  icon: ShoppingBasket },
  { id: "itens",  label: "Itens",  subtitle: "Vários itens somados",      icon: Sparkles },
];

/* ---------- Componente ---------- */

export function QuickFoodEntry({
  open,
  onOpenChange,
  categories,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: FinanceCategory[];
  onSaved: () => void;
}) {
  const saveFn = useServerFn(upsertTransaction);

  // resolve categoria por slug (com fallback pra 1ª de kind='market')
  const catBySlug = useMemo(() => {
    const map = new Map<string, FinanceCategory>();
    for (const c of categories) map.set(c.slug, c);
    return map;
  }, [categories]);
  const fallbackFoodCat = useMemo(
    () => categories.find((c) => c.slug === "alimentacao") ?? categories.find((c) => c.kind === "market") ?? null,
    [categories],
  );

  const [mode, setMode] = useState<Mode>("compra");
  const [presetSlug, setPresetSlug] = useState<string>("alimentacao");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [occurredOn, setOccurredOn] = useState(todayISO());
  const [payment, setPayment] = useState<PaymentMethod | "">("pix");
  const [items, setItems] = useState<Array<{ name: string; amount: string }>>([
    { name: "", amount: "" },
  ]);

  const resolveCategoryId = (slug: string): string | null => {
    const cat = catBySlug.get(slug) ?? fallbackFoodCat;
    return cat?.id ?? null;
  };

  const reset = () => {
    setMode("compra");
    setPresetSlug("alimentacao");
    setAmount("");
    setDescription("");
    setOccurredOn(todayISO());
    setPayment("pix");
    setItems([{ name: "", amount: "" }]);
  };

  const activePreset = FOOD_PRESETS.find((p) => p.slug === presetSlug) ?? FOOD_PRESETS[0];

  const itemsTotal = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);

  const save = useMutation({
    mutationFn: async () => {
      const catId = resolveCategoryId(presetSlug);
      if (mode === "itens") {
        const valid = items
          .map((it) => ({ name: it.name.trim(), amount: Number(it.amount) }))
          .filter((it) => it.amount > 0);
        if (valid.length === 0) throw new Error("Adicione pelo menos um item com valor");
        // Salva 1 lançamento por item para permitir edição fina
        for (const it of valid) {
          await saveFn({
            data: {
              categoryId: catId,
              occurredOn,
              amount: it.amount,
              description: it.name || null,
              paymentMethod: payment || null,
              metadata: { source: "quick_food", mode, preset: presetSlug },
            },
          });
        }
        return valid.length;
      }
      const n = Number(amount);
      if (!(n > 0)) throw new Error("Informe um valor");
      await saveFn({
        data: {
          categoryId: catId,
          occurredOn,
          amount: n,
          description: description || (mode === "cesta" ? "Cesta / compra do mês" : null),
          paymentMethod: payment || null,
          metadata: { source: "quick_food", mode, preset: presetSlug },
        },
      });
      return 1;
    },
    onSuccess: (count) => {
      toast.success(count > 1 ? `${count} itens salvos` : "Gasto registrado");
      reset();
      onOpenChange(false);
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-xl overflow-hidden p-0 gap-0">
        {/* HEADER com SVG decorativo */}
        <header
          className="relative overflow-hidden border-b px-5 py-4"
          style={{
            background: `linear-gradient(135deg, ${activePreset.color}18 0%, transparent 60%)`,
          }}
        >
          {/* SVG accent */}
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 opacity-20"
            viewBox="0 0 100 100"
            fill="none"
          >
            <circle cx="50" cy="50" r="40" stroke={activePreset.color} strokeWidth="1.5" />
            <circle cx="50" cy="50" r="26" stroke={activePreset.color} strokeWidth="1" strokeDasharray="2 3" />
            <circle cx="50" cy="50" r="12" fill={activePreset.color} fillOpacity="0.25" />
          </svg>

          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="grid h-11 w-11 place-items-center rounded-xl ring-1"
                style={{
                  background: `${activePreset.color}20`,
                  color: activePreset.color,
                  boxShadow: `inset 0 0 0 1px ${activePreset.color}40`,
                }}
              >
                <activePreset.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Registro rápido
                </p>
                <h2 className="font-display text-lg font-semibold leading-tight">
                  Gasto com alimentação
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* BODY */}
        <div className="max-h-[75vh] overflow-y-auto px-5 py-4 space-y-5">
          {/* Modo */}
          <section>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Como registrar
            </p>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map((m) => {
                const active = mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    className={cn(
                      "group relative flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all",
                      active
                        ? "border-primary/60 bg-primary/8 ring-1 ring-primary/40 shadow-sm"
                        : "border-border bg-card/40 hover:border-border/80 hover:bg-muted/40",
                    )}
                    aria-pressed={active}
                  >
                    <m.icon
                      className={cn(
                        "h-4 w-4 transition-colors",
                        active ? "text-primary" : "text-muted-foreground",
                      )}
                      aria-hidden="true"
                    />
                    <span className="text-sm font-semibold leading-none">{m.label}</span>
                    <span className="text-[11px] leading-tight text-muted-foreground">
                      {m.subtitle}
                    </span>
                    {active && (
                      <Check className="absolute right-2 top-2 h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Categoria preset (SVG chips) */}
          <section>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Onde foi
            </p>
            <div className="flex flex-wrap gap-2">
              {FOOD_PRESETS.map((p) => {
                const active = presetSlug === p.slug;
                return (
                  <button
                    key={p.slug}
                    type="button"
                    onClick={() => setPresetSlug(p.slug)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                      active
                        ? "text-white shadow-sm"
                        : "border-border bg-card/40 text-foreground hover:bg-muted/50",
                    )}
                    style={
                      active
                        ? { background: p.color, borderColor: p.color }
                        : undefined
                    }
                    aria-pressed={active}
                  >
                    <p.icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {p.name}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Formulário conforme modo */}
          {mode !== "itens" ? (
            <section className="space-y-3">
              <div className="grid grid-cols-[1fr_140px] gap-3">
                <div>
                  <Label className="text-xs">Valor (R$)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0,00"
                    className="h-11 text-lg font-semibold tabular-nums"
                    autoFocus
                  />
                </div>
                <div>
                  <Label className="text-xs">Data</Label>
                  <Input
                    type="date"
                    value={occurredOn}
                    onChange={(e) => setOccurredOn(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">
                  {mode === "cesta" ? "Descrição (opcional)" : "O que foi (opcional)"}
                </Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    mode === "cesta"
                      ? "Ex: compra do mês no Rebouças"
                      : "Ex: pão francês, filé de frango…"
                  }
                  className="h-10"
                />
              </div>
            </section>
          ) : (
            <section className="space-y-2.5">
              <div className="grid grid-cols-[1fr_140px] gap-3">
                <div>
                  <Label className="text-xs">Data</Label>
                  <Input
                    type="date"
                    value={occurredOn}
                    onChange={(e) => setOccurredOn(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div>
                  <Label className="text-xs">Total</Label>
                  <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm font-semibold tabular-nums">
                    {BRL(itemsTotal)}
                  </div>
                </div>
              </div>

              <ul className="space-y-2">
                {items.map((it, idx) => (
                  <li
                    key={idx}
                    className="grid grid-cols-[1fr_110px_36px] items-center gap-2 rounded-lg border bg-card/40 p-2"
                  >
                    <Input
                      value={it.name}
                      onChange={(e) => {
                        const next = [...items];
                        next[idx] = { ...next[idx], name: e.target.value };
                        setItems(next);
                      }}
                      placeholder={`Item ${idx + 1}`}
                      className="h-9 border-transparent bg-transparent shadow-none focus-visible:ring-1"
                    />
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={it.amount}
                      onChange={(e) => {
                        const next = [...items];
                        next[idx] = { ...next[idx], amount: e.target.value };
                        setItems(next);
                      }}
                      placeholder="0,00"
                      className="h-9 text-right tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (items.length === 1) {
                          setItems([{ name: "", amount: "" }]);
                        } else {
                          setItems(items.filter((_, i) => i !== idx));
                        }
                      }}
                      className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-destructive"
                      aria-label="Remover item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setItems([...items, { name: "", amount: "" }])}
                className="h-8 gap-1 text-xs"
              >
                <Plus className="h-3.5 w-3.5" /> adicionar item
              </Button>
            </section>
          )}

          {/* Meio de pagamento */}
          <section>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Pagamento
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PAY_METHODS.map((pm) => {
                const active = payment === pm.id;
                return (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPayment(active ? "" : pm.id)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all",
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-card/40 hover:bg-muted/50",
                    )}
                    aria-pressed={active}
                  >
                    <pm.icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {pm.label}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* FOOTER */}
        <footer className="flex items-center justify-between gap-3 border-t bg-muted/20 px-5 py-3">
          <div className="text-xs text-muted-foreground">
            {mode === "itens"
              ? `${items.filter((i) => Number(i.amount) > 0).length} item(ns) — ${BRL(itemsTotal)}`
              : amount
                ? `Total: ${BRL(Number(amount) || 0)}`
                : "Preencha o valor para salvar"}
          </div>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="btn-signal gap-1.5"
          >
            {save.isPending ? "Salvando…" : (
              <>
                Registrar <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
