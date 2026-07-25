import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  History,
  MapPin,
  Phone,
  Search,
  Minus,
  Loader2,
} from "lucide-react";
import { getPublicStoreCatalog, type PublicStoreProduct } from "@/lib/stores-public.functions";
import { getPublicPriceHistory } from "@/lib/store-public-history.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ProductListCard } from "@/components/product/ProductListCard";
import { RatingBadge, PLATFORM_RATING } from "@/components/ds/RatingStars";

import { EmptyState, LoadingGrid, RouteError } from "@/components/feedback";

const STORE_ID = "2de4712e-e767-4cfe-acf0-1ec111a316b8";
const OG_IMAGE =
  "https://precocertofj.lovable.app/__l5e/assets-v1/781eded8-622f-4399-a9c7-9e108082a6ab/recanto-da-carne-logo.png";

const catalogQuery = queryOptions({
  queryKey: ["public-store", STORE_ID],
  queryFn: () => getPublicStoreCatalog({ data: { id: STORE_ID } }),
  staleTime: 60_000,
});

import { PreparoDicas } from "@/components/estabelecimento/PreparoDicas";

export const Route = createFileRoute("/estabelecimento/recanto-da-carne")({
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  head: () => ({
    meta: [
      { title: "Recanto da Carne — Preços de cortes bovinos, sais e temperos | PreçoCerto Feijó" },
      {
        name: "description",
        content:
          "Catálogo público do Açougue Recanto da Carne em Feijó/AC: cortes bovinos, sais parrilha, temperos e molhos com preços atualizados. Busque por produto e ordene pelo menor preço.",
      },
      { property: "og:title", content: "Recanto da Carne — Catálogo público" },
      {
        property: "og:description",
        content:
          "Preços de cortes bovinos, sais e temperos direto do açougue Recanto da Carne em Feijó/AC.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
  }),
  errorComponent: ({ error, reset }) => (
    <RouteError
      title="Não foi possível carregar"
      message={error instanceof Error ? error.message : "Tente novamente em instantes."}
      onRetry={() => reset()}
    />
  ),
  notFoundComponent: () => (
    <div className="p-8 text-center text-sm text-muted-foreground">Estabelecimento não encontrado.</div>
  ),
  pendingComponent: () => (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <LoadingGrid count={6} columns={3} />
    </div>
  ),
  component: RecantoDaCarnePage,
});

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

type SortKey = "price-asc" | "price-desc" | "ppu-asc" | "name" | "recent";
const SORT_LABEL: Record<SortKey, string> = {
  "price-asc": "Menor preço",
  "price-desc": "Maior preço",
  "ppu-asc": "Menor preço por unidade (kg/L)",
  name: "Nome (A → Z)",
  recent: "Atualização recente",
};

function RecantoDaCarnePage() {
  const { data } = useSuspenseQuery(catalogQuery);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("price-asc");
  const [historyFor, setHistoryFor] = useState<PublicStoreProduct | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = data.products.slice();
    if (term) list = list.filter((p) => p.productName.toLowerCase().includes(term));
    switch (sort) {
      case "price-asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "ppu-asc":
        list.sort((a, b) => (a.pricePerUnit ?? Infinity) - (b.pricePerUnit ?? Infinity));
        break;
      case "recent":
        list.sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());
        break;
      case "name":
      default:
        list.sort((a, b) => a.productName.localeCompare(b.productName, "pt-BR"));
    }
    return list;
  }, [data.products, q, sort]);

  const cheapest = useMemo(() => {
    if (!data.products.length) return null;
    return data.products.reduce((min, p) => (p.price < min.price ? p : min), data.products[0]);
  }, [data.products]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-6">
        <Link
          to="/estabelecimentos"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Todos os estabelecimentos
        </Link>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-start gap-4">
            {data.store.logoUrl && (
              <img
                src={data.store.logoUrl}
                alt="Recanto da Carne"
                className="h-20 w-20 rounded-full border border-border object-cover"
              />
            )}
            <div className="flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <CardTitle className="text-2xl">Recanto da Carne</CardTitle>
                <RatingBadge value={PLATFORM_RATING.value} count={PLATFORM_RATING.count} />
              </div>
              <CardDescription className="mt-1 text-[12.5px] leading-snug">
                Açougue · {data.products.length} produto{data.products.length === 1 ? "" : "s"} publicados
              </CardDescription>

              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  R. Epaminondas Martins, nº 172 · Feijó/AC
                </span>
                <a
                  href="tel:+5568999759358"
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  <Phone className="h-3.5 w-3.5" />
                  (68) 99975-9358
                </a>
              </div>
            </div>
          </CardHeader>
          {cheapest && (
            <CardContent className="border-t border-border/60 bg-muted/30 py-3">
              <div className="text-xs text-muted-foreground">Menor preço no momento</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-lg font-semibold">{cheapest.productName}</span>
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {brl(cheapest.price)}
                </span>
              </div>
            </CardContent>
          )}
        </Card>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar produto (ex.: picanha, colorau, sal parrilha)"
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
              <option key={k} value={k}>
                {SORT_LABEL[k]}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 text-xs text-muted-foreground">
          {filtered.length} de {data.products.length} produtos
        </div>

        <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <li key={p.slug}>
              <ProductListCard
                name={p.productName}
                category={p.category}
                price={p.price}
                pricePerUnit={p.pricePerUnit}
                unitLabel={p.unitLabel}
                lastDate={p.lastDate}
                onHistory={() => setHistoryFor(p)}
              />
            </li>
          ))}
        </ul>

        {filtered.length === 0 && (
          <EmptyState
            className="mt-8"
            icon={Search}
            title="Nenhum produto encontrado"
            message={q ? `Nenhum item para "${q}".` : "Ainda não há produtos disponíveis."}
          />
        )}

        <PreparoDicas />
      </main>

      <PriceHistorySheet
        product={historyFor}
        onClose={() => setHistoryFor(null)}
      />

      <SiteFooter />
    </div>
  );
}

function PriceHistorySheet({
  product,
  onClose,
}: {
  product: PublicStoreProduct | null;
  onClose: () => void;
}) {
  const fetchHistory = useServerFn(getPublicPriceHistory);
  const { data: history, isLoading } = useQuery({
    queryKey: ["public-history", STORE_ID, product?.productName ?? ""],
    queryFn: () =>
      fetchHistory({
        data: {
          establishmentId: STORE_ID,
          productName: product!.productName,
          limit: 50,
        },
      }),
    enabled: !!product,
    staleTime: 30_000,
  });

  return (
    <Sheet open={!!product} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{product?.productName ?? "Histórico"}</SheetTitle>
          <SheetDescription>
            Todas as alterações de preço registradas neste estabelecimento, com data e responsável.
          </SheetDescription>
        </SheetHeader>

        {isLoading && (
          <div className="mt-6 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && (!history || history.length === 0) && (
          <p className="mt-6 text-sm text-muted-foreground">
            Nenhuma alteração registrada ainda.
          </p>
        )}

        {!isLoading && history && history.length > 0 && (
          <ol className="mt-6 space-y-3">
            {history.map((h) => {
              const trend =
                h.change_pct == null
                  ? "flat"
                  : h.change_pct > 0.01
                    ? "up"
                    : h.change_pct < -0.01
                      ? "down"
                      : "flat";
              return (
                <li
                  key={h.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold tabular-nums">{brl(h.price)}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(h.captured_at).toLocaleString("pt-BR")}
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {h.source === "edit"
                        ? `Editado por ${h.changed_by_email ?? "administrador"}`
                        : "Registro automático (leitura)"}
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
                        {trend === "down" ? (
                          <ArrowDown className="h-3 w-3" />
                        ) : trend === "up" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <Minus className="h-3 w-3" />
                        )}
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
