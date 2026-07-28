import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, PlusCircle, Search, Sparkles, Store, TrendingDown } from "lucide-react";
import { getSearchHighlights, type HighlightItem } from "@/lib/search-highlights.functions";
import { humanizeCategory } from "@/lib/establishments-public.functions";
import { QuickFilterBar } from "@/components/search/QuickFilterBar";
import { useSession } from "@/hooks/useSession";
import { getSearchHistory } from "@/lib/search-history";
import { listFavoriteItems } from "@/lib/favorites.functions";
import { PrecoCertoMark } from "@/components/typography/PrecoCertoMark";

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const STOP = new Set([
  "de",
  "da",
  "do",
  "com",
  "sem",
  "para",
  "kg",
  "ml",
  "un",
  "por",
  "pct",
  "und",
]);

function tokens(text: string): string[] {
  return norm(text)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !STOP.has(t));
}

type View = "economia" | "cobertura" | "para-voce";

type Props = {
  onPickQuery: (q: string) => void;
};


/**
 * Descoberta com dados reais em `/buscar`. Alterna entre economias (maior
 * diferença de preço), maior cobertura e — para quem está logado — destaques
 * personalizados pelas categorias mais pesquisadas e itens salvos.
 */
export function SearchHighlights({ onPickQuery }: Props) {
  const { data, isPending } = useQuery({
    queryKey: ["search-highlights"],
    queryFn: () => getSearchHighlights(),
    staleTime: 5 * 60_000,
  });

  const { user } = useSession();

  // Consultas recentes (client-only) — base do sinal de personalização.
  const [historyTerms, setHistoryTerms] = useState<string[]>([]);
  useEffect(() => {
    if (!user) {
      setHistoryTerms([]);
      return;
    }
    setHistoryTerms(getSearchHistory().map((e) => e.query));
  }, [user]);

  const { data: favorites } = useQuery({
    queryKey: ["favorite-items", "highlights", user?.id ?? "anon"],
    queryFn: () => listFavoriteItems(),
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const personalTokens = useMemo(() => {
    const set = new Set<string>();
    for (const q of historyTerms) for (const t of tokens(q)) set.add(t);
    for (const f of favorites ?? []) for (const t of tokens(f.displayName)) set.add(t);
    return set;
  }, [historyTerms, favorites]);

  const hasSignal = personalTokens.size > 0;

  const pool = useMemo(
    () => [...(data?.opportunities ?? []), ...(data?.covered ?? [])],
    [data],
  );

  /** Categorias favoritas do usuário, inferidas pelos itens que casam com o histórico/salvos. */
  const personalItems = useMemo(() => {
    if (!hasSignal) return [] as HighlightItem[];
    const score = (item: HighlightItem) => {
      const t = tokens(item.name);
      return t.reduce((acc, tok) => acc + (personalTokens.has(tok) ? 1 : 0), 0);
    };

    const catScore = new Map<string, number>();
    for (const item of pool) {
      const s = score(item);
      if (s > 0 && item.category) catScore.set(item.category, (catScore.get(item.category) ?? 0) + s);
    }

    const seen = new Set<string>();
    return pool
      .map((item) => {
        const direct = score(item);
        const cat = item.category ? (catScore.get(item.category) ?? 0) : 0;
        return { item, rank: direct * 10 + Math.min(cat, 6) + item.savings / 1000 };
      })
      .filter((r) => r.rank >= 1)
      .sort((a, b) => b.rank - a.rank)
      .filter(({ item }) => (seen.has(item.key) ? false : (seen.add(item.key), true)))
      .map((r) => r.item);
  }, [pool, personalTokens, hasSignal]);

  const canPersonalize = !!user && personalItems.length > 0;

  const [view, setView] = useState<View>("economia");
  const [category, setCategory] = useState<string>("");

  // Abre em "Para você" assim que houver sinal suficiente.
  useEffect(() => {
    if (canPersonalize) setView((v) => (v === "economia" ? "para-voce" : v));
  }, [canPersonalize]);

  const effectiveView: View = view === "para-voce" && !canPersonalize ? "economia" : view;

  const source =
    effectiveView === "para-voce"
      ? personalItems
      : effectiveView === "economia"
        ? (data?.opportunities ?? [])
        : (data?.covered ?? []);

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
    return filtered.slice(0, effectiveView === "cobertura" ? 8 : 6);
  }, [source, activeCategory, effectiveView]);

  if (!isPending && (data?.opportunities.length ?? 0) === 0 && (data?.covered.length ?? 0) === 0) {
    return null;
  }

  const isEconomia = effectiveView === "economia";
  const isPersonal = effectiveView === "para-voce";
  const asCards = effectiveView !== "cobertura";

  const title = isPersonal
    ? "Destaques para você"
    : isEconomia
      ? "Onde a diferença de preço é maior"
      : "Mais comparados nos mercados";
  const subtitle = isPersonal
    ? "Baseado no que você mais pesquisa e nos itens que salvou."
    : isEconomia
      ? "Mesmo produto, mercados diferentes — quanto dá para economizar hoje."
      : "Itens presentes em vários mercados parceiros — clique para comparar.";

  return (
    <section
      aria-label="Destaques da busca"
      className="relative border-t border-border/60 pt-5"
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
            {isPersonal ? (
              <Sparkles className="h-4 w-4" strokeWidth={2.25} />
            ) : isEconomia ? (
              <TrendingDown className="h-4 w-4" strokeWidth={2.25} />
            ) : (
              <Store className="h-4 w-4" strokeWidth={2.25} />
            )}
          </span>
          <div className="min-w-0">
            <h2 className="font-serif text-[14.5px] font-semibold leading-tight tracking-tight text-foreground">
              {title}
            </h2>
            <p className="text-[11.5px] leading-snug text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        <QuickFilterBar<View>
          ariaLabel="Tipo de destaque"
          value={effectiveView}
          size="sm"
          onChange={(next) => {
            setView(next ?? "economia");
            setCategory("");
          }}
          options={[
            ...(canPersonalize
              ? [
                  {
                    value: "para-voce" as View,
                    label: "Para você",
                    hint: "Categorias que você mais pesquisa e itens salvos",
                  },
                ]
              : []),
            {
              value: "economia" as View,
              label: "Economias",
              hint: "Maior diferença de preço entre mercados",
            },
            {
              value: "cobertura" as View,
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
          <EmptyHighlights
            categoryLabel={activeCategory ? humanizeCategory(activeCategory) : null}
            onClearCategory={() => setCategory("")}
            onPickQuery={onPickQuery}
          />
        ) : asCards ? (
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

/**
 * Estado vazio acionável: busca direta de um item e atalho para cadastrar
 * um preço novo quando a categoria ainda não tem destaques.
 */
function EmptyHighlights({
  categoryLabel,
  onClearCategory,
  onPickQuery,
}: {
  categoryLabel: string | null;
  onClearCategory: () => void;
  onPickQuery: (q: string) => void;
}) {
  const [term, setTerm] = useState("");

  return (
    <div
      role="status"
      className="rounded-xl border border-dashed border-border bg-background/60 px-3 py-4 text-center"
    >
      <p className="text-[12.5px] font-medium tracking-tight text-foreground">
        {categoryLabel
          ? `Ainda não há destaques em ${categoryLabel}.`
          : "Ainda não há destaques por aqui."}
      </p>
      <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
        Busque um item específico ou ajude cadastrando um preço que você viu no mercado.
      </p>

      <form
        className="mx-auto mt-2.5 flex w-full max-w-md items-center gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          const q = term.trim();
          if (q.length >= 2) onPickQuery(q);
        }}
      >
        <label className="sr-only" htmlFor="empty-highlight-search">
          Buscar um item específico
        </label>
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <input
            id="empty-highlight-search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Ex.: arroz 5kg"
            className="h-8 w-full rounded-full border border-border bg-background pl-8 pr-3 text-[12px] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-8 shrink-0 items-center rounded-full bg-brand-gold px-3 text-[11.5px] font-semibold text-brand-navy transition-colors hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Buscar
        </button>
      </form>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
        {categoryLabel && (
          <button
            type="button"
            onClick={onClearCategory}
            className="inline-flex h-7 items-center rounded-full border border-border px-2.5 text-[11.5px] font-medium text-foreground transition-colors hover:border-brand-gold hover:bg-[var(--pc-hover-tint)]"
          >
            Ver todas as categorias
          </button>
        )}
        <Link
          to="/colaborar"
          className="inline-flex h-7 items-center gap-1 rounded-full border border-brand-gold px-2.5 text-[11.5px] font-semibold text-brand-gold-soft transition-colors hover:bg-brand-gold hover:text-brand-navy dark:text-brand-gold"
        >
          <PlusCircle aria-hidden className="h-3.5 w-3.5" />
          Cadastrar um preço
        </Link>
      </div>
    </div>
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
      <PrecoCertoMark
        as="span"
        variant="card"
        className="line-clamp-2 text-foreground"
      >
        {item.name}
      </PrecoCertoMark>
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
        <span className="inline-flex shrink-0 items-center rounded-full bg-brand-gold px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-brand-navy">
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
