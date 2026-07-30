import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Loader2, Search as SearchIcon, Store, X } from "lucide-react";

import { Price } from "@/components/ds/Price";
import { Input } from "@/components/ui/input";
import {
  categoryLabel,
  getCatalogFilterOptions,
  searchCatalogAdvanced,
  type CatalogSearchItem,
} from "@/lib/catalog-search.functions";
import { useRovingFocus } from "@/hooks/use-roving-focus";
import { cn } from "@/lib/utils";


type SortKey = "cheapest" | "priciest" | "recent";

const SORTS: { id: SortKey; label: string }[] = [
  { id: "cheapest", label: "Menor preço" },
  { id: "priciest", label: "Maior preço" },
  { id: "recent", label: "Recentes" },
];

/**
 * Busca do painel do cliente — live (debounce 250ms), com filtro de
 * categoria, ordenação e resultados em lista rolável interna. Sem
 * botão "Buscar": o resultado acompanha a digitação.
 */
export function DashboardSearch() {
  const fetchOptions = useServerFn(getCatalogFilterOptions);
  const searchFn = useServerFn(searchCatalogAdvanced);

  const [input, setInput] = useState("");
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("cheapest");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = setTimeout(() => setTerm(input.trim()), 250);
    return () => clearTimeout(id);
  }, [input]);

  const optionsQ = useQuery({
    queryKey: ["catalog-filter-options"],
    queryFn: () => fetchOptions(),
    staleTime: 30 * 60_000,
  });

  const filters = useMemo(
    () => ({
      q: term,
      category,
      brand: null,
      minPrice: null,
      maxPrice: null,
      sort,
      limit: 40,
    }),
    [term, category, sort],
  );

  const active = term.length >= 2 || !!category;

  const resultsQ = useQuery({
    queryKey: ["app-dashboard-search", filters],
    queryFn: () => searchFn({ data: filters }),
    enabled: active,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const results: CatalogSearchItem[] = resultsQ.data ?? [];
  const categories = (optionsQ.data?.categories ?? []).slice(0, 12);

  return (
    <section
      aria-label="Buscar preços"
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card"
    >
      <div className="shrink-0 space-y-2 border-b border-border/70 p-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <label className="relative min-w-0">
            <span className="sr-only">Buscar produto</span>
            <SearchIcon
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Buscar produto: arroz, café, sabão…"
              className="h-9 pl-9 pr-8 text-[13px]"
              maxLength={80}
              inputMode="search"
              autoComplete="off"
            />
            {input && (
              <button
                type="button"
                aria-label="Limpar busca"
                onClick={() => {
                  setInput("");
                  inputRef.current?.focus();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </label>
          <div
            role="radiogroup"
            aria-label="Ordenar resultados"
            className="flex shrink-0 items-center gap-1"
          >
            {SORTS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={sort === s.id}
                onClick={() => setSort(s.id)}
                {...sortRoving.itemProps(i)}
                className={cn(
                  "h-8 rounded-full border px-2.5 text-[12px] font-semibold transition-colors",
                  sort === s.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/70 bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div
          role="radiogroup"
          aria-label="Filtrar por categoria"
          className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]{display:none}"
        >
          <Chip
            active={!category}
            onClick={() => setCategory(null)}
            {...chipRoving.itemProps(0)}
          >
            Todas
          </Chip>
          {categories.map((c, i) => (
            <Chip
              key={c}
              active={category === c}
              onClick={() => setCategory(category === c ? null : c)}
              {...chipRoving.itemProps(i + 1)}
            >
              {categoryLabel(c)}
            </Chip>
          ))}
        </div>
      </div>


      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        {!active ? (
          <p className="p-6 text-center text-[13px] text-muted-foreground">
            Digite ao menos 2 letras ou escolha uma categoria para ver os preços
            mais recentes dos mercados de Feijó.
          </p>
        ) : resultsQ.isLoading ? (
          <div className="flex items-center gap-2 p-6 text-[13px] text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Buscando…
          </div>
        ) : results.length === 0 ? (
          <p className="p-6 text-center text-[13px] text-muted-foreground">
            Nenhum produto encontrado para esse filtro.
          </p>
        ) : (
          <ul
            role="listbox"
            aria-label="Resultados da busca"
            className="divide-y divide-border/60"
          >
            {results.map((r, i) => (
              <li key={r.catalogId} role="presentation">
                <Link
                  to="/buscar"
                  role="option"
                  aria-selected={false}
                  ref={(el: HTMLAnchorElement | null) => {
                    resultRefs.current[i] = el;
                  }}
                  onKeyDown={(e) => onResultKeyDown(e, i)}
                  search={{ q: r.displayName } as never}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-foreground">
                      {r.displayName}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-[12px] text-muted-foreground">
                      {r.brand && <span className="truncate">{r.brand}</span>}
                      {r.brand && <span aria-hidden>·</span>}
                      <Store className="h-3 w-3 shrink-0" aria-hidden />
                      {r.storesCount}{" "}
                      {r.storesCount === 1 ? "mercado" : "mercados"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Price value={r.minPrice ?? 0} size="sm" />
                    {r.maxPrice != null &&
                      r.minPrice != null &&
                      r.maxPrice > r.minPrice && (
                        <p className="text-[11.5px] text-muted-foreground">
                          até{" "}
                          <Price value={r.maxPrice} size="xs" tone="muted" />
                        </p>
                      )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

      </div>

      {active && results.length > 0 && (
        <div className="shrink-0 border-t border-border/70 px-3 py-1.5 text-[12px] text-muted-foreground">
          {results.length} {results.length === 1 ? "produto" : "produtos"} ·
          preços de registros verificados
        </div>
      )}
    </section>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-7 shrink-0 whitespace-nowrap rounded-full border px-2.5 text-[12px] font-semibold transition-colors",
        active
          ? "border-primary/60 bg-primary/10 text-primary"
          : "border-border/70 bg-background text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
