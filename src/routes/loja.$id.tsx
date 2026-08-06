import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  FileDown,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Save,
  Scale,
  Search,
  Share2,
  SlidersHorizontal,
  Store as StoreIcon,
  ShoppingBag,
  Trash2,
  X,
  AlertTriangle,
  Download,
  History,
} from "lucide-react";
import { exportStoreCatalog } from "@/lib/export.functions";
import { toast } from "sonner";
import { MobileNav } from "@/components/nav/MobileNav";
import { SwipeRow } from "@/components/SwipeRow";
import {
  compareStoreCart,
  getPublicStoreCatalog,
  type CartCompareStore,
  type PublicStoreProduct,
} from "@/lib/stores-public.functions";
import { saveStoreQuote } from "@/lib/store-quotes.functions";
import { exportStoreQuotePdf } from "@/lib/store-quote-pdf";
import { cn } from "@/lib/utils";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { StoreSkeleton } from "@/components/loja/StoreSkeleton";
import { Price } from "@/components/ds/Price";
import { ShareButton } from "@/components/ds/ShareButton";

const storeCatalogQuery = (id: string) =>
  queryOptions({
    queryKey: ["public-store", id],
    queryFn: () => getPublicStoreCatalog({ data: { id } }),
    staleTime: 30_000,
  });

export const Route = createFileRoute("/loja/$id")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q.slice(0, 60) : "",
    from: typeof search.from === "string" ? search.from.slice(0, 20) : "",
  }),
  beforeLoad: async ({ location, context, params }) => {
    // Bloqueia visitantes sem conta ANTES de qualquer render. Em paralelo,
    // dispara o prefetch do catálogo para reduzir o tempo do skeleton.
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!data.session) {
        throw redirect({
          to: "/cadastro",
          replace: true,
          search: { redirect: location.href },
        });
      }
    } catch (err) {
      if (err && typeof err === "object" && "to" in err) throw err;
      throw redirect({ to: "/login", replace: true });
    }

    // Sessão validada — inicia o fetch imediatamente (fire-and-forget).
    // O loader chamará ensureQueryData e reaproveitará a promise em voo,
    // então o skeleton aparece apenas pelo tempo restante de rede.
    void context.queryClient.prefetchQuery(storeCatalogQuery(params.id));
  },
  loader: async ({ context, params }) => {
    try {
      await context.queryClient.ensureQueryData(storeCatalogQuery(params.id));
    } catch {
      throw notFound();
    }
  },
  head: ({ params }) => ({
    meta: [
      { title: `Catálogo da mercado — PreçoCerto` },
      { name: "description", content: `Preços registrados no estabelecimento ${params.id}.` },
    ],
  }),
  pendingComponent: () => <StoreSkeleton />,
  notFoundComponent: () => (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-muted">
        <StoreIcon className="h-7 w-7 text-muted-foreground" />
      </div>
      <h2 className="font-display text-lg font-semibold text-foreground">Mercado não encontrada</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Este estabelecimento pode ter sido removido ou o link está incorreto.
      </p>
      <Link
        to="/"
        className="mt-5 inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para o início
      </Link>
    </div>
  ),
  errorComponent: ({ error, reset }) => (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h2 className="font-display text-lg font-semibold text-foreground">
        Não conseguimos carregar a mercado
      </h2>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        Sua sessão pode ter expirado ou houve uma instabilidade momentânea. Entre novamente para
        continuar de onde parou.
      </p>
      {error instanceof Error && error.message && (
        <p className="mt-2 max-w-xs truncate text-[11px] text-muted-foreground/70">
          {error.message}
        </p>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex h-10 items-center rounded-full border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:border-primary/40"
        >
          Tentar novamente
        </button>
        <a
          href={`/login?redirect=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/")}`}
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para o login
        </a>

      </div>
    </div>
  ),
  component: () => (
    <ProtectedGate>
      <StorePage />
    </ProtectedGate>
  ),
});


const fmtPPU = (n: number, label: string) =>
  `${label} ${n < 10 ? n.toFixed(2).replace(".", ",") : n.toFixed(2).replace(".", ",")}`;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const now = Date.now();
  const diffDays = Math.floor((now - d.getTime()) / 86_400_000);
  if (diffDays <= 0) return "hoje";
  if (diffDays === 1) return "ontem";
  if (diffDays < 7) return `há ${diffDays} dias`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

type SortKey = "name" | "price-asc" | "price-desc" | "ppu-asc" | "recent";
const SORT_LABELS: Record<SortKey, string> = {
  name: "Nome (A–Z)",
  "price-asc": "Menor preço",
  "price-desc": "Maior preço",
  "ppu-asc": "Preço por unidade",
  recent: "Mais recentes",
};

const PAGE_SIZE = 24;

/* ============================ Local cart ============================ */

type CartRow = { productName: string; price: number; quantity: number };

function useStoreCart(storeId: string) {
  const key = `precocerto:store-cart:${storeId}`;
  const [items, setItems] = useState<Record<string, CartRow>>({});

  // hydrate
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(key);
      if (raw) setItems(JSON.parse(raw) as Record<string, CartRow>);
    } catch {
      /* ignore */
    }
  }, [key]);

  // persist
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(key, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [key, items]);

  const add = (p: PublicStoreProduct) =>
    setItems((prev) => {
      const cur = prev[p.slug];
      return {
        ...prev,
        [p.slug]: {
          productName: p.productName,
          price: p.price,
          quantity: (cur?.quantity ?? 0) + 1,
        },
      };
    });

  const dec = (slug: string) =>
    setItems((prev) => {
      const cur = prev[slug];
      if (!cur) return prev;
      if (cur.quantity <= 1) {
        const { [slug]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [slug]: { ...cur, quantity: cur.quantity - 1 } };
    });

  const remove = (slug: string) =>
    setItems((prev) => {
      const { [slug]: _, ...rest } = prev;
      return rest;
    });

  const clear = () => setItems({});

  const entries = Object.entries(items);
  const totalQty = entries.reduce((a, [, r]) => a + r.quantity, 0);
  const total = entries.reduce((a, [, r]) => a + r.price * r.quantity, 0);

  return { items, entries, totalQty, total, add, dec, remove, clear };
}

/* ============================== Page =============================== */

function StorePage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(storeCatalogQuery(id));
  const { store, products, categories } = data;

  const initialQ = Route.useSearch().q;
  const [q, setQ] = useState(initialQ);
  const [cat, setCat] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("name");
  const [sortOpen, setSortOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [cartOpen, setCartOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareTargetStore, setCompareTargetStore] = useState<string | null>(null);
  const [compareResults, setCompareResults] = useState<CartCompareStore[] | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const cart = useStoreCart(id);

  const handleExport = async (format: 'csv' | 'pdf') => {
    setIsExporting(true);
    try {
      const res = await exportStoreCatalog({ data: { storeId: id, format } });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (res.content) {
        const blob = new Blob([res.content], { type: format === 'csv' ? 'text/csv' : 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.filename || `precos-${id}.${format}`;
        a.click();
        toast.success(`Exportação concluída com sucesso!`);
      }
    } catch (err) {
      toast.error("Erro ao exportar dados.");
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => setPage(1), [q, cat, sort]);

  // Invalidate cached comparison whenever cart changes.
  useEffect(() => {
    setCompareResults(null);
  }, [cart.entries.length, cart.total]);

  const filtered = useMemo(() => {
    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const raw = q.trim();
    const tokens = norm(raw).split(/\s+/).filter((t) => t.length >= 1);
    let list = products.slice();
    if (cat !== "all") {
      const label = categories.find((c) => c.key === cat)?.label;
      if (label) list = list.filter((p) => p.category === label);
    }
    if (tokens.length > 0) {
      list = list.filter((p) => {
        const hay = norm(`${p.productName} ${p.baseName} ${p.barcode ?? ""} ${p.category ?? ""}`);
        return tokens.every((t) => hay.includes(t));
      });
    }
    switch (sort) {
      case "price-asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "ppu-asc":
        list.sort((a, b) => {
          const av = a.pricePerUnit ?? Infinity;
          const bv = b.pricePerUnit ?? Infinity;
          if (av === bv) return a.price - b.price;
          return av - bv;
        });
        break;
      case "recent":
        list.sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());
        break;
      default:
        list.sort((a, b) => a.productName.localeCompare(b.productName, "pt-BR"));
    }
    return list;
  }, [products, categories, q, cat, sort]);

  const visible = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < filtered.length;

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setPage((p) => p + 1);
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, visible.length]);

  const featured = useMemo(() => {
    const byPPU = products.filter((p) => p.pricePerUnit != null);
    byPPU.sort((a, b) => (a.pricePerUnit ?? 0) - (b.pricePerUnit ?? 0));
    const base = byPPU.length >= 4 ? byPPU : [...products].sort((a, b) => a.price - b.price);
    return base.slice(0, 10);
  }, [products]);

  return (
    <div className="min-h-[100svh] bg-background pb-[calc(var(--mobile-nav-height)+5.5rem)] text-foreground">
      <div className="mx-auto max-w-md px-4 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <div className="flex items-center justify-between gap-2">
          {Route.useSearch().from === "ranking" ? (
            <Link
              to="/app"
              hash="ranking-lojas"
              className="inline-flex items-center gap-1.5 pt-2 text-[12px] font-semibold text-primary hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar ao ranking
            </Link>
          ) : (
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 pt-2 text-[12px] font-semibold text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar
            </Link>
          )}
          <ShareButton
            size="sm"
            title={`${store.name} — PreçoCerto`}
            text={`Veja os preços de ${store.name} no PreçoCerto`}
          />
        </div>



        <header className="relative mt-3 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          {/* Gradient banner */}
          <div className="relative h-20 bg-gradient-to-br from-primary/25 via-primary/10 to-accent/20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,theme(colors.primary/30),transparent_60%)]" />
            <span className="absolute left-3 top-2 inline-flex items-center gap-1 rounded-full bg-background/85 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary shadow-sm backdrop-blur">
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
              Mercado verificada
            </span>
          </div>

          <div className="px-4 pb-4">
            {/* Logo overlaps the banner */}
            <div className="-mt-8 flex items-end gap-3">
              {store.logoUrl ? (
                <img
                  src={store.logoUrl}
                  alt={store.name}
                  className="h-16 w-16 shrink-0 rounded-2xl border-2 border-background bg-background object-contain shadow-md"
                  loading="lazy"
                  decoding="async"
                  width={64}
                  height={64}
                />
              ) : (
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border-2 border-background bg-primary/10 text-primary shadow-md">
                  <StoreIcon className="h-7 w-7" strokeWidth={1.75} />
                </span>
              )}
              <div className="min-w-0 flex-1 pb-1">
                <h1 className="truncate font-display text-[19px] font-bold leading-tight text-foreground">
                  {store.name}
                </h1>
                <p className="mt-0.5 flex items-center gap-1 truncate text-[11.5px] text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">
                    {[store.neighborhood, `${store.city}/${store.state}`].filter(Boolean).join(" · ")}
                  </span>
                </p>
              </div>
            </div>

            {store.address && (
              <p className="mt-2 line-clamp-2 text-[11px] text-muted-foreground">
                {store.address}
              </p>
            )}

            {/* Stats grid — Produtos · Categorias · Última leitura */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-border bg-background/60 px-2.5 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Produtos
                </p>
                <p className="num mt-0.5 font-display text-[16px] font-bold text-foreground">
                  {products.length}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background/60 px-2.5 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Categorias
                </p>
                <p className="num mt-0.5 font-display text-[16px] font-bold text-foreground">
                  {categories.length}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background/60 px-2.5 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Atualizado
                </p>
                <p className="mt-0.5 font-display text-[12px] font-semibold leading-tight text-foreground">
                  {formatDate(store.lastUpdate)}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Search */}
        <div className="mt-4 relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value.slice(0, 60))}
            inputMode="search"
            enterKeyHint="search"
            placeholder="Buscar produto, marca ou código"
            aria-label="Buscar no catálogo"
            className="h-11 w-full rounded-full border border-border bg-surface pl-10 pr-10 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-black/5"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Category chips */}
        {categories.length > 0 && (
          <div className="mt-3">
            <SwipeRow ariaLabel="Filtrar por categoria">
              <CategoryChip
                active={cat === "all"}
                onClick={() => setCat("all")}
                label={`Todas · ${products.length}`}
              />
              {categories.map((c) => (
                <CategoryChip
                  key={c.key}
                  active={cat === c.key}
                  onClick={() => setCat(c.key)}
                  label={`${c.label} · ${c.count}`}
                />
              ))}
            </SwipeRow>
          </div>
        )}

        {/* Sort + count */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="shrink-0 text-[11.5px] text-muted-foreground">
            <span className="num font-semibold text-foreground">{filtered.length}</span>{" "}
            {filtered.length === 1 ? "produto" : "produtos"}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSort((s) => (s === "price-asc" ? "name" : "price-asc"))}
              aria-pressed={sort === "price-asc"}
              title="Ordenar do menor para o maior preço"
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition",
                sort === "price-asc"
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-surface text-foreground hover:border-primary/40",
              )}
            >
              <span aria-hidden>↑</span>
              Menor preço
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setSortOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={sortOpen}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[11.5px] font-semibold text-foreground hover:border-primary/40"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {SORT_LABELS[sort]}
              </button>
              {sortOpen && (
                <div
                  role="listbox"
                  className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
                  onMouseLeave={() => setSortOpen(false)}
                >
                  {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      role="option"
                      aria-selected={sort === k}
                      onClick={() => {
                        setSort(k);
                        setSortOpen(false);
                      }}
                      className={cn(
                        "block w-full px-3.5 py-2 text-left text-[12.5px]",
                        sort === k
                          ? "bg-primary/10 font-semibold text-primary"
                          : "text-foreground hover:bg-muted",
                      )}
                    >
                      {SORT_LABELS[k]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Featured */}
        {featured.length > 0 && !q && cat === "all" && (
          <section aria-label="Destaques" className="mt-4">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="font-display text-[13px] font-semibold text-foreground">
                Melhores desta mercado
              </h2>
              <span className="text-[11px] text-muted-foreground">arraste →</span>
            </div>
            <SwipeRow ariaLabel="Destaques da mercado">
              {featured.map((p) => (
                <FeaturedCard
                  key={p.slug}
                  storeId={id}
                  p={p}
                  qty={cart.items[p.slug]?.quantity ?? 0}
                  onAdd={() => cart.add(p)}
                  onDec={() => cart.dec(p.slug)}
                />
              ))}
            </SwipeRow>
          </section>
        )}

        {/* Main list */}
        <section aria-label="Produtos" className="mt-4">
          {filtered.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-surface p-4 text-center text-[13px] text-muted-foreground">
              Nenhum produto encontrado.
            </p>
          ) : (
            <>
              {(() => {
                // Group by category only when browsing "all" without an active search;
                // otherwise render a flat list so sort order is honored.
                const groupByCategory = cat === "all" && q.trim() === "";
                if (!groupByCategory) {
                  return (
                    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
                      {visible.map((p) => (
                        <ProductRow
                          key={p.slug}
                          storeId={id}
                          p={p}
                          qty={cart.items[p.slug]?.quantity ?? 0}
                          onAdd={() => cart.add(p)}
                          onDec={() => cart.dec(p.slug)}
                        />
                      ))}
                    </ul>
                  );
                }
                // Preserve the order defined by `categories` (already ranked by count)
                const groups = new Map<string, PublicStoreProduct[]>();
                for (const p of visible) {
                  const key = p.category || "Outros";
                  const arr = groups.get(key) ?? [];
                  arr.push(p);
                  groups.set(key, arr);
                }
                const ordered = categories
                  .map((c) => ({ label: c.label, items: groups.get(c.label) ?? [] }))
                  .filter((g) => g.items.length > 0);
                // Append any leftover categories not in `categories` (e.g. "Outros")
                for (const [label, items] of groups) {
                  if (!ordered.some((g) => g.label === label)) {
                    ordered.push({ label, items });
                  }
                }
                return (
                  <div className="space-y-5">
                    {ordered.map((group) => (
                      <div key={group.label}>
                        <div className="sticky top-0 z-10 -mx-4 mb-2 flex items-center justify-between bg-background/95 px-4 py-1.5 backdrop-blur">
                          <h3 className="font-display text-[12px] font-bold uppercase tracking-[0.14em] text-foreground">
                            {group.label}
                          </h3>
                          <button
                            type="button"
                            onClick={() => {
                              const key = categories.find((c) => c.label === group.label)?.key;
                              if (key) setCat(key);
                            }}
                            className="num text-[11px] font-semibold text-primary hover:underline"
                          >
                            {group.items.length} {group.items.length === 1 ? "item" : "itens"} →
                          </button>
                        </div>
                        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
                          {group.items.map((p) => (
                            <ProductRow
                              key={p.slug}
                              storeId={id}
                              p={p}
                              qty={cart.items[p.slug]?.quantity ?? 0}
                              onAdd={() => cart.add(p)}
                              onDec={() => cart.dec(p.slug)}
                            />
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                );
              })()}
              {hasMore && (
                <div
                  ref={sentinelRef}
                  className="py-4 text-center text-[11px] text-muted-foreground"
                >
                  Carregando mais…
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* Floating cart footer */}
      {cart.totalQty > 0 && (
        <div
          className="fixed left-0 right-0 z-30 border-t border-border bg-surface/95 shadow-[0_-6px_20px_-8px_rgba(0,0,0,0.12)] backdrop-blur"
          style={{
            bottom: "calc(var(--mobile-nav-height) + env(safe-area-inset-bottom))",
          }}
        >
          <div className="mx-auto flex max-w-md items-center gap-2 px-4 py-3">
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="flex flex-1 items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-left text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              <span className="relative">
                <ShoppingBag className="h-4 w-4" />
                <span className="num absolute -right-2 -top-2 grid h-4 min-w-[16px] place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-accent-foreground">
                  {cart.totalQty}
                </span>
              </span>
              <span className="text-[12px] font-semibold uppercase tracking-wider">
                Ver cesta
              </span>
              <Price value={cart.total} size="md" className="ml-auto" />
            </button>
            <button
              type="button"
              onClick={() => setCompareOpen(true)}
              aria-label="Comparar com outros mercados"
              className="grid h-11 w-11 place-items-center rounded-full border border-primary/40 bg-surface text-primary shadow-sm transition hover:bg-primary/10"
              title="Comparar com outros mercados"
            >
              <Scale className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {cartOpen && (
        <CartDrawer
          storeId={id}
          storeName={store.name}
          entries={cart.entries}
          total={cart.total}
          comparison={compareResults}
          onClose={() => setCartOpen(false)}
          onDec={cart.dec}
          onInc={(slug) => {
            const row = cart.items[slug];
            if (!row) return;
            cart.add({
              slug,
              productName: row.productName,
              price: row.price,
            } as unknown as PublicStoreProduct);
          }}
          onRemove={cart.remove}
          onClear={cart.clear}
          onCompare={() => {
            setCartOpen(false);
            setCompareOpen(true);
          }}
        />
      )}

      {compareOpen && (
        <CompareDrawer
          storeId={id}
          storeName={store.name}
          entries={cart.entries}
          initialResults={compareResults}
          onResults={setCompareResults}
          onClose={() => setCompareOpen(false)}
        />
      )}

      <MobileNav />
    </div>
  );
}

/* ========================= Sub-components ========================= */

function CategoryChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 snap-start whitespace-nowrap rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-surface text-foreground hover:border-primary/40",
      )}
    >
      {label}
    </button>
  );
}

function ProductRow({
  storeId,
  p,
  qty,
  onAdd,
  onDec,
}: {
  storeId: string;
  p: PublicStoreProduct;
  qty: number;
  onAdd: () => void;
  onDec: () => void;
}) {
  return (
    <li>
      <div className="flex h-[68px] items-center gap-3 px-4">
        <Link
          to="/loja/$id/produto/$slug"
          params={{ id: storeId, slug: p.slug }}
          className="flex min-w-0 flex-1 flex-col justify-center"
        >
          <p className="truncate text-[13px] font-semibold leading-tight text-foreground">
            {p.productName}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0 text-[11px] leading-tight text-muted-foreground">
            {p.unit && <span>{p.unit}</span>}
            {p.pricePerUnit != null && p.unitLabel && (
              <span className="num">{fmtPPU(p.pricePerUnit, p.unitLabel)}</span>
            )}
          </div>
          <Price as="p" value={p.price} size="md" className="mt-0.5" />
        </Link>
        <QtyControl qty={qty} onAdd={onAdd} onDec={onDec} />
      </div>
    </li>
  );
}

function QtyControl({
  qty,
  onAdd,
  onDec,
}: {
  qty: number;
  onAdd: () => void;
  onDec: () => void;
}) {
  if (qty === 0) {
    return (
      <button
        type="button"
        onClick={onAdd}
        aria-label="Adicionar à cesta"
        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
        Cesta
      </button>
    );
  }
  return (
    <div className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/40 bg-primary/10 p-0.5">
      <button
        type="button"
        onClick={onDec}
        aria-label="Diminuir"
        className="grid h-7 w-7 place-items-center rounded-full text-primary hover:bg-primary/20"
      >
        <Minus className="h-3.5 w-3.5" strokeWidth={2.4} />
      </button>
      <span className="num min-w-[18px] text-center text-[12px] font-bold text-primary">
        {qty}
      </span>
      <button
        type="button"
        onClick={onAdd}
        aria-label="Aumentar"
        className="grid h-7 w-7 place-items-center rounded-full text-primary hover:bg-primary/20"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
      </button>
    </div>
  );
}

function FeaturedCard({
  storeId,
  p,
  qty,
  onAdd,
  onDec,
}: {
  storeId: string;
  p: PublicStoreProduct;
  qty: number;
  onAdd: () => void;
  onDec: () => void;
}) {
  return (
    <div className="group relative flex h-[236px] w-[124px] shrink-0 snap-start flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm transition-transform duration-300 ease-out hover:-translate-y-0.5">
      <Link
        to="/loja/$id/produto/$slug"
        params={{ id: storeId, slug: p.slug }}
        className="grid h-[92px] w-full shrink-0 place-items-center overflow-hidden bg-gradient-to-br from-primary/10 via-surface to-accent/10"
      >
        {p.imageUrl ? (
          <img
            src={p.imageUrl}
            alt={p.productName}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            width={124}
            height={92}
            draggable={false}
          />
        ) : (
          <span className="font-display text-[24px] font-bold text-primary/85">
            {p.productName.charAt(0).toUpperCase()}
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-0.5 p-1.5">
        <p className="line-clamp-1 min-h-[11px] text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {p.category}
        </p>
        <Link
          to="/loja/$id/produto/$slug"
          params={{ id: storeId, slug: p.slug }}
          className="line-clamp-2 min-h-[2.2em] text-[11px] font-semibold leading-tight text-foreground hover:text-primary"
        >
          {p.productName}
        </Link>
        <Price as="p" value={p.price} size="sm" className="mt-auto" />
        <div className="mt-0.5">
          <QtyControl qty={qty} onAdd={onAdd} onDec={onDec} />
        </div>
      </div>
    </div>
  );
}

/* ============================ Drawers ============================ */

type DrawerProps = {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

function Drawer({ onClose, title, children, footer }: DrawerProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative mx-auto flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-border bg-background shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-display text-[15px] font-bold text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-3">{children}</div>
        {footer && <div className="border-t border-border bg-surface px-4 py-3">{footer}</div>}
      </div>
    </div>
  );
}

function CartDrawer({
  storeId,
  storeName,
  entries,
  total,
  comparison,
  onClose,
  onInc,
  onDec,
  onRemove,
  onClear,
  onCompare,
}: {
  storeId: string;
  storeName: string;
  entries: Array<[string, CartRow]>;
  total: number;
  comparison: CartCompareStore[] | null;
  onClose: () => void;
  onInc: (slug: string) => void;
  onDec: (slug: string) => void;
  onRemove: (slug: string) => void;
  onClear: () => void;
  onCompare: () => void;
}) {
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);
  const saveFn = useServerFn(saveStoreQuote);

  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const filtered = useMemo(() => {
    const raw = q.trim();
    if (!raw) return entries;
    const needle = norm(raw);
    return entries.filter(([, row]) => norm(row.productName).includes(needle));
  }, [entries, q]);

  const cartPayload = () =>
    entries.map(([slug, row]) => ({
      slug,
      productName: row.productName,
      price: row.price,
      quantity: row.quantity,
    }));

  const comparisonPayload = () =>
    comparison?.map((r) => ({
      storeId: r.storeId,
      storeName: r.storeName,
      city: r.city,
      state: r.state,
      total: r.total,
      matchedCount: r.matchedCount,
      totalCount: r.totalCount,
      isReference: r.isReference,
    })) ?? null;

  async function handleShareOrSave(makePublic: boolean, forShare: boolean) {
    if (entries.length === 0) return;
    setSaving(true);
    try {
      const { id } = await saveFn({
        data: {
          storeId,
          storeName,
          cart: cartPayload(),
          comparison: comparisonPayload(),
          isPublic: makePublic,
        },
      });
      if (forShare && typeof window !== "undefined") {
        const url = `${window.location.origin}/cotacao/${id}`;
        try {
          if (navigator.share) {
            await navigator.share({ title: `Cotação — ${storeName}`, url });
          } else {
            await navigator.clipboard.writeText(url);
            toast.success("Link copiado para a área de transferência");
          }
        } catch {
          try {
            await navigator.clipboard.writeText(url);
            toast.success("Link copiado");
          } catch {
            toast.message(url);
          }
        }
      } else {
        toast.success("Cotação salva no seu perfil");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao salvar cotação";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  function handlePdf() {
    if (entries.length === 0) return;
    exportStoreQuotePdf({
      storeName,
      cart: cartPayload(),
      comparison: comparisonPayload(),
    });
  }

  return (
    <Drawer
      onClose={onClose}
      title={`Cesta — ${storeName}`}
      footer={
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total
            </span>
            <Price value={total} size="lg" />
          </div>
          <button
            type="button"
            onClick={onCompare}
            disabled={entries.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wider text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
          >
            <Scale className="h-4 w-4" />
            Comparar com outros mercados
          </button>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handlePdf}
              disabled={entries.length === 0}
              className="inline-flex items-center justify-center gap-1 rounded-full border border-primary/40 bg-surface px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-primary hover:bg-primary/10 disabled:opacity-50"
            >
              <FileDown className="h-3.5 w-3.5" /> PDF
            </button>
            <button
              type="button"
              onClick={() => handleShareOrSave(false, false)}
              disabled={entries.length === 0 || saving}
              className="inline-flex items-center justify-center gap-1 rounded-full border border-primary/40 bg-surface px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-primary hover:bg-primary/10 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Salvar
            </button>
            <button
              type="button"
              onClick={() => handleShareOrSave(true, true)}
              disabled={entries.length === 0 || saving}
              className="inline-flex items-center justify-center gap-1 rounded-full border border-primary/40 bg-surface px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-primary hover:bg-primary/10 disabled:opacity-50"
            >
              <Share2 className="h-3.5 w-3.5" /> Compartilhar
            </button>
          </div>
          <p className="text-center text-[11px] text-muted-foreground">
            Sistema de pesquisa de preços — não realizamos pagamentos.
          </p>
        </div>
      }
    >
      {entries.length === 0 ? (
        <p className="py-8 text-center text-[12.5px] text-muted-foreground">
          Sua cesta está vazia. Toque em <span className="font-semibold">+ Cesta</span> nos
          produtos para montar sua compra.
        </p>
      ) : (
        <>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value.slice(0, 60))}
              placeholder="Buscar item na cesta"
              aria-label="Buscar na cesta"
              className="h-9 w-full rounded-full border border-border bg-surface pl-9 pr-8 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                aria-label="Limpar"
                className="absolute right-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-black/5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-[12px] text-muted-foreground">
              Nenhum item na cesta corresponde a “{q}”.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map(([slug, row]) => (
                <li key={slug} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-semibold text-foreground">
                      {row.productName}
                    </p>
                    <p className="num mt-0.5 text-[11px] text-muted-foreground">
                      <Price value={row.price} size="xs" tone="muted" /> × {row.quantity} ={" "}
                      <span className="font-semibold text-foreground">
                        <Price value={row.price * row.quantity} size="xs" />
                      </span>
                    </p>
                  </div>
                  <QtyControl qty={row.quantity} onAdd={() => onInc(slug)} onDec={() => onDec(slug)} />
                  <button
                    type="button"
                    onClick={() => onRemove(slug)}
                    aria-label="Remover"
                    className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
              <li className="pt-3">
                <button
                  type="button"
                  onClick={onClear}
                  className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-destructive"
                >
                  Limpar cesta
                </button>
              </li>
            </ul>
          )}
        </>
      )}
    </Drawer>
  );
}

function CompareDrawer({
  storeId,
  storeName,
  entries,
  initialResults,
  onResults,
  onClose,
}: {
  storeId: string;
  storeName: string;
  entries: Array<[string, CartRow]>;
  initialResults: CartCompareStore[] | null;
  onResults: (r: CartCompareStore[] | null) => void;
  onClose: () => void;
}) {
  const compareFn = useServerFn(compareStoreCart);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<CartCompareStore[] | null>(initialResults);

  useEffect(() => {
    if (initialResults) return; // cache hit — skip refetch
    if (entries.length === 0) {
      setResults([]);
      onResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    compareFn({
      data: {
        storeId,
        items: entries.map(([, row]) => ({
          productName: row.productName,
          quantity: row.quantity,
        })),
      },
    })
      .then((data) => {
        if (cancelled) return;
        setResults(data);
        onResults(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Falha ao comparar";
        setError(msg);
        toast.error(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [compareFn, storeId, entries, initialResults, onResults]);

  const ref = results?.find((r) => r.isReference);
  const refTotal = ref?.total ?? 0;

  return (
    <Drawer onClose={onClose} title="Comparar cesta entre mercados">
      {loading && (
        <div className="flex items-center justify-center gap-2 py-10 text-[12.5px] text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Calculando…
        </div>
      )}
      {error && !loading && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-[12px] text-destructive">
          {error}
        </p>
      )}
      {!loading && !error && results && results.length === 0 && (
        <p className="py-8 text-center text-[12.5px] text-muted-foreground">
          Adicione produtos à cesta para comparar.
        </p>
      )}
      {!loading && !error && results && results.length > 0 && (
        <>
          <p className="mb-3 text-[11.5px] text-muted-foreground">
            Comparação da mesma cesta em cada estabelecimento cadastrado. Estimativa baseada no
            preço mais recente registrado para cada produto.
          </p>
          <ul className="space-y-2">
            {results.map((r) => (
              <CompareRow
                key={r.storeId}
                store={r}
                refTotal={refTotal}
                isCurrent={r.storeId === storeId}
                currentName={storeName}
              />
            ))}
          </ul>
        </>
      )}
    </Drawer>
  );
}

function CompareRow({
  store,
  refTotal,
  isCurrent,
  currentName,
}: {
  store: CartCompareStore;
  refTotal: number;
  isCurrent: boolean;
  currentName: string;
}) {
  const [open, setOpen] = useState(false);
  const complete = store.matchedCount === store.totalCount;
  const diff = refTotal > 0 ? store.total - refTotal : 0;
  const pct = refTotal > 0 ? (diff / refTotal) * 100 : 0;
  const cheaper = diff < 0 && complete;
  return (
    <li
      className={cn(
        "overflow-hidden rounded-2xl border bg-surface shadow-sm",
        isCurrent ? "border-primary/50" : "border-border",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-3 text-left"
      >
        {store.logoUrl ? (
          <img
            src={store.logoUrl}
            alt={store.storeName}
            className="h-10 w-10 shrink-0 rounded-lg border border-border object-contain"
            loading="lazy"
            decoding="async"
            width={40}
            height={40}
          />
        ) : (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <StoreIcon className="h-4 w-4" strokeWidth={1.75} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[12.5px] font-semibold text-foreground">
              {store.storeName}
            </p>
            {isCurrent && (
              <span className="rounded-full bg-primary/15 px-1.5 py-[1px] text-[11px] font-bold uppercase tracking-wider text-primary">
                Atual
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {store.city}/{store.state} · {store.matchedCount}/{store.totalCount} itens
            encontrados
          </p>
        </div>
        <div className="shrink-0 text-right">
          <Price
            as="p"
            value={store.total}
            size="md"
            tone={cheaper ? "best" : "default"}
          />
          {!isCurrent && complete && refTotal > 0 && (
            <p
              className={cn(
                "num text-[11px] font-semibold",
                cheaper
                  ? "text-savings dark:text-savings"
                  : diff > 0
                  ? "text-destructive"
                  : "text-muted-foreground",
              )}
            >
              {cheaper ? "▼" : diff > 0 ? "▲" : "="} {Math.abs(pct).toFixed(1).replace(".", ",")}%
            </p>
          )}
          {!complete && (
            <p className="text-[11px] font-semibold uppercase tracking-wider text-warning">
              parcial
            </p>
          )}
        </div>
      </button>
      {open && (
        <ul className="divide-y divide-border border-t border-border bg-background/40 text-[11.5px]">
          {store.items.map((it, i) => (
            <li key={`${it.productName}-${i}`} className="flex items-center gap-2 px-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-foreground">
                  {it.productName}
                </span>
                {it.matched ? (
                  <span className="text-[11px] text-muted-foreground">
                    <Price value={it.unitPrice ?? 0} size="xs" tone="muted" /> × {it.quantity}
                    {it.matchedName && it.matchedName.toUpperCase() !== it.productName.toUpperCase()
                      ? ` · como "${it.matchedName}"`
                      : ""}
                  </span>
                ) : (
                  <span className="text-[11px] text-warning">
                    Sem registro em {isCurrent ? currentName : store.storeName}
                  </span>
                )}
              </span>
              {it.matched ? (
                <Price value={it.subtotal ?? 0} size="xs" className="shrink-0" />
              ) : (
                <span className="shrink-0 font-semibold text-muted-foreground">—</span>
              )}
              {it.matched && (
                <Check
                  className="h-3.5 w-3.5 shrink-0 text-savings dark:text-savings"
                  strokeWidth={2.5}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
