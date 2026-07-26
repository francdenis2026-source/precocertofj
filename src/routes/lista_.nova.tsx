import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/brand/AppShell";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import {
  createShoppingList,
  addAdhocListItem,
  searchCatalog,
  type CatalogSuggestion,
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
  Search,
  Camera,
  ScanLine,
  Minus,
  Pencil,
  ListChecks,
} from "lucide-react";

export const Route = createFileRoute("/lista_/nova")({
  head: () => ({
    meta: [
      { title: "Nova lista em 60s — PreçoCerto" },
      {
        name: "description",
        content:
          "Monte sua primeira lista em menos de 60 segundos: escolha os essenciais, revise e receba o melhor mercado.",
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

/* --------------------------- Essenciais --------------------------- */
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

const NAME_SUGGESTIONS = ["Compras da semana", "Feira do mês", "Rancho grande", "Churrasco"];

/* ---------- Estado local de itens (unificado, com quantidade) ---------- */
type DraftItem = {
  key: string; // id único local
  displayName: string;
  category: string | null;
  unit: string | null;
  quantity: number;
  source: "essencial" | "catalog" | "custom";
};

function useDebounced<T>(value: T, delay = 250): T {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setD(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);
  return d;
}

function NovaListaWizard() {
  const router = useRouter();
  const createFn = useServerFn(createShoppingList);
  const addFn = useServerFn(addAdhocListItem);
  const searchFn = useServerFn(searchCatalog);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("Compras da semana");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [query, setQuery] = useState("");
  const [customText, setCustomText] = useState("");
  const [scanHint, setScanHint] = useState(false);

  const debouncedQuery = useDebounced(query, 250);
  const searchQuery = useQuery({
    queryKey: ["catalog-search", debouncedQuery],
    queryFn: () => searchFn({ data: { query: debouncedQuery } }),
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 30_000,
  });

  const totalItems = items.length;
  const totalUnits = items.reduce((s, i) => s + i.quantity, 0);

  const addEssencial = (e: Essencial) => {
    const key = `ess:${e.name}`;
    setItems((prev) =>
      prev.some((x) => x.key === key)
        ? prev.filter((x) => x.key !== key)
        : [...prev, { key, displayName: e.name, category: e.category, unit: e.unit, quantity: 1, source: "essencial" }],
    );
  };
  const addCatalog = (c: CatalogSuggestion) => {
    const key = `cat:${c.id}`;
    if (items.some((x) => x.key === key)) {
      toast("Este produto já está na lista");
      return;
    }
    setItems((prev) => [
      ...prev,
      { key, displayName: c.displayName, category: null, unit: c.defaultUnit, quantity: 1, source: "catalog" },
    ]);
    setQuery("");
  };
  const addCustomItem = () => {
    const v = customText.trim();
    if (!v) return;
    if (v.length > 80) return toast.error("Nome muito longo");
    const key = `cus:${v.toLowerCase()}`;
    if (items.some((x) => x.key === key)) return toast("Este item já está na lista");
    setItems((prev) => [
      ...prev,
      { key, displayName: v, category: null, unit: null, quantity: 1, source: "custom" },
    ]);
    setCustomText("");
  };
  const remove = (key: string) => setItems((prev) => prev.filter((x) => x.key !== key));
  const setQty = (key: string, q: number) =>
    setItems((prev) => prev.map((x) => (x.key === key ? { ...x, quantity: Math.max(1, Math.min(99, q)) } : x)));

  const selectedEssenciais = useMemo(() => new Set(items.filter((i) => i.source === "essencial").map((i) => i.key)), [items]);

  const createMut = useMutation({
    mutationFn: async () => {
      const finalName = name.trim() || "Compras da semana";
      const { id } = await createFn({ data: { name: finalName } });
      await Promise.all(
        items.map((it) =>
          addFn({
            data: {
              listId: id,
              displayName: it.displayName,
              quantity: it.quantity,
              category: it.category,
              unit: it.unit,
              notes: null,
            },
          }),
        ),
      );
      return { id };
    },
    onSuccess: ({ id }) => {
      router.navigate({ to: "/lista/pronta", search: { id } as never });
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
        {/* Cabeçalho + progresso */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            to="/lista"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Minhas listas
          </Link>
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Passo {step} de 3
          </span>
        </div>

        <ol aria-label="Etapas" className="mb-6 grid grid-cols-3 gap-2 text-[11px] font-semibold uppercase tracking-[0.14em]">
          {[
            { n: 1, label: "Nome" },
            { n: 2, label: "Itens" },
            { n: 3, label: "Revisão" },
          ].map((s) => (
            <li
              key={s.n}
              className={`rounded-full border px-3 py-1.5 text-center transition ${
                step === s.n
                  ? "border-primary bg-primary text-primary-foreground"
                  : step > s.n
                    ? "border-primary/40 bg-primary/5 text-primary"
                    : "border-border bg-background text-muted-foreground"
              }`}
            >
              {step > s.n ? "✓ " : `${s.n}. `}
              {s.label}
            </li>
          ))}
        </ol>

        {/* ------------------------- STEP 1 ------------------------- */}
        {step === 1 && (
          <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              <Sparkles className="h-3 w-3" /> Começando
            </span>
            <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight text-foreground md:text-4xl">
              Como quer chamar sua primeira lista?
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Mantenha o nome sugerido ou personalize. Dá para mudar depois.
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

        {/* ------------------------- STEP 2 ------------------------- */}
        {step === 2 && (
          <section className="space-y-5">
            {/* Busca no catálogo */}
            <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar produto no catálogo (arroz, café, sabão...)"
                    className="w-full rounded-full border border-border bg-background pl-9 pr-4 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setScanHint(true)}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-xs font-semibold text-foreground transition hover:border-primary/50"
                  aria-label="Adicionar por foto ou código de barras"
                >
                  <Camera className="h-4 w-4" />
                  <ScanLine className="h-4 w-4" />
                  <span className="hidden sm:inline">Foto / código</span>
                </button>
              </div>

              {/* Resultados */}
              {debouncedQuery.trim().length >= 2 && (
                <div className="mt-3 rounded-xl border border-border bg-background">
                  {searchQuery.isLoading && (
                    <div className="p-3 text-sm text-muted-foreground">
                      <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Buscando...
                    </div>
                  )}
                  {!searchQuery.isLoading && (searchQuery.data ?? []).length === 0 && (
                    <div className="p-3 text-sm text-muted-foreground">
                      Nenhum produto no catálogo. Adicione manualmente abaixo.
                    </div>
                  )}
                  <ul className="max-h-64 divide-y divide-border overflow-y-auto">
                    {(searchQuery.data ?? []).slice(0, 12).map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{c.displayName}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {c.brand ?? "Sem marca"} {c.defaultUnit ? `• ${c.defaultUnit}` : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => addCatalog(c)}
                          className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:brightness-105"
                        >
                          <Plus className="h-3.5 w-3.5" /> Adicionar
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Essenciais agrupados */}
            <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                  <ShoppingCart className="h-3 w-3" /> Sugestões populares
                </span>
              </div>
              <h2 className="mt-3 font-display text-xl font-bold text-foreground md:text-2xl">
                Toque nos essenciais que você costuma comprar
              </h2>
              <div className="mt-4 space-y-4">
                {grouped.map(([cat, group]) => (
                  <div key={cat}>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      {cat}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {group.map((it) => {
                        const on = selectedEssenciais.has(`ess:${it.name}`);
                        return (
                          <button
                            key={it.name}
                            type="button"
                            onClick={() => addEssencial(it)}
                            aria-pressed={on}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 ${
                              on
                                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                : "border-border bg-background text-foreground hover:border-primary/50"
                            }`}
                          >
                            {on ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5 opacity-70" />}
                            {it.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add livre */}
              <div className="mt-5 border-t border-border pt-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Faltou algo?
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    addCustomItem();
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
              </div>
            </div>

            {/* Ações */}
            <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={totalItems === 0}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:opacity-60"
              >
                Revisar
                {totalItems > 0 && (
                  <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs">{totalItems}</span>
                )}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}

        {/* ------------------------- STEP 3 ------------------------- */}
        {step === 3 && (
          <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              <ListChecks className="h-3 w-3" /> Revisão
            </span>
            <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight text-foreground md:text-4xl">
              Confira antes de salvar
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Ajuste quantidades, remova o que não precisar e confirme o nome.
            </p>

            {/* Nome */}
            <div className="mt-5 rounded-xl border border-border bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Nome da lista</p>
                  <p className="mt-1 text-base font-semibold text-foreground">{name || "Compras da semana"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </button>
              </div>
            </div>

            {/* Itens */}
            <div className="mt-4 rounded-xl border border-border bg-background">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Itens ({totalItems}) • {totalUnits} un.
                </p>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar mais
                </button>
              </div>
              {items.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Nenhum item selecionado.</div>
              ) : (
                <ul className="divide-y divide-border">
                  {items.map((it) => (
                    <li key={it.key} className="flex items-center gap-3 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{it.displayName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {it.category ?? (it.source === "catalog" ? "Catálogo" : "Personalizado")}
                          {it.unit ? ` • ${it.unit}` : ""}
                        </p>
                      </div>
                      <div className="inline-flex items-center rounded-full border border-border bg-background">
                        <button
                          type="button"
                          onClick={() => setQty(it.key, it.quantity - 1)}
                          className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
                          aria-label="Diminuir"
                          disabled={it.quantity <= 1}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold tabular-nums">{it.quantity}</span>
                        <button
                          type="button"
                          onClick={() => setQty(it.key, it.quantity + 1)}
                          className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground"
                          aria-label="Aumentar"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(it.key)}
                        className="text-muted-foreground transition hover:text-destructive"
                        aria-label={`Remover ${it.displayName}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Ações finais */}
            <div className="mt-6 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
              <button
                type="button"
                onClick={() => createMut.mutate()}
                disabled={createMut.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:opacity-60"
              >
                {createMut.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                  </>
                ) : (
                  <>
                    Salvar e comparar preços <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </section>
        )}

        {/* Modal "em breve" para foto/código */}
        {scanHint && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            onClick={() => setScanHint(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl"
            >
              <div className="flex items-center gap-2 text-primary">
                <Camera className="h-5 w-5" />
                <ScanLine className="h-5 w-5" />
                <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.14em]">
                  Em breve
                </span>
              </div>
              <h3 className="mt-3 font-display text-lg font-bold text-foreground">
                Adicionar por foto ou código de barras
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Vamos liberar em seguida a leitura da etiqueta pela câmera e a
                leitura de códigos de barras direto no fluxo. Enquanto isso,
                use a busca no catálogo ou o campo "Adicionar" acima — leva 2
                segundos.
              </p>
              <button
                type="button"
                onClick={() => setScanHint(false)}
                className="mt-5 w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-105"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
