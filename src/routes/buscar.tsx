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
import { InternalPageHeader } from "@/components/layout";
import { RouteError } from "@/components/feedback";
import { SearchDiscovery, pushRecentSearch } from "@/components/search/SearchDiscovery";
import { SearchSidebar } from "@/components/search/SearchSidebar";


const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  mode: fallback(z.string(), "strict").default("strict"),
  pure: fallback(z.string(), "1").default("1"),
  brand: fallback(z.string(), "").default(""),
  min: fallback(z.string(), "").default(""),
  max: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/buscar")({
  validateSearch: zodValidator(searchSchema),
  search: {
    middlewares: [retainSearchParams(["q", "mode", "pure", "brand", "min", "max"])],
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



  const mode: SearchMode = search.mode === "loose" ? "loose" : "strict";
  const pureOnly = search.pure !== "0";
  const q = (search.q ?? "").slice(0, 80);
  const hasQuery = q.trim().length > 0;
  const brandFilter = (search.brand ?? "").slice(0, 40);
  const priceMin = search.min ? Number(search.min) : NaN;
  const priceMax = search.max ? Number(search.max) : NaN;
  const hasFilters =
    brandFilter.trim().length > 0 || Number.isFinite(priceMin) || Number.isFinite(priceMax);

  const setBrand = (next: string) =>
    navigate({
      search: (prev: Record<string, unknown>) => {
        const nextSearch: Record<string, unknown> = { ...prev, brand: next };
        if (!next) delete nextSearch.brand;
        return nextSearch;
      },
      replace: true,
    });
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
      search: () => ({ q: "", mode: "strict", pure: "1" }),
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

  // urlSyncTimer declared above

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


  return (
    <div
      className="pc-search-scope min-h-[100dvh] pb-[calc(var(--mobile-nav-height)+1rem)] text-foreground"
    >
      <div className="mx-auto w-full max-w-7xl px-4 md:px-8 pt-4 md:pt-6">
        <InternalPageHeader
          breadcrumbs={[{ label: "Início", to: "/" }, { label: "Buscar" }]}
          title="Buscar preço por nome"
          highlight="preço"
          description="Consulte o preço médio, mínimo e onde comprar mais barato."
          actions={
            <>
              {hasQuery ? (
                <ShareButton
                  title={`PreçoCerto — ${q}`}
                  text={`Veja preços comparados de "${q}" no PreçoCerto`}
                />
              ) : null}
              <FreeQuotaBadge variant="inline" />
            </>
          }
        />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-6">
            <PriceSearchBar
              initialQuery={q}
              mode={mode}
              pureOnly={pureOnly}
              brandFilter={brandFilter}
              priceMin={Number.isFinite(priceMin) ? priceMin : undefined}
              priceMax={Number.isFinite(priceMax) ? priceMax : undefined}
              onQueryChange={syncQueryToUrl}
            />

            {/* Toolbar única: match + filtro puro + filtros avançados */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-border/50 pb-4">
              <QuickFilterBar<SearchMode>
                label="Match"
                ariaLabel="Modo de correspondência"
                value={mode}
                onChange={(next) => chooseMode(next ?? "strict")}
                size="sm"
                options={[
                  { value: "strict", label: "Estrita", hint: "Palavra inteira" },
                  { value: "loose", label: "Parcial", hint: "Permite prefixo (≥ 3 chars)" },
                ]}
              />
              <QuickFilterBar<"pure" | "all">
                label="Item"
                ariaLabel="Filtro de item puro"
                value={pureOnly ? "pure" : "all"}
                onChange={(next) => setPure(next === "pure")}
                size="sm"
                options={[
                  { value: "pure", label: "Puro", hint: "Remove ingredientes" },
                  { value: "all", label: "Todos" },
                ]}
              />
              <FilterInputs
                min={search.min ?? ""}
                max={search.max ?? ""}
                onMin={setMinPrice}
                onMax={setMaxPrice}
                onClear={clearFilters}
              />
            </div>

            {!hasQuery && <SearchDiscovery onPickQuery={pickQuery} />}

            {hasQuery && !user ? (
              <SignupCTA context="save-comparison" className="mt-2" />
            ) : (
              <div className="pt-4 text-center">
                <Link
                  to="/"
                  className="text-[12px] font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  Voltar ao início
                </Link>
              </div>
            )}
          </div>

          {/* Painel lateral persistente — apenas desktop ≥ lg */}
          <div className="hidden lg:block">
            <SearchSidebar recent={recent} onPickQuery={pickQuery} onRemoveRecent={removeRecent} onClearRecent={clearRecent} />
          </div>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}

type FilterInputsProps = {
  min: string;
  max: string;
  onMin: (v: string) => void;
  onMax: (v: string) => void;
  onClear: () => void;
};

function FilterInputs({ min, max, onMin, onMax, onClear }: FilterInputsProps) {
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

  const dirty = mn.trim() !== "" || mx.trim() !== "";
  const clearAll = () => {
    setMn("");
    setMx("");
    onClear();
  };

  const applyPreset = (lo: string, hi: string) => {
    setMn(lo);
    setMx(hi);
    onMin(lo);
    onMax(hi);
  };

  const presets: { label: string; lo: string; hi: string }[] = [
    { label: "Até R$ 20", lo: "", hi: "20" },
    { label: "R$ 20–50", lo: "20", hi: "50" },
    { label: "R$ 50–100", lo: "50", hi: "100" },
    { label: "R$ 100+", lo: "100", hi: "" },
  ];

  const isActive = (lo: string, hi: string) => mn.trim() === lo && mx.trim() === hi;

  const inputBase =
    "h-9 w-24 rounded-md border-0 bg-transparent px-2 text-[13px] font-medium text-foreground tabular-nums placeholder:text-muted-foreground/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 transition-colors";

  return (
    <div className="ml-auto flex flex-wrap items-center gap-2">
      <div
        className="flex items-center gap-1 rounded-lg border border-border/70 bg-background/60 px-2.5 py-0.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30"
        role="group"
        aria-label="Faixa de preço"
      >
        <span className="select-none pr-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Faixa de preço
        </span>
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
        <span aria-hidden="true" className="text-muted-foreground/60">—</span>
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
      <div
        role="group"
        aria-label="Presets de faixa de preço"
        className="flex flex-wrap items-center gap-1"
      >
        {presets.map((p) => {
          const active = isActive(p.lo, p.hi);
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p.lo, p.hi)}
              aria-pressed={active}
              className={
                "inline-flex h-8 items-center rounded-full border px-3 text-[11.5px] font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold " +
                (active
                  ? "border-brand-gold bg-brand-gold/15 text-brand-gold"
                  : "border-border/70 bg-background/60 text-muted-foreground hover:border-brand-gold/60 hover:text-foreground")
              }
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={clearAll}
        disabled={!dirty}
        className="inline-flex h-9 items-center rounded-lg px-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Limpar filtros"
      >
        Limpar
      </button>
    </div>
  );
}



