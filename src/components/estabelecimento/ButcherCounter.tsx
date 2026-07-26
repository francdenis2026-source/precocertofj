import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Beef,
  Bell,
  History,
  LayoutGrid,
  List as ListIcon,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/feedback";
import { normalize } from "@/lib/search-tokens";
import type { PublicStoreProduct } from "@/lib/stores-public.functions";
import {
  BUTCHER_PROTEINS,
  classifyButcherCut,
  cutPricePerKg,
  type ButcherProtein,
} from "@/lib/butcher-cuts";

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export type CutSort = "kg-asc" | "kg-desc" | "name";
const SORT_LABEL: Record<CutSort, string> = {
  "kg-asc": "Menor preço por kg",
  "kg-desc": "Maior preço por kg",
  name: "Nome (A → Z)",
};

/** Estado visual do balcão — espelhado na URL pelas rotas. */
export type ButcherViewState = {
  q: string;
  protein: ButcherProtein | null;
  sort: CutSort;
  view: "grid" | "list";
};

export const BUTCHER_STATE_DEFAULTS: ButcherViewState = {
  q: "",
  protein: null,
  sort: "kg-asc",
  view: "grid",
};

export const CUT_SORT_KEYS: CutSort[] = ["kg-asc", "kg-desc", "name"];

/** Converte valores crus da URL em estado válido do balcão. */
export function parseButcherState(raw: {
  q?: string;
  prot?: string;
  bsort?: string;
  bview?: string;
}): ButcherViewState {
  const protein = BUTCHER_PROTEINS.find((p) => p.id === raw.prot)?.id ?? null;
  return {
    q: raw.q ?? "",
    protein,
    sort: CUT_SORT_KEYS.includes(raw.bsort as CutSort) ? (raw.bsort as CutSort) : "kg-asc",
    view: raw.bview === "list" ? "list" : "grid",
  };
}


type Cut = PublicStoreProduct & { protein: ButcherProtein };

const chip = (active: boolean) =>
  active
    ? "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-brand-gold bg-brand-gold px-3 text-[11px] font-bold uppercase leading-none tracking-[0.14em] text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    : "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-foreground transition-colors hover:border-brand-gold hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Separa os cortes de balcão do restante do catálogo. */
export function splitButcherCuts(products: PublicStoreProduct[]) {
  const cuts: Cut[] = [];
  const general: PublicStoreProduct[] = [];
  for (const p of products) {
    const protein = classifyButcherCut(p.productName, p.unit);
    if (protein) cuts.push({ ...p, protein });
    else general.push(p);
  }
  return { cuts, general };
}

const proteinLabel = (id: ButcherProtein) =>
  BUTCHER_PROTEINS.find((x) => x.id === id)?.label ?? "Açougue";

export function ButcherCounter({
  storeName,
  cuts,
  onHistory,
  onAlert,
  onOpen,
  state,
  onStateChange,
  loading = false,
  error = null,
  onRetry,
}: {
  storeName: string;
  cuts: Cut[];
  onHistory?: (p: PublicStoreProduct) => void;
  onAlert?: (p: PublicStoreProduct) => void;
  onOpen?: (p: PublicStoreProduct) => void;
  /** Carregando cortes do servidor — mostra skeletons no lugar da lista. */
  loading?: boolean;
  /** Falha ao carregar cortes — mostra mensagem consistente com nova tentativa. */
  error?: string | null;
  onRetry?: () => void;
  /** Estado controlado (sincronizado com a URL). Quando ausente, usa estado local. */
  state?: ButcherViewState;
  onStateChange?: (patch: Partial<ButcherViewState>) => void;
}) {
  const [local, setLocal] = useState<ButcherViewState>(BUTCHER_STATE_DEFAULTS);
  const controlled = Boolean(state && onStateChange);
  const current = controlled ? (state as ButcherViewState) : local;
  const changeRef = useRef(onStateChange);
  changeRef.current = onStateChange;
  const patchState = useCallback(
    (patch: Partial<ButcherViewState>) => {
      if (controlled) changeRef.current?.(patch);
      else setLocal((prev) => ({ ...prev, ...patch }));
    },
    [controlled],
  );

  const q = current.q;
  const protein = current.protein;
  const sort = current.sort;
  const view = current.view;

  // Termo local para digitação fluida quando controlado por URL (debounce no pai).
  const [draft, setDraft] = useState(q);
  useEffect(() => {
    setDraft(q);
  }, [q]);

  const [limit, setLimit] = useState(30);
  // Alternar Grade/Lista preserva a paginação — só filtros reiniciam a lista.
  useEffect(() => {
    setLimit(30);
  }, [q, protein, sort]);

  // Índice pré-computado: normalização e preço/kg calculados uma única vez.
  const index = useMemo(
    () =>
      cuts.map((cut) => ({
        cut,
        search: normalize(cut.productName),
        kg: cutPricePerKg(cut) ?? cut.price,
      })),
    [cuts],
  );

  const counts = useMemo(() => {
    const m = new Map<ButcherProtein, number>();
    for (const c of cuts) m.set(c.protein, (m.get(c.protein) ?? 0) + 1);
    return m;
  }, [cuts]);

  const filtered = useMemo(() => {
    const term = normalize(q);
    let list = index;
    if (protein) list = list.filter((e) => e.cut.protein === protein);
    if (term) list = list.filter((e) => e.search.includes(term));
    const rows = list === index ? list.slice() : list;
    switch (sort) {
      case "kg-desc":
        rows.sort((a, b) => b.kg - a.kg || a.cut.slug.localeCompare(b.cut.slug));
        break;
      case "name":
        rows.sort((a, b) => a.cut.productName.localeCompare(b.cut.productName, "pt-BR"));
        break;
      default:
        rows.sort((a, b) => a.kg - b.kg || a.cut.slug.localeCompare(b.cut.slug));
    }
    return rows.map((e) => e.cut);
  }, [index, q, protein, sort]);

  const cheapest = filtered.length > 1 ? filtered[0] : null;
  const shown = useMemo(() => filtered.slice(0, limit), [filtered, limit]);


  // Trilho de proteína: navegação por teclado (←/→/Home/End) com foco móvel.
  const railRef = useRef<HTMLDivElement | null>(null);
  // Proteínas visíveis: as que têm cortes + a ativa vinda da URL (mesmo vazia),
  // para que o filtro restaurado apareça e possa ser removido.
  const visibleProteins = useMemo(
    () => BUTCHER_PROTEINS.filter((p) => (counts.get(p.id) ?? 0) > 0 || p.id === protein),
    [counts, protein],
  );
  const options: (ButcherProtein | null)[] = useMemo(
    () => [null, ...visibleProteins.map((p) => p.id)],
    [visibleProteins],
  );
  const activeIndex = Math.max(0, options.indexOf(protein));

  const focusChip = (index: number) => {
    const nodes = railRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    nodes?.[index]?.focus();
    nodes?.[index]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  const onRailKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const last = options.length - 1;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = Math.min(last, activeIndex + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = Math.max(0, activeIndex - 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next === null) return;
    e.preventDefault();
    patchState({ protein: options[next] });
    requestAnimationFrame(() => focusChip(next!));
  };

  return (
    <section aria-label={`Açougue do ${storeName}`} className="mt-4">
      {/* Cabeçalho compacto — sem repetir o nome da loja já exibido no topo */}
      <div className="grid gap-2 rounded-xl border border-border bg-card p-3 shadow-elev-1 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-4">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-gold bg-brand-gold px-2 py-0.5 text-[10px] font-bold uppercase leading-none tracking-[0.16em] text-brand-navy">
            <Beef className="h-3 w-3" aria-hidden /> Setor interno
          </span>
          <h2 className="mt-1.5 font-serif text-[17px] font-semibold leading-tight tracking-tight text-foreground sm:text-[19px]">
            Balcão do açougue
          </h2>
          <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
            {cuts.length} corte{cuts.length === 1 ? "" : "s"} com preço por quilo — setor dentro da
            loja, não é um estabelecimento separado.
          </p>
        </div>
        {cheapest && (
          <div className="flex flex-wrap items-baseline gap-x-1.5 rounded-lg border border-brand-gold/40 bg-brand-gold/10 px-2.5 py-1.5 text-[12.5px] lg:max-w-[320px]">
            <span className="text-[10px] font-bold uppercase leading-none tracking-[0.14em] text-[var(--pc-gold-ink)]">
              Menor preço por kg
            </span>
            <strong className="font-semibold text-foreground">{cheapest.productName}</strong>
            <span className="font-bold tabular-nums text-[var(--pc-gold-ink)]">
              {brl(cutPricePerKg(cheapest) ?? cheapest.price)}/kg
            </span>
          </div>
        )}
      </div>


      {/* Filtro por proteína — trilho com teclado */}
      <div
        ref={railRef}
        className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="radiogroup"
        aria-label="Filtrar por proteína"
        onKeyDown={onRailKeyDown}
      >
        <button
          type="button"
          role="radio"
          aria-checked={protein === null}
          tabIndex={activeIndex === 0 ? 0 : -1}
          onClick={() => patchState({ protein: null })}
          className={chip(protein === null)}
        >
          Todos
          <span
            className={
              protein === null
                ? "rounded-full bg-brand-navy/15 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-brand-navy"
                : "rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-foreground"
            }
          >
            {cuts.length}
          </span>
        </button>
        {visibleProteins.map((p, i) => {
          const active = protein === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={activeIndex === i + 1 ? 0 : -1}
              onClick={() => patchState({ protein: active ? null : p.id })}
              className={chip(active)}
            >
              {p.label}
              <span
                className={
                  active
                    ? "rounded-full bg-brand-navy/15 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-brand-navy"
                    : "rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-foreground"
                }
              >
                {counts.get(p.id) ?? 0}
              </span>
            </button>
          );
        })}
      </div>


      {/* Busca · ordenação · modo */}
      <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              patchState({ q: e.target.value });
            }}
            placeholder="Buscar corte (picanha, coxa, costela…)"
            aria-label="Buscar corte"
            inputMode="search"
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-brand-gold focus-visible:ring-2 focus-visible:ring-brand-gold/50"
          />
        </div>
        <Select value={sort} onValueChange={(v) => patchState({ sort: v as CutSort })}>
          <SelectTrigger
            aria-label="Ordenar cortes"
            className="h-9 w-full text-[12.5px] font-medium sm:w-[220px]"
          >
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABEL) as CutSort[]).map((k) => (
              <SelectItem key={k} value={k} className="text-[12.5px]">
                {SORT_LABEL[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div
          role="radiogroup"
          aria-label="Modo de exibição"
          onKeyDown={(e) => {
            if (["ArrowRight", "ArrowDown", "End"].includes(e.key)) {
              e.preventDefault();
              patchState({ view: "list" });
            } else if (["ArrowLeft", "ArrowUp", "Home"].includes(e.key)) {
              e.preventDefault();
              patchState({ view: "grid" });
            }
          }}
          className="flex h-9 shrink-0 items-center gap-1 rounded-lg border border-border bg-card p-1"
        >
          {[
            { id: "grid" as const, label: "Grade", Icon: LayoutGrid },
            { id: "list" as const, label: "Lista", Icon: ListIcon },
          ].map(({ id, label, Icon }) => {
            const active = view === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={active}
                tabIndex={active ? 0 : -1}
                aria-label={`Exibir em ${label.toLowerCase()}`}
                onClick={() => patchState({ view: id })}
                className={
                  active
                    ? "inline-flex h-7 items-center gap-1 rounded-md bg-brand-gold px-2 text-[11.5px] font-bold leading-none text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    : "inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11.5px] font-semibold leading-none text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                }
              >
                <Icon className="h-3.5 w-3.5" aria-hidden /> {label}
              </button>
            );
          })}
        </div>

      </div>

      <div className="mt-2.5 flex items-baseline justify-between gap-3">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-foreground">
          Cortes de balcão
        </h3>
        <span className="text-[11px] text-muted-foreground" aria-hidden>
          {filtered.length} de {cuts.length}
          {protein ? ` · ${proteinLabel(protein)}` : ""}
        </span>
      </div>

      {/* Região viva: anuncia resultado dos filtros a leitores de tela */}
      <p className="sr-only" role="status" aria-live="polite">
        {loading
          ? "Carregando cortes do açougue."
          : error
            ? `Erro ao carregar os cortes: ${error}`
            : `${filtered.length} de ${cuts.length} cortes exibidos${
                protein ? ` em ${proteinLabel(protein)}` : ""
              }${q ? ` para a busca ${q}` : ""}.`}
      </p>

      {loading ? (
        <CutSkeletons view={view} />
      ) : error ? (
        <div role="alert">
        <EmptyState
          className="mt-2"
          size="sm"

          icon={AlertTriangle}
          title="Não foi possível carregar os cortes"
          message={error}
          action={
            onRetry ? (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Tentar novamente
              </Button>
            ) : undefined
          }
        />
        </div>
      ) : filtered.length > 0 ? (
        <>
          {view === "grid" ? (
            <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((p) => (
                <li key={p.slug}>
                  <CutTile cut={p} onOpen={onOpen} onAlert={onAlert} onHistory={onHistory} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-2 overflow-hidden rounded-lg border border-border bg-card">
              <div className="grid grid-cols-[minmax(0,1fr)_96px] items-center gap-3 border-b border-border bg-muted/60 px-2.5 py-1.5 sm:grid-cols-[minmax(0,1fr)_120px_96px_200px]">
                <span className="text-[10px] font-bold uppercase leading-none tracking-[0.14em] text-muted-foreground">
                  Corte
                </span>
                <span className="hidden text-[10px] font-bold uppercase leading-none tracking-[0.14em] text-muted-foreground sm:block">
                  Preço por kg
                </span>
                <span className="text-right text-[10px] font-bold uppercase leading-none tracking-[0.14em] text-muted-foreground">
                  Preço
                </span>
                <span className="hidden text-right text-[10px] font-bold uppercase leading-none tracking-[0.14em] text-muted-foreground sm:block">
                  Ações
                </span>
              </div>
              <ul className="divide-y divide-border/70">
                {shown.map((p) => (
                  <li key={p.slug}>
                    <CutRow cut={p} onOpen={onOpen} onAlert={onAlert} onHistory={onHistory} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {filtered.length > limit && (
            <button
              type="button"
              onClick={() => setLimit((l) => l + 30)}
              className="mt-2.5 h-9 w-full rounded-lg border border-border bg-card text-[12.5px] font-semibold text-foreground transition-colors hover:border-brand-gold"
            >
              Mostrar mais ({filtered.length - limit} restantes)
            </button>
          )}
        </>
      ) : (
        <EmptyState
          role="status"
          className="mt-4"
          size="sm"
          icon={Beef}
          title="Nenhum corte encontrado"
          message={
            q && protein
              ? `Nenhum corte de ${proteinLabel(protein).toLowerCase()} para "${q}".`
              : q
                ? `Nenhum corte para "${q}".`
                : protein
                  ? `Este balcão ainda não tem cortes de ${proteinLabel(protein).toLowerCase()}.`
                  : "Ainda não há cortes publicados."
          }
          action={
            q || protein ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDraft("");
                  patchState({ q: "", protein: null });
                }}
              >
                Limpar filtros
              </Button>
            ) : undefined
          }
        />
      )}
    </section>
  );
}

const ActionButtons = memo(function ActionButtons({
  cut,
  onAlert,
  onHistory,
  size = "sm",
}: {
  cut: Cut;
  onAlert?: (p: PublicStoreProduct) => void;
  onHistory?: (p: PublicStoreProduct) => void;
  size?: "sm" | "md";
}) {
  const cls =
    size === "sm"
      ? "inline-flex h-6 items-center gap-1 rounded-full border border-border bg-background px-2 text-[10.5px] font-semibold leading-none text-foreground transition-colors hover:border-brand-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
      : "inline-flex h-7 items-center gap-1 rounded-full border border-border bg-background px-2 text-[10.5px] font-semibold leading-none text-foreground transition-colors hover:border-brand-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold";
  if (!onAlert && !onHistory) return null;
  return (
    <div className="flex shrink-0 items-center gap-1">
      {onAlert && (
        <button
          type="button"
          onClick={() => onAlert(cut)}
          aria-label={`Criar alerta de preço para ${cut.productName}`}
          className={cls}
        >
          <Bell className="h-3 w-3 text-brand-gold" aria-hidden /> Alerta
        </button>
      )}
      {onHistory && (
        <button
          type="button"
          onClick={() => onHistory(cut)}
          aria-label={`Ver histórico de preço de ${cut.productName}`}
          className={cls}
        >
          <History className="h-3 w-3 text-brand-gold" aria-hidden /> Histórico
        </button>
      )}
    </div>
  );
});

/** Cartão compacto de corte — clique abre o modal de detalhes. */
const CutTile = memo(function CutTile({
  cut,
  onOpen,
  onAlert,
  onHistory,
}: {
  cut: Cut;
  onOpen?: (p: PublicStoreProduct) => void;
  onAlert?: (p: PublicStoreProduct) => void;
  onHistory?: (p: PublicStoreProduct) => void;
}) {
  const kg = cutPricePerKg(cut);
  return (
    <article className="flex h-full flex-col justify-between rounded-lg border border-border bg-card shadow-elev-1 transition-colors hover:border-brand-gold hover:bg-muted/30">
      <button
        type="button"
        onClick={onOpen ? () => onOpen(cut) : undefined}
        aria-label={`Ver detalhes de ${cut.productName}`}
        className="w-full px-3 pb-1.5 pt-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-gold"
      >
        <div className="flex items-start gap-2">
          <h4 className="min-w-0 flex-1 text-[13px] font-semibold leading-snug text-foreground">
            {cut.productName}
          </h4>
          <span className="shrink-0 text-[13.5px] font-bold leading-tight tabular-nums text-foreground">
            {brl(cut.price)}
          </span>
        </div>
        <p className="mt-1 truncate text-[11px] leading-none text-muted-foreground">
          {proteinLabel(cut.protein)}
          {cut.brand ? ` · ${cut.brand}` : ""}
          {kg ? ` · ${brl(kg)} / kg` : ""}
        </p>
      </button>
      <div className="mx-3 mb-2.5 flex items-center justify-between gap-2 border-t border-border/70 pt-1.5">
        <span className="truncate text-[10.5px] leading-none text-muted-foreground">
          {cut.lastDate ? `Atualizado ${new Date(cut.lastDate).toLocaleDateString("pt-BR")}` : ""}
        </span>
        <ActionButtons cut={cut} onAlert={onAlert} onHistory={onHistory} />
      </div>
    </article>
  );
});

/** Linha densa em colunas (corte · R$/kg · preço · ações). */
const CutRow = memo(function CutRow({
  cut,
  onOpen,
  onAlert,
  onHistory,
}: {
  cut: Cut;
  onOpen?: (p: PublicStoreProduct) => void;
  onAlert?: (p: PublicStoreProduct) => void;
  onHistory?: (p: PublicStoreProduct) => void;
}) {
  const kg = cutPricePerKg(cut);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_96px] min-h-11 items-center gap-3 px-2.5 py-2 transition-colors hover:bg-muted/50 sm:min-h-0 sm:py-1.5 sm:grid-cols-[minmax(0,1fr)_120px_96px_200px]">
      <button
        type="button"
        onClick={onOpen ? () => onOpen(cut) : undefined}
        aria-label={`Ver detalhes de ${cut.productName}`}
        className="min-w-0 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-gold"
      >
        <span className="block truncate text-[12.5px] font-semibold leading-tight text-foreground">
          {cut.productName}
        </span>
        <span className="block truncate text-[10.5px] leading-tight text-muted-foreground">
          {proteinLabel(cut.protein)}
          {cut.brand ? ` · ${cut.brand}` : ""}
        </span>
      </button>

      <span className="hidden truncate text-[11.5px] tabular-nums leading-tight text-muted-foreground sm:block">
        {kg ? `${brl(kg)} / kg` : "—"}
      </span>

      <span className="whitespace-nowrap text-right text-[13px] font-bold tabular-nums leading-tight text-foreground">
        {brl(cut.price)}
      </span>

      <div className="hidden items-center justify-end sm:flex">
        <ActionButtons cut={cut} onAlert={onAlert} onHistory={onHistory} size="md" />
      </div>
    </div>
  );
});

/** Skeletons na mesma densidade da grade/lista de cortes. */
function CutSkeletons({ view }: { view: "grid" | "list" }) {
  const rows = Array.from({ length: 6 });
  if (view === "list") {
    return (
      <div
        className="mt-2 overflow-hidden rounded-lg border border-border bg-card"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="Carregando cortes"
      >
        <ul className="divide-y divide-border/70">
          {rows.map((_, i) => (
            <li key={i} className="flex items-center gap-3 px-2.5 py-2.5">
              <span className="h-3.5 flex-1 animate-pulse rounded bg-muted" />
              <span className="h-3.5 w-16 animate-pulse rounded bg-muted" />
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <ul
      className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Carregando cortes"
    >
      {rows.map((_, i) => (
        <li
          key={i}
          className="rounded-lg border border-border bg-card p-3"
        >
          <span className="block h-3.5 w-3/4 animate-pulse rounded bg-muted" />
          <span className="mt-2 block h-3 w-1/2 animate-pulse rounded bg-muted" />
          <span className="mt-3 block h-3 w-1/3 animate-pulse rounded bg-muted" />
        </li>
      ))}
    </ul>
  );
}
