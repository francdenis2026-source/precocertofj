import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Search as SearchIcon, Store, X } from "lucide-react";

import { Price } from "@/components/ds/Price";
import { ProductCompareSheet } from "@/components/app/ProductCompareSheet";
import { Input } from "@/components/ui/input";
import {
  categoryLabel,
  getCatalogFilterOptions,
  searchCatalogAdvanced,
  type CatalogSearchItem,
} from "@/lib/catalog-search.functions";
import { useLocalStorageState } from "@/hooks/use-local-storage";
import { useRovingFocus } from "@/hooks/use-roving-focus";
import { useHotkeys } from "@/hooks/use-hotkeys";

import { cn } from "@/lib/utils";
import { tc } from "@/lib/typeclear";

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
  // Filtros persistidos: sobrevivem a recarregamentos e trocas de rota.
  const [category, setCategory] = useLocalStorageState<string | null>(
    "app:dashboard-search:category",
    null,
    { validate: (v): v is string | null => v === null || typeof v === "string" },
  );
  const [sort, setSort] = useLocalStorageState<SortKey>(
    "app:dashboard-search:sort",
    "cheapest",
    { validate: (v): v is SortKey => SORTS.some((s) => s.id === v) },
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const [compareKey, setCompareKey] = useState<string | null>(null);

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

  // Foco itinerante nos chips (categorias) e na ordenação.
  const chipIndex = category ? categories.indexOf(category) + 1 : 0;
  const chipRoving = useRovingFocus(categories.length + 1, chipIndex, (i) =>
    setCategory(i === 0 ? null : (categories[i - 1] ?? null)),
  );
  const sortRoving = useRovingFocus(
    SORTS.length,
    SORTS.findIndex((s) => s.id === sort),
    (i) => setSort(SORTS[i].id),
  );

  // Navegação teclado entre campo de busca e lista de resultados.
  const resultRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusResult = (i: number) => {
    if (results.length === 0) return;
    const next = (i + results.length) % results.length;
    resultRefs.current[next]?.focus();
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && results.length > 0) {
      e.preventDefault();
      focusResult(0);
    } else if (e.key === "Escape" && input) {
      e.preventDefault();
      setInput("");
    }
  };

  const onResultKeyDown = (e: React.KeyboardEvent, i: number) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        focusResult(i + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        if (i === 0) inputRef.current?.focus();
        else focusResult(i - 1);
        break;
      case "Home":
        e.preventDefault();
        focusResult(0);
        break;
      case "End":
        e.preventDefault();
        focusResult(results.length - 1);
        break;
      case "Escape":
        e.preventDefault();
        inputRef.current?.focus();
        break;
      default:
    }
  };

  // Atalhos de teclado do painel de busca.
  useHotkeys({
    "alt+b": () => inputRef.current?.focus(),
    "/": () => inputRef.current?.focus(),
    "alt+o": () => {
      const i = SORTS.findIndex((s) => s.id === sort);
      setSort(SORTS[(i + 1) % SORTS.length].id);
    },
    "alt+l": () => {
      setCategory(null);
      setInput("");
    },
    escape: () => {
      if (compareKey) setCompareKey(null);
    },
  });

  return (
    <section
      aria-label="Buscar preços"
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/70 bg-card/94 shadow-sm backdrop-blur-md"
    >
      <div className="shrink-0 space-y-2 border-b border-border/70 p-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <div className="min-w-0">
            <h2 className={cn(tc.panelTitle, "truncate")}>Buscar produtos e preços</h2>
            <p className={cn(tc.panelNote, "truncate")}>Menores preços dos mercados de Feijó</p>
          </div>
          <kbd
            className="hidden shrink-0 rounded border border-border/70 bg-muted/60 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground sm:inline-block"
            title="Atalhos: Alt+B busca · Alt+O ordena · Alt+L limpa"
          >
            Alt + B
          </kbd>
        </div>

        <label className="relative block min-w-0">
          <span className="sr-only">Buscar produto</span>
          <SearchIcon
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Buscar produto: arroz, café, sabão…"
            className={cn(
              tc.body,
              "h-12 w-full rounded-lg border-border/80 bg-background/90 pl-10 pr-10 text-[15px] shadow-sm transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            )}
            maxLength={80}
            inputMode="search"
            autoComplete="off"
            onKeyDown={onInputKeyDown}
            role="combobox"
            aria-expanded={active && results.length > 0}
            aria-controls="dashboard-search-results"
            aria-describedby="dashboard-search-help"
          />

          {input && (
            <button
              type="button"
              aria-label="Limpar busca"
              onClick={() => {
                setInput("");
                inputRef.current?.focus();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </label>

        <div className="flex items-center gap-2">
          <div
            role="radiogroup"
            aria-label="Filtrar por categoria"
            className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]{display:none}"
          >
            <Chip active={!category} onClick={() => setCategory(null)} {...chipRoving.itemProps(0)}>
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

          <div
            role="radiogroup"
            aria-label="Ordenar resultados"
            className="flex shrink-0 items-center gap-1 border-l border-border/60 pl-2"
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
                  tc.filter,
                  "h-8 rounded-md border px-2.5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                  sort === s.id
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border/70 bg-background text-muted-foreground hover:border-primary/50 hover:bg-primary/10 hover:text-primary",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

      </div>

      <p id="dashboard-search-help" className="sr-only">
        Use seta para baixo para entrar na lista de resultados, setas para navegar, Enter para abrir
        e Esc para voltar ao campo de busca. Alt mais B foca a busca, Alt mais O troca a ordenação e
        Alt mais L limpa os filtros.
      </p>

      {/* Cabeçalho de colunas: produto (relevância) · mercados · menor preço */}
      {active && results.length > 0 && (
        <div
          aria-hidden
          className={cn(
            tc.tableHead,
            "pc-cols-search shrink-0 border-b border-border/60 bg-muted/30 px-3 py-1",
          )}
        >
          <span className="truncate">Produto</span>
          <span data-col="stores" className="text-center">
            Mercados
          </span>
          <span className="text-right">Menor preço</span>
        </div>
      )}


      <div
        className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]"
        aria-live="polite"
        aria-busy={resultsQ.isLoading}
      >
        {!active ? (
          <p className={cn(tc.meta, "p-6 text-center")}>
            Digite ao menos 2 letras ou escolha uma categoria para ver os preços mais recentes dos
            mercados de Feijó.
          </p>
        ) : resultsQ.isLoading ? (
          <ul className="space-y-2 p-3" aria-label="Buscando produtos">
            {Array.from({ length: 6 }).map((_, i) => (
              <li
                key={i}
                className="h-12 animate-pulse rounded-md border border-border/60 bg-muted/50"
                style={{ opacity: 1 - i * 0.1 }}
              />
            ))}
          </ul>
        ) : resultsQ.isError ? (
          <div className="p-6 text-center">
            <p className={tc.meta}>Não conseguimos buscar agora.</p>
            <button
              type="button"
              onClick={() => resultsQ.refetch()}
              className={cn(
                tc.control,
                "mt-2 h-9 rounded-md border border-border px-3 hover:bg-muted",
              )}
            >
              Tentar novamente
            </button>
          </div>
        ) : results.length === 0 ? (
          <p className={cn(tc.meta, "p-6 text-center")}>
            Nenhum produto encontrado para esse filtro.
          </p>
        ) : (
          <ul
            role="listbox"
            id="dashboard-search-results"
            aria-label="Resultados da busca"
            className="divide-y divide-border/60"
          >
            {results.map((r, i) => (
              <li key={r.catalogId} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  ref={(el: HTMLButtonElement | null) => {
                    resultRefs.current[i] = el;
                  }}
                  onKeyDown={(e) => onResultKeyDown(e, i)}
                  onClick={() => setCompareKey(r.displayName)}
                  className="pc-cols-search w-full px-3 py-1.5 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50"
                >
                  <span className="min-w-0">
                    <span className={cn(tc.itemTitle, "block truncate")}>{r.displayName}</span>
                    <span className={cn(tc.metaMuted, "block truncate")}>
                      {r.brand ? r.brand : categoryLabel(r.category ?? "")}
                    </span>
                  </span>
                  <span
                    data-col="stores"
                    className={cn(tc.num, "flex items-center justify-center gap-1 text-muted-foreground")}
                    title={`${r.storesCount} ${r.storesCount === 1 ? "mercado" : "mercados"}`}
                  >
                    <Store className="h-3 w-3 shrink-0" aria-hidden />
                    {r.storesCount}
                  </span>
                  <span className="text-right">
                    <Price value={r.minPrice ?? 0} size="sm" />
                    {r.maxPrice != null && r.minPrice != null && r.maxPrice > r.minPrice && (
                      <span className={cn(tc.metaMuted, "block")}>
                        até <Price value={r.maxPrice} size="xs" tone="muted" />
                      </span>
                    )}
                  </span>
                </button>

              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        className={cn(
          tc.metaMuted,
          "flex shrink-0 items-center justify-between gap-2 border-t border-border/70 px-3 py-2",
        )}
      >
        <span className="truncate">
          {active && results.length > 0
            ? `${results.length} ${results.length === 1 ? "produto" : "produtos"} · preços verificados`
            : "Toque em um produto para comparar entre mercados"}
        </span>
        <Link
          to="/app/produtos"
          className={cn(
            tc.filter,
            "shrink-0 rounded-md border border-border px-2.5 py-1 text-primary",
          )}
        >
          Ver todos
        </Link>
      </div>

      <ProductCompareSheet productKey={compareKey} onClose={() => setCompareKey(null)} />
    </section>
  );
}

function Chip({
  active,
  onClick,
  children,
  ...rest
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "children"> & {
    ref?: React.Ref<HTMLButtonElement>;
  }) {
  return (
    <button
      type="button"
      role="radio"
      onClick={onClick}
      aria-checked={active}
      {...rest}
      className={cn(
        tc.filter,
        "group relative h-8 shrink-0 whitespace-nowrap rounded-full border px-3 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border/70 bg-background text-muted-foreground hover:-translate-y-px hover:border-primary/60 hover:bg-primary/10 hover:text-primary hover:shadow-sm",
      )}
    >
      {children}
    </button>
  );
}
