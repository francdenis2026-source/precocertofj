import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, PackageSearch, Search, Store, TrendingDown } from "lucide-react";

import {
  getWhereToBuyRegions,
  searchWhereToBuy,
  type WhereToBuyProduct,
  type WhereToBuyRegions,
} from "@/lib/where-to-buy.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IsolatedPage } from "@/components/layout/IsolatedPage";
import { EmptyState } from "@/components/layout/EmptyState";
import { FadeSwap, LocationsSkeleton } from "@/components/layout/LoadingSkeleton";
import { BackButton } from "@/components/layout/BackButton";
import { HomeBrandLink } from "@/components/layout/HomeBrandLink";
import { tc } from "@/lib/typeclear";
import { cn } from "@/lib/utils";
import { usePerceivedPerfTelemetry } from "@/lib/perf-telemetry";

export const Route = createFileRoute("/onde-comprar")({
  head: () => ({
    meta: [
      { title: "Onde comprar mais barato — PreçoCerto" },
      {
        name: "description",
        content:
          "Compare o preço de cada produto entre os mercados parceiros e descubra onde comprar mais barato no seu bairro ou cidade.",
      },
      { property: "og:title", content: "Onde comprar mais barato — PreçoCerto" },
      {
        property: "og:description",
        content: "Comparação de preços por produto e por bairro/cidade nos mercados parceiros.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OndeComprarPage,
});

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

function OndeComprarPage() {
  const fetchRegions = useServerFn(getWhereToBuyRegions);
  const fetchProducts = useServerFn(searchWhereToBuy);

  const [term, setTerm] = useState("");
  const [query, setQuery] = useState("");
  const [city, setCity] = useState<string | null>(null);
  const [neighborhood, setNeighborhood] = useState<string | null>(null);

  const regionsQ = useQuery({
    queryKey: ["where-to-buy-regions"],
    queryFn: () => fetchRegions() as Promise<WhereToBuyRegions>,
    staleTime: 10 * 60_000,
  });

  const productsQ = useQuery({
    queryKey: ["where-to-buy", query, city, neighborhood],
    queryFn: () =>
      fetchProducts({ data: { q: query, city, neighborhood } }) as Promise<WhereToBuyProduct[]>,
    staleTime: 60_000,
  });

  const hoods = useMemo(() => {
    const list = regionsQ.data?.neighborhoods ?? [];
    return city ? list.filter((h) => h.city === city) : list;
  }, [regionsQ.data, city]);

  const products = productsQ.data ?? [];

  const stateKey = productsQ.isLoading ? "loading" : products.length === 0 ? "empty" : "ready";

  usePerceivedPerfTelemetry({
    route: "/onde-comprar",
    isLoading: productsQ.isLoading,
    isReady: !productsQ.isLoading && products.length > 0,
    count: products.length,
  });

  return (
    <IsolatedPage className="bg-background">
      <header className="border-b border-border/60 bg-card/60">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <BackButton />
          <HomeBrandLink />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-4">
        <h1 className={cn(tc.h1, "mb-1")}>
          Onde comprar mais barato
        </h1>
        <p className={cn(tc.meta, "mb-3")}>
          Compare o preço de cada produto entre os mercados parceiros e filtre por bairro ou cidade.
        </p>

        {/* Filtros */}
        <form
          className="mb-3 space-y-2 rounded-xl border border-border/70 bg-card p-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(term.trim());
          }}
        >
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Buscar produto (ex.: arroz, café, leite)"
                className="h-9 pl-8"
                aria-label="Buscar produto"
              />
            </div>
            <Button type="submit" className="h-9 shrink-0 px-4">
              Comparar
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn(tc.meta, "inline-flex items-center gap-1 font-semibold")}>
              <MapPin className="h-3.5 w-3.5" /> Cidade
            </span>
            <Button
              type="button"
              size="sm"
              variant={city === null ? "default" : "outline"}
              className="h-7 px-2.5"
              onClick={() => {
                setCity(null);
                setNeighborhood(null);
              }}
            >
              Todas
            </Button>
            {(regionsQ.data?.cities ?? []).map((c) => (
              <Button
                key={c}
                type="button"
                size="sm"
                variant={city === c ? "default" : "outline"}
                className="h-7 px-2.5"
                onClick={() => {
                  setCity(c);
                  setNeighborhood(null);
                }}
              >
                {c}
              </Button>
            ))}
          </div>

          {hoods.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={cn(tc.meta, "font-semibold")}>Bairro</span>
              <Button
                type="button"
                size="sm"
                variant={neighborhood === null ? "default" : "outline"}
                className="h-7 px-2.5"
                onClick={() => setNeighborhood(null)}
              >
                Todos
              </Button>
              {hoods.map((h) => (
                <Button
                  key={h.name}
                  type="button"
                  size="sm"
                  variant={neighborhood === h.name ? "default" : "outline"}
                  className="h-7 px-2.5"
                  onClick={() => setNeighborhood(h.name)}
                >
                  {h.name}
                </Button>
              ))}
            </div>
          )}
        </form>

        {/* Resultados */}
        <FadeSwap showKey={stateKey}>
          {productsQ.isLoading ? (
            <LocationsSkeleton rows={4} />
          ) : products.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title={
                query
                  ? "Nenhum produto encontrado com esses filtros"
                  : "Comece pela busca por um produto"
              }
              description={
                <>
                  Tente termos curtos (ex.: <span className="font-medium text-foreground">arroz</span>,{" "}
                  <span className="font-medium text-foreground">café</span>,{" "}
                  <span className="font-medium text-foreground">leite</span>) e limpe filtros de cidade/bairro.
                  Não achou? Sugira o preço que você viu na prateleira — a base cresce com colaboração.
                </>
              }
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button asChild size="sm" variant="default">
                    <Link to="/colaborar">Sugerir/registrar preço</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/buscar">Abrir busca completa</Link>
                  </Button>
                </div>
              }
            />
          ) : (
            <ul className="space-y-2">
              {products.map((p) => (
                <li key={p.productKey} className="rounded-xl border border-border/70 bg-card p-2.5">
                  <div className="mb-1.5 flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/onde-comprar/$produto"
                        params={{ produto: encodeURIComponent(p.productKey) }}
                        className={cn(tc.itemTitle, "block truncate hover:underline")}
                      >
                        {p.productName}
                      </Link>
                      <p className={cn(tc.meta)}>
                        {p.storeCount} {p.storeCount === 1 ? "loja" : "lojas"} • média {brl(p.avgPrice)}
                      </p>
                    </div>
                    {p.savingsPct > 0 && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11.5px] font-semibold text-emerald-600">
                        <TrendingDown className="h-3 w-3" /> economize {p.savingsPct}%
                      </span>
                    )}
                  </div>
                  <ul className="grid gap-1 sm:grid-cols-2">
                    {p.offers.map((o, i) => (
                      <li
                        key={`${p.productKey}-${o.establishmentId ?? i}`}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-2 py-1.5",
                          o.isCheapest ? "border-emerald-500/50 bg-emerald-500/5" : "border-border/60",
                        )}
                      >
                        <Store className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1">
                          <span className={cn(tc.storeName, "block truncate")}>{o.storeName}</span>
                          <span className={cn(tc.meta, "block truncate")}>
                            {[o.neighborhood, o.city].filter(Boolean).join(" • ") || "—"}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className={cn(tc.itemTitle, o.isCheapest && "text-emerald-600")}>
                            {brl(o.price)}
                          </span>
                          {!o.isCheapest && o.diffPct > 0 && (
                            <span className={cn(tc.meta, "block")}>+{o.diffPct}%</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </FadeSwap>

        <p className={cn(tc.meta, "mt-3")}>
          Precisa de uma visão por cesta?{" "}
          <Link to="/comparador" className="font-semibold underline">
            Abrir o comparador completo
          </Link>
          .
        </p>
      </main>
    </IsolatedPage>
  );
}
