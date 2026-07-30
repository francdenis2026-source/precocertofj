import { createFileRoute, useNavigate, Link, retainSearchParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";

import { Nav } from "@/components/brand/Nav";
import { PageShell, PageShellContent } from "@/components/layout/PageShell";
import { PriceSpotlight } from "@/components/product/PriceSpotlight";

import { HomeBrandLink } from "@/components/layout/HomeBrandLink";
import { ShareButton } from "@/components/ds";
import { PrecoCertoMark } from "@/components/typography/PrecoCertoMark";
import { tc } from "@/lib/typeclear";
import { dsx } from "@/lib/ds";
import { cn } from "@/lib/utils";

import { supabase } from "@/integrations/supabase/client";
import { useSignedLogoUrls } from "@/hooks/use-signed-logo-urls";
import { SlidersHorizontal, PackageSearch, Share2, TrendingDown, Trophy, Store as StoreIcon, ArrowRight, Clock, AlertTriangle, RefreshCw, Search as SearchIcon, ChevronLeft, ChevronRight, Flag, X } from "lucide-react";
import { toast } from "sonner";
import { formatRelative } from "@/components/product/TrustIndicator";
import { shortenStoreName } from "@/lib/store-name";
import { TeaserCard } from "@/components/paywall/TeaserGate";
import { FreeQuotaBadge } from "@/components/paywall/FreeQuotaBadge";
import { PaywallInline } from "@/components/paywall/PaywallInline";
import { useTeaserQuota } from "@/hooks/use-teaser-quota";

import { QuickFilterBar } from "@/components/search/QuickFilterBar";
import { ErrorState, EmptyState as FeedbackEmptyState, LoadingGrid, RouteError } from "@/components/feedback";
import { RankingSkeleton, FadeSwap } from "@/components/layout/LoadingSkeleton";
import { usePerceivedPerfTelemetry } from "@/lib/perf-telemetry";

import { ProductImage } from "@/components/product/ProductImage";
import { UnitPriceBadge } from "@/components/product/UnitPriceBadge";
import { computeUnitPrice } from "@/lib/unit-price";
import { useMyRoles } from "@/hooks/useMyRoles";
import { usePricesRealtime } from "@/hooks/usePricesRealtime";
import { LiveUpdateBadge, useLivePulse } from "@/components/ui/live-update-badge";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { submitPriceReport } from "@/lib/stores-public.functions";
import { classifyProductType, PRODUCT_TYPE_LABEL } from "@/lib/product-type";
import { applyButcherFilter } from "@/lib/butcher-filter";
import { useButcherIds } from "@/hooks/useButcherIds";
import { useSession } from "@/hooks/useSession";
import { usePromptSignIn } from "@/components/auth/usePromptSignIn";
import { Price } from "@/components/ds/Price";
import { CATEGORY_LABELS } from "@/lib/product-category";



const PAGE_SIZE = 24;







const searchSchema = z.object({
  cat: fallback(z.string(), "").default(""),
  type: fallback(z.string(), "").default(""),
  sort: fallback(z.string(), "savings").default("savings"),
  min: fallback(z.number(), 0).default(0),
  max: fallback(z.number(), 0).default(0),
  stores: fallback(z.number().int(), 1).default(1),
  q: fallback(z.string(), "").default(""),
  page: fallback(z.number().int(), 1).default(1),
});



export const Route = createFileRoute("/melhores-precos")({
  validateSearch: zodValidator(searchSchema),
  search: {
    middlewares: [retainSearchParams(["cat", "type", "sort", "min", "max", "stores", "q", "page"])],

  },
  head: () => ({
    meta: [
      { title: "Melhores preços por produto — PreçoCerto" },
      {
        name: "description",
        content:
          "Descubra onde cada produto está mais barato, por categoria, e a diferença percentual em relação à média entre os mercados cadastrados.",
      },
      { property: "og:title", content: "Melhores preços por produto — PreçoCerto" },
      {
        property: "og:description",
        content:
          "Ranking automático de melhores preços entre mercados, com filtro por categoria e validação de tamanho e unidade.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://precocerto-fj.lovable.app/melhores-precos" },
      { property: "og:site_name", content: "PreçoCerto" },
      { property: "og:locale", content: "pt_BR" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Melhores preços por produto — PreçoCerto" },
      {
        name: "twitter:description",
        content: "Ranking automático de melhores preços entre mercados cadastrados.",
      },
    ],
    links: [
      { rel: "canonical", href: "https://precocerto-fj.lovable.app/melhores-precos" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Melhores preços por produto — PreçoCerto",
          description:
            "Ranking automático de melhores preços entre mercados, com filtro por categoria e validação de tamanho e unidade.",
          url: "https://precocerto-fj.lovable.app/melhores-precos",
          inLanguage: "pt-BR",
          isPartOf: {
            "@type": "WebSite",
            name: "PreçoCerto",
            url: "https://precocerto-fj.lovable.app",
          },
          breadcrumb: {
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Início",
                item: "https://precocerto-fj.lovable.app/",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Melhores preços",
                item: "https://precocerto-fj.lovable.app/melhores-precos",
              },
            ],
          },
        }),
      },
    ],
  }),
  component: () => (
    <ProtectedGate>
      <MelhoresPrecosPage />
    </ProtectedGate>
  ),
  errorComponent: ({ error, reset }) => (
    <RouteError message={(error as Error)?.message} onRetry={reset} />
  ),
  notFoundComponent: () => (
    <RouteError title="Página não encontrada" message="Volte para o início e tente novamente." />
  ),
});


type StoreEntry = {
  establishment_id: string;
  store_name: string;
  price: number;
  product_name: string;
  last_seen_at?: string | null;
  scans_count?: number | null;
};


type Comparison = {
  product_key: string;
  display_name: string;
  category: string;
  size_value: number | null;
  size_unit: string;
  store_count: number;
  min_price: number;
  avg_price: number;
  max_price: number;
  savings_pct: number;
  cheapest_store: string;
  cheapest_establishment_id: string;
  image_url: string | null;
  catalog_slug: string | null;
  stores: StoreEntry[];
  last_seen_at: string | null;
  total_scans: number | null;
};



function formatBRL(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatSize(size_value: number | null, size_unit: string): string | null {
  if (size_value == null) return null;
  if (size_unit === "g" && size_value >= 1000)
    return `${(size_value / 1000).toLocaleString("pt-BR")} kg`;
  if (size_unit === "ml" && size_value >= 1000)
    return `${(size_value / 1000).toLocaleString("pt-BR")} L`;
  return `${size_value.toLocaleString("pt-BR")} ${size_unit}`;
}

function MelhoresPrecosPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/melhores-precos" });
  const activeCategory = search.cat || null;
  const activeType = search.type || null;
  const sortBy: "savings" | "price" | "trend" | "unit" | "ticket" =
    search.sort === "price"
      ? "price"
      : search.sort === "trend"
        ? "trend"
        : search.sort === "unit"
          ? "unit"
          : search.sort === "ticket"
            ? "ticket"
            : "savings";

  const minStores = Math.max(1, search.stores || 1);
  const minPrice = search.min || 0;
  const maxPrice = search.max || 0;
  const q = (search.q || "").trim();
  const page = Math.max(1, search.page || 1);

  const setSearch = (
    patch: Partial<{ cat: string; type: string; sort: string; min: number; max: number; stores: number; q: string; page: number }>,
  ) => {

    navigate({
      search: (prev: Record<string, unknown>) => {
        const next = { ...prev, ...patch };
        // Qualquer filtro que muda o conjunto reseta a página, exceto quando a própria mudança é de página.
        const changingFilter = Object.keys(patch).some((k) => k !== "page");
        if (changingFilter) next.page = 1;
        return next;
      },
    });
  };


  const queryClient = useQueryClient();
  const { isAdmin } = useMyRoles();
  const { data, isLoading, isFetching, error, dataUpdatedAt } = useQuery({
    queryKey: ["price-comparisons"],
    queryFn: async (): Promise<Comparison[]> => {
      const { data, error } = await supabase.rpc("get_price_comparisons");
      if (error) throw error;
      return (data as unknown as Comparison[]) ?? [];
    },
    staleTime: 30 * 60_000,
  });

  // Atualização em tempo real: novos preços invalidam o ranking na hora.
  const live = useLivePulse();
  usePricesRealtime(() => {
    live.ping();
    void queryClient.invalidateQueries({ queryKey: ["price-comparisons"] });
  });

  // Locais de todos os mercados ativos — usados para permitir busca por cidade/bairro.
  const estabsQ = useQuery({
    queryKey: ["estabs-basics-for-melhores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("establishments")
        .select("id, name, city, neighborhood, state")
        .eq("active", true);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        name: string;
        city: string | null;
        neighborhood: string | null;
        state: string | null;
      }>;
    },
    staleTime: 30 * 60_000,
  });

  const estabsMap = useMemo(() => {
    const m = new Map<string, { name: string; city: string | null; neighborhood: string | null; state: string | null }>();
    for (const e of estabsQ.data ?? []) m.set(e.id, e);
    return m;
  }, [estabsQ.data]);

  const availableLocations = useMemo(() => {
    const set = new Set<string>();
    for (const e of estabsQ.data ?? []) {
      if (e.city) set.add(e.city);
      if (e.neighborhood) set.add(e.neighborhood);
    }
    return Array.from(set).sort();
  }, [estabsQ.data]);



  const handleRefresh = async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: ["price-comparisons"] });
      toast.success("Preços atualizados");
    } catch {
      toast.error("Não foi possível atualizar agora.");
    }
  };

  const butcherIds = useButcherIds();
  const allRows = useMemo(
    () => applyButcherFilter(data ?? [], butcherIds, { requireMinStores: 2 }),
    [data, butcherIds],
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of allRows) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
    return counts;
  }, [allRows]);

  // Tipos disponíveis são recalculados após o filtro de categoria — assim o
  // usuário só vê tipos que existem dentro do escopo escolhido.
  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of allRows) {
      if (activeCategory && r.category !== activeCategory) continue;
      const t = classifyProductType(r.display_name);
      if (t === "outros") continue;
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return counts;
  }, [allRows, activeCategory]);


  const priceBounds = useMemo(() => {
    if (allRows.length === 0) return { min: 0, max: 0 };
    let lo = Infinity, hi = 0;
    for (const r of allRows) {
      const p = Number(r.min_price);
      if (p < lo) lo = p;
      if (p > hi) hi = p;
    }
    return { min: Math.floor(lo), max: Math.ceil(hi) };
  }, [allRows]);

  const qNorm = useMemo(
    () =>
      q
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim(),
    [q],
  );

  const rows = useMemo(() => {
    const filtered = allRows.filter((r) => {
      if (activeCategory && r.category !== activeCategory) return false;
      if (activeType && classifyProductType(r.display_name) !== activeType) return false;

      if (Number(r.store_count) < minStores) return false;
      const p = Number(r.min_price);
      if (minPrice > 0 && p < minPrice) return false;
      if (maxPrice > 0 && p > maxPrice) return false;
      if (qNorm) {
        const stores = Array.isArray(r.stores) ? r.stores : [];
        const hit = stores.some((s) => {
          const e = estabsMap.get(s.establishment_id);
          const hay = [
            s.store_name,
            e?.city ?? "",
            e?.neighborhood ?? "",
            e?.state ?? "",
          ]
            .join(" ")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
          return hay.includes(qNorm);
        });
        if (!hit) return false;
      }
      return true;
    });
    return [...filtered].sort((a, b) => {
      const priceA = Number(a.min_price);
      const priceB = Number(b.min_price);
      const avgA = Number(a.avg_price);
      const avgB = Number(b.avg_price);
      const savA = Number(a.savings_pct);
      const savB = Number(b.savings_pct);

      let primary = 0;
      if (sortBy === "price") primary = priceA - priceB;
      else if (sortBy === "ticket") primary = avgA - avgB;
      else if (sortBy === "unit") {
        const ua = computeUnitPrice(priceA, a.display_name, {
          sizeValue: a.size_value,
          sizeUnit: a.size_unit,
        });
        const ub = computeUnitPrice(priceB, b.display_name, {
          sizeValue: b.size_value,
          sizeUnit: b.size_unit,
        });
        if (ua && ub) primary = ua.perBase - ub.perBase;
        else if (ua) primary = -1;
        else if (ub) primary = 1;
        else primary = priceA - priceB;
      } else if (sortBy === "trend") {
        const spreadA = priceA > 0 ? (Number(a.max_price) - priceA) / priceA : 0;
        const spreadB = priceB > 0 ? (Number(b.max_price) - priceB) / priceB : 0;
        primary = spreadB - spreadA;
      } else {
        primary = savB - savA;
      }
      if (primary !== 0) return primary;
      // Desempates: menor preço → maior economia % → alfabético
      if (priceA !== priceB) return priceA - priceB;
      if (savA !== savB) return savB - savA;
      return a.display_name.localeCompare(b.display_name, "pt-BR");
    });

  }, [allRows, activeCategory, activeType, sortBy, minStores, minPrice, maxPrice, qNorm, estabsMap]);

  usePerceivedPerfTelemetry({
    route: "/melhores-precos",
    isLoading,
    isReady: !isLoading && !error && rows.length > 0,
    count: rows.length,
  });

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = useMemo(
    () => rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [rows, currentPage],
  );

  const totalSavings = rows.reduce(
    (acc, r) => acc + (Number(r.avg_price) - Number(r.min_price)),
    0,
  );

  const maxStoreCount = useMemo(
    () => allRows.reduce((m, r) => Math.max(m, Number(r.store_count) || 0), 2),
    [allRows],
  );

  const hasFilters =
    !!activeCategory || !!activeType || minStores > 1 || minPrice > 0 || maxPrice > 0 || sortBy !== "savings" || !!q;



  return (
    <PageShell fit hideFooter>
      <Nav />
      <PageShellContent fit className="!pb-0">
      <main className="mx-auto w-full max-w-7xl flex-1 min-h-0 overflow-y-auto px-4 pb-[calc(var(--mobile-nav-height)+1rem)] pt-1 md:px-6 md:pb-6">

        {/* ---------- Cabeçalho editorial compacto ---------- */}
        <header className="border-b border-border/60 pb-2.5">
          <div className="mb-1 flex min-w-0 items-center gap-2">
            <HomeBrandLink className="-ml-1" />
            <nav
              aria-label="Trilha de navegação"
              className={dsx(tc.meta, "hidden min-w-0 items-center gap-1 sm:flex")}
            >
              <span aria-hidden className="text-border">
                /
              </span>
              <Link to="/" className="transition-colors hover:text-foreground">
                Início
              </Link>
              <span aria-hidden className="opacity-50">
                /
              </span>
              <span className="text-foreground">Ranking</span>
            </nav>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
            <div className="min-w-0">
              <span className="flex items-center gap-2">
                <span className={tc.eyebrow}>Ranking de preços</span>
                <LiveUpdateBadge active={live.active} />
              </span>
              <h1 className={dsx(tc.h1, "font-editorial pc-hero-editorial mt-0.5")} style={{ fontVariationSettings: '"opsz" 144, "SOFT" 25' }}>
                Onde cada produto está{" "}
                <PrecoCertoMark variant="inline" as="em">mais barato</PrecoCertoMark>
              </h1>
              <p className={dsx(tc.sectionNote, "mt-0.5 line-clamp-2 max-w-2xl")}>
                Comparamos itens de mesmo tamanho e unidade (ml, g, un). A economia é medida
                contra a média dos mercados que vendem o item.
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
              <FreeQuotaBadge variant="inline" />
              <ShareButton
                title="Ranking de preços — PreçoCerto"
                text="Veja onde cada produto está mais barato em Feijó/AC"
              />
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isFetching}
                  className={dsx(
                    tc.control,
                    "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-foreground transition-colors hover:border-brand-gold/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold disabled:cursor-not-allowed disabled:opacity-60",
                  )}
                  aria-label="Atualizar preços"
                  title={dataUpdatedAt ? `Atualizado ${formatRelative(new Date(dataUpdatedAt).toISOString())}` : undefined}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} strokeWidth={2} />
                  <span className="hidden sm:inline">{isFetching ? "Atualizando" : "Atualizar"}</span>
                </button>
              )}
              <button
                type="button"
                onClick={async () => {
                  if (typeof window === "undefined") return;
                  const url = window.location.href;
                  try {
                    const nav = window.navigator as Navigator & {
                      share?: (data: { url?: string; title?: string; text?: string }) => Promise<void>;
                    };
                    if (nav.share) {
                      await nav.share({ url, title: "Melhores preços — PreçoCerto" });
                      return;
                    }
                    await window.navigator.clipboard.writeText(url);
                    toast.success("Link copiado");
                  } catch {
                    try {
                      await window.navigator.clipboard.writeText(url);
                      toast.success("Link copiado");
                    } catch {
                      toast.error("Não foi possível copiar o link.");
                    }
                  }
                }}
                className={dsx(
                  tc.control,
                  "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-foreground transition-colors hover:border-brand-gold/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold",
                )}
                aria-label="Compartilhar"
              >
                <Share2 className="h-3.5 w-3.5" strokeWidth={2} />
                <span className="hidden sm:inline">Compartilhar</span>
              </button>
            </div>
          </div>
        </header>

        {/* ---------- Spotlight editorial — melhor economia do ranking ---------- */}
        {rows[0] && (
          <div className="mt-2">
            <PriceSpotlight
              kicker={`Top do ranking · ${rows[0].savings_pct.toFixed(1)}% de economia`}
              productName={rows[0].display_name}
              sizeLabel={rows[0].size_value != null ? `${rows[0].size_value} ${rows[0].size_unit}` : null}
              price={Number(rows[0].min_price)}
              storeName={rows[0].cheapest_store}
              storesAvailable={rows[0].store_count}
              detailSlug={rows[0].catalog_slug ?? rows[0].display_name}
              ctaLabel="Abrir produto"
            />
          </div>
        )}

        {/* ---------- Faixa de indicadores (linha fina, sem cards altos) ---------- */}
        <dl className="mt-2 grid grid-cols-3 divide-x divide-border/60 overflow-hidden rounded-xl border border-border bg-card/50">
          {[
            {
              icon: PackageSearch,
              label: "Produtos comparados",
              value: String(rows.length),
              hint: null as string | null,
            },
            {
              icon: TrendingDown,
              label: "Economia acumulada",
              value: formatBRL(totalSavings),
              hint: "mais barato vs média",
            },
            {
              icon: Trophy,
              label: "Melhor economia",
              value: rows[0] ? `${rows[0].savings_pct.toFixed(1)}%` : "—",
              hint: rows[0]?.display_name ?? null,
            },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="min-w-0 px-2.5 py-1.5 sm:px-3.5">
                <dt className={dsx(tc.tag, "flex min-w-0 items-center gap-1.5 text-muted-foreground")}>
                  <Icon className="h-3.5 w-3.5 shrink-0 text-gold-ink" strokeWidth={2} />
                  <span className="truncate">{s.label}</span>
                </dt>
                <dd className={dsx(tc.num, "mt-0.5 truncate font-semibold text-foreground")}>
                  {s.value}
                </dd>
                {s.hint && (
                  <p className={dsx(tc.meta, "truncate")}>{s.hint}</p>
                )}
              </div>
            );
          })}
        </dl>

        {/* ---------- Filtros ---------- */}
        <section className="mt-2 space-y-1.5">
          <CategoryTabs
            active={activeCategory}
            counts={categoryCounts}
            total={allRows.length}
            onChange={(c) => setSearch({ cat: c ?? "", type: "" })}
          />

          {typeCounts.size > 1 && (
            <QuickFilterBar
              label="Tipo"
              ariaLabel="Filtrar por tipo de produto"
              options={Array.from(typeCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 12)
                .map(([key, count]) => ({
                  value: key,
                  label:
                    PRODUCT_TYPE_LABEL[key as keyof typeof PRODUCT_TYPE_LABEL] ?? key,
                  count,
                }))}
              value={activeType}
              onChange={(next) => setSearch({ type: next ?? "" })}
              size="sm"
            />
          )}

          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <SearchIcon
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                inputMode="search"
                autoComplete="off"
                list="melhores-precos-locations"
                value={q}
                onChange={(e) => setSearch({ q: e.target.value })}
                placeholder="Buscar por cidade, bairro ou mercado"
                className={dsx(
                  tc.body,
                  "w-full rounded-full border border-border bg-background py-1.5 pl-8 pr-9 placeholder:text-muted-foreground focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/25",
                )}
                aria-label="Buscar por cidade, bairro ou mercado"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setSearch({ q: "" })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                  aria-label="Limpar busca"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <datalist id="melhores-precos-locations">
              {availableLocations.map((loc) => (
                <option key={loc} value={loc} />
              ))}
            </datalist>

            <div className="flex shrink-0 items-center gap-2 sm:pl-1">
              <p className={dsx(tc.tag, "text-muted-foreground")}>
                {rows.length} {rows.length === 1 ? "produto" : "produtos"}
              </p>
              <details className="group relative">
                <summary
                  className={dsx(
                    tc.control,
                    "flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-foreground transition-colors hover:border-brand-gold/60 [&::-webkit-details-marker]:hidden",
                  )}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Filtros
                  {hasFilters && (
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-gold" aria-label="filtros ativos" />
                  )}
                </summary>

                <div className="absolute right-0 z-30 mt-1.5 w-[min(92vw,560px)] rounded-xl border border-border bg-card p-3 shadow-lg">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className={dsx(tc.tag, "text-muted-foreground")}>Filtros avançados</span>
                    {hasFilters && (
                      <button
                        type="button"
                        onClick={() => navigate({ search: {} })}
                        className={dsx(
                          tc.tag,
                          "rounded-full border border-border bg-background px-2.5 py-0.5 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold",
                        )}
                      >
                        Limpar
                      </button>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <QuickFilterBar<"savings" | "price" | "trend" | "unit" | "ticket">
                        label="Ordenar"
                        ariaLabel="Ordenar por"
                        value={sortBy}
                        onChange={(next) => setSearch({ sort: next ?? "savings" })}
                        options={[
                          { value: "savings", label: "Maior economia %" },
                          { value: "price", label: "Menor preço" },
                          { value: "ticket", label: "Menor ticket médio" },
                          { value: "unit", label: "Menor R$/kg ou R$/L" },
                          { value: "trend", label: "Maior variação" },
                        ]}
                        size="sm"
                      />
                    </div>

                    <div>
                      <label className={dsx(tc.meta, "mb-1 block font-medium")}>
                        Mínimo de mercados:{" "}
                        <span className="font-mono text-foreground">{minStores}</span>
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={Math.max(2, maxStoreCount)}
                        step={1}
                        value={minStores}
                        onChange={(e) => setSearch({ stores: Number(e.target.value) })}
                        className="w-full accent-[var(--pc-gold-ink)]"
                        aria-label="Número mínimo de mercados com preço"
                      />
                    </div>

                    <div>
                      <label className={dsx(tc.meta, "mb-1 block font-medium")}>
                        Faixa de preço (R$)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.01"
                          value={minPrice || ""}
                          placeholder={priceBounds.min ? String(priceBounds.min) : "min"}
                          onChange={(e) => setSearch({ min: Number(e.target.value) || 0 })}
                          className={dsx(
                            tc.cell,
                            "w-full rounded-lg border border-border bg-background px-2 py-1 text-foreground focus:border-brand-gold focus:outline-none",
                          )}
                          aria-label="Preço mínimo"
                        />
                        <span className={tc.meta}>até</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.01"
                          value={maxPrice || ""}
                          placeholder={priceBounds.max ? String(priceBounds.max) : "max"}
                          onChange={(e) => setSearch({ max: Number(e.target.value) || 0 })}
                          className={dsx(
                            tc.cell,
                            "w-full rounded-lg border border-border bg-background px-2 py-1 text-foreground focus:border-brand-gold focus:outline-none",
                          )}
                          aria-label="Preço máximo"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            </div>
          </div>
        </section>

        {/* ---------- Resultados ---------- */}
        <section className="mt-2.5" aria-live="polite">
          <FadeSwap showKey={isLoading ? "loading" : error ? "error" : rows.length === 0 ? "empty" : `ready-${currentPage}`}>
            {isLoading && <RankingSkeleton rows={8} />}

            {!isLoading && error && (
              <ErrorState
                title="Não foi possível carregar as comparações"
                message={(error as Error).message}
                onRetry={() => window.location.reload()}
              />
            )}

            {!isLoading && !error && rows.length === 0 && <EmptyState hasCategory={!!activeCategory} />}

            {!isLoading && !error && rows.length > 0 && (
              <>
                <MelhoresList rows={pagedRows} startIndex={(currentPage - 1) * PAGE_SIZE} />
                {totalPages > 1 && (
                  <Pagination
                    page={currentPage}
                    totalPages={totalPages}
                    total={rows.length}
                    onChange={(p) => setSearch({ page: p })}
                  />
                )}
              </>
            )}
          </FadeSwap>
        </section>
      </main>

      {/* Página isolada — sem footer (padrão IsolatedPage). */}
      </PageShellContent>
    </PageShell>
  );
}


function MelhoresList({ rows, startIndex = 0 }: { rows: Comparison[]; startIndex?: number }) {
  const signedImages = useSignedLogoUrls(useMemo(() => rows.map((r) => r.image_url), [rows]));
  return (
    <>
      <ul className="grid animate-in fade-in gap-2.5 duration-300 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {rows.map((row, idx) => {
          const globalIdx = startIndex + idx;
          return (
            <li key={row.product_key} className="relative h-full">
              <TeaserCard
                id={row.product_key}
                index={globalIdx}
                variant="full"
                reason="Os melhores preços por mercado aparecem apenas para contas cadastradas. Crie sua conta grátis (30 dias) para ver o ranking completo."
                trackEventName="visitor_click_unlock_melhores_precos"
                trackPayload={{ product_key: row.product_key, rank: globalIdx + 1 }}
              >
                <ComparisonCard
                  row={row}
                  rank={globalIdx + 1}
                  imageOverride={row.image_url ? signedImages[row.image_url] : undefined}
                />
              </TeaserCard>
            </li>
          );
        })}
      </ul>
      <VisitorFooterCta />
    </>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const canPrev = page > 1;
  const canNext = page < totalPages;
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const windowStart = Math.max(1, page - 2);
  const windowEnd = Math.min(totalPages, windowStart + 4);
  const pages: number[] = [];
  for (let i = windowStart; i <= windowEnd; i++) pages.push(i);

  return (
    <nav
      role="navigation"
      aria-label="Paginação"
      className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/60 px-4 py-3"
    >
      <p className="font-mono text-[12.5px] uppercase tracking-[0.16em] text-muted-foreground">
        {from}–{to} de {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => canPrev && onChange(page - 1)}
          disabled={!canPrev}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[12.5px] font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-3 w-3" />
          Anterior
        </button>
        {windowStart > 1 && (
          <>
            <PageButton page={1} active={false} onClick={onChange} />
            {windowStart > 2 && <span className="px-1 text-xs text-muted-foreground">…</span>}
          </>
        )}
        {pages.map((p) => (
          <PageButton key={p} page={p} active={p === page} onClick={onChange} />
        ))}
        {windowEnd < totalPages && (
          <>
            {windowEnd < totalPages - 1 && <span className="px-1 text-xs text-muted-foreground">…</span>}
            <PageButton page={totalPages} active={false} onClick={onChange} />
          </>
        )}
        <button
          type="button"
          onClick={() => canNext && onChange(page + 1)}
          disabled={!canNext}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[12.5px] font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Próxima página"
        >
          Próxima
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </nav>
  );
}

function PageButton({
  page,
  active,
  onClick,
}: {
  page: number;
  active: boolean;
  onClick: (page: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(page)}
      aria-current={active ? "page" : undefined}
      className={
        "min-w-[2rem] rounded-full border px-2 py-1 font-mono text-[12.5px] font-semibold tabular-nums transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
        (active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground")
      }
    >
      {page}
    </button>
  );
}

function VisitorFooterCta() {
  const { isVisitor, loading } = useTeaserQuota();
  if (loading || !isVisitor) return null;
  return (
    <div className="pt-4">
      <PaywallInline
        title="Veja todos os preços e ative alertas"
        subtitle="Crie sua conta grátis para desbloquear todos os itens desta lista e ser avisado quando os favoritos abaixarem."
      />
    </div>
  );
}






function CategoryTabs({
  active,
  counts,
  total,
  onChange,
}: {
  active: string | null;
  counts: Map<string, number>;
  total: number;
  onChange: (c: string | null) => void;
}) {
  const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const ALL = "__all";
  const options = [
    { value: ALL, label: "Todas", count: total },
    ...entries.map(([cat, n]) => ({
      value: cat,
      label: CATEGORY_LABELS[cat] ?? cat,
      count: n,
    })),
  ];
  return (
    <QuickFilterBar<string>
      label="Categoria"
      ariaLabel="Filtrar por categoria"
      value={active ?? ALL}
      onChange={(next) => onChange(!next || next === ALL ? null : next)}
      options={options}
    />
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="hairline-gold rounded-xl border border-border bg-card px-4 py-3">
      <p className="font-mono text-[12.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-[20px] font-bold leading-tight tracking-tight text-foreground">
        {value}
      </p>
      {hint && <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{hint}</p>}
    </div>
  );
}


const STALE_THRESHOLD_DAYS = 30;

function formatFreshness(iso: string | null | undefined): { label: string; days: number; stale: boolean } | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;
  const days = Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
  const stale = days > STALE_THRESHOLD_DAYS;
  const label =
    days <= 0
      ? "hoje"
      : days === 1
        ? "ontem"
        : days < 30
          ? `${days}d`
          : days < 60
            ? "+1 mês"
            : `${Math.floor(days / 30)} meses`;
  return { label, days, stale };
}

function ComparisonCard({ row, rank, imageOverride }: { row: Comparison; rank: number; imageOverride?: string }) {
  const size = formatSize(row.size_value, row.size_unit);
  const stores = Array.isArray(row.stores) ? row.stores : [];
  const catLabel = CATEGORY_LABELS[row.category] ?? row.category;
  const detailSlug = row.catalog_slug ?? row.display_name;
  const isMulti = Number(row.store_count) > 1;

  const bestPrice = Number(row.min_price);
  const avgPrice = Number(row.avg_price);

  // Frescor agregado do card: usa o preço mais recente entre as mercados
  const latestIso = stores.reduce<string | null>((acc, s) => {
    if (!s.last_seen_at) return acc;
    if (!acc) return s.last_seen_at;
    return new Date(s.last_seen_at).getTime() > new Date(acc).getTime() ? s.last_seen_at : acc;
  }, row.last_seen_at ?? null);
  const cardFreshness = formatFreshness(latestIso);

  return (
    <div className="relative flex h-full flex-col">
    <Link
      to="/produto-publico/$slug"
      params={{ slug: detailSlug }}
      aria-label={`${row.display_name}${size ? ` (${size})` : ""} — abrir comparativo`}
      className={cn(
        "hairline-gold group relative flex h-full flex-col overflow-hidden",
        rank === 1 ? "pc-surface-3-interactive" : "pc-surface-2-interactive",
      )}
    >

      {/* Rank ribbon */}
      <span
        aria-label={`Posição ${rank}`}
        className="absolute left-2 top-2 z-10 inline-flex h-5 min-w-[1.75rem] items-center justify-center rounded-full border border-accent/60 bg-background/95 px-1.5 font-mono text-[12.5px] font-bold leading-none text-accent shadow-sm backdrop-blur"
      >
        {rank.toString().padStart(2, "0")}
      </span>

      {/* Media */}
      <div className="relative aspect-[3/2] w-full overflow-hidden bg-gradient-to-br from-muted/60 to-background">
        <ProductImage
          src={imageOverride ?? row.image_url}
          alt={row.display_name}
          className="absolute inset-0 h-full w-full"
          imageClassName="h-full w-full"
          fit="contain"
          loading="lazy"
          width={320}
          sizes="(min-width: 1536px) 16vw, (min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
        />
        {isMulti ? (
          <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-savings px-1.5 py-0.5 font-mono text-[12.5px] font-bold leading-none text-savings-foreground shadow-sm">
            <TrendingDown className="h-2.5 w-2.5" strokeWidth={2.4} />
            −{Number(row.savings_pct).toFixed(0)}%
          </span>
        ) : (
          <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-background/90 px-1.5 py-0.5 font-mono text-[12.5px] font-semibold leading-none text-muted-foreground shadow-sm">
            <Trophy className="h-2.5 w-2.5 text-accent" strokeWidth={2.4} />
            único
          </span>
        )}
        <span className="absolute right-1.5 bottom-1.5 inline-flex items-center gap-1 rounded-sm border border-accent/40 bg-background/90 px-1 py-0.5 font-display text-[12.5px] italic text-foreground backdrop-blur">
          <StoreIcon className="h-2.5 w-2.5 text-accent" /> {row.store_count}
        </span>
        {cardFreshness && (
          <span
            className={
              "absolute left-1.5 bottom-1.5 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[12.5px] font-semibold leading-none shadow-sm backdrop-blur " +
              (cardFreshness.stale
                ? "bg-destructive/90 text-destructive-foreground"
                : "bg-background/90 text-muted-foreground border border-accent/30")
            }
            title={latestIso ? `Preço mais recente: ${formatRelative(latestIso)}` : undefined}
            aria-label={`Preços atualizados há ${cardFreshness.label}`}
          >
            {cardFreshness.stale ? (
              <AlertTriangle className="h-2.5 w-2.5" strokeWidth={2.4} aria-hidden />
            ) : (
              <Clock className="h-2.5 w-2.5" strokeWidth={2.4} aria-hidden />
            )}
            {cardFreshness.stale ? "defasado" : `há ${cardFreshness.label}`}
          </span>
        )}
      </div>

      {/* Header — alturas fixas */}
      <div className="flex flex-col gap-0.5 px-2.5 pt-2 sm:px-3 sm:pt-2.5">
        <span className="h-3 truncate font-sans text-[12.5px] font-semibold uppercase leading-none tracking-[0.2em] text-accent">
          {catLabel || "\u00A0"}
        </span>
        <h2 className="line-clamp-2 h-[2.4em] font-display text-[13px] font-semibold leading-[1.2] tracking-tight text-foreground sm:text-[12.5px]">
          {row.display_name}
        </h2>
        <span className="h-3 truncate font-display text-[12.5px] italic leading-none text-muted-foreground">
          {size ?? "\u00A0"}
        </span>
      </div>

      {/* Price hero */}
      <div className={cn(
        "mt-1.5 border-y px-2.5 py-2 sm:px-3",
        rank === 1
          ? "border-[var(--pc-gold-ink)]/45 bg-transparent"
          : "border-accent/25 bg-background/40",
      )}>
        <span className={cn(tc.eyebrow, "mb-0.5 block")}>
          Menor preço
        </span>
        <div className="flex items-baseline justify-between gap-2">
          <Price value={bestPrice} size="lg" tone={rank === 1 ? "best" : "default"} />
          {isMulti && avgPrice > 0 && (
            <Price value={avgPrice} size="sm" tone="strike" />
          )}
        </div>
        <div className="mt-1 h-4 flex items-center">
          <UnitPriceBadge
            price={bestPrice}
            productName={row.display_name}
            sizeValue={row.size_value}
            sizeUnit={row.size_unit}
          />
        </div>
        {/* Métricas de ordenação — visíveis em todos os cards */}
        <dl className="mt-1.5 grid grid-cols-3 gap-1 border-t border-accent/15 pt-1.5 text-[12px] uppercase tracking-[0.12em] text-muted-foreground">
          <div className="min-w-0">
            <dt className="truncate">Menor</dt>
            <Price as="dd" value={bestPrice} size="sm" tone="best" className="truncate" />
          </div>
          <div className="min-w-0">
            <dt className="truncate">Ticket médio</dt>
            <Price
              as="dd"
              value={avgPrice > 0 ? avgPrice : null}
              size="sm"
              className="truncate"
            />
          </div>
          <div className="min-w-0">
            <dt className="truncate">Economia</dt>
            <dd className="pc-num truncate text-savings">
              {isMulti ? `−${Number(row.savings_pct).toFixed(1)}%` : "—"}
            </dd>
          </div>
        </dl>
      </div>


      {/* Store list — sempre 2 slots */}
      <ul className="flex-1 divide-y divide-accent/15">
        {Array.from({ length: 2 }).map((_, idx) => {
          const s = stores[idx];
          const isBest = idx === 0;
          if (!s) {
            return (
              <li
                key={`empty-${idx}`}
                className="flex h-7 items-center px-2.5 sm:h-8 sm:px-3"
                aria-hidden
              >
                <span className="text-[12.5px] italic text-muted-foreground/50">—</span>
              </li>
            );
          }
          const freshness = formatFreshness(s.last_seen_at);
          return (
            <li
              key={s.establishment_id}
              className={
                "flex h-7 items-center justify-between gap-2 px-2.5 sm:h-8 sm:px-3 " +
                (freshness?.stale ? "bg-destructive/5 " : isBest ? "bg-savings/[0.06]" : "")
              }
            >
              <div className="flex min-w-0 items-center gap-1.5">
                {isBest ? (
                  <Trophy className="h-2.5 w-2.5 shrink-0 text-accent" strokeWidth={2.25} />
                ) : (
                  <span className="h-1 w-1 shrink-0 rounded-full bg-accent/40" />
                )}
                <span
                  className={cn("truncate leading-none", tc.storeNameTight)}
                  title={s.store_name}
                >
                  {shortenStoreName(s.store_name)}
                </span>
                {freshness ? (
                  <span
                    className={
                      "inline-flex shrink-0 items-center gap-0.5 rounded-full px-1 py-0.5 text-[12.5px] font-medium leading-none " +
                      (freshness.stale
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted/60 text-muted-foreground")
                    }
                    title={s.last_seen_at ? formatRelative(s.last_seen_at) : undefined}
                  >
                    {freshness.stale ? (
                      <AlertTriangle className="h-2 w-2" aria-hidden />
                    ) : (
                      <Clock className="h-2 w-2" aria-hidden />
                    )}
                    {freshness.label}
                  </span>
                ) : null}
              </div>
              <Price
                value={Number(s.price)}
                size="sm"
                tone={
                  freshness?.stale
                    ? "strike"
                    : isBest
                      ? "savings"
                      : "muted"
                }
                className="shrink-0"
                title={s.last_seen_at ? formatRelative(s.last_seen_at) : undefined}
              />
            </li>
          );
        })}
      </ul>

      {/* Footer CTA */}
      <div className="flex h-7 items-center justify-between border-t border-accent/30 px-2.5 font-display text-[12.5px] italic leading-none text-primary sm:h-8 sm:px-3 sm:text-[12.5px]">
        <span>Ver detalhes</span>
        <ArrowRight className="h-3 w-3 shrink-0 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
    <PriceReportInlineButton
      establishmentId={stores[0]?.establishment_id ?? row.cheapest_establishment_id}
      storeName={stores[0]?.store_name ?? row.cheapest_store}
      productName={row.display_name}
      productSlug={row.catalog_slug ?? null}
      currentPrice={bestPrice}
    />
    </div>
  );
}

/**
 * Botão inline embaixo do card que permite ao usuário logado denunciar um
 * preço incorreto ou desatualizado. Mantido leve — modal simples, sem
 * upload de comprovante (o fluxo completo mora em /loja/... /produto/...).
 */
function PriceReportInlineButton({
  establishmentId,
  storeName,
  productName,
  productSlug,
  currentPrice,
}: {
  establishmentId: string;
  storeName: string;
  productName: string;
  productSlug: string | null;
  currentPrice: number;
}) {
  const { user, loading: sessionLoading } = useSession();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<"outdated" | "incorrect" | "wrong_product" | "other">("outdated");
  const [correctPrice, setCorrectPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const submit = useServerFn(submitPriceReport);
  const navigate = useNavigate();
  const promptSignIn = usePromptSignIn();

  const handleOpen = () => {
    if (sessionLoading) return;
    if (!user) {
      void promptSignIn({
        intent: "report-price",
        payload: { productName, storeName, currentPrice },
      });
      return;
    }
    setSent(false);
    setOpen(true);
  };


  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={sessionLoading}
        className="mt-1 inline-flex w-full items-center justify-center gap-1 rounded-md border border-border bg-background/70 px-2 py-1 font-mono text-[12.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive disabled:opacity-50"
        aria-label={user ? `Denunciar preço de ${productName} em ${storeName}` : `Entrar para denunciar preço de ${productName}`}
        title={user ? "Denunciar preço incorreto" : "É necessário entrar na conta para denunciar"}
      >
        <Flag className="h-2.5 w-2.5" aria-hidden />
        {user ? "Denunciar preço" : "Entrar para denunciar"}
      </button>


      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-4 shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3
                  id="report-dialog-title"
                  className="font-display text-base font-bold text-foreground"
                >
                  Denunciar preço
                </h3>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {productName} em <strong className="text-foreground">{storeName}</strong> — preço atual{" "}
                  <Price value={currentPrice} size="sm" />
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {sent ? (
              <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
                  <Flag className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="font-display text-sm font-bold text-foreground">
                  Denúncia registrada!
                </p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Nossa equipe vai revisar e atualizar o preço em breve. Obrigado por manter a base confiável.
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-3 inline-flex items-center justify-center rounded-full border border-border bg-background px-4 py-1.5 text-[13px] font-semibold text-foreground hover:bg-muted"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <>
            <div className="mt-3 space-y-3">
              <div>
                <label className="mb-1 block text-[12.5px] font-semibold text-muted-foreground">Motivo</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as typeof reason)}
                  className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="outdated">Preço desatualizado</option>
                  <option value="incorrect">Preço incorreto</option>
                  <option value="wrong_product">Produto errado</option>
                  <option value="other">Outro</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[12.5px] font-semibold text-muted-foreground">
                  Preço correto (opcional)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  value={correctPrice}
                  onChange={(e) => setCorrectPrice(e.target.value)}
                  placeholder="Ex.: 6,49"
                  className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[12.5px] font-semibold text-muted-foreground">
                  Observação (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
                  placeholder="Ex.: vi outro preço na gôndola…"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const priceNum = correctPrice.trim() ? Number(correctPrice.replace(",", ".")) : null;
                    await submit({
                      data: {
                        establishmentId,
                        productName,
                        productSlug,
                        barcode: null,
                        reportedPrice: currentPrice,
                        correctPrice: priceNum && Number.isFinite(priceNum) ? priceNum : null,
                        reason,
                        notes: notes.trim() || null,
                        evidenceUrl: null,
                      },
                    });
                    toast.success("Denúncia enviada. Obrigado por ajudar!");
                    setSent(true);
                    setNotes("");
                    setCorrectPrice("");
                  } catch (err) {
                    const msg = (err as Error).message ?? "Não foi possível enviar.";
                    if (/unauthor|401/i.test(msg)) {
                      toast.error("Sessão expirou. Entre novamente para denunciar.");
                      setOpen(false);
                      navigate({ to: "/login", search: { redirect: window.location.pathname } as never });
                    } else {
                      toast.error(msg);
                    }
                  } finally {
                    setBusy(false);
                  }
                }}
                className="inline-flex items-center gap-1 rounded-full bg-destructive px-3 py-1.5 text-[13px] font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                <Flag className="h-3 w-3" />
                {busy ? "Enviando…" : "Enviar denúncia"}
              </button>
            </div>
              </>
            )}

          </div>
        </div>
      )}
    </>
  );
}


function EmptyState({ hasCategory }: { hasCategory: boolean }) {
  return (
    <FeedbackEmptyState
      icon={PackageSearch}
      title={hasCategory ? "Nenhum produto nesta categoria ainda" : "Ainda não há produtos cadastrados"}
      message="Dica: limpe filtros muito restritivos (preço mínimo/máximo, mercados) e tente uma categoria diferente. Você também pode contribuir enviando o preço que viu na prateleira — o ranking aparece assim que o mesmo item existir em duas ou mais mercados."
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <Link
            to="/colaborar"
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-[13px] font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
          >
            Sugerir/registrar preço
          </Link>
          <Link
            to="/buscar"
            className="inline-flex h-9 items-center rounded-md border border-border/70 bg-background px-4 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted/40"
          >
            Abrir busca completa
          </Link>
        </div>
      }
    />
  );
}

