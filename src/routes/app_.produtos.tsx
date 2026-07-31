import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, BarChart3, Search as SearchIcon, Store, X } from "lucide-react";

import { AppShell } from "@/components/brand/AppShell";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { PriceDropAlertToggle } from "@/components/app/PriceDropAlertToggle";
import { ProductCompareSheet } from "@/components/app/ProductCompareSheet";
import { Input } from "@/components/ui/input";
import { Price } from "@/components/ds/Price";
import {
  categoryLabel,
  getCatalogFilterOptions,
  searchCatalogAdvanced,
  type CatalogSearchItem,
} from "@/lib/catalog-search.functions";
import { cn } from "@/lib/utils";
import { tc } from "@/lib/typeclear";

type SortKey = "cheapest" | "priciest" | "recent";
const SORTS: { id: SortKey; label: string }[] = [
  { id: "cheapest", label: "Menor preço" },
  { id: "priciest", label: "Maior preço" },
  { id: "recent", label: "Recentes" },
];

export const Route = createFileRoute("/app_/produtos")({
  head: () => ({
    meta: [
      { title: "Produtos e preços — PreçoCerto Feijó" },
      {
        name: "description",
        content:
          "Lista completa de produtos do PreçoCerto: filtre por categoria, ordene por preço e compare o valor entre os estabelecimentos de Feijó.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Produtos e preços — PreçoCerto Feijó" },
      {
        property: "og:description",
        content: "Veja a lista completa de produtos e compare preços entre os mercados de Feijó.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <ProtectedGate>
      <ProductsPage />
    </ProtectedGate>
  ),
});

function ProductsPage() {
  const fetchOptions = useServerFn(getCatalogFilterOptions);
  const searchFn = useServerFn(searchCatalogAdvanced);

  const [input, setInput] = useState("");
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("cheapest");
  const [limit, setLimit] = useState(24);
  const [compareKey, setCompareKey] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setTerm(input.trim()), 250);
    return () => clearTimeout(id);
  }, [input]);

  useEffect(() => setLimit(24), [term, category, sort]);

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
      limit,
    }),
    [term, category, sort, limit],
  );

  const resultsQ = useQuery({
    queryKey: ["app-products-page", filters],
    queryFn: () => searchFn({ data: filters }),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const results: CatalogSearchItem[] = resultsQ.data ?? [];
  const categories = optionsQ.data?.categories ?? [];
  const showSkeleton = resultsQ.isLoading || (resultsQ.isFetching && results.length === 0);

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 px-4 py-4 md:px-6 md:py-5">
        <header className="rounded-xl border border-border/70 bg-card/94 px-4 py-3.5 shadow-sm backdrop-blur-md">
          <Link
            to="/app"
            className={cn(tc.metaMuted, "inline-flex items-center gap-1 hover:text-foreground")}
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Voltar ao painel
          </Link>
          <h1 className={cn(tc.h1, "mt-1")}>Produtos e preços</h1>
          <p className={cn(tc.sectionNote, "mt-0.5")}>
            Toque em um produto para comparar o preço entre os estabelecimentos de Feijó.
          </p>
        </header>

        {/* Filtros */}
        <section
          aria-label="Filtros de produtos"
          className="space-y-1.5 rounded-lg border border-border/70 bg-card/94 p-2 shadow-sm backdrop-blur-md"
        >
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <label className="relative min-w-0">
              <span className="sr-only">Buscar produto</span>
              <SearchIcon
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Buscar produto: arroz, café, sabão…"
                className={cn(tc.body, "h-9 rounded-md bg-background/80 pl-9 pr-8")}
                maxLength={80}
                inputMode="search"
                autoComplete="off"
              />
              {input && (
                <button
                  type="button"
                  aria-label="Limpar busca"
                  onClick={() => setInput("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </label>
            <div
              role="radiogroup"
              aria-label="Ordenar resultados"
              className="flex shrink-0 flex-wrap items-center gap-1"
            >
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={sort === s.id}
                  onClick={() => setSort(s.id)}
                  className={cn(
                    tc.control,
                    "h-8 rounded-md border px-2.5 transition-colors",
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
            className="flex gap-1.5 overflow-x-auto pb-0.5"
          >
            <Chip active={!category} onClick={() => setCategory(null)}>
              Todas
            </Chip>
            {categories.map((c) => (
              <Chip
                key={c}
                active={category === c}
                onClick={() => setCategory(category === c ? null : c)}
              >
                {categoryLabel(c)}
              </Chip>
            ))}
          </div>
        </section>

        {/* Resultados */}
        <section aria-live="polite" aria-busy={resultsQ.isFetching}>
          {showSkeleton ? (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 9 }).map((_, i) => (
                <li
                  key={i}
                  className="h-[72px] animate-pulse rounded-lg border border-border/60 bg-card/70"
                  style={{ opacity: 1 - i * 0.05 }}
                />
              ))}
            </ul>
          ) : resultsQ.isError ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-center">
              <p className={tc.body}>Não conseguimos carregar os produtos agora.</p>
              <button
                type="button"
                onClick={() => resultsQ.refetch()}
                className={cn(
                  tc.control,
                  "mt-3 h-9 rounded-md border border-border px-3 hover:bg-muted",
                )}
              >
                Tentar novamente
              </button>
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-lg border border-border/70 bg-card/94 p-5 text-center backdrop-blur-md">
              <SearchIcon className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden />
              <p className={cn(tc.itemTitle, "mt-2")}>Nenhum produto encontrado</p>
              <p className={cn(tc.meta, "mt-1")}>
                {term
                  ? `Nada para “${term}”. Tente outro termo ou remova o filtro de categoria.`
                  : "Ajuste os filtros para ver os produtos disponíveis."}
              </p>
            </div>
          ) : (
            <>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {results.map((r) => (
                  <li key={r.catalogId} className="relative">
                    <button
                      type="button"
                      onClick={() => setCompareKey(r.displayName)}
                      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border/70 bg-card/94 px-4 py-3 pb-8 text-left shadow-sm backdrop-blur-md transition-colors hover:border-primary/40 hover:bg-muted/40"
                    >
                      <span className="min-w-0">
                        <span className={cn(tc.itemTitle, "block truncate")}>{r.displayName}</span>
                        <span
                          className={cn(tc.metaMuted, "mt-0.5 flex items-center gap-1.5 truncate")}
                        >
                          {r.brand && <span className="truncate">{r.brand}</span>}
                          {r.brand && <span aria-hidden>·</span>}
                          <Store className="h-3 w-3 shrink-0" aria-hidden />
                          {r.storesCount} {r.storesCount === 1 ? "mercado" : "mercados"}
                        </span>
                        <span
                          className={cn(
                            tc.metaMuted,
                            "mt-0.5 inline-flex items-center gap-1 text-primary",
                          )}
                        >
                          <BarChart3 className="h-3 w-3" aria-hidden /> Comparar preços
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <Price value={r.minPrice} size="md" tone="best" />
                        {r.maxPrice != null && r.minPrice != null && r.maxPrice > r.minPrice && (
                          <span className={cn(tc.metaMuted, "block")}>
                            até {r.maxPrice.toFixed(2).replace(".", ",")}
                          </span>
                        )}
                      </span>
                    </button>
                    <PriceDropAlertToggle
                      variant="chip"
                      className="absolute bottom-2 left-3"
                      productName={r.displayName}
                      targetPrice={r.minPrice}
                    />
                  </li>
                ))}
              </ul>

              {results.length >= limit && limit < 60 && (
                <div className="mt-3 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setLimit((n) => Math.min(60, n + 24))}
                    disabled={resultsQ.isFetching}
                    className={cn(
                      tc.control,
                      "h-9 rounded-md border border-border px-4 transition-colors hover:bg-muted disabled:opacity-60",
                    )}
                  >
                    {resultsQ.isFetching ? "Carregando…" : "Ver mais produtos"}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <ProductCompareSheet productKey={compareKey} onClose={() => setCompareKey(null)} />
    </AppShell>
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
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        tc.chip,
        "h-7 shrink-0 rounded-full border px-2.5 transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border/70 bg-background text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
