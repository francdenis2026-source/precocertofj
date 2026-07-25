import { useMemo, useState } from "react";
import { Beef, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback";
import { ProductListCard } from "@/components/product/ProductListCard";
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

type CutSort = "kg-asc" | "kg-desc" | "name";
const SORT_LABEL: Record<CutSort, string> = {
  "kg-asc": "Menor preço por kg",
  "kg-desc": "Maior preço por kg",
  name: "Nome (A → Z)",
};

const chip = (active: boolean) =>
  active
    ? "inline-flex h-9 items-center gap-1.5 rounded-full border border-brand-gold bg-brand-gold px-3.5 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-brand-navy shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    : "inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3.5 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-foreground transition-colors hover:border-brand-gold hover:bg-[var(--pc-hover-tint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Separa os cortes de balcão do restante do catálogo. */
export function splitButcherCuts(products: PublicStoreProduct[]) {
  const cuts: (PublicStoreProduct & { protein: ButcherProtein })[] = [];
  const general: PublicStoreProduct[] = [];
  for (const p of products) {
    const protein = classifyButcherCut(p.productName, p.unit);
    if (protein) cuts.push({ ...p, protein });
    else general.push(p);
  }
  return { cuts, general };
}

export function ButcherCounter({
  storeName,
  cuts,
  onHistory,
  onAlert,
}: {
  storeName: string;
  cuts: (PublicStoreProduct & { protein: ButcherProtein })[];
  onHistory?: (p: PublicStoreProduct) => void;
  onAlert?: (p: PublicStoreProduct) => void;
}) {
  const [q, setQ] = useState("");
  const [protein, setProtein] = useState<ButcherProtein | null>(null);
  const [sort, setSort] = useState<CutSort>("kg-asc");

  const counts = useMemo(() => {
    const m = new Map<ButcherProtein, number>();
    for (const c of cuts) m.set(c.protein, (m.get(c.protein) ?? 0) + 1);
    return m;
  }, [cuts]);

  const filtered = useMemo(() => {
    const term = normalize(q);
    let list = cuts.slice();
    if (protein) list = list.filter((c) => c.protein === protein);
    if (term) list = list.filter((c) => normalize(c.productName).includes(term));
    const kg = (p: PublicStoreProduct) => cutPricePerKg(p) ?? p.price;
    switch (sort) {
      case "kg-desc":
        list.sort((a, b) => kg(b) - kg(a));
        break;
      case "name":
        list.sort((a, b) => a.productName.localeCompare(b.productName, "pt-BR"));
        break;
      default:
        list.sort((a, b) => kg(a) - kg(b));
    }
    return list;
  }, [cuts, q, protein, sort]);

  const cheapest = useMemo(() => {
    if (!filtered.length) return null;
    return filtered.reduce((min, p) =>
      (cutPricePerKg(p) ?? p.price) < (cutPricePerKg(min) ?? min.price) ? p : min,
    );
  }, [filtered]);

  return (
    <section aria-label={`Açougue do ${storeName}`} className="mt-6">
      <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-gold bg-brand-gold px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-navy">
            <Beef className="h-3 w-3" aria-hidden /> Setor interno
          </span>
          <span className="text-[11px] text-muted-foreground">
            Não é um estabelecimento separado — é o balcão de carnes do {storeName}.
          </span>
        </div>
        <h2 className="mt-2 font-serif text-[20px] font-semibold leading-tight tracking-tight sm:text-[23px]">
          Açougue do {storeName}
        </h2>
        <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">
          {cuts.length} corte{cuts.length === 1 ? "" : "s"} de balcão com preço por quilo, ordenados
          para facilitar a comparação.
        </p>
        {cheapest && (
          <p className="mt-2 text-[13px]">
            <span className="text-muted-foreground">Melhor preço por kg agora: </span>
            <strong>{cheapest.productName}</strong>{" "}
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {brl(cutPricePerKg(cheapest) ?? cheapest.price)}/kg
            </span>
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Filtrar por proteína">
        <button
          type="button"
          role="radio"
          aria-checked={protein === null}
          onClick={() => setProtein(null)}
          className={chip(protein === null)}
        >
          Todos
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-foreground/80">
            {cuts.length}
          </span>
        </button>
        {BUTCHER_PROTEINS.filter((p) => (counts.get(p.id) ?? 0) > 0).map((p) => {
          const active = protein === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setProtein(active ? null : p.id)}
              className={chip(active)}
            >
              {p.label}
              <span
                className={
                  active
                    ? "rounded-full bg-brand-navy/15 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-brand-navy"
                    : "rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-foreground/80"
                }
              >
                {counts.get(p.id)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar corte (picanha, coxa, costela…)"
            className="pl-9"
            inputMode="search"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as CutSort)}
          aria-label="Ordenar cortes"
          className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground transition-colors hover:border-brand-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {(Object.keys(SORT_LABEL) as CutSort[]).map((k) => (
            <option key={k} value={k}>
              {SORT_LABEL[k]}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        {filtered.length} de {cuts.length} cortes
      </div>

      <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <li key={p.slug}>
            <ProductListCard
              name={p.productName}
              category={`Açougue · ${BUTCHER_PROTEINS.find((x) => x.id === p.protein)?.label ?? ""}`}
              brand={p.brand}
              price={p.price}
              pricePerUnit={cutPricePerKg(p)}
              unitLabel={cutPricePerKg(p) ? "R$/kg" : p.unitLabel}
              lastDate={p.lastDate}
              onAlert={onAlert ? () => onAlert(p) : undefined}
              onHistory={onHistory ? () => onHistory(p) : undefined}
            />
          </li>
        ))}
      </ul>

      {filtered.length === 0 && (
        <EmptyState
          className="mt-8"
          icon={Beef}
          title="Nenhum corte encontrado"
          message={q ? `Nenhum corte para "${q}".` : "Ainda não há cortes publicados."}
          action={
            q || protein ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQ("");
                  setProtein(null);
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
