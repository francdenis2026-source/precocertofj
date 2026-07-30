import { createFileRoute, Link, notFound, retainSearchParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { ArrowLeft, Coins, PackageSearch, Search as SearchIcon, Tags, Trophy, X } from "lucide-react";

import { Nav } from "@/components/brand/Nav";
import { PageShell, PageShellContent } from "@/components/layout/PageShell";
import { RouteError, EmptyState as FeedbackEmptyState } from "@/components/feedback";
import { RankingSkeleton } from "@/components/layout/LoadingSkeleton";
import { Input } from "@/components/ui/input";
import { resolveEstablishmentBySlug } from "@/lib/establishment-slug.functions";
import { getPublicStoreCatalog, getStoreCatalogPriceRanking } from "@/lib/stores-public.functions";
import type { CatalogPriceRank, PublicStoreProduct } from "@/lib/stores-public.functions";
import { tc } from "@/lib/typeclear";
import { cn } from "@/lib/utils";
import { Price } from "@/components/ds/Price";
import { CATEGORY_LABELS } from "@/lib/product-category";
import { ShareButton } from "@/components/ds/ShareButton";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Normaliza texto para busca insensível a acento/caixa. */
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();


const categoryLabel = (slug: string) =>
  CATEGORY_LABELS[slug] ?? slug.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

type SortKey = "price" | "name" | "recent";

/** Faixas de preço pré-definidas (max = 0 significa "sem teto"). */
const PRICE_BANDS: Array<{ label: string; min: number; max: number }> = [
  { label: "Até R$ 5", min: 0, max: 5 },
  { label: "R$ 5–10", min: 5, max: 10 },
  { label: "R$ 10–20", min: 10, max: 20 },
  { label: "R$ 20–50", min: 20, max: 50 },
  { label: "Acima de R$ 50", min: 50, max: 0 },
];

/* ------------------------------------------------------------------ */
/* Rota                                                                */
/* ------------------------------------------------------------------ */

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  cat: fallback(z.string(), "").default(""),
  marca: fallback(z.string(), "").default(""),
  sort: fallback(z.string(), "price").default("price"),
  /** faixa de preço (R$) — vazio = sem limite */
  min: fallback(z.number(), 0).default(0),
  max: fallback(z.number(), 0).default(0),
  /** somente itens em que esta loja tem o menor preço */
  best: fallback(z.boolean(), false).default(false),
});

export const Route = createFileRoute("/catalogo/$slug")({
  validateSearch: zodValidator(searchSchema),
  search: {
    middlewares: [retainSearchParams(["q", "cat", "marca", "sort", "min", "max", "best"])],
  },

  loader: async ({ params }) => {
    const match = await resolveEstablishmentBySlug({ data: { slug: params.slug } });
    if (!match) throw notFound();
    return { storeId: match.id, storeName: match.name, slug: match.slug };
  },
  head: ({ params }) => {
    const pretty = params.slug
      .split("-")
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ");
    const title = `Catálogo de produtos e preços — ${pretty} | PreçoCerto`;
    const description = `Catálogo completo de ${pretty} em Feijó (AC): busque por produto e filtre por categoria e marca para achar o melhor preço.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
    };
  },
  component: CatalogoPage,
  errorComponent: ({ error, reset }) => (
    <RouteError message={(error as Error)?.message} onRetry={reset} />
  ),
  notFoundComponent: () => (
    <RouteError
      title="Estabelecimento não encontrado"
      message="Confira o endereço ou volte para a lista de mercados."
    />
  ),
});

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

function CatalogoPage() {
  const { storeId, storeName } = Route.useLoaderData();
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const sort: SortKey =
    search.sort === "price" ? "price" : search.sort === "recent" ? "recent" : "name";

  const setSearch = (patch: Partial<z.infer<typeof searchSchema>>) => {
    navigate({ search: (prev: z.infer<typeof searchSchema>) => ({ ...prev, ...patch }) });
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-store-catalog", storeId],
    queryFn: () => getPublicStoreCatalog({ data: { id: storeId } }),
    staleTime: 10 * 60_000,
  });

  /** Ranking de menor preço entre mercados (opcional — não bloqueia a lista). */
  const { data: rankRows } = useQuery({
    queryKey: ["store-catalog-price-rank", storeId],
    queryFn: () => getStoreCatalogPriceRanking({ data: { storeId } }),
    staleTime: 10 * 60_000,
  });

  const rankMap = useMemo(() => {
    const map = new Map<string, CatalogPriceRank>();
    for (const r of rankRows ?? []) map.set(r.slug, r);
    return map;
  }, [rankRows]);

  const products = useMemo(() => data?.products ?? [], [data]);

  /** Categorias com contagem — sempre do dataset completo. */
  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      const key = (p.category || "outros").toLowerCase();
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([key, count]) => ({ key, label: categoryLabel(key), count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR"));
  }, [products]);

  /** Marcas disponíveis — respeitam a categoria selecionada. */
  const brands = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      if (search.cat && (p.category || "outros").toLowerCase() !== search.cat) continue;
      const brand = (p.brand ?? "").trim();
      if (!brand) continue;
      map.set(brand, (map.get(brand) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));
  }, [products, search.cat]);

  // Faixa de preço aplicada (0 = sem limite), sempre sanitizada.
  const minPrice = Math.max(0, search.min || 0);
  const maxPrice = Math.max(0, search.max || 0);

  const filtered = useMemo(() => {
    const nq = norm(search.q);
    const rows = products.filter((p) => {
      if (search.cat && (p.category || "outros").toLowerCase() !== search.cat) return false;
      if (search.marca && norm(p.brand ?? "") !== norm(search.marca)) return false;
      if (minPrice > 0 && p.price < minPrice) return false;
      if (maxPrice > 0 && p.price > maxPrice) return false;
      if (search.best && rankMap.get(p.slug)?.rank !== 1) return false;
      if (nq) {
        const haystack = norm(`${p.productName} ${p.brand ?? ""} ${p.barcode ?? ""}`);
        if (!haystack.includes(nq)) return false;
      }
      return true;
    });
    return [...rows].sort((a, b) => {
      if (sort === "price") return a.price - b.price;
      if (sort === "recent") return new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime();
      return a.productName.localeCompare(b.productName, "pt-BR");
    });
  }, [products, search.q, search.cat, search.marca, search.best, minPrice, maxPrice, rankMap, sort]);

  const cheapestCount = useMemo(
    () => (rankRows ?? []).filter((r) => r.rank === 1).length,
    [rankRows],
  );

  const hasFilters = Boolean(
    search.q || search.cat || search.marca || minPrice || maxPrice || search.best,
  );


  return (
    <PageShell>
      <Nav />
      <PageShellContent className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <header className="mb-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              to="/estabelecimento/$slug"
              params={{ slug }}
              className={cn(
                tc.meta,
                "inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground",
              )}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar ao estabelecimento
            </Link>
            <ShareButton
              size="sm"
              title={`Catálogo de ${storeName} — PreçoCerto`}
              text={`Veja o catálogo completo de ${storeName} no PreçoCerto`}
            />
          </div>
          <p className={cn(tc.eyebrow, "mt-3")}>Catálogo completo</p>

          <h1 className={cn(tc.h1, "mt-1")}>
            <span className={tc.storeName}>{storeName}</span>
          </h1>
          <p className={cn(tc.sectionNote, "mt-1")}>
            {isLoading
              ? "Carregando produtos…"
              : `${products.length} produtos catalogados · ${categories.length} categorias · ${brands.length} marcas`}
          </p>
        </header>

        {/* Toolbar: busca + ordenação */}
        <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-3 shadow-sm sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search.q}
              onChange={(e) => setSearch({ q: e.target.value })}
              placeholder="Buscar produto, marca ou código de barras…"
              className="h-10 pl-9"
              aria-label="Buscar no catálogo"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className={cn(tc.control, "text-muted-foreground")} htmlFor="catalogo-sort">
              Ordenar
            </label>
            <select
              id="catalogo-sort"
              value={sort}
              onChange={(e) => setSearch({ sort: e.target.value })}
              className={cn(
                tc.meta,
                "h-10 rounded-md border border-border/60 bg-background px-2 text-foreground",
              )}
            >
              <option value="name">Nome (A–Z)</option>
              <option value="price">Menor preço</option>
              <option value="recent">Mais recentes</option>
            </select>
          </div>
        </div>

        {/* Filtros por categoria */}
        <FilterRow
          icon={<Tags className="h-3.5 w-3.5" />}
          label="Categorias"
          active={search.cat}
          options={categories.map((c) => ({ value: c.key, label: c.label, count: c.count }))}
          onSelect={(value) => setSearch({ cat: value, marca: "" })}
        />

        {/* Filtros por marca */}
        {brands.length > 0 && (
          <FilterRow
            icon={<PackageSearch className="h-3.5 w-3.5" />}
            label="Marcas"
            active={search.marca}
            options={brands.slice(0, 40).map((b) => ({
              value: b.name,
              label: b.name,
              count: b.count,
            }))}
            onSelect={(value) => setSearch({ marca: value })}
          />
        )}

        {/* Faixa de preço */}
        <div className="mt-3">
          <p className={cn(tc.control, "mb-1.5 flex items-center gap-1.5 text-muted-foreground")}>
            <Coins className="h-3.5 w-3.5" />
            Faixa de preço
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip label="Todos" isActive={!minPrice && !maxPrice} onClick={() => setSearch({ min: 0, max: 0 })} />
            {PRICE_BANDS.map((band) => (
              <Chip
                key={band.label}
                label={band.label}
                isActive={minPrice === band.min && maxPrice === band.max}
                onClick={() =>
                  setSearch(
                    minPrice === band.min && maxPrice === band.max
                      ? { min: 0, max: 0 }
                      : { min: band.min, max: band.max },
                  )
                }
              />
            ))}
            <span className={cn(tc.metaMuted, "ml-1")}>ou</span>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              value={minPrice || ""}
              onChange={(e) => setSearch({ min: Math.max(0, Number(e.target.value) || 0) })}
              placeholder="mín."
              aria-label="Preço mínimo"
              className="h-9 w-24"
            />
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              value={maxPrice || ""}
              onChange={(e) => setSearch({ max: Math.max(0, Number(e.target.value) || 0) })}
              placeholder="máx."
              aria-label="Preço máximo"
              className="h-9 w-24"
            />
            {cheapestCount > 0 && (
              <Chip
                label={`🏆 Menor preço da cidade (${cheapestCount})`}
                isActive={search.best}
                onClick={() => setSearch({ best: !search.best })}
              />
            )}
          </div>
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={() => setSearch({ q: "", cat: "", marca: "", min: 0, max: 0, best: false })}
            className={cn(
              tc.meta,
              "mt-3 inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1 text-muted-foreground transition-colors hover:text-foreground",
            )}
          >
            <X className="h-3 w-3" />
            Limpar filtros ({filtered.length} resultados)
          </button>
        )}

        {/* Resultados */}
        <div className="mt-5">
          {isLoading ? (
            <CatalogGridSkeleton count={9} className="lg:grid-cols-3 xl:grid-cols-3" />
          ) : error ? (
            <SmartErrorState error={error} onRetry={() => void refetch()} />
          ) : filtered.length === 0 ? (
            <IllustratedEmptyState
              kind="search"
              title="Nenhum produto encontrado"
              message="Ajuste a busca ou remova os filtros para ver mais itens deste catálogo."
              action={
                hasFilters ? (
                  <Button
                    size="sm"
                    onClick={() =>
                      setSearch({ q: "", cat: "", marca: "", min: 0, max: 0, best: false })
                    }
                  >
                    Limpar filtros
                  </Button>
                ) : undefined
              }
            />
          ) : (

            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <li key={p.slug}>
                  <ProductCard product={p} rank={rankMap.get(p.slug)} />
                </li>
              ))}
            </ul>

          )}
        </div>
      </PageShellContent>
    </PageShell>
  );
}

/* ------------------------------------------------------------------ */
/* Subcomponentes                                                      */
/* ------------------------------------------------------------------ */

function FilterRow({
  icon,
  label,
  active,
  options,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  active: string;
  options: Array<{ value: string; label: string; count: number }>;
  onSelect: (value: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="mt-3">
      <p className={cn(tc.control, "mb-1.5 flex items-center gap-1.5 text-muted-foreground")}>
        {icon}
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <Chip label="Todas" isActive={!active} onClick={() => onSelect("")} />
        {options.map((o) => (
          <Chip
            key={o.value}
            label={`${o.label} (${o.count})`}
            isActive={active === o.value}
            onClick={() => onSelect(active === o.value ? "" : o.value)}
          />
        ))}
      </div>
    </div>
  );
}

function Chip({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        tc.meta,
        "rounded-full border px-3 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border/60 bg-card text-muted-foreground hover:border-border hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function ProductCard({
  product,
  rank,
}: {
  product: PublicStoreProduct;
  rank?: CatalogPriceRank;
}) {
  const isCheapest = rank?.rank === 1;
  return (
    <article className="flex h-full flex-col justify-between gap-2 rounded-xl border border-border/60 bg-card p-3 shadow-sm transition-colors hover:border-border">
      <div className="min-w-0">
        <p className={cn(tc.itemTitle, "line-clamp-2")}>{product.productName}</p>
        <p className={cn(tc.metaMuted, "mt-1 truncate")}>
          {[product.brand, categoryLabel((product.category || "outros").toLowerCase())]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      <div className="flex items-end justify-between gap-2">
        <Price value={product.price} size="lg" />
        {product.pricePerUnit && product.unitLabel ? (
          <Price
            value={product.pricePerUnit}
            size="xs"
            tone="muted"
            suffix={product.unitLabel}
          />
        ) : null}
      </div>

      {/* Ranking de menor preço entre mercados */}
      {rank ? (
        isCheapest ? (
          <p
            className={cn(
              tc.meta,
              "inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1 text-primary",
            )}
          >
            <Trophy className="h-3.5 w-3.5 shrink-0" />
            Menor preço entre {rank.offersCount} mercados
          </p>
        ) : (
          <p className={cn(tc.metaMuted, "truncate")}>
            {rank.rank}º de {rank.offersCount} · mais barato em{" "}
            <span className={tc.storeName}>{rank.bestStoreName}</span> por{" "}
            <Price value={rank.bestPrice} size="xs" tone="muted" /> ({rank.savingsPct.toFixed(0)}%
            menos)
          </p>
        )
      ) : null}
    </article>
  );
}

