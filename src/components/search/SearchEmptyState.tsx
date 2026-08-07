import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Clock, Filter, Search, ShoppingBag, Sparkles, X } from "lucide-react";

import { listPopularQueries } from "@/lib/search-popular.functions";

export interface EmptyFilterShortcut {
  key: string;
  label: string;
  hint?: string;
  onApply: () => void;
}

/** Termos usados quando ainda não há histórico de buscas na plataforma. */
const FALLBACK_TERMS = [
  "arroz",
  "feijão",
  "café",
  "óleo",
  "açúcar",
  "leite",
  "macarrão",
  "sabão em pó",
];

/**
 * Deriva variações mais curtas do termo buscado — normalmente a causa de
 * "nenhum resultado" é excesso de detalhe (marca + gramagem).
 */
function relaxedVariants(query: string): string[] {
  const q = query.trim().replace(/\s{2,}/g, " ");
  if (!q) return [];
  const words = q.split(" ").filter(Boolean);
  const out: string[] = [];
  if (words.length > 1) out.push(words.slice(0, -1).join(" "));
  if (words.length > 2) out.push(words[0] + " " + words[1]);
  if (words.length > 1) out.push(words[0]);
  const singular = words[0]?.replace(/(oes|ões)$/i, "ão").replace(/s$/i, "");
  if (singular && singular.toLowerCase() !== words[0]?.toLowerCase()) out.push(singular);
  return Array.from(new Set(out.filter((t) => t.length >= 3 && t.toLowerCase() !== q.toLowerCase()))).slice(0, 4);
}

/**
 * Estado vazio do /buscar: explica o porquê, oferece sugestões de busca
 * (variações do termo, termos populares e histórico) e atalhos para
 * relaxar/limpar filtros ativos. Tipografia e espaçamento seguem os tokens
 * da grade de resultados (`.pc-res-*`), válidos em claro e escuro.
 */
export function SearchEmptyState({
  query,
  recent = [],
  onSearch,
  onClearQuery,
  filterShortcuts = [],
  activeFilterCount = 0,
  onClearFilters,
}: {
  query: string;
  recent?: string[];
  onSearch: (term: string) => void;
  onClearQuery: () => void;
  filterShortcuts?: EmptyFilterShortcut[];
  activeFilterCount?: number;
  onClearFilters?: () => void;
}) {
  const fetchPopular = useServerFn(listPopularQueries);
  const popularQ = useQuery({
    queryKey: ["search-popular", 8],
    queryFn: () => fetchPopular({ data: { days: 30, limit: 8 } }),
    staleTime: 30 * 60_000,
  });

  const current = query.trim().toLowerCase();
  const variants = relaxedVariants(query);
  const popular = (popularQ.data ?? [])
    .map((p) => p.query)
    .filter((t) => t.toLowerCase() !== current);
  const suggestions = (popular.length > 0 ? popular : FALLBACK_TERMS)
    .filter((t) => t.toLowerCase() !== current)
    .slice(0, 8);
  const recentTerms = recent
    .filter((t) => t.trim() && t.toLowerCase() !== current)
    .slice(0, 5);

  return (
    <section
      aria-live="polite"
      className="pc-res-card mt-2 border-dashed border-[color-mix(in_oklab,var(--brand-gold)_38%,transparent)] p-4 sm:p-5"
    >
      {/* Cabeçalho */}
      <div className="flex flex-col items-center text-center">
        <span className="mb-2 grid h-11 w-11 place-items-center rounded-full border border-[color-mix(in_oklab,var(--brand-gold)_45%,transparent)] bg-[color-mix(in_oklab,var(--brand-gold)_10%,transparent)] text-[var(--pc-gold-ink)]">
          <Search className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <h2 className="text-[16px] font-semibold tracking-tight text-foreground">
          {query.trim()
            ? `No prices for “${query.trim()}”`
            : "No prices found"}
        </h2>
        <p className="pc-res-meta mt-1 max-w-md">
          Try a shorter term, check the spelling, or loosen the filters — the product
          may not have been scanned yet.
        </p>
      </div>

      {/* Atalhos de filtro */}
      {(filterShortcuts.length > 0 || (activeFilterCount > 0 && onClearFilters)) && (
        <div className="mt-4 rounded-lg border border-border bg-muted/25 p-2.5">
          <p className="pc-res-label flex items-center gap-1.5">
            <Filter className="h-3 w-3" aria-hidden="true" />
            Adjust filters
            {activeFilterCount > 0 ? (
              <span className="rounded-full bg-[color-mix(in_oklab,var(--brand-gold)_18%,transparent)] px-1.5 tabular-nums">
                {activeFilterCount}
              </span>
            ) : null}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {filterShortcuts.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={f.onApply}
                title={f.hint}
                className="pc-res-store inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 font-medium text-foreground transition hover:border-[var(--pc-gold-ink)] hover:text-[var(--pc-gold-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50"
              >
                <Sparkles className="h-3 w-3 shrink-0 text-[var(--pc-gold-ink)]" aria-hidden="true" />
                {f.label}
              </button>
            ))}
            {activeFilterCount > 0 && onClearFilters ? (
              <button
                type="button"
                onClick={onClearFilters}
                className="pc-res-store inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--brand-gold)_45%,transparent)] bg-[color-mix(in_oklab,var(--brand-gold)_12%,transparent)] px-2.5 py-1 font-semibold text-[var(--pc-gold-ink)] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50"
              >
                <X className="h-3 w-3 shrink-0" aria-hidden="true" />
                Clear filters
              </button>
            ) : null}
          </div>
        </div>
      )}

      {/* Sugestões de busca */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {variants.length > 0 ? (
          <div>
            <p className="pc-res-label">Try searching for</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {variants.map((t) => (
                <li key={t}>
                  <TermChip term={t} onSearch={onSearch} emphasis />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <p className="pc-res-label">
            {popular.length > 0 ? "Popular searches" : "Common products"}
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {suggestions.map((t) => (
              <li key={t}>
                <TermChip term={t} onSearch={onSearch} />
              </li>
            ))}
          </ul>
        </div>

        {recentTerms.length > 0 ? (
          <div className="sm:col-span-2">
            <p className="pc-res-label flex items-center gap-1.5">
              <Clock className="h-3 w-3" aria-hidden="true" />
              Your recent searches
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {recentTerms.map((t) => (
                <li key={t}>
                  <TermChip term={t} onSearch={onSearch} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {/* Ações finais */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 border-t border-border pt-3">
        <button
          type="button"
          onClick={onClearQuery}
          className="pc-res-label inline-flex h-9 items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--brand-gold)_55%,transparent)] bg-[color-mix(in_oklab,var(--brand-gold)_14%,transparent)] px-3.5 text-[var(--pc-gold-ink)] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          New search
        </button>
        <Link
          to="/estabelecimentos"
          className="pc-res-label inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3.5 text-foreground transition hover:border-[var(--pc-gold-ink)] hover:text-[var(--pc-gold-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50"
        >
          <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
          Explore markets
        </Link>
      </div>
    </section>
  );
}

function TermChip({
  term,
  onSearch,
  emphasis = false,
}: {
  term: string;
  onSearch: (t: string) => void;
  emphasis?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSearch(term)}
      aria-label={`Search for ${term}`}
      className={
        "pc-res-store inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 py-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50 " +
        (emphasis
          ? "border-[color-mix(in_oklab,var(--brand-gold)_45%,transparent)] bg-[color-mix(in_oklab,var(--brand-gold)_10%,transparent)] font-semibold text-foreground hover:brightness-105"
          : "border-border bg-background text-foreground hover:border-[var(--pc-gold-ink)] hover:text-[var(--pc-gold-ink)]")
      }
    >
      <Search className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
      {term}
    </button>
  );
}
