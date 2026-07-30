import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  History,
  Search,
  Minus,
  Loader2,
  Store,
} from "lucide-react";
import { getPublicStoreCatalog, type PublicStoreProduct } from "@/lib/stores-public.functions";
import { getPublicPriceHistory } from "@/lib/store-public-history.functions";
import { resolveEstablishmentBySlug } from "@/lib/establishment-slug.functions";
import { normalize } from "@/lib/search-tokens";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { HomeBrandLink } from "@/components/layout/HomeBrandLink";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ProductListCard } from "@/components/product/ProductListCard";
import { EmptyState, LoadingGrid, RouteError } from "@/components/feedback";
import { Price } from "@/components/ds/Price";
import { ShareButton } from "@/components/ds/ShareButton";

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export function slugifyCategory(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type SortKey = "price-asc" | "price-desc" | "ppu-asc" | "name" | "recent";
const SORT_LABEL: Record<SortKey, string> = {
  "price-asc": "Menor preço",
  "price-desc": "Maior preço",
  "ppu-asc": "Menor preço por unidade (kg/L)",
  name: "Nome (A → Z)",
  recent: "Atualização recente",
};

const storeQuery = (id: string) =>
  queryOptions({
    queryKey: ["public-store", id],
    queryFn: () => getPublicStoreCatalog({ data: { id } }),
    staleTime: 60_000,
  });

export const Route = createFileRoute("/estabelecimento/$slug/categoria/$category")({
  loader: async ({ params, context }) => {
    const match = await resolveEstablishmentBySlug({ data: { slug: params.slug } });
    if (!match) throw notFound();
    const data = await context.queryClient.ensureQueryData(storeQuery(match.id));
    const cat = data.categories.find((c) => slugifyCategory(c.label) === params.category);
    if (!cat) throw notFound();
    return { storeId: match.id, categoryLabel: cat.label };
  },
  head: ({ loaderData, params }) => {
    const label = loaderData?.categoryLabel ?? params.category.replace(/-/g, " ");
    const pretty = params.slug
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
    return {
      meta: [
        { title: `${label} em ${pretty} — PreçoCerto Feijó` },
        {
          name: "description",
          content: `Produtos da categoria ${label} em ${pretty}, com ordenação por menor preço e histórico.`,
        },
        { property: "og:title", content: `${label} — ${pretty}` },
        { property: "og:description", content: `Produtos de ${label} em ${pretty}, ordenados pelo menor preço.` },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  errorComponent: ({ error, reset }) => (
    <RouteError
      title="Não foi possível carregar"
      message={error instanceof Error ? error.message : "Tente novamente."}
      onRetry={() => reset()}
    />
  ),
  notFoundComponent: () => (
    <div className="mx-auto flex min-h-[50dvh] max-w-md flex-col items-center justify-center px-4 text-center">
      <Store className="mb-2 h-8 w-8 text-muted-foreground" />
      <h2 className="text-lg font-semibold">Categoria não encontrada</h2>
      <p className="mt-1 text-sm text-muted-foreground">Verifique o link ou volte para o catálogo.</p>
      <Link to="/estabelecimentos" className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> Voltar aos estabelecimentos
      </Link>
    </div>
  ),
  pendingComponent: () => (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <LoadingGrid count={6} columns={3} />
    </div>
  ),
  component: CategoryPage,
});

function CategoryPage() {
  const { storeId, categoryLabel } = Route.useLoaderData();
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(storeQuery(storeId));
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("price-asc");
  const [historyFor, setHistoryFor] = useState<PublicStoreProduct | null>(null);

  const items = useMemo(() => {
    const term = normalize(q);
    let list = data.products.filter((p) => p.category === categoryLabel);
    if (term) {
      list = list.filter((p) => normalize(`${p.productName} ${p.brand ?? ""}`).includes(term));
    }

    switch (sort) {
      case "price-asc": list.sort((a, b) => a.price - b.price); break;
      case "price-desc": list.sort((a, b) => b.price - a.price); break;
      case "ppu-asc": list.sort((a, b) => (a.pricePerUnit ?? Infinity) - (b.pricePerUnit ?? Infinity)); break;
      case "recent": list.sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime()); break;
      case "name":
      default: list.sort((a, b) => a.productName.localeCompare(b.productName, "pt-BR"));
    }
    return list;
  }, [data.products, q, sort, categoryLabel]);

  const cheapest = useMemo(() => {
    const inCat = data.products.filter((p) => p.category === categoryLabel);
    if (!inCat.length) return null;
    return inCat.reduce((min, p) => (p.price < min.price ? p : min), inCat[0]);
  }, [data.products, categoryLabel]);

  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto w-full max-w-6xl px-4 pt-3"><HomeBrandLink /></div>
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-6">
        <Link
          to="/estabelecimento/$slug"
          params={{ slug }}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao catálogo de {data.store.name}
        </Link>

        <header className="mb-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{data.store.name}</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{categoryLabel}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} produto{items.length === 1 ? "" : "s"} nesta categoria
            {cheapest && (
              <> · menor preço <Price value={cheapest.price} size="xs" tone="best" /></>
            )}
          </p>
        </header>

        <nav className="mb-6 flex flex-wrap gap-2" aria-label="Outras categorias">
          {data.categories.map((c) => {
            const isActive = c.label === categoryLabel;
            return (
              <Link
                key={c.key}
                to="/estabelecimento/$slug/categoria/$category"
                params={{ slug, category: slugifyCategory(c.label) }}
                className={
                  isActive
                    ? "inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[12px] font-medium text-primary-foreground"
                    : "inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-[12px] text-foreground hover:bg-muted"
                }
              >
                {c.label} <span className="opacity-70">({c.count})</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Buscar em ${categoryLabel}`}
              className="pl-9"
              inputMode="search"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-10 w-full sm:w-[260px]" aria-label="Ordenar por">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {SORT_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <li key={p.slug}>
              <ProductListCard
                name={p.productName}
                price={p.price}
                pricePerUnit={p.pricePerUnit}
                unitLabel={p.unitLabel}
                lastDate={p.lastDate}
                onHistory={() => setHistoryFor(p)}
              />
            </li>
          ))}
        </ul>

        {items.length === 0 && (
          <EmptyState
            className="mt-8"
            icon={Search}
            title="Nenhum produto encontrado"
            message={q ? `Nenhum item para "${q}" nesta categoria.` : "Nenhum item nesta categoria."}
          />
        )}
      </main>

      <PriceHistorySheet
        storeId={storeId}
        product={historyFor}
        onClose={() => setHistoryFor(null)}
      />

      <SiteFooter />
    </div>
  );
}

function PriceHistorySheet({
  storeId,
  product,
  onClose,
}: {
  storeId: string;
  product: PublicStoreProduct | null;
  onClose: () => void;
}) {
  const fetchHistory = useServerFn(getPublicPriceHistory);
  const { data: history, isLoading } = useQuery({
    queryKey: ["public-history", storeId, product?.productName ?? ""],
    queryFn: () =>
      fetchHistory({
        data: { establishmentId: storeId, productName: product!.productName, limit: 50 },
      }),
    enabled: !!product,
    staleTime: 30_000,
  });

  return (
    <Sheet open={!!product} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{product?.productName ?? "Histórico"}</SheetTitle>
          <SheetDescription>Alterações de preço registradas.</SheetDescription>
        </SheetHeader>

        {isLoading && (
          <div className="mt-6 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && (!history || history.length === 0) && (
          <p className="mt-6 text-sm text-muted-foreground">Nenhuma alteração registrada.</p>
        )}

        {!isLoading && history && history.length > 0 && (
          <ol className="mt-6 space-y-3">
            {history.map((h) => {
              const trend =
                h.change_pct == null ? "flat" : h.change_pct > 0.01 ? "up" : h.change_pct < -0.01 ? "down" : "flat";
              return (
                <li key={h.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                  <div className="min-w-0">
                    <Price as="div" value={h.price} size="sm" />
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(h.captured_at).toLocaleString("pt-BR")}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {h.previous_price != null && (
                      <Price as="div" value={h.previous_price} size="xs" tone="strike" />
                    )}
                    {h.change_pct != null && (
                      <div
                        className={`mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium ${
                          trend === "down"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : trend === "up"
                              ? "text-red-600 dark:text-red-400"
                              : "text-muted-foreground"
                        }`}
                      >
                        {trend === "down" ? <ArrowDown className="h-3 w-3" /> : trend === "up" ? <ArrowUp className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                        {h.change_pct > 0 ? "+" : ""}
                        {h.change_pct.toFixed(1)}%
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </SheetContent>
    </Sheet>
  );
}
