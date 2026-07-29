import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, MapPin, PackageSearch, Search, Store, TrendingDown, X } from "lucide-react";

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
import { ShareButton } from "@/components/ds";
import { ButcherCutBadge } from "@/components/ds/ButcherCutBadge";
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
      <header className="border-b border-[var(--pc-surface-1-border)] bg-[var(--pc-surface-1)]">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <BackButton />
          <HomeBrandLink />
          <div className="ml-auto">
            <ShareButton title="Onde comprar mais barato — PreçoCerto" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-4">
        <p className={cn(tc.eyebrow, "mb-1")}>Comparador geográfico</p>
        <h1 className={cn(tc.sectionTitle, "mb-1")}>
          Onde comprar mais barato
        </h1>
        <p className={cn(tc.metaMuted, "mb-3")}>
          Compare o preço de cada produto entre os mercados parceiros e filtre por bairro ou cidade.
        </p>
        <hr className="pc-rule mb-3" aria-hidden />

        {/* Filtros */}
        <form
          className="mb-3 space-y-2 pc-surface-2 p-2.5"
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
                <ProductAccordion key={p.productKey} product={p} />
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

const INITIAL_OFFERS = 4;

function ProductAccordion({ product: p }: { product: WhereToBuyProduct }) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? p.offers : p.offers.slice(0, INITIAL_OFFERS);
  const hidden = Math.max(0, p.offers.length - INITIAL_OFFERS);
  const best = p.offers.find((o) => o.isCheapest) ?? p.offers[0];

  return (
    <li className="pc-surface-2 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-2 p-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
      >
        <ChevronDown
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <span className={cn(tc.itemTitle, "block truncate")}>{p.productName}</span>
          <span className={cn(tc.meta, "block truncate")}>
            {p.storeCount} {p.storeCount === 1 ? "loja" : "lojas"} • média{" "}
            <span className="pc-price pc-price--sm">{brl(p.avgPrice)}</span>
            {best ? (
              <>
                {" "}• melhor{" "}
                <span className="pc-price pc-price--sm pc-price--best">{brl(best.price)}</span>{" "}
                <span className={cn(tc.storeName)}>{best.storeName}</span>
              </>
            ) : null}
          </span>
        </div>
        {p.savingsPct > 0 && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11.5px] font-semibold text-emerald-600">
            <TrendingDown className="h-3 w-3" /> {p.savingsPct}%
          </span>
        )}
      </button>

      {open && (
        <div className="border-t border-[var(--pc-surface-2-border)] p-2.5">
          <ul
            className="grid gap-2"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
          >
            {visible.map((o, i) => (
              <li
                key={`${p.productKey}-${o.establishmentId ?? i}`}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-2",
                  o.isCheapest
                    ? "pc-surface-3 pc-best-result pc-best-result--compact"
                    : "border border-[var(--pc-surface-2-border)] bg-background/40",
                )}
                aria-label={o.isCheapest ? `Melhor preço: ${o.storeName}` : undefined}
              >
                <Store
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    o.isCheapest ? "text-[var(--pc-gold-ink)]" : "text-muted-foreground",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className={cn(tc.storeName, "pc-store-name truncate")}>
                      {o.storeName}
                    </span>
                    {o.butcherProtein ? (
                      <ButcherCutBadge protein={o.butcherProtein} size="xs" />
                    ) : null}
                  </span>
                  <span className={cn(tc.metaMuted, "block truncate")}>
                    {[o.neighborhood, o.city].filter(Boolean).join(" • ") || "—"}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span
                    className={cn(
                      "pc-price-value text-[13.5px]",
                      o.isCheapest && "pc-price-value--best",
                    )}
                  >
                    {brl(o.price)}
                  </span>
                  {!o.isCheapest && o.diffPct > 0 && (
                    <span className={cn(tc.metaMuted, "block")}>+{o.diffPct}%</span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          {hidden > 0 && (
            <div className="mt-2 flex justify-center">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 px-3 text-[12px]"
                onClick={() => setShowAll((v) => !v)}
              >
                {showAll ? "Mostrar menos" : `Ver mais ${hidden} ${hidden === 1 ? "estabelecimento" : "estabelecimentos"}`}
              </Button>
            </div>
          )}

          <div className="mt-2 flex justify-end">
            <Link
              to="/onde-comprar/$produto"
              params={{ produto: encodeURIComponent(p.productKey) }}
              className={cn(tc.meta, "font-semibold underline hover:text-foreground")}
            >
              Ver comparação completa →
            </Link>
          </div>
        </div>
      )}
    </li>
  );
}
