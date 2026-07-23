import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/brand/AppShell";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import {
  createShoppingList,
  addAdhocListItem,
} from "@/lib/shopping-list.functions";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  ShoppingCart,
  Sparkles,
  Plus,
  X,
} from "lucide-react";

export const Route = createFileRoute("/lista_/nova")({
  head: () => ({
    meta: [
      { title: "Nova lista em 60s — PreçoCerto" },
      {
        name: "description",
        content:
          "Monte sua primeira lista de compras em menos de 60 segundos: escolha os essenciais e receba o melhor mercado.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ProtectedGate>
      <NovaListaWizard />
    </ProtectedGate>
  ),
});

/* -------------------- Essenciais para partida rápida -------------------- */
type Essencial = { name: string; category: string; unit: string };
const ESSENCIAIS: Essencial[] = [
  { name: "Arroz 5kg", category: "Grãos", unit: "un" },
  { name: "Feijão 1kg", category: "Grãos", unit: "un" },
  { name: "Açúcar 1kg", category: "Mercearia", unit: "un" },
  { name: "Café 500g", category: "Mercearia", unit: "un" },
  { name: "Óleo de soja 900ml", category: "Mercearia", unit: "un" },
  { name: "Farinha de mandioca 1kg", category: "Mercearia", unit: "un" },
  { name: "Leite 1L", category: "Laticínios", unit: "un" },
  { name: "Ovos (dúzia)", category: "Laticínios", unit: "dz" },
  { name: "Pão francês", category: "Padaria", unit: "kg" },
  { name: "Frango (kg)", category: "Carnes", unit: "kg" },
  { name: "Carne bovina (kg)", category: "Carnes", unit: "kg" },
  { name: "Tomate", category: "Hortifrúti", unit: "kg" },
  { name: "Cebola", category: "Hortifrúti", unit: "kg" },
  { name: "Banana", category: "Hortifrúti", unit: "kg" },
  { name: "Batata", category: "Hortifrúti", unit: "kg" },
  { name: "Sabão em pó 1kg", category: "Limpeza", unit: "un" },
  { name: "Papel higiênico 12un", category: "Higiene", unit: "un" },
  { name: "Refrigerante 2L", category: "Bebidas", unit: "un" },
];

const NAME_SUGGESTIONS = [
  "Compras da semana",
  "Feira do mês",
  "Rancho grande",
  "Churrasco",
];

function NovaListaWizard() {
  const router = useRouter();
  const createFn = useServerFn(createShoppingList);
  const addFn = useServerFn(addAdhocListItem);

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("Compras da semana");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [customText, setCustomText] = useState("");
  const [customItems, setCustomItems] = useState<string[]>([]);

  const totalItems = selected.size + customItems.length;

  const toggle = (n: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });

  const addCustom = () => {
    const v = customText.trim();
    if (!v) return;
    if (v.length > 80) {
      toast.error("Nome muito longo");
      return;
    }
    if (customItems.includes(v)) {
      toast("Este item já está na lista");
      return;
    }
    setCustomItems((prev) => [...prev, v]);
    setCustomText("");
  };

  const removeCustom = (v: string) =>
    setCustomItems((prev) => prev.filter((x) => x !== v));

  const createMut = useMutation({
    mutationFn: async () => {
      const finalName = name.trim() || "Compras da semana";
      const { id } = await createFn({ data: { name: finalName } });
      const essenciais = ESSENCIAIS.filter((e) => selected.has(e.name));
      // Envia em paralelo para manter o fluxo &lt; 60s
      await Promise.all([
        ...essenciais.map((e) =>
          addFn({
            data: {
              listId: id,
              displayName: e.name,
              quantity: 1,
              category: e.category,
              unit: e.unit,
              notes: null,
            },
          }),
        ),
        ...customItems.map((c) =>
          addFn({
            data: {
              listId: id,
              displayName: c,
              quantity: 1,
              category: null,
              unit: null,
              notes: null,
            },
          }),
        ),
      ]);
      return { id };
    },
    onSuccess: () => {
      toast.success(
        totalItems > 0
          ? `Lista pronta com ${totalItems} ${totalItems === 1 ? "item" : "itens"}`
          : "Lista criada",
      );
      router.navigate({ to: "/lista" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const grouped = useMemo(() => {
    const g = new Map<string, Essencial[]>();
    for (const e of ESSENCIAIS) {
      if (!g.has(e.category)) g.set(e.category, []);
      g.get(e.category)!.push(e);
    }
    return Array.from(g.entries());
  }, []);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-8 md:py-10">
        {/* Header + progresso */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            to="/lista"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Minhas listas
          </Link>
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Passo {step} de 2
          </span>
        </div>

        <div
          aria-hidden
          className="mb-8 h-1.5 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: step === 1 ? "50%" : "100%" }}
          />
        </div>

        {step === 1 && (
          <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              <Sparkles className="h-3 w-3" /> Começando
            </span>
            <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight text-foreground md:text-4xl">
              Como quer chamar sua primeira lista?
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Você pode manter o nome sugerido ou personalizar. Dá para mudar
              depois.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setStep(2);
              }}
              className="mt-6 space-y-4"
            >
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Nome da lista
                </span>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  placeholder="Compras da semana"
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-base font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-primary/40"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                {NAME_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setName(s)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      name === s
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:opacity-50"
                >
                  Escolher itens <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          </section>
        )}

        {step === 2 && (
          <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              <ShoppingCart className="h-3 w-3" /> Essenciais
            </span>
            <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight text-foreground md:text-4xl">
              Toque nos itens que você costuma comprar
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Escolha alguns essenciais para começar em segundos. Você ajusta
              quantidades e adiciona mais na próxima tela.
            </p>

            <div className="mt-6 space-y-5">
              {grouped.map(([cat, items]) => (
                <div key={cat}>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {cat}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {items.map((it) => {
                      const on = selected.has(it.name);
                      return (
                        <button
                          key={it.name}
                          type="button"
                          onClick={() => toggle(it.name)}
                          aria-pressed={on}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 ${
                            on
                              ? "border-primary bg-primary text-primary-foreground shadow-sm"
                              : "border-border bg-background text-foreground hover:border-primary/50"
                          }`}
                        >
                          {on ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Plus className="h-3.5 w-3.5 opacity-70" />
                          )}
                          {it.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Add livre */}
            <div className="mt-6 border-t border-border pt-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Faltou algo?
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addCustom();
                }}
                className="mt-2 flex gap-2"
              >
                <input
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Ex.: Manteiga 200g"
                  maxLength={80}
                  className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                />
                <button
                  type="submit"
                  disabled={!customText.trim()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary/50 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" /> Adicionar
                </button>
              </form>
              {customItems.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {customItems.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/5 px-3 py-1.5 text-sm text-foreground"
                    >
                      {c}
                      <button
                        type="button"
                        onClick={() => removeCustom(c)}
                        aria-label={`Remover ${c}`}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="mt-8 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => createMut.mutate()}
                  disabled={createMut.isPending}
                  className="text-sm font-medium text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline disabled:opacity-50"
                >
                  Pular e criar vazia
                </button>
                <button
                  type="button"
                  onClick={() => createMut.mutate()}
                  disabled={createMut.isPending || totalItems === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:opacity-60"
                >
                  {createMut.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Criando...
                    </>
                  ) : (
                    <>
                      Criar lista
                      {totalItems > 0 && (
                        <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs">
                          {totalItems}
                        </span>
                      )}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
