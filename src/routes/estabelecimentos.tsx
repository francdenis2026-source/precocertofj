import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
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

export const Route = createFileRoute("/estabelecimentos")({
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

type SortKey = "products" | "name" | "neighborhood" | "savings";

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

  const [q, setQ] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("__all");
  const [sort, setSort] = useState<SortKey>("products");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpenMobile, setDetailOpenMobile] = useState(false);

  useEffect(() => {
    if (!user) setOnlyFavorites(false);
  }, [user]);

  const kindsPresent = useMemo(() => {
    const s = new Set<string>();
    for (const it of data?.items ?? []) s.add(it.kind ?? "outro");
    return s;
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [] as EstablishmentStat[];
    const term = q.trim().toLowerCase();
    let list = data.items.slice();
    if (onlyFavorites) list = list.filter((e) => favSet.has(e.name.trim().toLowerCase()));
    if (kindFilter !== "__all") list = list.filter((e) => (e.kind ?? "outro") === kindFilter);
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
  }, [data, q, kindFilter, sort, onlyFavorites, favSet]);

  // Auto-selecionar primeiro item quando lista muda
  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((e) => e.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selected = useMemo(
    () => filtered.find((e) => e.id === selectedId) ?? null,
    [filtered, selectedId],
  );

  return (
    <IsolatedPage fit className="bg-background" contentClassName="!pb-0">
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
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
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
                  onClick={() => setKindFilter(k)}
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
                onClick={() => setOnlyFavorites((v) => !v)}
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

      {/* MASTER-DETAIL — flex-1, sem scroll de página; cada painel rola internamente */}
      <div className="mx-auto grid min-h-0 w-full max-w-7xl flex-1 grid-cols-1 gap-0 overflow-hidden md:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]">
        {/* LISTA (mestre) */}
        <aside
          className={cn(
            "flex min-h-0 min-w-0 flex-col border-border/60 md:border-r",
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
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nome, bairro ou cidade…"
                className="h-9 pl-8 text-[13.5px]"
                aria-label="Buscar mercado"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className={cn("truncate", tc.metaMuted)}>
                {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
              </span>
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="h-8 w-[160px] text-[12px]">
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
          </div>

          <ul
            className="pc-rail min-h-0 flex-1 divide-y divide-border/50 overflow-y-auto"
            role="listbox"
            aria-label="Lista de mercados"
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

            {filtered.map((e) => {
              const active = e.id === selectedId;
              const meta = kindMeta(e.kind);
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      setSelectedId(e.id);
                      setDetailOpenMobile(true);
                    }}
                    className={cn(
                      "group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors md:px-4",
                      "focus-visible:outline-none focus-visible:bg-muted/50",
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
        </aside>

        {/* DETALHE (preview) */}
        <section
          className={cn(
            "min-h-0 min-w-0 flex-col",
            detailOpenMobile ? "flex" : "hidden md:flex",
          )}
          aria-live="polite"
        >
          {selected ? (
            <DetailPanel
              item={selected}
              overview={data ?? null}
              onCloseMobile={() => setDetailOpenMobile(false)}
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
}: {
  item: EstablishmentStat;
  overview: EstablishmentsOverview | null;
  onCloseMobile: () => void;
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
    <div className="flex min-h-0 flex-1 flex-col">
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
            <h2 className={cn("mt-0.5 truncate", tc.h2, "text-[var(--pc-gold-ink)]")}>
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
      <div className="pc-rail min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 md:px-6 md:py-5">
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
