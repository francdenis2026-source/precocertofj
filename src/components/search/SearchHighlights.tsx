import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Store, TrendingDown } from "lucide-react";
import { getSearchHighlights, type HighlightItem } from "@/lib/search-highlights.functions";
import { humanizeCategory } from "@/lib/establishments-public.functions";
import { QuickFilterBar } from "@/components/search/QuickFilterBar";

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

type View = "economia" | "cobertura";

type Props = {
  onPickQuery: (q: string) => void;
};

/**
 * Descoberta com dados reais em `/buscar`. Alterna entre economias (maior
 * diferença de preço, filtrável por categoria) e maior cobertura entre
 * mercados parceiros.
 */
export function SearchHighlights({ onPickQuery }: Props) {
  const { data, isPending } = useQuery({
    queryKey: ["search-highlights"],
    queryFn: () => getSearchHighlights(),
    staleTime: 5 * 60_000,
  });

  const [view, setView] = useState<View>("economia");
  const [category, setCategory] = useState<string>("");

  const source = view === "economia" ? (data?.opportunities ?? []) : (data?.covered ?? []);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const i of source) {
      if (!i.category) continue;
      counts.set(i.category, (counts.get(i.category) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([slug]) => slug);
  }, [source]);

  const activeCategory = category && categories.includes(category) ? category : "";

  const items = useMemo(() => {
    const filtered = activeCategory ? source.filter((i) => i.category === activeCategory) : source;
    return filtered.slice(0, view === "economia" ? 6 : 8);
  }, [source, activeCategory, view]);

  if (!isPending && (data?.opportunities.length ?? 0) === 0 && (data?.covered.length ?? 0) === 0) {
    return null;
  }

  const isEconomia = view === "economia";

  return (
    <section
      aria-label="Destaques da busca"
      className="relative overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-sm"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-brand-gold/45 to-transparent"
      />

      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-gold/15 text-brand-gold-soft dark:text-brand-gold"
          >
            {isEconomia ? (
              <TrendingDown className="h-4 w-4" strokeWidth={2.25} />
            ) : (
              <Store className="h-4 w-4" strokeWidth={2.25} />
            )}
          </span>
          <div className="min-w-0">
            <h2 className="font-serif text-[14.5px] font-semibold leading-tight tracking-tight text-foreground">
              {isEconomia ? "Onde a diferença de preço é maior" : "Mais comparados nos mercados"}
            </h2>
            <p className="text-[11.5px] leading-snug text-muted-foreground">
              {isEconomia
                ? "Mesmo produto, mercados diferentes — quanto dá para economizar hoje."
                : "Itens presentes em vários mercados parceiros — clique para comparar."}
            </p>
          </div>
        </div>

        <QuickFilterBar<View>
          ariaLabel="Tipo de destaque"
          value={view}
          size="sm"
          onChange={(next) => {
            setView(next ?? "economia");
            setCategory("");
          }}
          options={[
            {
              value: "economia",
              label: "Economias",
              hint: "Maior diferença de preço entre mercados",
            },
            {
              value: "cobertura",
              label: "Maior cobertura",
              hint: "Produtos presentes em mais mercados",
            },
          ]}
        />
      </header>

      {categories.length > 1 && (
        <div
          role="group"
          aria-label="Filtrar destaques por categoria"
          className="-mx-1 mt-2.5 flex snap-x gap-1.5 overflow-x-auto px-1 pb-1"
        >
          <CategoryChip
            label="Todas"
            active={!activeCategory}
            onClick={() => setCategory("")}
          />
          {categories.map((slug) => (
            <CategoryChip
              key={slug}
              label={humanizeCategory(slug)}
              active={activeCategory === slug}
              onClick={() => setCategory(slug === activeCategory ? "" : slug)}
            />
          ))}
        </div>
      )}

      <div className="mt-2.5">
        {isPending ? (
          <SkeletonGrid rows={6} />
        ) : items.length === 0 ? (
          <p
            role="status"
            className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-[12.5px] text-muted-foreground"
          >
            Nenhum destaque nesta categoria por enquanto.
          </p>
        ) : isEconomia ? (
          <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <li key={item.key}>
                <OpportunityCard item={item} onPick={() => onPickQuery(item.name)} />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {items.map((item) => (
              <li key={item.key}>
                <CoveredRow item={item} onPick={() => onPickQuery(item.name)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`snap-start inline-flex h-7 shrink-0 items-center rounded-full border px-2.5 text-[11.5px] font-medium tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        active
          ? "border-brand-gold bg-brand-gold text-brand-navy"
          : "border-border bg-background text-foreground hover:border-brand-gold hover:bg-[var(--pc-hover-tint)]"
      }`}
    >
      {label}
    </button>
  );
}

function OpportunityCard({ item, onPick }: { item: HighlightItem; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="group flex h-full w-full flex-col gap-1.5 rounded-xl border border-border bg-background p-2.5 text-left transition-all hover:-translate-y-px hover:border-brand-gold hover:bg-[var(--pc-hover-tint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="line-clamp-2 text-[12.5px] font-medium leading-snug tracking-tight text-foreground">
        {item.name}
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className="text-[15px] font-semibold tabular-nums text-foreground">
          {brl(item.minPrice)}
        </span>
        <span className="text-[11px] text-muted-foreground line-through tabular-nums">
          {brl(item.maxPrice)}
        </span>
      </span>
      <span className="mt-auto flex items-center justify-between gap-2">
        <span className="truncate text-[11px] text-muted-foreground">
          {item.cheapestStore ?? `${item.storeCount} mercados`}
        </span>
        <span className="inline-flex shrink-0 items-center rounded-full bg-brand-gold px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-brand-navy">
          −{brl(item.savings)}
        </span>
      </span>
    </button>
  );
}

function CoveredRow({ item, onPick }: { item: HighlightItem; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-border bg-background px-2.5 py-2 text-left transition-colors hover:border-brand-gold hover:bg-[var(--pc-hover-tint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="min-w-0">
        <span className="block truncate text-[12.5px] font-medium tracking-tight text-foreground">
          {item.name}
        </span>
        <span className="block truncate text-[11px] text-muted-foreground">
          em {item.storeCount} mercados · a partir de {brl(item.minPrice)}
        </span>
      </span>
      <ArrowRight
        aria-hidden
        className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-brand-gold"
      />
    </button>
  );
}

function SkeletonGrid({ rows }: { rows: number }) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-[68px] animate-pulse rounded-xl border border-border bg-muted/40" />
      ))}
    </div>
  );
}
