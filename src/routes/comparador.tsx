import { createFileRoute, Link, useNavigate, retainSearchParams } from "@tanstack/react-router";
import { Nav } from "@/components/brand/Nav";
import { PageShell, PageShellContent } from "@/components/layout/PageShell";
import { PriceSpotlight } from "@/components/product/PriceSpotlight";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePricesRealtime } from "@/hooks/usePricesRealtime";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ProductImage } from "@/components/product/ProductImage";
import { useSignedLogoUrls } from "@/hooks/use-signed-logo-urls";
import { shortenStoreName } from "@/lib/store-name";
import { filterAndSortComparisonRows } from "@/lib/comparison-search";
import { TeaserCard, useTeaserAccess } from "@/components/paywall/TeaserGate";
import { PaywallInline } from "@/components/paywall/PaywallInline";
import { FreeQuotaBadge } from "@/components/paywall/FreeQuotaBadge";

import { PriceHero } from "@/components/product/PriceHero";
import { SavingsBadge } from "@/components/product/SavingsBadge";
import { UnitPriceBadge } from "@/components/product/UnitPriceBadge";
import { Price } from "@/components/ds/Price";
import { ConfidenceBadge, computeConfidence } from "@/components/product/ConfidenceBadge";
import { computeUnitPrice } from "@/lib/unit-price";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { QuickFilterBar } from "@/components/search/QuickFilterBar";
import { ProductStoresDialog } from "@/components/product/ProductStoresDialog";
import { PriceRankingPanel } from "@/components/product/PriceRankingPanel";
import { equivalentGroupLabel, selectCheapestEquivalentIndexes } from "@/lib/equivalent-group";
import { auditPriceConsistency } from "@/lib/price-audit";
import { PriceAuditAlert } from "@/components/product/PriceAuditAlert";

import { useTeaserQuota } from "@/hooks/use-teaser-quota";
import { useGuestGate } from "@/hooks/useGuestGate";
import { GuestGateDialog } from "@/components/gate/GuestGateDialog";
import { useSession } from "@/hooks/useSession";
import { trackEvent } from "@/lib/analytics-events";
import {
  ErrorState,
  EmptyState,
  LoadingGrid,
  LoadingList,
} from "@/components/feedback";
import { RankingSkeleton, FadeSwap } from "@/components/layout/LoadingSkeleton";
import { usePerceivedPerfTelemetry } from "@/lib/perf-telemetry";
import { tc } from "@/lib/typeclear";
import { cn } from "@/lib/utils";
import { applyButcherFilter } from "@/lib/butcher-filter";
import { useButcherIds } from "@/hooks/useButcherIds";
import {
  Search,
  Store as StoreIcon,
  Trophy,
  ArrowRight,
  PackageSearch,
  Check,
  X,
  Scale,
  LayoutGrid,
  Rows3,
  SlidersHorizontal,
  Lock,
  Share2,
  ArrowLeft,
  BellRing,
} from "lucide-react";
import { BackButton } from "@/components/layout/BackButton";
import { HomeBrandLink } from "@/components/layout/HomeBrandLink";
import { PrecoCertoMark } from "@/components/typography/PrecoCertoMark";

type ViewMode = "grid" | "table";
type SortKey = "relevance" | "price-asc" | "savings-desc" | "unit-asc" | "name" | "confidence-desc";
type ConfFilter = "" | "alta" | "media" | "baixa";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  cat: fallback(z.string(), "").default(""),
  view: fallback(z.string(), "grid").default("grid"),
  sort: fallback(z.string(), "relevance").default("relevance"),
  sel: fallback(z.string(), "").default(""),
  conf: fallback(z.string(), "").default(""),
  p: fallback(z.string(), "").default(""),
});



export const Route = createFileRoute("/comparador")({
  validateSearch: zodValidator(searchSchema),
  search: {
    middlewares: [retainSearchParams(["view", "sort", "cat", "sel", "conf"])],
  },
  head: () => ({
    meta: [
      { title: "Comparador de preços — PreçoCerto" },
      {
        name: "description",
        content:
          "Compare preços reais de produtos nos mercados cadastrados. Do mais barato ao mais caro, com imagens e detalhes.",
      },
      { property: "og:title", content: "Comparador de preços — PreçoCerto" },
      {
        property: "og:description",
        content: "Preços reais capturados nos mercados. Encontre onde está mais barato.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://precocerto-fj.lovable.app/comparador" },
      { property: "og:site_name", content: "PreçoCerto" },
      { property: "og:locale", content: "pt_BR" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Comparador de preços — PreçoCerto" },
      {
        name: "twitter:description",
        content: "Preços reais capturados nos mercados. Encontre onde está mais barato.",
      },
    ],
    links: [
      { rel: "canonical", href: "https://precocerto-fj.lovable.app/comparador" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Comparador de preços — PreçoCerto",
          description:
            "Compare preços reais de produtos nos mercados cadastrados, do mais barato ao mais caro.",
          url: "https://precocerto-fj.lovable.app/comparador",
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
                name: "Comparador",
                item: "https://precocerto-fj.lovable.app/comparador",
              },
            ],
          },
        }),
      },
    ],
  }),
  component: ComparadorPage,
});

type StoreEntry = {
  establishment_id: string;
  store_name: string;
  price: number;
  product_name: string;
  last_seen_at?: string | null;
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

function ComparadorPage() {
  const { q, cat, view: viewParam, sort: sortParam, sel: selParam, conf: confParam, p: productParam } = Route.useSearch() as any;
  const navigate = useNavigate({ from: "/comparador" });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const isTypingTarget = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el.isContentEditable
      );
    };

    const onKey = (e: KeyboardEvent) => {
      // Cmd/Ctrl+K → focus search (works even inside inputs)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }
      // Escape while search is focused → blur and move focus to results
      if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        searchInputRef.current?.blur();
        return;
      }
      if (isTypingTarget(e.target)) return;
      // "/" → focus search
      if (e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }
      // "r" → focus results region and first focusable card
      if (e.key.toLowerCase() === "r") {
        const region = resultsRef.current;
        if (!region) return;
        e.preventDefault();
        const firstFocusable = region.querySelector<HTMLElement>(
          '[role="link"], a, button, [tabindex]:not([tabindex="-1"])',
        );
        (firstFocusable ?? region).focus();
        region.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);


  const view: ViewMode = viewParam === "table" ? "table" : "grid";
  const sortKey: SortKey =
    sortParam === "price-asc" ||
    sortParam === "savings-desc" ||
    sortParam === "unit-asc" ||
    sortParam === "name" ||
    sortParam === "confidence-desc"
      ? sortParam
      : "relevance";
  const confFilter: ConfFilter =
    confParam === "alta" || confParam === "media" || confParam === "baixa" ? confParam : "";

  const setQ = (value: string) => {
    navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, q: value }) });
  };
  const setCat = (value: string) => {
    navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, cat: value }) });
  };
  const setView = (next: ViewMode) => {
    navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, view: next }) });
  };
  const setSortKey = (next: SortKey) => {
    navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, sort: next }) });
  };
  const setConfFilter = (next: ConfFilter) => {
    navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, conf: next }) });
  };

  const queryClient = useQueryClient();
  usePricesRealtime(() => {
    void queryClient.invalidateQueries({ queryKey: ["price-comparisons-all"] });
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["price-comparisons-all"],
    queryFn: async (): Promise<Comparison[]> => {
      // PostgREST aplica um teto padrão de 1.000 linhas por resposta.
      // Como `get_price_comparisons` pode devolver > 1.000 produtos,
      // paginamos explicitamente com `.range()` até esgotar o retorno.
      const PAGE = 1000;
      const acc: Comparison[] = [];
      for (let offset = 0; ; offset += PAGE) {
        const { data, error } = await supabase
          .rpc("get_price_comparisons")
          .range(offset, offset + PAGE - 1);
        if (error) throw error;
        const batch = (data as unknown as Comparison[]) ?? [];
        acc.push(...batch);
        if (batch.length < PAGE) break;
      }
      return acc;
    },
    staleTime: 30 * 60_000,
  });

  const butcherIds = useButcherIds();
  const allRows = useMemo(
    () => applyButcherFilter(data ?? [], butcherIds, { requireMinStores: 2 }),
    [data, butcherIds],
  );

  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of allRows) {
      const c = (r.category ?? "outros").trim() || "outros";
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);
  }, [allRows]);

  // Cache local (por sessão) das linhas derivadas por chave de consulta.
  // Evita reprocessar `filterAndSortComparisonRows` quando o usuário alterna
  // entre filtros já vistos (categoria, ordenação, texto).
  const derivedCacheRef = useRef<Map<string, Comparison[]>>(new Map());
  const rows: Comparison[] = useMemo(() => {
    const key = `${allRows.length}|${q}|${cat}|${sortKey}|${confFilter}`;
    const cached = derivedCacheRef.current.get(key);
    if (cached) return cached;
    const next = filterAndSortComparisonRows(allRows, q, cat) as unknown as Comparison[];
    if (derivedCacheRef.current.size > 24) {
      const firstKey = derivedCacheRef.current.keys().next().value;
      if (firstKey) derivedCacheRef.current.delete(firstKey);
    }
    derivedCacheRef.current.set(key, next);
    return next;
  }, [allRows, q, cat, sortKey, confFilter]);

  usePerceivedPerfTelemetry({
    route: "/comparador",
    isLoading,
    isReady: !isLoading && !error && rows.length > 0,
    count: rows.length,
  });


  /**
   * Grupo equivalente: mesmos termos buscados + mesmo tamanho + mesma
   * categoria, atravessando marcas (ex.: óleo de soja 900ml Coamo/Soya/
   * Concórdia). Garante que o "menor preço" mostrado seja realmente o mais
   * baixo do município para aquele item — e não o da marca mais popular.
   *
   * IMPORTANTE: este é o ÚNICO ponto que decide o menor preço quando há busca
   * ativa. O card "Menor preço agora" e o ranking leem daqui, então nunca
   * podem divergir (antes o card varria todos os resultados e podia apontar
   * outro produto/estabelecimento).
   */
  const equivalentRanking = useMemo(() => {
    if (!q.trim() || rows.length === 0) return null;
    const idxs = selectCheapestEquivalentIndexes(
      rows.map((r) => ({
        name: r.display_name,
        category: r.category,
        sizeValue: r.size_value,
        sizeUnit: r.size_unit,
        minPrice: r.min_price,
        samples: r.store_count,
      })),
      q,
    );
    const members = idxs.map((i) => rows[i]).filter(Boolean);
    if (members.length === 0) return null;
    const cheapestMember = members.reduce((best, row) =>
      Number(row.min_price) < Number(best.min_price) ? row : best,
    members[0]);

    // Melhor preço por mercado dentro do grupo (produto mais barato da loja).
    const byStore = new Map<string, { store_name: string; establishment_id?: string | null; price: number; product_name?: string | null; last_seen_at?: string | null }>();
    const push = (s: {
      store_name: string;
      establishment_id?: string | null;
      price: number;
      product_name?: string | null;
      last_seen_at?: string | null;
    }) => {
      const price = Number(s.price);
      if (!Number.isFinite(price) || price <= 0) return;
      const key = s.establishment_id ?? s.store_name;
      if (!key) return;
      const cur = byStore.get(key);
      if (!cur || price < cur.price) byStore.set(key, { ...s, price });
    };
    for (const m of members) {
      const list = m.stores ?? [];
      if (list.length > 0) {
        for (const s of list) {
          push({
            store_name: s.store_name,
            establishment_id: s.establishment_id,
            price: Number(s.price),
            product_name: s.product_name ?? m.display_name,
            last_seen_at: s.last_seen_at,
          });
        }
      } else if (m.cheapest_store) {
        // Fallback: cache sem detalhamento por loja — não perder o menor preço.
        push({
          store_name: m.cheapest_store,
          establishment_id: m.cheapest_establishment_id,
          price: Number(m.min_price),
          product_name: m.display_name,
          last_seen_at: null,
        });
      }
    }
    const stores = Array.from(byStore.values()).sort((a, b) => a.price - b.price);
    if (stores.length === 0) return null;
    return {
      label:
        members.length > 1
          ? equivalentGroupLabel(members.map((m) => m.display_name), cheapestMember.display_name)
          : cheapestMember.display_name,
      sizeLabel: formatSize(cheapestMember.size_value, cheapestMember.size_unit),
      brands: members.length,
      stores,
      cheapest: stores[0],
      referenceRow: cheapestMember,
    };
  }, [rows, q]);

  const stats = useMemo(() => {
    const stores = new Set<string>();
    let cheapestRow: (typeof rows)[number] | null = null;
    for (const r of rows) {
      for (const s of r.stores) stores.add(s.establishment_id);
      const price = Number(r.min_price);
      if (!Number.isFinite(price) || price <= 0) continue;
      if (!cheapestRow || price < Number(cheapestRow.min_price)) cheapestRow = r;
    }
    // Com busca ativa, o menor preço vem do MESMO grupo comparado no ranking.
    const eq = equivalentRanking?.cheapest;
    return {
      cheapest: eq ? eq.price : (cheapestRow?.min_price ?? null),
      cheapestName: eq
        ? (eq.product_name ?? equivalentRanking?.label ?? null)
        : (cheapestRow?.display_name ?? null),
      cheapestStore: eq ? eq.store_name : (cheapestRow?.cheapest_store ?? null),
      storeCount: stores.size,
      productCount: rows.length,
    };
  }, [rows, equivalentRanking]);

  /**
   * Verificação automática a cada pesquisa: confere se o menor preço exibido
   * no card bate exatamente com o topo do ranking equivalente e varre as
   * linhas em busca de faixa invertida, divergência entre fontes e lojas
   * ausentes no cache. Só aparece na tela quando encontra algo.
   */
  const auditReport = useMemo(() => {
    if (rows.length === 0) return null;
    const report = auditPriceConsistency({
      rows: rows.map((r) => ({
        display_name: r.display_name,
        min_price: r.min_price,
        max_price: r.max_price,
        cheapest_store: r.cheapest_store,
        store_count: r.store_count,
        stores: (r.stores ?? []).map((s) => ({
          store_name: s.store_name,
          establishment_id: s.establishment_id,
          price: Number(s.price),
        })),
      })),
      ranking: equivalentRanking
        ? {
            label: equivalentRanking.label,
            cheapest: {
              store_name: equivalentRanking.cheapest.store_name,
              establishment_id: equivalentRanking.cheapest.establishment_id,
              price: Number(equivalentRanking.cheapest.price),
            },
            stores: equivalentRanking.stores.map((s) => ({
              store_name: s.store_name,
              establishment_id: s.establishment_id,
              price: Number(s.price),
            })),
          }
        : null,
      card: { price: stats.cheapest != null ? Number(stats.cheapest) : null, storeName: stats.cheapestStore },
    });
    return report.issues.length > 0 ? report : null;
  }, [rows, equivalentRanking, stats]);

  useEffect(() => {
    if (auditReport && auditReport.criticalCount > 0) {
      console.warn("[auditoria de preços]", auditReport.issues);
    }
  }, [auditReport]);





  const signedImages = useSignedLogoUrls(useMemo(() => rows.map((r) => r.image_url), [rows]));

  const confidenceByKey = useMemo(() => {
    const map = new Map<string, { level: "alta" | "media" | "baixa"; rank: number }>();
    const rankOf = (l: "alta" | "media" | "baixa") => (l === "alta" ? 3 : l === "media" ? 2 : 1);
    for (const r of rows) {
      const c = computeConfidence({
        storeCount: r.stores?.length ?? 0,
        minPrice: Number(r.min_price),
        avgPrice: Number(r.avg_price),
        maxPrice: Number(r.max_price),
        hasSize: Boolean(r.size_value && r.size_unit),
      });
      map.set(r.product_key, { level: c.level, rank: rankOf(c.level) });
    }
    return map;
  }, [rows]);

  const lowQualityCount = useMemo(
    () => Array.from(confidenceByKey.values()).filter((c) => c.level === "baixa").length,
    [confidenceByKey],
  );

  const filteredRows = useMemo(() => {
    if (!confFilter) return rows;
    return rows.filter((r) => confidenceByKey.get(r.product_key)?.level === confFilter);
  }, [rows, confFilter, confidenceByKey]);

  const sortedRows = useMemo(() => {
    const arr = sortKey === "relevance" ? [...filteredRows] : [...filteredRows];
    if (sortKey === "price-asc") arr.sort((a, b) => Number(a.min_price) - Number(b.min_price));
    else if (sortKey === "savings-desc") arr.sort((a, b) => Number(b.savings_pct) - Number(a.savings_pct));
    else if (sortKey === "name") arr.sort((a, b) => a.display_name.localeCompare(b.display_name, "pt-BR"));
    else if (sortKey === "confidence-desc") {
      arr.sort((a, b) => {
        const ra = confidenceByKey.get(a.product_key)?.rank ?? 0;
        const rb = confidenceByKey.get(b.product_key)?.rank ?? 0;
        if (rb !== ra) return rb - ra;
        return Number(a.min_price) - Number(b.min_price);
      });
    } else if (sortKey === "unit-asc") {
      arr.sort((a, b) => {
        const ua = computeUnitPrice(Number(a.min_price), a.display_name, {
          sizeValue: a.size_value,
          sizeUnit: a.size_unit,
        });
        const ub = computeUnitPrice(Number(b.min_price), b.display_name, {
          sizeValue: b.size_value,
          sizeUnit: b.size_unit,
        });
        if (ua && ub) return ua.perBase - ub.perBase;
        if (ua) return -1;
        if (ub) return 1;
        return Number(a.min_price) - Number(b.min_price);
      });
    }
    return arr;
  }, [filteredRows, sortKey, confidenceByKey]);

  const MAX_SEL = 3;
  const selected = useMemo<string[]>(() => {
    if (!selParam) return [];
    return String(selParam)
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean)
      .slice(0, MAX_SEL);
  }, [selParam]);
  const setSelected = (next: string[]) => {
    const value = next.join(",");
    navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, sel: value }) });
  };
  const compareGate = useGuestGate("compare");
  const toggleSelect = (key: string) => {
    if (selected.includes(key)) {
      setSelected(selected.filter((k) => k !== key));
    } else {
      if (selected.length >= MAX_SEL) return;
      // Visitantes: cada produto único adicionado consome 1 uso da cota.
      if (!compareGate.allow(`compare:${key}`)) return;
      setSelected([...selected, key]);
    }
  };
  const selectedRows = useMemo(
    () => selected.map((k) => rows.find((r) => r.product_key === k)).filter(Boolean) as Comparison[],
    [selected, rows],
  );

  const handleShare = async () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    try {
      const nav = window.navigator as Navigator & {
        share?: (data: { url?: string; title?: string; text?: string }) => Promise<void>;
      };
      if (nav.share) {
        await nav.share({ url, title: "Comparador de preços — PreçoCerto" });
        return;
      }
      await window.navigator.clipboard.writeText(url);
      toast.success("Link copiado", { description: "Compartilhe esta comparação com quem quiser." });
    } catch {
      try {
        await window.navigator.clipboard.writeText(url);
        toast.success("Link copiado");
      } catch {
        toast.error("Não foi possível copiar o link.");
      }
    }
  };

  // Cota grátis para visitantes: consome 1 crédito só quando o visitante
  // realmente inicia um comparativo (marca ao menos 1 produto). Só entrar
  // na página não gasta cota. `consumeOnce` garante 1 débito por sessão.
  const quota = useTeaserQuota(3);
  const { user } = useSession();

  // Telemetria: mede quantos visitantes chegam ao comparador (uma vez por sessão)
  // e quantos usuários abrem o drilldown por estabelecimento.
  useEffect(() => {
    if (quota.loading) return;
    if (quota.isVisitor) {
      trackEvent("visitor_view_comparador");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quota.loading, quota.isVisitor]);

  useEffect(() => {
    if (!quota.loading && quota.isVisitor && selected.length > 0) {
      quota.consumeOnce("comparador:selecionou");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.length, quota.loading]);
  const TEASER_PREVIEW = 3;
  // Paginação: mantém a página curta (tipografia maior sem estourar a altura).
  const [RESULTS_PAGE_SIZE, setResultsPageSize] = useState(12);
  useEffect(() => {
    const sync = () => setResultsPageSize(window.innerWidth < 768 ? 4 : 12);
    sync();
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(sync);
    };
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => {
    setPage(1);
  }, [q, cat, sortKey, view, RESULTS_PAGE_SIZE]);
  const pagedRows = useMemo(
    () => sortedRows.slice((page - 1) * RESULTS_PAGE_SIZE, page * RESULTS_PAGE_SIZE),
    [sortedRows, page, RESULTS_PAGE_SIZE],
  );
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / RESULTS_PAGE_SIZE));
  const visibleRows = quota.exceeded ? sortedRows.slice(0, TEASER_PREVIEW) : pagedRows;

  // Dialog "Preços por estabelecimento" — sincronizado com o querystring `?p=<product_key>`
  // para que voltar/avançar no navegador reabra o mesmo produto.
  const openStoresRow = useMemo<Comparison | null>(() => {
    if (!productParam) return null;
    return rows.find((r) => r.product_key === productParam) ?? null;
  }, [productParam, rows]);
  const setOpenStoresRow = (row: Comparison | null) => {
    if (row && user) {
      trackEvent("user_open_comparador_drilldown", { product_key: row.product_key });
    }
    navigate({
      search: (prev: Record<string, unknown>) => ({ ...prev, p: row?.product_key ?? "" }),
    });
  };







  const filtersNode = (
    <>
        {categoryOptions.length > 0 && (
        <div className="mt-4">
          <QuickFilterBar<string>
            label="Categoria"
            ariaLabel="Filtrar por categoria"
            value={cat || null}
            onChange={(next) => setCat(next ?? "")}
            options={[
              { value: "__all", label: "Todas" },
              ...categoryOptions.map((c) => ({ value: c.key, label: c.key, count: c.count })),
            ].map((o) =>
              o.value === "__all"
                ? { value: "", label: o.label as string }
                : (o as { value: string; label: string; count?: number }),
            )}
          />
        </div>
      )}

      {/* Sort + view chips — consistent chip design (QuickFilterBar) */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <QuickFilterBar<SortKey>
          label="Ordenar"
          ariaLabel="Ordenar produtos"
          value={sortKey}
          onChange={(next) => setSortKey(next ?? "relevance")}
          options={[
            { value: "relevance", label: "Relevância" },
            { value: "price-asc", label: "Menor preço", hint: "Preço crescente" },
            { value: "unit-asc", label: "Menor R$/kg ou R$/L", hint: "Compara unidades diferentes" },
            { value: "savings-desc", label: "Maior economia %" },
            { value: "confidence-desc", label: "Maior confiança", hint: "Prioriza dados mais completos e consistentes" },
            { value: "name", label: "A–Z" },
          ]}
        />
        <QuickFilterBar<ViewMode>
          label="Visual"
          ariaLabel="Modo de exibição"
          value={view}
          onChange={(next) => setView(next ?? "grid")}
          options={[
            { value: "grid", label: (<span className="inline-flex items-center gap-1"><LayoutGrid className="h-3 w-3" /> Cards</span>) },
            { value: "table", label: (<span className="inline-flex items-center gap-1"><Rows3 className="h-3 w-3" /> Tabela</span>) },
          ]}
        />
      </div>

      {/* Confidence filter + low-quality signal */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <QuickFilterBar<ConfFilter>
          label="Confiança"
          ariaLabel="Filtrar por nível de confiança dos dados"
          value={confFilter || null}
          onChange={(next) => setConfFilter((next as ConfFilter) ?? "")}
          options={[
            { value: "alta", label: "Alta", hint: "≥ 3 mercados, dados consistentes" },
            { value: "media", label: "Parcial", hint: "2 mercados, variação elevada ou tamanho ausente" },
            { value: "baixa", label: "Baixa", hint: "1 mercado, dados divergentes ou variação muito alta" },
          ]}
        />
        {lowQualityCount > 0 && !confFilter && (
          <button
            type="button"
            onClick={() => setConfFilter("baixa")}
            className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-destructive transition hover:bg-destructive/15"
            title="Ver apenas produtos com dados de baixa qualidade"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
            {lowQualityCount} com baixa qualidade
          </button>
        )}
      </div>


    </>
  );

  return (
    <PageShell fit hideFooter>
      <Nav />
      <Breadcrumbs items={[{ label: "Comparador de preços" }]} />

      <PageShellContent fit className="!pb-0">
      <div className="flex-1 min-h-0 overflow-y-auto pb-[calc(var(--mobile-nav-height)+1rem)] md:pb-0">
      {/* BARRA DE COMANDO — mesmo cabeçalho editorial sticky do /buscar */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">

        <div className="mx-auto grid w-full max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 md:gap-6 md:px-8 md:py-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <BackButton fallbackTo="/" variant="ghost" />
            <span aria-hidden className="h-5 w-px bg-border" />
            <HomeBrandLink />
          </div>

          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--pc-gold-ink)]">
              Preços reais dos mercados
            </span>
            <h1 className="font-editorial pc-hero-editorial min-w-0 truncate whitespace-nowrap text-[20px] font-normal text-foreground sm:text-[26px] lg:text-[30px]" style={{ fontVariationSettings: '"opsz" 144, "SOFT" 25' }}>
              Comparador<span className="hidden sm:inline"> de preços</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border px-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-brand-gold hover:text-[var(--pc-gold-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
              aria-label="Compartilhar esta visualização do comparador"
            >
              <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Compartilhar</span>
            </button>
            <Link
              to="/alertas"
              title="Criar alerta quando o preço cair"
              className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border px-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-brand-gold hover:text-[var(--pc-gold-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            >
              <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Alertas de preço</span>
            </Link>
            <span aria-hidden className="hidden h-8 w-px bg-border md:block" />
            <FreeQuotaBadge variant="inline" />
          </div>
        </div>
      </header>




      <section className="mx-auto max-w-7xl px-4 pt-2.5 md:px-6 md:pt-8">
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2.5 shadow-sm transition focus-within:border-primary focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-primary)_25%,transparent)]">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={searchInputRef}
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar produto (ex.: arroz, leite, óleo…)"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            aria-label="Buscar produto (atalho: barra ou Ctrl+K)"
            aria-keyshortcuts="/ Control+K"
          />
          <kbd
            aria-hidden
            className="hidden shrink-0 rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground sm:inline-block"
            title="Atalho: / ou Ctrl+K para buscar, R para resultados"
          >
            /
          </kbd>
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="rounded-full border border-border bg-card px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
            >
              limpar
            </button>
          )}
        </div>

        {/* Filtros — inline no desktop, drawer no mobile */}
        <div className="hidden md:block">{filtersNode}</div>
        <div className="mt-3 md:hidden">
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-[12.5px] font-bold uppercase tracking-[0.1em] text-foreground transition hover:border-primary/50"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden /> Filtros e ordenação
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto">
              <SheetHeader className="text-left">
                <SheetTitle className="text-[15px]">Filtros e ordenação</SheetTitle>
              </SheetHeader>
              <div className="space-y-1 pb-8">{filtersNode}</div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Spotlight editorial — menor preço em destaque com hierarquia forte */}
        {stats.cheapest != null && (
          <div className="mt-4 md:mt-6">
            <PriceSpotlight
              kicker="Menor preço agora"
              productName={stats.cheapestName ?? "Produto em destaque"}
              price={Number(stats.cheapest)}
              storeName={stats.cheapestStore}
              storesAvailable={stats.storeCount}
              detailSlug={equivalentRanking?.referenceRow?.catalog_slug ?? equivalentRanking?.referenceRow?.display_name ?? null}
            />
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2 md:mt-4 md:gap-3">
          <StatCard label="Produtos encontrados" value={String(stats.productCount)} />
          <StatCard
            label="Mercados com preço"
            value={String(stats.storeCount)}
            hint="mercados cadastrados"
          />
        </div>

        <PriceAuditAlert report={auditReport} />

        {equivalentRanking ? (
          <div className="mt-5">
            <PriceRankingPanel
              productName={
                equivalentRanking.brands > 1
                  ? `${equivalentRanking.label} · ${equivalentRanking.brands} marcas`
                  : equivalentRanking.label
              }
              sizeLabel={equivalentRanking.sizeLabel}
              stores={equivalentRanking.stores}
              onOpenStore={
                equivalentRanking.referenceRow && equivalentRanking.brands === 1
                  ? () => setOpenStoresRow(equivalentRanking.referenceRow)
                  : undefined
              }
            />
          </div>
        ) : null}


      </section>



      <section
        ref={resultsRef}
        id="resultados"
        tabIndex={-1}
        aria-label="Resultados da comparação (atalho: R)"
        className="mx-auto max-w-7xl px-4 py-5 focus:outline-none md:px-6 md:py-10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <FadeSwap showKey={isLoading ? "loading" : error ? "error" : rows.length === 0 ? "empty" : `ready-${view}-${visibleRows.length}`}>
        {isLoading && <RankingSkeleton rows={view === "grid" ? 8 : 6} />}

        {!isLoading && error && (
          <ErrorState
            title="Não foi possível carregar os produtos"
            message={(error as Error).message}
            onRetry={() => window.location.reload()}
          />
        )}

        {!isLoading && !error && rows.length === 0 && (
          <EmptyState
            icon={PackageSearch}
            title={q ? "Nenhum produto encontrado" : "Ainda não há produtos cadastrados"}
            message={
              q
                ? "Tente outro termo de busca ou limpe o filtro."
                : "Cadastre produtos com preço nos mercados para vê-los aqui."
            }
            action={
              q ? (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  Limpar busca
                </button>
              ) : undefined
            }
          />
        )}

        {!isLoading && !error && rows.length > 0 && (
          <div aria-live="polite">
            {view === "grid" ? (
              <ul className="grid animate-in fade-in gap-2.5 duration-300 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {visibleRows.map((row, idx) => (
                  <ProductCard
                    key={row.product_key}
                    row={row}
                    index={idx}
                    imageOverride={row.image_url ? signedImages[row.image_url] : undefined}
                    selected={selected.includes(row.product_key)}
                    canSelect={selected.length < MAX_SEL || selected.includes(row.product_key)}
                    onToggleSelect={() => toggleSelect(row.product_key)}
                    onOpenStores={() => setOpenStoresRow(row)}
                  />
                ))}
              </ul>
            ) : (
              <ComparisonTable
                rows={visibleRows}
                sortKey={sortKey}
                onSortChange={setSortKey}
                selected={selected}
                canSelectMore={selected.length < MAX_SEL}
                onToggleSelect={toggleSelect}
                onOpenStores={(row) => setOpenStoresRow(row)}
              />
            )}
            {!quota.exceeded && totalPages > 1 && (
              <nav
                aria-label="Paginação dos resultados"
                className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-3"
              >
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center rounded-full border border-border bg-background px-3.5 py-1.5 text-[12.5px] font-semibold text-foreground transition hover:border-primary/50 disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="text-[12.5px] font-medium tabular-nums text-muted-foreground">
                  Página {page} de {totalPages} · {sortedRows.length} produtos
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="inline-flex items-center rounded-full border border-border bg-background px-3.5 py-1.5 text-[12.5px] font-semibold text-foreground transition hover:border-primary/50 disabled:opacity-40"
                >
                  Próxima
                </button>
              </nav>
            )}
            {quota.exceeded && (
              <div className="mt-8 pb-24">
                <PaywallInline
                  title={`Você já explorou ${quota.limit} comparações grátis`}
                  subtitle="Crie sua conta grátis para continuar comparando todos os produtos entre os mercados cadastrados — sem limite."
                />
              </div>
            )}
            {!quota.exceeded && <div className="pb-16" />}
          </div>
        )}
        </FadeSwap>
      </section>


      {selected.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <div className="pointer-events-auto flex w-full max-w-xl items-center gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Scale className="h-5 w-5 shrink-0 text-primary" strokeWidth={2.2} />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {selected.length}/{MAX_SEL} selecionado{selected.length > 1 ? "s" : ""}
                </p>
                <p className="line-clamp-1 text-[12.5px] font-medium text-foreground">
                  {selectedRows.map((r) => r.display_name).join(" · ")}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelected([])}
              className="hidden shrink-0 rounded-full border border-border bg-background px-3 py-1.5 text-[11.5px] font-semibold text-muted-foreground transition hover:text-foreground sm:inline-flex"
            >
              Limpar
            </button>


          </div>
        </div>
      )}

      <ProductStoresDialog
        open={openStoresRow != null}
        onOpenChange={(next) => {
          if (!next) setOpenStoresRow(null);
        }}
        productName={openStoresRow?.display_name ?? ""}
        category={openStoresRow?.category ?? null}
        sizeLabel={
          openStoresRow
            ? formatSize(openStoresRow.size_value, openStoresRow.size_unit)
            : null
        }
        stores={openStoresRow?.stores ?? []}
        detailSlug={
          openStoresRow?.catalog_slug ?? openStoresRow?.display_name ?? null
        }
      />

      </div>
      </PageShellContent>
      <GuestGateDialog
        open={compareGate.open}
        onOpenChange={compareGate.setOpen}
        action="compare"
        title="Comparar produtos é grátis para quem tem conta"
        description="Cadastre-se em 30 segundos (7 dias sem cartão) para montar sua cesta e comparar preços entre mercados sem limite."
      />
    </PageShell>
  );
}


// Footer removido: página isolada e compacta (padrão IsolatedPage).

/**
 * Tabela responsiva para o comparador — reaproveita os mesmos dados que
 * o grid de cards e mantém o paywall (linhas de visitante bloqueadas
 * exibem um cadeado). Não altera regras de negócio.
 *
 * - Cabeçalho sticky com colunas clicáveis (aria-sort refletindo o estado)
 * - Menor preço sempre em destaque (cor primary + tabular-nums)
 * - Layout responsivo: em telas < md, colapsa colunas secundárias
 */
function ComparisonTable({
  rows,
  sortKey,
  onSortChange,
  selected,
  canSelectMore,
  onToggleSelect,
  onOpenStores,
}: {
  rows: Comparison[];
  sortKey: SortKey;
  onSortChange: (k: SortKey) => void;
  selected: string[];
  canSelectMore: boolean;
  onToggleSelect: (key: string) => void;
  onOpenStores: (row: Comparison) => void;
}) {
  const headerBtn =
    "inline-flex items-center gap-1 rounded font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  const ariaSort = (k: SortKey): "ascending" | "descending" | "none" => {
    if (sortKey !== k) return "none";
    return k === "price-asc" || k === "name" ? "ascending" : "descending";
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_color-mix(in_oklab,var(--color-foreground)_8%,transparent)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
            <tr>
              <th scope="col" aria-sort={ariaSort("name")} className="px-4 py-3">
                <button type="button" className={headerBtn} onClick={() => onSortChange("name")}>
                  Produto
                </button>
              </th>
              <th scope="col" aria-sort={ariaSort("price-asc")} className="px-4 py-3 text-right border-l border-[color-mix(in_oklab,var(--pc-gold-ink)_35%,transparent)]">
                <button type="button" className={headerBtn} onClick={() => onSortChange("price-asc")}>
                  Menor preço
                </button>
              </th>
              <th scope="col" className="hidden px-4 py-3 text-right md:table-cell">
                <span className={headerBtn.replace("hover:text-foreground", "")}>Média</span>
              </th>
              <th scope="col" aria-sort={ariaSort("savings-desc")} className="px-4 py-3 text-right">
                <button
                  type="button"
                  className={headerBtn}
                  onClick={() => onSortChange("savings-desc")}
                >
                  Economia
                </button>
              </th>
              <th scope="col" className="hidden px-4 py-3 text-right sm:table-cell">
                <span className={headerBtn.replace("hover:text-foreground", "")}>Mercados</span>
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                <span className="sr-only">Ação</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row, idx) => (
              <ComparisonTableRow
                key={row.product_key}
                row={row}
                index={idx}
                selected={selected.includes(row.product_key)}
                canSelect={canSelectMore || selected.includes(row.product_key)}
                onToggleSelect={() => onToggleSelect(row.product_key)}
                onOpenStores={() => onOpenStores(row)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ComparisonTableRow({
  row,
  index,
  selected,
  canSelect,
  onToggleSelect,
  onOpenStores,
}: {
  row: Comparison;
  index: number;
  selected: boolean;
  canSelect: boolean;
  onToggleSelect: () => void;
  onOpenStores: () => void;
}) {
  const { locked } = useTeaserAccess(row.product_key, index);
  const isMulti = Number(row.store_count) > 1;

  if (locked) {
    return (
      <tr className="bg-card/60">
        <td colSpan={6} className="px-4 py-3">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-primary/25 bg-primary/5 px-3 py-2">
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5 text-primary" strokeWidth={2.2} />
              <span className="truncate font-medium text-foreground">{row.display_name}</span>
              <span className="hidden sm:inline text-muted-foreground">— entre grátis para ver o preço</span>
            </p>
            <Link
              to="/login"
              className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-primary transition hover:bg-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Desbloquear
            </Link>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr
      className={
        "pc-row-interactive group transition-colors " +
        (selected ? "bg-primary/[0.06]" : "")
      }
    >
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={onOpenStores}
          className="line-clamp-2 text-left font-display text-[13.5px] font-semibold leading-snug text-foreground transition hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card rounded"
          aria-label={`Ver preços de ${row.display_name} em todos os estabelecimentos`}
        >
          {row.display_name}
        </button>
        {row.category && (
          <p className="mt-0.5 text-[11px] uppercase tracking-widest text-muted-foreground">
            {row.category}
          </p>
        )}
      </td>
      <td className="pc-best-result pc-best-result--compact px-4 py-3 text-right border-l border-[color-mix(in_oklab,var(--pc-gold-ink)_20%,transparent)] bg-[color-mix(in_oklab,var(--pc-gold-ink)_5%,transparent)]" aria-label="Menor preço do produto">
        <Price as="p" value={Number(row.min_price)} size="lg" tone="best" />
        <p className={cn("mt-1 truncate pc-store-emphasis", tc.storeNameTight)} title={row.cheapest_store}>
          {shortenStoreName(row.cheapest_store)}
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-end gap-1">
          <UnitPriceBadge
            price={Number(row.min_price)}
            productName={row.display_name}
            sizeValue={row.size_value}
            sizeUnit={row.size_unit}
          />
          {(() => {
            const c = computeConfidence({
              storeCount: Number(row.store_count) || 0,
              minPrice: Number(row.min_price),
              avgPrice: Number(row.avg_price),
              maxPrice: Number(row.max_price),
              hasSize: row.size_value != null,
            });
            if (c.level === "alta") return null;
            return <ConfidenceBadge level={c.level} reasons={c.reasons} compact />;
          })()}
        </div>
      </td>
      <td className="hidden px-4 py-3 text-right md:table-cell">
        {isMulti ? (
          <span className="inline-flex flex-col items-end gap-0.5">
            <Price value={Number(row.avg_price)} size="sm" tone="strike" />
            <span className="inline-flex items-baseline gap-1 text-[11px] text-muted-foreground">
              maior
              <Price value={Number(row.max_price)} size="sm" tone="muted" />
            </span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {isMulti && Number(row.savings_pct) > 0 ? (
          <SavingsBadge pct={Number(row.savings_pct)} variant="tonal" size="sm" precision={1} />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="hidden px-4 py-3 text-right sm:table-cell">
        <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
          <StoreIcon className="h-3 w-3" /> {row.store_count}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={onToggleSelect}
          disabled={!canSelect && !selected}
          aria-pressed={selected}
          aria-label={
            selected
              ? `Remover ${row.display_name} da comparação`
              : `Adicionar ${row.display_name} à comparação`
          }
          className={
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-widest transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card " +
            (selected
              ? "border-primary bg-primary text-primary-foreground"
              : canSelect
                ? "border-border bg-background text-foreground hover:border-primary/40 hover:text-primary"
                : "cursor-not-allowed border-border bg-background/60 text-muted-foreground opacity-60")
          }
        >
          {selected ? (
            <>
              <Check className="h-3 w-3" strokeWidth={2.6} /> Selecionado
            </>
          ) : (
            "Comparar"
          )}
        </button>
      </td>
    </tr>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-2.5 md:rounded-2xl md:p-5">
      <p className="text-[11px] leading-[1.2] uppercase tracking-[0.14em] text-muted-foreground md:text-xs md:tracking-widest">
        {label}
      </p>
      <p className="mt-1 font-mono text-[17px] leading-tight text-foreground md:mt-2 md:text-2xl">
        {value}
      </p>
      {hint && <p className="mt-0.5 hidden truncate text-xs text-muted-foreground md:mt-1 md:block">{hint}</p>}
    </div>
  );
}

function ProductCardBase({
  row,
  index,
  imageOverride,
  selected,
  canSelect,
  onToggleSelect,
  onOpenStores,
}: {
  row: Comparison;
  index: number;
  imageOverride?: string;
  selected: boolean;
  canSelect: boolean;
  onToggleSelect: () => void;
  onOpenStores: () => void;
}) {
  const size = formatSize(row.size_value, row.size_unit);
  const stores = Array.isArray(row.stores) ? row.stores : [];
  const isMulti = Number(row.store_count) > 1;

  return (
    <li className="cv-card relative h-full">
      <TeaserCard
        id={row.product_key}
        index={index}
        variant="full"
        reason="Este card mostra menor preço, média e ranking de mercados — dados exclusivos para contas cadastradas. Entre grátis para comparar e abrir o drilldown por estabelecimento."
        trackEventName="visitor_click_unlock_comparador"
        trackPayload={{ product_key: row.product_key, rank: index + 1 }}
      >
      <button
        type="button"
        onClick={onToggleSelect}
        disabled={!canSelect && !selected}
        aria-pressed={selected}
        aria-label={
          selected
            ? `Remover ${row.display_name} da comparação`
            : `Adicionar ${row.display_name} à comparação`
        }
        className={
          "absolute left-2 top-2 z-20 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest shadow-sm backdrop-blur transition " +
          (selected
            ? "border-primary bg-primary text-primary-foreground"
            : canSelect
              ? "border-border bg-background/90 text-foreground hover:border-primary/40 hover:text-primary"
              : "cursor-not-allowed border-border bg-background/60 text-muted-foreground opacity-70")
        }

      >
        {selected ? (
          <>
            <Check className="h-3 w-3" strokeWidth={2.6} /> Selecionado
          </>
        ) : (
          <>
            <X className="h-3 w-3 rotate-45" strokeWidth={2.6} /> Comparar
          </>
        )}
      </button>
      <button
        type="button"
        onClick={onOpenStores}
        aria-label={`Ver preços de ${row.display_name} em todos os estabelecimentos`}
        className={
          "hairline-gold group relative flex h-full w-full flex-col overflow-hidden rounded-xl border bg-card text-left shadow-[0_1px_2px_color-mix(in_oklab,var(--color-foreground)_8%,transparent)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-18px_color-mix(in_oklab,var(--color-primary)_35%,transparent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
          (selected
            ? "border-primary ring-2 ring-primary/25"
            : "border-border hover:border-accent/50")
        }
      >
        {/* Editorial ordinal */}
        <span
          aria-hidden
          className="pointer-events-none absolute right-2.5 top-2.5 z-10 font-display text-[11px] italic tracking-tight text-accent"
        >
          Nº {String(index + 1).padStart(2, "0")}
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
          {isMulti && Number(row.savings_pct) > 0 && (
            <div className="absolute left-1.5 top-8">
              <SavingsBadge pct={Number(row.savings_pct)} variant="solid" size="sm" />
            </div>
          )}
          <span className="absolute right-1.5 bottom-1.5 inline-flex items-center gap-1 rounded-sm border border-accent/40 bg-background/90 px-1 py-0.5 font-display text-[11px] italic text-foreground backdrop-blur">
            <StoreIcon className="h-2.5 w-2.5 text-accent" /> {row.store_count}
          </span>
        </div>

        {/* Header — alturas fixas para alinhamento */}
        <div className="flex flex-col gap-0.5 px-2.5 pt-2 sm:px-3 sm:pt-2.5">
          <span className="h-3 truncate font-sans text-[11px] font-semibold uppercase leading-none tracking-[0.2em] text-accent">
            {row.category || "\u00A0"}
          </span>
          <h2 className="line-clamp-2 h-[2.4em] font-display text-[12px] font-semibold leading-[1.2] tracking-tight text-foreground sm:text-[12.5px]">
            {row.display_name}
          </h2>
          <span className="h-3 truncate font-display text-[11px] italic leading-none text-muted-foreground">
            {size ?? "\u00A0"}
          </span>
        </div>

        {/* Price hero */}
        <div className="mt-1.5 border-y border-accent/25 bg-background/40 px-2.5 py-2 sm:px-3">
          <span className="mb-0.5 flex items-baseline gap-1 font-sans text-[11px] font-semibold uppercase leading-none tracking-[0.2em] text-muted-foreground">
            Menor <PrecoCertoMark variant="label">preço</PrecoCertoMark>
          </span>
          <PriceHero
            minPrice={Number(row.min_price)}
            avgPrice={Number(row.avg_price)}
            savingsPct={Number(row.savings_pct)}
            cheapestStore={row.cheapest_store}
            isMulti={isMulti}
            size="sm"
          />
          {isMulti && (
            <p className="mt-1 truncate text-[11px] leading-tight text-muted-foreground">
              Maior no município:{" "}
              <Price value={Number(row.max_price)} size="sm" tone="muted" />
              {stores.length > 1 ? ` — ${shortenStoreName(stores[stores.length - 1].store_name)}` : ""}
            </p>
          )}
          <div className="mt-1 flex min-h-4 flex-wrap items-center gap-1">
            <UnitPriceBadge
              price={Number(row.min_price)}
              productName={row.display_name}
              sizeValue={row.size_value}
              sizeUnit={row.size_unit}
            />
            {(() => {
              const c = computeConfidence({
                storeCount: Number(row.store_count) || 0,
                minPrice: Number(row.min_price),
                avgPrice: Number(row.avg_price),
                maxPrice: Number(row.max_price),
                hasSize: row.size_value != null,
              });
              if (c.level === "alta") return null;
              return <ConfidenceBadge level={c.level} reasons={c.reasons} compact />;
            })()}
          </div>
        </div>

        {/* Store list — alturas fixas (sempre 2 slots) */}
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
                  <span className="text-[11px] italic text-muted-foreground/50">—</span>
                </li>
              );
            }
            return (
              <li
                key={s.establishment_id}
                className={
                  "flex h-7 items-center justify-between gap-2 px-2.5 sm:h-8 sm:px-3 " +
                  (isBest ? "bg-savings/[0.06]" : "")
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
                </div>
                <Price
                  value={Number(s.price)}
                  size="sm"
                  tone={isBest ? "savings" : "muted"}
                  className="shrink-0"
                />

              </li>
            );
          })}
        </ul>

        {/* Footer CTA */}
        <div className="flex h-7 items-center justify-between border-t border-accent/30 px-2.5 font-display text-[11px] italic leading-none text-primary sm:h-8 sm:px-3 sm:text-[11px]">
          <span>Ver em todas as mercados</span>
          <ArrowRight className="h-3 w-3 shrink-0 transition-transform group-hover:translate-x-0.5" />
        </div>
      </button>



      </TeaserCard>
    </li>
  );
}

// Memoizado: evita re-render de todos os cards a cada tecla/filtro no mobile.
const ProductCard = memo(ProductCardBase);

