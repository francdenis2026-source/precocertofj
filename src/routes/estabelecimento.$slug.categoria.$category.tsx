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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

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
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center px-4 text-center">
      <h2 className="text-lg font-semibold">Não foi possível carregar</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {error instanceof Error ? error.message : "Tente novamente."}
      </p>
      <Button className="mt-4" onClick={() => reset()}>Tentar de novo</Button>
    </div>
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
    <div className="flex min-h-[50dvh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
    const term = q.trim().toLowerCase();
    let list = data.products.filter((p) => p.category === categoryLabel);
    if (term) list = list.filter((p) => p.productName.toLowerCase().includes(term));
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
    <div className="min-h-dvh bg-background text-foreground">
      <SiteHeader />
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
            {cheapest && <> · menor preço {brl(cheapest.price)}</>}
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
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            aria-label="Ordenar por"
          >
            {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
              <option key={k} value={k}>{SORT_LABEL[k]}</option>
            ))}
          </select>
        </div>

        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <li key={p.slug}>
              <Card className="h-full">
                <CardContent className="flex h-full flex-col gap-2 p-4">
                  <h3 className="font-medium leading-tight">{p.productName}</h3>
                  <div className="mt-auto flex items-baseline justify-between gap-2 pt-2">
                    <span className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {brl(p.price)}
                    </span>
                    {p.pricePerUnit != null && p.unitLabel && (
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {brl(p.pricePerUnit)} {p.unitLabel.replace("R$", "").trim() || p.unitLabel}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Atualizado {new Date(p.lastDate).toLocaleDateString("pt-BR")}</span>
                    <button
                      type="button"
                      onClick={() => setHistoryFor(p)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-muted"
                    >
                      <History className="h-3 w-3" /> Histórico
                    </button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>

        {items.length === 0 && (
          <div className="mt-10 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhum produto encontrado{q ? ` para "${q}"` : ""} nesta categoria.
          </div>
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
                    <div className="text-sm font-semibold tabular-nums">{brl(h.price)}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(h.captured_at).toLocaleString("pt-BR")}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {h.previous_price != null && (
                      <div className="text-[11px] text-muted-foreground line-through tabular-nums">
                        {brl(h.previous_price)}
                      </div>
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
