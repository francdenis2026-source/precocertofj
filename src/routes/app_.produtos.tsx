import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, BarChart3, Search as SearchIcon, Store, X, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";

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
      <div className="mx-auto max-w-6xl px-4 md:px-6 pb-20">
        <PageHeader
          title="Produtos e preços"
          description="Toque em um produto para comparar o preço entre os estabelecimentos de Feijó."
          breadcrumbs={[{ label: "Painel", to: "/app" }, { label: "Produtos" }]}
          actions={
             <div className="flex shrink-0 flex-wrap items-center gap-1">
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={sort === s.id}
                  onClick={() => setSort(s.id)}
                  className={cn(
                    "h-8 rounded-lg border px-3 text-[10px] font-black uppercase tracking-wider transition-all",
                    sort === s.id
                      ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-[var(--pc-brand-navy)]"
                      : "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          }
        />

        {/* Filtros */}
        <div className="mb-8 space-y-4">
          <div className="relative w-full">
            <SearchIcon
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Buscar produto: arroz, café, sabão…"
              className="h-12 rounded-2xl bg-[var(--bg-surface)] pl-10 pr-10 shadow-sm border-[var(--border-subtle)] focus:border-[var(--brand-primary)]/50"
              maxLength={80}
              inputMode="search"
              autoComplete="off"
            />
            {input && (
              <button
                type="button"
                aria-label="Limpar busca"
                onClick={() => setInput("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div
            role="radiogroup"
            aria-label="Filtrar por categoria"
            className="flex gap-2 overflow-x-auto pb-2 no-scrollbar"
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
        </div>

        {/* Resultados */}
        <section aria-live="polite" aria-busy={resultsQ.isFetching}>
          {showSkeleton ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
                />
              ))}
            </div>
          ) : resultsQ.isError ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center">
              <p className="text-sm font-medium">Não conseguimos carregar os produtos agora.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => resultsQ.refetch()}
                className="mt-4 rounded-xl"
              >
                Tentar novamente
              </Button>
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-[var(--bg-surface)] p-12 text-center">
              <SearchIcon className="mx-auto h-8 w-8 text-muted-foreground opacity-20" aria-hidden />
              <p className="mt-4 text-sm font-bold text-foreground">Nenhum produto encontrado</p>
              <p className="text-xs text-muted-foreground">
                {term
                  ? `Nada para “${term}”. Tente outro termo ou remova o filtro de categoria.`
                  : "Ajuste os filtros para ver os produtos disponíveis."}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((r) => (
                  <div key={r.catalogId} className="relative group">
                    <button
                      type="button"
                      onClick={() => setCompareKey(r.displayName)}
                      className="pc-card w-full flex flex-col items-start gap-3 p-5 pb-12"
                    >
                      <div className="flex w-full items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-display text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors">
                            {r.displayName}
                          </h3>
                          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                            {r.brand && <span className="truncate">{r.brand}</span>}
                            {r.brand && <span aria-hidden>·</span>}
                            <Store className="h-3 w-3 shrink-0" aria-hidden />
                            {r.storesCount} {r.storesCount === 1 ? "mercado" : "mercados"}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <Price value={r.minPrice} size="lg" tone="best" />
                          {r.maxPrice != null && r.minPrice != null && r.maxPrice > r.minPrice && (
                            <span className="mt-0.5 block text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                              até R$ {r.maxPrice.toFixed(2).replace(".", ",")}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 flex w-full items-center justify-between border-t border-border/40 pt-4">
                        <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[var(--brand-primary)]">
                          <BarChart3 className="h-3 w-3" aria-hidden /> Comparar preços
                        </span>
                        <ArrowRight className="h-4 w-4 text-[var(--brand-primary)] transition-transform group-hover:translate-x-1" />
                      </div>
                    </button>
                    <PriceDropAlertToggle
                      variant="chip"
                      className="absolute bottom-4 left-5"
                      productName={r.displayName}
                      targetPrice={r.minPrice}
                    />
                  </div>
                ))}
              </div>

              {results.length >= limit && limit < 60 && (
                <div className="mt-8 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setLimit((n) => Math.min(60, n + 24))}
                    disabled={resultsQ.isFetching}
                    className="rounded-xl px-8"
                  >
                    {resultsQ.isFetching ? "Carregando…" : "Ver mais produtos"}
                  </Button>
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
