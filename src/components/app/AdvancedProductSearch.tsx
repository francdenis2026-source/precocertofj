import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Filter,
  Loader2,
  Search as SearchIcon,
  SlidersHorizontal,
  Store,
  Tag,
  X,
} from "lucide-react";

import { SectionKicker } from "@/components/dashboard/SectionKicker";
import { ProductImage } from "@/components/ds/ProductImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  categoryLabel,
  getCatalogFilterOptions,
  searchCatalogAdvanced,
  type CatalogSearchItem,
} from "@/lib/catalog-search.functions";
import { cn } from "@/lib/utils";

const fmtBRL = (n: number | null) =>
  n == null
    ? "—"
    : n.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
      });

type SortKey = "cheapest" | "priciest" | "recent";

const SORTS: { id: SortKey; label: string }[] = [
  { id: "cheapest", label: "Menor preço" },
  { id: "priciest", label: "Maior preço" },
  { id: "recent", label: "Mais recentes" },
];

/**
 * Busca avançada de produtos no painel do cliente com filtros por
 * categoria, marca e faixa de preço. Reutiliza o page `/buscar` como
 * destino da linha (mantém consistência com as demais superfícies).
 */
export function AdvancedProductSearch() {
  const fetchOptions = useServerFn(getCatalogFilterOptions);
  const searchFn = useServerFn(searchCatalogAdvanced);

  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [brand, setBrand] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [sort, setSort] = useState<SortKey>("cheapest");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const optionsQ = useQuery({
    queryKey: ["catalog-filter-options"],
    queryFn: () => fetchOptions(),
    staleTime: 30 * 60_000,
  });

  const filters = useMemo(
    () => ({
      q,
      category,
      brand,
      minPrice: minPrice ? Number(minPrice.replace(",", ".")) : null,
      maxPrice: maxPrice ? Number(maxPrice.replace(",", ".")) : null,
      sort,
      limit: 24,
    }),
    [q, category, brand, minPrice, maxPrice, sort],
  );

  const hasFilter =
    q.trim().length > 0 || !!category || !!brand || !!minPrice || !!maxPrice;

  const resultsQ = useQuery({
    queryKey: ["catalog-advanced-search", filters],
    queryFn: () => searchFn({ data: filters }),
    enabled: hasFilter,
    staleTime: 60_000,
  });

  const bounds = optionsQ.data?.priceBounds;
  const results: CatalogSearchItem[] = resultsQ.data ?? [];

  const clearAll = () => {
    setQ("");
    setQInput("");
    setCategory(null);
    setBrand(null);
    setMinPrice("");
    setMaxPrice("");
    setSort("cheapest");
  };

  const activeChips = [
    category
      ? {
          k: "cat",
          label: categoryLabel(category),
          onClear: () => setCategory(null),
        }
      : null,
    brand ? { k: "brand", label: brand, onClear: () => setBrand(null) } : null,
    minPrice
      ? {
          k: "min",
          label: `A partir de ${fmtBRL(Number(minPrice.replace(",", ".")))}`,
          onClear: () => setMinPrice(""),
        }
      : null,
    maxPrice
      ? {
          k: "max",
          label: `Até ${fmtBRL(Number(maxPrice.replace(",", ".")))}`,
          onClear: () => setMaxPrice(""),
        }
      : null,
  ].filter(Boolean) as { k: string; label: string; onClear: () => void }[];

  return (
    <section aria-label="Busca avançada de produtos" className="space-y-3">
      <SectionKicker eyebrow="Busca avançada" title="Encontre produtos rapidamente" />

      <div className="space-y-3 rounded-2xl border border-border/60 bg-card p-3 md:p-4">
        {/* Search + toggle filters */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setQ(qInput.trim());
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <label className="relative flex-1 min-w-[220px]">
            <span className="sr-only">Nome do produto</span>
            <SearchIcon
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Ex: arroz, café, sabão…"
              className="h-10 pl-9"
              maxLength={80}
              inputMode="search"
              autoComplete="off"
            />
          </label>

          <Button type="submit" size="sm" className="h-10 gap-1">
            <SearchIcon className="h-4 w-4" aria-hidden="true" />
            Buscar
          </Button>

          <Button
            type="button"
            variant={filtersOpen ? "default" : "outline"}
            size="sm"
            className="h-10 gap-1"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            aria-controls="advanced-filters"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filtros
            {activeChips.length > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-foreground/20 px-1.5 text-[11px] font-bold">
                {activeChips.length}
              </span>
            )}
          </Button>
        </form>

        {/* Filters panel */}
        {filtersOpen && (
          <div
            id="advanced-filters"
            className="grid gap-3 rounded-xl border border-dashed border-border/60 bg-muted/30 p-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Categoria
              </label>
              <Select
                value={category ?? "__all"}
                onValueChange={(v) => setCategory(v === "__all" ? null : v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Todas categorias</SelectItem>
                  {(optionsQ.data?.categories ?? []).map((c) => (
                    <SelectItem key={c} value={c}>
                      {categoryLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Marca
              </label>
              <Select
                value={brand ?? "__all"}
                onValueChange={(v) => setBrand(v === "__all" ? null : v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="__all">Todas marcas</SelectItem>
                  {(optionsQ.data?.brands ?? []).map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="min-price"
                className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Preço mínimo
                {bounds && (
                  <span className="ml-1 font-normal normal-case text-muted-foreground/70">
                    (a partir de {fmtBRL(bounds.min)})
                  </span>
                )}
              </label>
              <Input
                id="min-price"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value.replace(/[^\d,.]/g, ""))}
                placeholder="0,00"
                inputMode="decimal"
                className="h-9"
                maxLength={10}
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="max-price"
                className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Preço máximo
                {bounds && (
                  <span className="ml-1 font-normal normal-case text-muted-foreground/70">
                    (até {fmtBRL(bounds.max)})
                  </span>
                )}
              </label>
              <Input
                id="max-price"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value.replace(/[^\d,.]/g, ""))}
                placeholder="0,00"
                inputMode="decimal"
                className="h-9"
                maxLength={10}
              />
            </div>

            <div className="space-y-1 sm:col-span-2 lg:col-span-4">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Ordenar por
              </label>
              <div className="flex flex-wrap gap-1.5">
                {SORTS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSort(s.id)}
                    className={cn(
                      "h-8 rounded-full border px-3 text-xs font-semibold transition-colors",
                      sort === s.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/60 bg-background hover:bg-muted",
                    )}
                    aria-pressed={sort === s.id}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Active chips */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
              <Filter className="h-3 w-3" aria-hidden="true" /> Filtros ativos:
            </span>
            {activeChips.map((c) => (
              <button
                key={c.k}
                type="button"
                onClick={c.onClear}
                className="inline-flex h-6 items-center gap-1 rounded-full border border-border/60 bg-muted px-2 text-[11px] hover:bg-muted/70"
              >
                {c.label}
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            ))}
            <button
              type="button"
              onClick={clearAll}
              className="h-6 rounded-full border border-transparent px-2 text-[11px] font-semibold text-primary hover:underline"
            >
              Limpar tudo
            </button>
          </div>
        )}

        {/* Results */}
        {!hasFilter ? (
          <p className="rounded-xl bg-muted/40 p-4 text-center text-xs text-muted-foreground md:text-sm">
            Digite um termo ou selecione um filtro para ver produtos.
          </p>
        ) : resultsQ.isLoading ? (
          <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Buscando produtos…
          </div>
        ) : results.length === 0 ? (
          <p className="rounded-xl bg-muted/40 p-4 text-center text-xs text-muted-foreground md:text-sm">
            Nenhum produto encontrado com esses filtros. Tente ampliar a faixa de preço ou remover a marca.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((p) => (
              <li key={p.catalogId}>
                <Link
                  to="/buscar"
                  search={{ q: p.displayName, mode: "strict", pure: "1" }}
                  className="group flex h-full items-center gap-3 rounded-xl border border-border/60 bg-background p-2.5 transition-all hover:border-primary/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                    <ProductImage
                      src={p.imageUrl}
                      alt=""
                      name={p.displayName}
                      brand={p.brand}
                      className="h-full w-full"
                      size="sm"
                    />

                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-xs font-semibold text-foreground md:text-sm">
                      {p.displayName}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                      {p.brand && (
                        <span className="inline-flex items-center gap-0.5">
                          <Tag className="h-2.5 w-2.5" aria-hidden="true" />
                          {p.brand}
                        </span>
                      )}
                      {p.category && (
                        <span className="rounded-full bg-muted px-1.5 py-0.5">
                          {categoryLabel(p.category)}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-baseline justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          A partir de
                        </span>
                        <p className="pc-price text-base font-bold text-foreground md:text-lg">
                          {fmtBRL(p.minPrice)}
                        </p>
                      </div>
                      {p.storesCount > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
                          <Store className="h-2.5 w-2.5" aria-hidden="true" />
                          {p.storesCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
