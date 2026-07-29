import { createFileRoute, Link, retainSearchParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";

import { Nav } from "@/components/brand/Nav";
import { PageShell, PageShellContent } from "@/components/layout/PageShell";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { RouteError, EmptyState as FeedbackEmptyState } from "@/components/feedback";
import { RankingSkeleton } from "@/components/layout/LoadingSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { shortenStoreName } from "@/lib/store-name";
import { tc } from "@/lib/typeclear";
import { cn } from "@/lib/utils";
import { Search as SearchIcon, TrendingDown, Store as StoreIcon, ArrowRight, Tags } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

interface Comparison {
  product_key: string;
  display_name: string;
  category: string | null;
  size_value: number | null;
  size_unit: string | null;
  store_count: number;
  min_price: number;
  avg_price: number;
  max_price: number;
  savings_pct: number;
  cheapest_store: string;
  cheapest_establishment_id: string;
  catalog_slug: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  mercearia: "Mercearia",
  graos: "Grãos",
  bebidas: "Bebidas",
  bebidas_em_po: "Bebidas em pó",
  laticinios: "Laticínios",
  carnes: "Carnes",
  padaria: "Padaria",
  hortifruti: "Hortifruti",
  biscoitos: "Biscoitos",
  doces: "Doces",
  congelados: "Congelados",
  higiene: "Higiene",
  limpeza: "Limpeza",
  outros: "Outros",
};

const categoryLabel = (slug: string) =>
  CATEGORY_LABELS[slug] ?? slug.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Normaliza texto para busca insensível a acento/caixa. */
const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/* ------------------------------------------------------------------ */
/* Rota                                                                */
/* ------------------------------------------------------------------ */

const searchSchema = z.object({
  cat: fallback(z.string(), "").default(""),
  q: fallback(z.string(), "").default(""),
  sort: fallback(z.string(), "price").default("price"),
  stores: fallback(z.number().int(), 1).default(1),
  limit: fallback(z.number().int(), 6).default(6),
});

const CANONICAL = "https://precocerto-fj.lovable.app/precos-por-categoria";

export const Route = createFileRoute("/precos-por-categoria")({
  validateSearch: zodValidator(searchSchema),
  search: {
    middlewares: [retainSearchParams(["cat", "q", "sort", "stores", "limit"])],
  },
  head: () => ({
    meta: [
      { title: "Menores preços por categoria — PreçoCerto" },
      {
        name: "description",
        content:
          "Veja o menor preço de cada produto organizado por categoria — hortifruti, higiene, grãos, limpeza e mais — com filtros e ordenação.",
      },
      { property: "og:title", content: "Menores preços por categoria — PreçoCerto" },
      {
        property: "og:description",
        content:
          "Lista de menores preços agrupada por categoria, com filtro por categoria, busca e ordenação por preço ou economia.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Menores preços por categoria — PreçoCerto" },
      {
        name: "twitter:description",
        content: "Menores preços por categoria com filtros e ordenação.",
      },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
  }),
  component: () => (
    <ProtectedGate>
      <PrecosPorCategoriaPage />
    </ProtectedGate>
  ),
  errorComponent: ({ error, reset }) => (
    <RouteError message={(error as Error)?.message} onRetry={reset} />
  ),
  notFoundComponent: () => (
    <RouteError title="Página não encontrada" message="Volte para o início e tente novamente." />
  ),
});

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

type SortKey = "price" | "savings" | "name";

function PrecosPorCategoriaPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const sort: SortKey =
    search.sort === "savings" ? "savings" : search.sort === "name" ? "name" : "price";
  const minStores = Math.max(1, search.stores || 1);
  const perCategory = Math.max(3, search.limit || 6);
  const q = (search.q || "").trim();

  const setSearch = (patch: Partial<z.infer<typeof searchSchema>>) => {
    navigate({ search: (prev: z.infer<typeof searchSchema>) => ({ ...prev, ...patch }) });
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ["price-comparisons"],
    queryFn: async (): Promise<Comparison[]> => {
      const { data, error } = await supabase.rpc("get_price_comparisons");
      if (error) throw error;
      return (data as unknown as Comparison[]) ?? [];
    },
    staleTime: 30 * 60_000,
  });

  /** Categorias disponíveis com contagem (sempre a partir do dataset completo). */
  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of data ?? []) {
      const slug = (c.category || "outros").toLowerCase();
      map.set(slug, (map.get(slug) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([slug, count]) => ({ slug, label: categoryLabel(slug), count }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  /** Agrupamento filtrado + ordenado. */
  const groups = useMemo(() => {
    const nq = norm(q);
    const rows = (data ?? []).filter((c) => {
      if (c.store_count < minStores) return false;
      if (search.cat && (c.category || "outros").toLowerCase() !== search.cat) return false;
      if (nq && !norm(c.display_name).includes(nq) && !norm(c.cheapest_store || "").includes(nq))
        return false;
      return Number.isFinite(c.min_price) && c.min_price > 0;
    });

    const byCat = new Map<string, Comparison[]>();
    for (const r of rows) {
      const slug = (r.category || "outros").toLowerCase();
      const list = byCat.get(slug);
      if (list) list.push(r);
      else byCat.set(slug, [r]);
    }

    const cmp = (a: Comparison, b: Comparison) => {
      if (sort === "savings") return (b.savings_pct ?? 0) - (a.savings_pct ?? 0);
      if (sort === "name") return a.display_name.localeCompare(b.display_name, "pt-BR");
      return a.min_price - b.min_price;
    };

    return [...byCat.entries()]
      .map(([slug, items]) => {
        const sorted = [...items].sort(cmp);
        return {
          slug,
          label: categoryLabel(slug),
          total: items.length,
          cheapest: Math.min(...items.map((i) => i.min_price)),
          items: sorted.slice(0, perCategory),
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }, [data, q, minStores, search.cat, sort, perCategory]);

  const totalShown = groups.reduce((s, g) => s + g.items.length, 0);

  return (
    <PageShell>
      <Nav />
      <PageShellContent className="container-page py-6 md:py-8">
        {/* Cabeçalho */}
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className={tc.eyebrow}>Panorama de preços</p>
            <h1 className={cn(tc.h1, "mt-1")}>Menores preços por categoria</h1>
            <p className={cn(tc.sectionNote, "mt-1 max-w-2xl")}>
              Hortifruti, higiene, grãos e mais — o menor preço atual de cada produto,
              agrupado por categoria, com filtros e ordenação.
            </p>
          </div>
          <Link
            to="/melhores-precos"
            className={cn(
              tc.control,
              "inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3 py-2 text-foreground/80 transition-colors hover:bg-muted",
            )}
          >
            Ver ranking geral <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </header>

        {/* Filtros */}
        <section
          aria-label="Filtros"
          className="mb-5 rounded-2xl border border-border/60 bg-card/60 p-3 md:p-4"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <label className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={q}
                onChange={(e) => setSearch({ q: e.target.value })}
                placeholder="Buscar produto ou mercado…"
                aria-label="Buscar produto ou mercado"
                className={cn(
                  tc.body,
                  "w-full rounded-xl border border-border/70 bg-background py-2 pl-9 pr-3 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <label className={cn(tc.control, "text-muted-foreground")} htmlFor="sort">
                Ordenar
              </label>
              <select
                id="sort"
                value={sort}
                onChange={(e) => setSearch({ sort: e.target.value })}
                className={cn(
                  tc.body,
                  "rounded-xl border border-border/70 bg-background px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <option value="price">Menor preço</option>
                <option value="savings">Maior economia</option>
                <option value="name">Nome (A–Z)</option>
              </select>

              <label className={cn(tc.control, "text-muted-foreground")} htmlFor="stores">
                Mercados
              </label>
              <select
                id="stores"
                value={String(minStores)}
                onChange={(e) => setSearch({ stores: Number(e.target.value) })}
                className={cn(
                  tc.body,
                  "rounded-xl border border-border/70 bg-background px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <option value="1">Todos</option>
                <option value="2">2 ou mais</option>
                <option value="3">3 ou mais</option>
              </select>
            </div>
          </div>

          {/* Chips de categoria */}
          <div className="mt-3 flex flex-wrap gap-2">
            <CategoryChip
              active={!search.cat}
              label="Todas"
              onClick={() => setSearch({ cat: "" })}
            />
            {categories.map((c) => (
              <CategoryChip
                key={c.slug}
                active={search.cat === c.slug}
                label={`${c.label} · ${c.count}`}
                onClick={() => setSearch({ cat: search.cat === c.slug ? "" : c.slug })}
              />
            ))}
          </div>
        </section>

        {/* Conteúdo */}
        {isLoading ? (
          <RankingSkeleton />
        ) : error ? (
          <RouteError message={(error as Error).message} />
        ) : totalShown === 0 ? (
          <FeedbackEmptyState
            title="Nenhum produto encontrado"
            message="Ajuste a busca, a categoria ou o número mínimo de mercados."
          />
        ) : (
          <div className="space-y-6">
            {groups.map((g) => (
              <section key={g.slug} aria-label={g.label}>
                <div className="mb-2 flex items-end justify-between gap-3">
                  <h2 className={cn(tc.sectionTitle, "flex items-center gap-2")}>
                    <Tags className="h-4 w-4 text-[var(--pc-gold-ink)]" aria-hidden />
                    {g.label}
                  </h2>
                  <p className={tc.metaMuted}>
                    {g.total} {g.total === 1 ? "produto" : "produtos"} · a partir de{" "}
                    <span className="pc-price font-semibold text-foreground">
                      {formatBRL(g.cheapest)}
                    </span>
                  </p>
                </div>

                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {g.items.map((item) => (
                    <li key={item.product_key}>
                      <ProductRow item={item} />
                    </li>
                  ))}
                </ul>

                {g.total > g.items.length && (
                  <button
                    type="button"
                    onClick={() => setSearch({ cat: g.slug, limit: 24 })}
                    className={cn(
                      tc.control,
                      "mt-2 inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3 py-1.5 text-foreground/80 transition-colors hover:bg-muted",
                    )}
                  >
                    Ver todos de {g.label} <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </section>
            ))}
          </div>
        )}
      </PageShellContent>
    </PageShell>
  );
}

/* ------------------------------------------------------------------ */
/* Subcomponentes                                                      */
/* ------------------------------------------------------------------ */

function CategoryChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        tc.chip,
        "rounded-full border px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border/70 bg-background text-foreground/75 hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
}

function ProductRow({ item }: { item: Comparison }) {
  const href = item.catalog_slug ? `/produto/${item.catalog_slug}` : null;
  const savings = Math.round(item.savings_pct ?? 0);

  const body = (
    <article
      className={cn(
        "flex h-full flex-col justify-between gap-2 rounded-2xl border border-border/60 bg-card p-3 transition-colors",
        href && "hover:border-primary/50 hover:bg-muted/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className={cn(tc.body, "line-clamp-2 font-medium")}>{item.display_name}</h3>
        {savings > 0 && (
          <span
            className={cn(
              tc.chip,
              "inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-1 text-emerald-700 dark:text-emerald-300",
            )}
          >
            <TrendingDown className="h-3 w-3" aria-hidden />
            {savings}%
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-2">
        <p className={cn(tc.dataPrimary, "text-foreground")}>{formatBRL(item.min_price)}</p>
        <p className={cn(tc.metaMuted, "flex items-center gap-1 text-right")}>
          <StoreIcon className="h-3.5 w-3.5" aria-hidden />
          <span className="font-medium text-[var(--pc-gold-ink)]">
            {shortenStoreName(item.cheapest_store || "—")}
          </span>
        </p>
      </div>
    </article>
  );

  return href ? (
    <Link to={href} className="block h-full focus-visible:outline-none">
      {body}
    </Link>
  ) : (
    body
  );
}
