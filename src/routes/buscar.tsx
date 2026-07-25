import { createFileRoute, Link, useNavigate, retainSearchParams } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useCallback, useEffect, useRef, useState } from "react";
import { PriceSearchBar } from "@/components/scanner/PriceSearchBar";
import { MobileNav } from "@/components/nav/MobileNav";
import type { SearchMode } from "@/lib/search-tokens";
import { FreeQuotaBadge } from "@/components/paywall/FreeQuotaBadge";
import { QuickFilterBar } from "@/components/search/QuickFilterBar";
import { ShareButton, SignupCTA } from "@/components/ds";
import { useSession } from "@/hooks/useSession";
import { trackEvent } from "@/lib/analytics-events";
import { RouteError } from "@/components/feedback";
import { SearchDiscovery, pushRecentSearch } from "@/components/search/SearchDiscovery";
import { SearchSidebar } from "@/components/search/SearchSidebar";
import { BackButton } from "@/components/layout/BackButton";
import { SiteFooter } from "@/components/layout/SiteFooter";

import { Filter, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  categoria: fallback(z.string(), "").default(""),
  mode: fallback(z.string(), "strict").default("strict"),
  pure: fallback(z.string(), "1").default("1"),
  brand: fallback(z.string(), "").default(""),
  min: fallback(z.string(), "").default(""),
  max: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/buscar")({
  validateSearch: zodValidator(searchSchema),
  search: {
    middlewares: [retainSearchParams(["q", "categoria", "mode", "pure", "brand", "min", "max"])],
  },

  head: () => ({
    meta: [
      { title: "Buscar preço por nome — PreçoCerto" },
      {
        name: "description",
        content:
          "Digite o nome do produto e veja preço médio, mínimo e onde está mais barato — sem precisar tirar foto.",
      },
      { property: "og:title", content: "Buscar preço — PreçoCerto" },
      {
        property: "og:description",
        content: "Consulte preços por nome do produto em mercados próximos.",
      },
    ],
  }),

  component: SearchPage,
  errorComponent: ({ error, reset }) => (
    <RouteError message={(error as Error)?.message} onRetry={reset} />
  ),
  notFoundComponent: () => (
    <RouteError title="Página não encontrada" message="Volte para o início e tente novamente." />
  ),
});

const STORAGE_KEY = "search:mode";
const PURE_KEY = "search:pureOnly";

function SearchPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/buscar" });
  const { user } = useSession();
  const urlSyncTimer = useRef<number | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const mode: SearchMode = search.mode === "loose" ? "loose" : "strict";
  const pureOnly = search.pure !== "0";
  const q = (search.q ?? "").slice(0, 80);
  const hasQuery = q.trim().length > 0;
  const brandFilter = (search.brand ?? "").slice(0, 40);
  const priceMin = search.min ? Number(search.min) : NaN;
  const priceMax = search.max ? Number(search.max) : NaN;
  const activeFilterCount =
    (mode === "loose" ? 1 : 0) +
    (pureOnly ? 0 : 1) +
    (brandFilter.trim() ? 1 : 0) +
    (Number.isFinite(priceMin) ? 1 : 0) +
    (Number.isFinite(priceMax) ? 1 : 0);

  const setMinPrice = (next: string) =>
    navigate({
      search: (prev: Record<string, unknown>) => {
        const s: Record<string, unknown> = { ...prev, min: next };
        if (!next) delete s.min;
        return s;
      },
      replace: true,
    });
  const setMaxPrice = (next: string) =>
    navigate({
      search: (prev: Record<string, unknown>) => {
        const s: Record<string, unknown> = { ...prev, max: next };
        if (!next) delete s.max;
        return s;
      },
      replace: true,
    });
  const clearFilters = () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(PURE_KEY);
    } catch {
      /* ignore */
    }
    if (urlSyncTimer.current != null) {
      window.clearTimeout(urlSyncTimer.current);
      urlSyncTimer.current = null;
    }
    navigate({
      search: (prev: Record<string, unknown>) => ({ ...prev, mode: "strict", pure: "1", brand: undefined, min: undefined, max: undefined }),
      replace: true,
    });
  };

  useEffect(() => {
    if (!hasQuery) return;
    if (user) {
      trackEvent("user_view_search", { has_query: true });
    } else {
      trackEvent("visitor_view_search_aggregate", { has_query: true });
    }
  }, [hasQuery, user]);

  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    try {
      const url = new URL(window.location.href);
      const hasMode = url.searchParams.has("mode");
      const hasPure = url.searchParams.has("pure");
      if (hasMode && hasPure) return;
      const storedMode = window.localStorage.getItem(STORAGE_KEY);
      const storedPure = window.localStorage.getItem(PURE_KEY);
      const patch: Partial<{ mode: string; pure: string }> = {};
      if (!hasMode && (storedMode === "strict" || storedMode === "loose")) {
        patch.mode = storedMode;
      }
      if (!hasPure && (storedPure === "0" || storedPure === "1")) {
        patch.pure = storedPure;
      }
      if (Object.keys(patch).length > 0) {
        navigate({
          search: (prev: Record<string, unknown>) => ({ ...prev, ...patch }),
          replace: true,
        });
      }
    } catch {
      /* ignore */
    }
  }, [navigate]);

  const chooseMode = (m: SearchMode) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, m);
    } catch {
      /* ignore */
    }
    navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, mode: m }) });
  };

  const setPure = (next: boolean) => {
    try {
      window.localStorage.setItem(PURE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
    navigate({
      search: (prev: Record<string, unknown>) => ({ ...prev, pure: next ? "1" : "0" }),
    });
  };

  const syncQueryToUrl = useCallback(
    (next: string) => {
      const value = next.slice(0, 80);
      if (urlSyncTimer.current != null) window.clearTimeout(urlSyncTimer.current);
      urlSyncTimer.current = window.setTimeout(() => {
        navigate({
          search: (prev: Record<string, unknown>) => {
            const currentQ = typeof prev?.q === "string" ? prev.q : "";
            if (currentQ === value) return prev;
            const nextSearch: Record<string, unknown> = { ...prev, q: value };
            if (!value) delete nextSearch.q;
            return nextSearch;
          },
          replace: true,
        });
      }, 250);
    },
    [navigate],
  );
  useEffect(() => () => {
    if (urlSyncTimer.current != null) window.clearTimeout(urlSyncTimer.current);
  }, []);

  const pickQuery = (next: string) => {
    pushRecentSearch(next);
    if (urlSyncTimer.current != null) {
      window.clearTimeout(urlSyncTimer.current);
      urlSyncTimer.current = null;
    }
    navigate({
      search: (prev: Record<string, unknown>) => ({ ...prev, q: next.slice(0, 80) }),
      replace: true,
    });
  };

  useEffect(() => {
    if (hasQuery) pushRecentSearch(q);
  }, [hasQuery, q]);

  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("search:recent-queries");
      if (raw) setRecent(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, [q]);

  const removeRecent = (item: string) => {
    setRecent((prev) => {
      const next = prev.filter((x) => x !== item);
      try {
        window.localStorage.setItem("search:recent-queries", JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  };

  const clearRecent = () => {
    setRecent([]);
    try {
      window.localStorage.removeItem("search:recent-queries");
    } catch { /* ignore */ }
  };

  // Restauração de scroll ao voltar para /buscar preservando filtros
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("search:scroll");
      if (raw) {
        const y = Number(raw);
        if (Number.isFinite(y) && y > 0) {
          requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "auto" }));
        }
      }
    } catch { /* ignore */ }
    const onScroll = () => {
      try {
        window.sessionStorage.setItem("search:scroll", String(window.scrollY));
      } catch { /* ignore */ }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="pc-search-scope flex min-h-[100dvh] flex-col bg-background text-foreground">
      {/* HERO COMPACTO + BARRA DE BUSCA STICKY */}
      <section className="sticky top-0 z-30 border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(520px_180px_at_10%_0%,color-mix(in_oklab,var(--brand-gold)_12%,transparent),transparent_65%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-brand-gold/60 to-transparent"
        />

        <div className="relative mx-auto w-full max-w-5xl px-4 pb-2.5 pt-2.5 md:px-8 md:pb-3 md:pt-3">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <BackButton fallbackTo="/" variant="ghost" />
              <span className="hidden truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--pc-gold-ink)] sm:inline">
                Comparador de preços
              </span>
            </div>
            <FreeQuotaBadge variant="inline" />
          </div>

          <div className="mt-1.5 flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
            <h1 className="font-serif text-[19px] font-semibold leading-tight tracking-tight text-foreground sm:text-[22px]">
              Buscar <span className="text-[var(--pc-gold-ink)]">preço</span> por nome
            </h1>
            <p className="text-[12.5px] leading-snug text-muted-foreground">
              Preço médio, mínimo e onde está mais barato.
            </p>
          </div>

          {/* BARRA DE BUSCA — cartão compacto */}
          <div className="mt-2 rounded-xl border border-border bg-card p-1.5 shadow-sm ring-1 ring-brand-gold/15 md:p-2">
            <PriceSearchBar
              initialQuery={q}
              mode={mode}
              pureOnly={pureOnly}
              brandFilter={brandFilter}
              priceMin={Number.isFinite(priceMin) ? priceMin : undefined}
              priceMax={Number.isFinite(priceMax) ? priceMax : undefined}
              onQueryChange={syncQueryToUrl}
            />
          </div>

          {hasQuery && (
            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2">
              <ShareButton
                title={`PreçoCerto — ${q}`}
                text={`Veja preços comparados de "${q}" no PreçoCerto`}
              />
            </div>
          )}
        </div>
      </section>

      {/* CORPO */}
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 pb-[calc(var(--mobile-nav-height)+1.25rem)] pt-3.5 md:px-8 md:pb-8 md:pt-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_312px] lg:gap-6">
          <div className="min-w-0 space-y-3.5">
            {/* Toolbar de filtros — organizada, com colapso no mobile */}
            <FiltersToolbar
              open={filtersOpen}
              onToggle={() => setFiltersOpen((v) => !v)}
              activeCount={activeFilterCount}
              mode={mode}
              onMode={chooseMode}
              pureOnly={pureOnly}
              onPure={setPure}
              min={search.min ?? ""}
              max={search.max ?? ""}
              onMin={setMinPrice}
              onMax={setMaxPrice}
              onClear={clearFilters}
            />

            {!hasQuery && <SearchDiscovery onPickQuery={pickQuery} />}

            {hasQuery && !user && <SignupCTA context="save-comparison" />}

            <div className="pt-1 text-center">
              <Link
                to="/"
                className="text-[12px] font-medium text-muted-foreground transition-colors hover:text-[var(--pc-gold-ink)]"
              >
                Voltar ao início
              </Link>
            </div>
          </div>

          {/* Sidebar persistente — desktop */}
          <aside className="hidden lg:block">
            <div className="sticky top-6">
              <SearchSidebar
                recent={recent}
                onPickQuery={pickQuery}
                onRemoveRecent={removeRecent}
                onClearRecent={clearRecent}
              />
            </div>
          </aside>
        </div>
      </div>

      <SiteFooter />
      <MobileNav />
    </div>
  );
}


// ============================================================================
// Toolbar de filtros — colapsável no mobile, aberta por padrão no desktop
// ============================================================================

type FiltersToolbarProps = {
  open: boolean;
  onToggle: () => void;
  activeCount: number;
  mode: SearchMode;
  onMode: (m: SearchMode) => void;
  pureOnly: boolean;
  onPure: (v: boolean) => void;
  min: string;
  max: string;
  onMin: (v: string) => void;
  onMax: (v: string) => void;
  onClear: () => void;
};

function FiltersToolbar({
  open,
  onToggle,
  activeCount,
  mode,
  onMode,
  pureOnly,
  onPure,
  min,
  max,
  onMin,
  onMax,
  onClear,
}: FiltersToolbarProps) {
  return (
    <section
      aria-label="Filtros de busca"
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
    >
      {/* Header da toolbar */}
      <header className="flex items-center justify-between gap-3 border-b border-border/70 px-3 py-1.5">
        <div className="flex items-center gap-2 text-[12.5px] font-semibold tracking-tight text-foreground">
          <SlidersHorizontal className="h-3.5 w-3.5 text-[var(--pc-gold-ink)]" aria-hidden />
          Filtros
          {activeCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-gold px-1.5 text-[10.5px] font-bold tabular-nums text-brand-navy">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {activeCount > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            >
              <X className="h-3 w-3" aria-hidden /> Limpar
            </button>
          )}
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground transition-colors hover:border-brand-gold hover:bg-[var(--pc-hover-tint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold md:hidden"
            aria-expanded={open}
          >
            <Filter className="h-3 w-3" aria-hidden />
            {open ? "Ocultar" : "Ajustar"}
          </button>
        </div>
      </header>

      {/* Grid de filtros */}
      <div className={`${open ? "grid" : "hidden"} gap-x-4 gap-y-2.5 px-3 py-2.5 md:!grid md:grid-cols-[auto_auto_1fr] md:items-end`}>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Correspondência
          </span>
          <QuickFilterBar<SearchMode>
            ariaLabel="Modo de correspondência"
            value={mode}
            onChange={(next) => onMode(next ?? "strict")}
            size="sm"
            options={[
              { value: "strict", label: "Estrita", hint: "Palavra inteira" },
              { value: "loose", label: "Parcial", hint: "Permite prefixo (≥ 3 chars)" },
            ]}
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Tipo de item
          </span>
          <QuickFilterBar<"pure" | "all">
            ariaLabel="Filtro de item puro"
            value={pureOnly ? "pure" : "all"}
            onChange={(next) => onPure(next === "pure")}
            size="sm"
            options={[
              { value: "pure", label: "Puro", hint: "Remove ingredientes" },
              { value: "all", label: "Todos" },
            ]}
          />
        </div>

        <div className="flex flex-col gap-1 md:ml-auto">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Faixa de preço
          </span>
          <PriceRangeInputs min={min} max={max} onMin={onMin} onMax={onMax} />
        </div>
      </div>
    </section>
  );
}

type PriceRangeInputsProps = {
  min: string;
  max: string;
  onMin: (v: string) => void;
  onMax: (v: string) => void;
};

function PriceRangeInputs({ min, max, onMin, onMax }: PriceRangeInputsProps) {
  const [mn, setMn] = useState(min);
  const [mx, setMx] = useState(max);
  useEffect(() => setMn(min), [min]);
  useEffect(() => setMx(max), [max]);

  const sanitizePrice = (v: string) => {
    const cleaned = v.replace(",", ".").replace(/[^\d.]/g, "");
    if (cleaned === "" || cleaned === ".") return "";
    const n = Number(cleaned);
    if (!Number.isFinite(n) || n < 0) return "";
    return cleaned;
  };

  const inputBase =
    "h-9 w-24 rounded-md border-0 bg-transparent px-2 text-[13px] font-medium text-foreground tabular-nums placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50 transition-colors";

  return (
    <div
      className="flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-0.5 shadow-sm transition-colors focus-within:border-brand-gold focus-within:ring-2 focus-within:ring-brand-gold/30"
      role="group"
      aria-label="Faixa de preço"
    >
      <Search className="h-3 w-3 text-muted-foreground" aria-hidden />
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        placeholder="R$ min"
        value={mn}
        onChange={(e) => setMn(sanitizePrice(e.currentTarget.value))}
        onBlur={() => onMin(mn.trim())}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); onMin(mn.trim()); }
        }}
        aria-label="Preço mínimo"
        className={inputBase}
      />
      <span aria-hidden="true" className="text-border">—</span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        placeholder="R$ máx"
        value={mx}
        onChange={(e) => setMx(sanitizePrice(e.currentTarget.value))}
        onBlur={() => onMax(mx.trim())}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); onMax(mx.trim()); }
        }}
        aria-label="Preço máximo"
        className={inputBase}
      />
    </div>
  );
}
