import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import {
  Beef,
  ChevronRight,
  Croissant,
  ExternalLink,
  MapPin,
  Package,
  PiggyBank,
  Pill,
  Search,
  ShoppingBasket,
  Store,
  X,
} from "lucide-react";

import { slugifyEstablishment } from "@/lib/establishment-slug.functions";
import {
  humanizeCategory,
  listPublicEstablishments,
  type EstablishmentStat,
  type EstablishmentsOverview,
} from "@/lib/establishments-public.functions";

import { IsolatedPage } from "@/components/layout/IsolatedPage";
import { BackButton } from "@/components/layout/BackButton";
import { HomeBrandLink } from "@/components/layout/HomeBrandLink";
import { StoreLogoThumb } from "@/components/brand/StoreLogoThumb";
import { FavoriteMarketButton } from "@/components/market/FavoriteMarketButton";
import { useSession } from "@/hooks/useSession";
import { listFavoriteMarkets } from "@/lib/favorites.functions";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { tc } from "@/lib/typeclear";
import { cn } from "@/lib/utils";

const SORT_KEYS = ["products", "name", "neighborhood", "savings"] as const;
type SortKey = (typeof SORT_KEYS)[number];

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  kind: fallback(z.string(), "__all").default("__all"),
  sort: fallback(z.string(), "products").default("products"),
  bairro: fallback(z.string(), "__all").default("__all"),
  cidade: fallback(z.string(), "__all").default("__all"),
  economia: fallback(z.string(), "__all").default("__all"),
  fav: fallback(z.boolean(), false).default(false),
  sel: fallback(z.string(), "").default(""),
  pagina: fallback(z.number().int(), 1).default(1),
});

export const Route = createFileRoute("/estabelecimentos")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Mercados de Feijó — PreçoCerto" },
      {
        name: "description",
        content:
          "Painel mestre-detalhe dos mercados parceiros com preços monitorados: veja lista, categorias e detalhes de cada estabelecimento em Feijó/AC.",
      },
      { property: "og:title", content: "Mercados parceiros — PreçoCerto" },
      {
        property: "og:description",
        content:
          "Explore a rede de mercados parceiros do PreçoCerto num painel único, sem rolagem.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EstablishmentsPage,
});

const KIND_META: Record<
  string,
  { label: string; icon: typeof Store; tagline: string }
> = {
  mercado: { label: "Supermercado", icon: ShoppingBasket, tagline: "Cesta básica comparada" },
  farmacia: { label: "Farmácia", icon: Pill, tagline: "Medicamentos e cuidados" },
  padaria: { label: "Padaria", icon: Croissant, tagline: "Pães, bolos e insumos" },
  acougue: { label: "Açougue", icon: Beef, tagline: "Cortes bovinos, suínos e aves" },
  outro: { label: "Outro comércio", icon: Store, tagline: "Comércio parceiro" },
};

function kindMeta(kind: string | null) {
  return KIND_META[kind ?? "outro"] ?? KIND_META.outro;
}

function EstablishmentsPage() {
  const fetchList = useServerFn(listPublicEstablishments);
  const { data, isLoading, error } = useQuery({
    queryKey: ["public-establishments"],
    queryFn: () => fetchList({}),
    staleTime: 60_000,
  });

  const { user } = useSession();
  const listFavFn = useServerFn(listFavoriteMarkets);
  const { data: favMarkets } = useQuery({
    queryKey: ["favorite-markets"],
    queryFn: () => listFavFn(),
    enabled: !!user,
    staleTime: 60_000,
  });
  const favSet = useMemo(
    () => new Set((favMarkets ?? []).map((f) => f.marketName.trim().toLowerCase())),
    [favMarkets],
  );

  // URL como fonte da verdade dos filtros + seleção (compartilhável / voltar-friendly).
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const q = search.q;
  const kindFilter = search.kind;
  const sort: SortKey = (SORT_KEYS as readonly string[]).includes(search.sort)
    ? (search.sort as SortKey)
    : "products";
  const neighborhoodFilter = search.bairro;
  const cityFilter = search.cidade;
  const savingsFilter = search.economia;
  const onlyFavorites = search.fav && !!user;
  const selectedId = search.sel || null;
  const pagesLoaded = Math.max(1, search.pagina | 0);

  const updateSearch = useCallback(
    (patch: Partial<z.infer<typeof searchSchema>>) => {
      navigate({
        search: (prev: z.infer<typeof searchSchema>) => {
          const next = { ...prev, ...patch };
          if (next.q === "") delete (next as Record<string, unknown>).q;
          if (next.kind === "__all") delete (next as Record<string, unknown>).kind;
          if (next.bairro === "__all") delete (next as Record<string, unknown>).bairro;
          if (next.cidade === "__all") delete (next as Record<string, unknown>).cidade;
          if (next.economia === "__all") delete (next as Record<string, unknown>).economia;
          if (next.sort === "products") delete (next as Record<string, unknown>).sort;
          if (!next.fav) delete (next as Record<string, unknown>).fav;
          if (!next.sel) delete (next as Record<string, unknown>).sel;
          if (!next.pagina || next.pagina <= 1) delete (next as Record<string, unknown>).pagina;
          return next;
        },
        replace: true,
      });
    },
    [navigate],
  );

  const [detailOpenMobile, setDetailOpenMobile] = useState(false);
  const PAGE_SIZE = 8;
  const [qDraft, setQDraft] = useState(q);
  // Sincroniza rascunho quando URL muda de fora (back/forward, link compartilhado).
  useEffect(() => setQDraft(q), [q]);
  // Debounce da digitação para não estourar history.replaceState a cada tecla.
  useEffect(() => {
    if (qDraft === q) return;
    const t = window.setTimeout(() => updateSearch({ q: qDraft }), 220);
    return () => window.clearTimeout(t);
  }, [qDraft, q, updateSearch]);

  useEffect(() => {
    if (!user && search.fav) updateSearch({ fav: false });
  }, [user, search.fav, updateSearch]);

  const kindsPresent = useMemo(() => {
    const s = new Set<string>();
    for (const it of data?.items ?? []) s.add(it.kind ?? "outro");
    return s;
  }, [data]);

  const neighborhoodsPresent = useMemo(() => {
    const bairros = new Set<string>();
    for (const it of data?.items ?? []) {
      const b = (it.neighborhood ?? "").trim();
      if (b) bairros.add(b);
    }
    return Array.from(bairros).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [] as EstablishmentStat[];
    const term = q.trim().toLowerCase();
    let list = data.items.slice();
    if (onlyFavorites) list = list.filter((e) => favSet.has(e.name.trim().toLowerCase()));
    if (kindFilter !== "__all") list = list.filter((e) => (e.kind ?? "outro") === kindFilter);
    if (neighborhoodFilter !== "__all") {
      list = list.filter(
        (e) => (e.neighborhood ?? "").trim().toLowerCase() === neighborhoodFilter.toLowerCase(),
      );
    }
    if (term) {
      list = list.filter((e) =>
        [e.name, e.neighborhood ?? "", e.city ?? ""].some((v) => v.toLowerCase().includes(term)),
      );
    }
    switch (sort) {
      case "name":
        list.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
        break;
      case "neighborhood":
        list.sort((a, b) => {
          const cmp = (a.neighborhood ?? "\uffff").localeCompare(b.neighborhood ?? "\uffff", "pt-BR");
          return cmp !== 0 ? cmp : a.name.localeCompare(b.name, "pt-BR");
        });
        break;
      case "savings":
        list.sort((a, b) => b.maxSavings - a.maxSavings);
        break;
      case "products":
      default:
        list.sort((a, b) => b.productsCount - a.productsCount);
    }
    return list;
  }, [data, q, kindFilter, neighborhoodFilter, sort, onlyFavorites, favSet]);

  // Reset page when filters change / list shrinks
  useEffect(() => {
    setPage(0);
  }, [q, kindFilter, neighborhoodFilter, sort, onlyFavorites]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageItems = useMemo(
    () => filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE),
    [filtered, currentPage],
  );

  // Auto-selecionar primeiro item quando lista muda / seleção some.
  useEffect(() => {
    if (filtered.length === 0) {
      if (selectedId) updateSearch({ sel: "" });
      return;
    }
    if (!selectedId || !filtered.some((e) => e.id === selectedId)) {
      updateSearch({ sel: filtered[0].id });
    }
  }, [filtered, selectedId, updateSearch]);

  const selected = useMemo(
    () => filtered.find((e) => e.id === selectedId) ?? null,
    [filtered, selectedId],
  );

  // Roving-tabindex + navegação por teclado na lista.
  const listRef = useRef<HTMLUListElement | null>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const registerItem = useCallback((id: string, el: HTMLButtonElement | null) => {
    if (el) itemRefs.current.set(id, el);
    else itemRefs.current.delete(id);
  }, []);

  const focusItem = useCallback((id: string | null) => {
    if (!id) return;
    const el = itemRefs.current.get(id);
    el?.focus();
    el?.scrollIntoView({ block: "nearest" });
  }, []);

  const selectAt = useCallback(
    (idx: number, opts?: { focus?: boolean }) => {
      if (filtered.length === 0) return;
      const clamped = Math.max(0, Math.min(filtered.length - 1, idx));
      const item = filtered[clamped];
      updateSearch({ sel: item.id });
      if (opts?.focus) focusItem(item.id);
    },
    [filtered, updateSearch, focusItem],
  );

  const currentIndex = useMemo(
    () => filtered.findIndex((e) => e.id === selectedId),
    [filtered, selectedId],
  );

  const onListKeyDown = useCallback(
    (e: KeyboardEvent<HTMLUListElement>) => {
      if (filtered.length === 0) return;
      const idx = currentIndex < 0 ? 0 : currentIndex;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          selectAt(idx + 1, { focus: true });
          break;
        case "ArrowUp":
          e.preventDefault();
          selectAt(idx - 1, { focus: true });
          break;
        case "Home":
          e.preventDefault();
          selectAt(0, { focus: true });
          break;
        case "End":
          e.preventDefault();
          selectAt(filtered.length - 1, { focus: true });
          break;
        case "Enter":
        case " ":
          // Em mobile abre o painel; em desktop apenas confirma o foco no preview.
          e.preventDefault();
          setDetailOpenMobile(true);
          window.setTimeout(() => detailHeadingRef.current?.focus(), 30);
          break;
      }
    },
    [filtered, currentIndex, selectAt],
  );

  const detailHeadingRef = useRef<HTMLHeadingElement | null>(null);

  return (
    <IsolatedPage className="bg-background" contentClassName="!pb-0">
      {/* HEADER compacto */}
      <header className="shrink-0 border-b border-border/60 bg-background/92 backdrop-blur">
        <span
          aria-hidden
          className="block h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, color-mix(in oklab, var(--brand-gold) 75%, transparent) 50%, transparent)",
          }}
        />
        <div className="mx-auto grid w-full max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 md:gap-6 md:px-6">
          <div className="flex min-w-0 items-center gap-1.5">
            <BackButton fallbackTo="/" variant="ghost" />
            <span aria-hidden className="h-5 w-px bg-border" />
            <HomeBrandLink />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className={tc.eyebrow}>Comércios parceiros</span>
            <h1 className={cn("truncate", tc.h1)}>Mercados de Feijó</h1>
          </div>
          <Link
            to="/farmacias"
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-brand-gold hover:text-[var(--pc-gold-ink)]"
          >
            <Pill className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Plantão farmácias</span>
          </Link>
        </div>
      </header>

      {/* MÉTRICAS + filtros compactos */}
      <section className="shrink-0 border-b border-border/60">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-3 py-2 md:px-6">
          {data && (
            <>
              <Metric icon={Store} label="Comércios" value={String(data.totalEstablishments)} />
              <Metric icon={Package} label="Produtos" value={data.totalProducts.toLocaleString("pt-BR")} />
              <Metric
                icon={PiggyBank}
                label="Economia"
                value={
                  data.totalMaxSavings > 0
                    ? `R$ ${data.totalMaxSavings.toFixed(2).replace(".", ",")}`
                    : "—"
                }
              />
            </>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Tipo de comércio">
            {(["__all", ...Object.keys(KIND_META)] as const).map((k) => {
              if (k !== "__all" && !kindsPresent.has(k)) return null;
              const meta = k === "__all" ? { label: "Todos", icon: Store } : KIND_META[k];
              const active = kindFilter === k;
              const Icon = meta.icon;
              return (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => updateSearch({ kind: k })}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors",
                    tc.chip,
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold",
                    active
                      ? "border-brand-gold bg-brand-gold text-brand-navy"
                      : "border-border bg-background text-muted-foreground hover:border-brand-gold hover:text-[var(--pc-gold-ink)]",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {meta.label}
                </button>
              );
            })}
            {user && favSet.size > 0 && (
              <button
                type="button"
                role="switch"
                aria-checked={onlyFavorites}
                onClick={() => updateSearch({ fav: !onlyFavorites })}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors",
                  tc.chip,
                  onlyFavorites
                    ? "border-brand-gold bg-brand-gold text-brand-navy"
                    : "border-border bg-background text-muted-foreground hover:border-brand-gold hover:text-[var(--pc-gold-ink)]",
                )}
              >
                ★ Favoritos ({favSet.size})
              </button>
            )}
          </div>
        </div>
      </section>

      {/* MASTER-DETAIL — cresce com o conteúdo, sem forçar viewport */}
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-0 md:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]">
        {/* LISTA (mestre) */}
        <aside
          className={cn(
            "flex min-w-0 flex-col border-border/60 md:border-r",
            detailOpenMobile ? "hidden md:flex" : "flex",
          )}
        >

          <div className="shrink-0 space-y-2 border-b border-border/60 px-3 py-2 md:px-4">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={qDraft}
                onChange={(e) => setQDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" && filtered.length > 0) {
                    e.preventDefault();
                    focusItem(filtered[0].id);
                  }
                }}
                placeholder="Buscar por nome, bairro ou cidade…"
                className="h-9 pl-8 text-[13.5px]"
                aria-label="Buscar mercado"
                aria-controls="mercados-listbox"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Select
                value={neighborhoodFilter}
                onValueChange={(v) => updateSearch({ bairro: v })}
              >
                <SelectTrigger
                  className="h-8 flex-1 min-w-[140px] text-[12px]"
                  aria-label="Filtrar por bairro"
                >
                  <MapPin className="mr-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <SelectValue placeholder="Todos os bairros" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Todos os bairros</SelectItem>
                  {neighborhoodsPresent.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={(v) => updateSearch({ sort: v })}>
                <SelectTrigger className="h-8 w-[150px] text-[12px]" aria-label="Ordenar lista">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="products">Mais produtos</SelectItem>
                  <SelectItem value="savings">Maior economia</SelectItem>
                  <SelectItem value="name">Nome (A→Z)</SelectItem>
                  <SelectItem value="neighborhood">Bairro (A→Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className={cn("truncate", tc.metaMuted)} aria-live="polite">
                {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
              </span>
              {(q || kindFilter !== "__all" || neighborhoodFilter !== "__all" || onlyFavorites) && (
                <button
                  type="button"
                  onClick={() =>
                    updateSearch({ q: "", kind: "__all", bairro: "__all", fav: false })
                  }
                  className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground hover:text-[var(--pc-gold-ink)]"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </div>

          <ul
            id="mercados-listbox"
            ref={listRef}
            className="pc-rail divide-y divide-border/50 focus:outline-none"
            role="listbox"
            aria-label="Lista de mercados"
            aria-activedescendant={selectedId ? `mercado-opt-${selectedId}` : undefined}
            onKeyDown={onListKeyDown}
          >
            {isLoading &&
              Array.from({ length: 8 }).map((_, i) => (
                <li key={i} className="flex items-center gap-3 px-3 py-2.5 md:px-4">
                  <span className="h-11 w-11 shrink-0 animate-pulse rounded-lg bg-muted" />
                  <div className="flex-1 space-y-1.5">
                    <span className="block h-3 w-2/3 animate-pulse rounded bg-muted" />
                    <span className="block h-2.5 w-1/3 animate-pulse rounded bg-muted" />
                  </div>
                </li>
              ))}

            {error && (
              <li className="p-4 text-[13px] text-destructive">
                Erro ao carregar mercados: {(error as Error).message}
              </li>
            )}

            {!isLoading && !error && filtered.length === 0 && (
              <li className="p-6 text-center text-[13px] text-muted-foreground">
                Nenhum estabelecimento encontrado com esses filtros.
              </li>
            )}

            {pageItems.map((e) => {
              const active = e.id === selectedId;
              const meta = kindMeta(e.kind);
              return (
                <li key={e.id}>
                  <button
                    id={`mercado-opt-${e.id}`}
                    ref={(el) => registerItem(e.id, el)}
                    type="button"
                    role="option"
                    aria-selected={active}
                    tabIndex={active ? 0 : -1}
                    onClick={() => {
                      updateSearch({ sel: e.id });
                      setDetailOpenMobile(true);
                    }}
                    onFocus={() => {
                      if (!active) updateSearch({ sel: e.id });
                    }}
                    className={cn(
                      "group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors md:px-4",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-gold",
                      active
                        ? "bg-[color-mix(in_oklab,var(--brand-gold)_10%,transparent)]"
                        : "hover:bg-muted/40",
                    )}
                  >
                    {active && (
                      <span
                        aria-hidden
                        className="-ml-3 mr-0 h-10 w-[3px] shrink-0 bg-[var(--pc-gold-ink)] md:-ml-4"
                      />
                    )}
                    <StoreLogoThumb
                      src={e.logoUrl}
                      name={e.name}
                      className="h-11 w-11 shrink-0 border-border/60"
                      initialsClassName="text-[12px]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className={cn("truncate", tc.itemTitle)}>{e.name}</div>
                      <div className={cn("truncate", tc.metaMuted)}>
                        {meta.label}
                        {e.neighborhood ? ` · ${e.neighborhood}` : ""}
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={cn("tabular-nums font-semibold text-[var(--pc-gold-ink)]", tc.num)}>
                        {e.productsCount}
                      </span>
                      <span className={tc.metaMuted}>itens</span>
                    </div>
                    <ChevronRight
                      className="hidden h-4 w-4 shrink-0 text-muted-foreground/60 md:block"
                      aria-hidden
                    />
                  </button>
                </li>
              );
            })}
          </ul>

          {pageCount > 1 && (
            <nav
              className="flex shrink-0 items-center justify-between gap-2 border-t border-border/60 px-3 py-2 md:px-4"
              aria-label="Paginação de mercados"
            >
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="inline-flex h-7 items-center gap-1 rounded-full border border-border px-2.5 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-brand-gold hover:text-[var(--pc-gold-ink)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Anteriores
              </button>
              <span className={cn("tabular-nums", tc.metaMuted)}>
                Página {currentPage + 1} de {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={currentPage >= pageCount - 1}
                className="inline-flex h-7 items-center gap-1 rounded-full border border-border px-2.5 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-brand-gold hover:text-[var(--pc-gold-ink)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Próximos →
              </button>
            </nav>
          )}
        </aside>

        {/* DETALHE (preview) */}
        <section
          className={cn(
            "min-w-0 flex-col",
            detailOpenMobile ? "flex" : "hidden md:flex",
          )}

          aria-live="polite"
          aria-label="Detalhes do mercado selecionado"
        >
          {selected ? (
            <DetailPanel
              item={selected}
              overview={data ?? null}
              headingRef={detailHeadingRef}
              onCloseMobile={() => {
                setDetailOpenMobile(false);
                window.setTimeout(() => focusItem(selectedId), 30);
              }}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center">
              <div className="max-w-sm space-y-2">
                <Store className="mx-auto h-8 w-8 text-muted-foreground/50" aria-hidden />
                <p className={tc.lead}>
                  Selecione um mercado na lista para ver os detalhes, categorias e economia disponível.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </IsolatedPage>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Store;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-[var(--pc-gold-ink)]" aria-hidden />
      <div className="leading-tight">
        <div className={cn("tabular-nums font-semibold text-foreground", tc.num)}>{value}</div>
        <div className={tc.metaMuted}>{label}</div>
      </div>
    </div>
  );
}

function DetailPanel({
  item,
  overview,
  onCloseMobile,
  headingRef,
}: {
  item: EstablishmentStat;
  overview: EstablishmentsOverview | null;
  onCloseMobile: () => void;
  headingRef: React.MutableRefObject<HTMLHeadingElement | null>;
}) {
  const meta = kindMeta(item.kind);
  const slug = slugifyEstablishment(item.name);
  const KindIcon = meta.icon;
  const cats = item.topCategories.slice(0, 6);
  const share =
    overview && overview.totalProducts > 0
      ? Math.round((item.productsCount / overview.totalProducts) * 100)
      : 0;

  return (
    <div className="flex flex-col">
      {/* Cabeçalho do detalhe */}
      <div className="shrink-0 border-b border-border/60 px-4 py-3 md:px-6 md:py-4">
        <div className="flex items-start gap-3 md:gap-4">
          <button
            type="button"
            onClick={onCloseMobile}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border text-muted-foreground hover:text-foreground md:hidden"
            aria-label="Voltar à lista"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
          <StoreLogoThumb
            src={item.logoUrl}
            name={item.name}
            eager
            className="h-14 w-14 shrink-0 border-border/60 md:h-16 md:w-16"
            initialsClassName="text-[16px]"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={tc.eyebrow}>
                <KindIcon className="mr-1 inline h-3 w-3" aria-hidden />
                {meta.label}
              </span>
            </div>
            <h2
              ref={headingRef}
              tabIndex={-1}
              className={cn("mt-0.5 truncate focus:outline-none", tc.h2, "text-[var(--pc-gold-ink)]")}
            >
              {item.name}
            </h2>
            <div className={cn("mt-0.5 flex items-center gap-1.5", tc.meta)}>
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">
                {item.neighborhood ?? "Bairro não informado"}
                {item.city ? ` · ${item.city}` : ""}
                {item.state ? `/${item.state}` : ""}
              </span>
            </div>
          </div>
          <FavoriteMarketButton marketName={item.name} />
        </div>
      </div>

      {/* Conteúdo rolável */}
      <div className="space-y-4 px-4 py-4 md:px-6 md:py-5">
        <div className="grid grid-cols-3 gap-2">
          <StatBlock
            icon={Package}
            label="Produtos"
            value={item.productsCount.toString()}
            hint={share > 0 ? `${share}% da rede` : undefined}
          />
          <StatBlock
            icon={PiggyBank}
            label="Maior economia"
            value={
              item.maxSavings > 0
                ? `R$ ${item.maxSavings.toFixed(2).replace(".", ",")}`
                : "—"
            }
          />
          <StatBlock
            icon={Store}
            label="Categorias"
            value={String(item.topCategories.length)}
          />
        </div>

        {cats.length > 0 && (
          <div>
            <div className={cn("mb-1.5 flex items-baseline justify-between gap-2", tc.eyebrow)}>
              <span>Categorias em destaque</span>
              <span className={tc.metaMuted}>por nº de produtos</span>
            </div>
            <ul className="divide-y divide-border/50 overflow-hidden rounded-lg border border-border/60">
              {cats.map((c) => {
                const pct =
                  item.productsCount > 0
                    ? Math.round((c.count / item.productsCount) * 100)
                    : 0;
                return (
                  <li
                    key={c.category}
                    className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-2"
                  >
                    <span className={cn("truncate", tc.body)}>
                      {humanizeCategory(c.category)}
                    </span>
                    <span className={cn("tabular-nums text-muted-foreground", tc.meta)}>
                      {pct}%
                    </span>
                    <span
                      className={cn(
                        "tabular-nums font-semibold text-[var(--pc-gold-ink)]",
                        tc.num,
                      )}
                    >
                      {c.count}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            to="/estabelecimento/$slug"
            params={{ slug }}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-brand-gold px-4 text-[13px] font-semibold text-brand-navy transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
          >
            Ver página completa
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </Link>
          <Link
            to="/buscar"
            search={{ estabelecimento: item.name } as never}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-[13px] font-semibold text-foreground hover:border-brand-gold hover:text-[var(--pc-gold-ink)]"
          >
            <Search className="h-3.5 w-3.5" aria-hidden />
            Buscar produtos deste mercado
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatBlock({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Store;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-[var(--pc-gold-ink)]" aria-hidden />
        <span className={tc.metaMuted}>{label}</span>
      </div>
      <div className={cn("mt-0.5 tabular-nums font-bold text-foreground", tc.num)}>
        {value}
      </div>
      {hint && <div className={tc.metaMuted}>{hint}</div>}
    </div>
  );
}
