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

import { ChevronRight, Search } from "lucide-react";
import buscarHero from "@/assets/buscar-hero.jpg?w=1200;1920&format=avif;webp;jpg&quality=68&as=picture";


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
    links: [
      {
        rel: "preload",
        as: "image",
        href: buscarHero.img.src,
        imagesrcset: (buscarHero.sources.webp ?? buscarHero.sources.jpeg) as string,
        imagesizes: "100vw",
        fetchpriority: "high",
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
      {/* Hero editorial — mesmo padrão de /estabelecimentos (blur suave, sem véus escuros extras) */}
      <section className="relative isolate overflow-hidden border-b border-white/10">
        <div aria-hidden className="absolute inset-0 -z-40" style={{ background: "var(--brand-navy)" }} />
        <picture aria-hidden className="pc-hero-picture absolute inset-0 -z-30 h-full w-full">
          {Object.entries(buscarHero.sources).map(([type, srcset]) => (
            <source key={type} type={type} srcSet={srcset as string} sizes="100vw" />
          ))}
          <img
            src={buscarHero.img.src}
            alt=""
            className="h-full w-full scale-[1.04] object-cover opacity-0 transition-opacity duration-500 [.pc-hero-picture.is-loaded_&]:opacity-100"
            style={{ filter: "saturate(0.9) brightness(0.9) contrast(1.02) blur(2px)" }}
            width={buscarHero.img.w}
            height={buscarHero.img.h}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            onLoad={(ev) => ev.currentTarget.closest(".pc-hero-picture")?.classList.add("is-loaded")}
            ref={(el) => {
              if (el?.complete) el.closest(".pc-hero-picture")?.classList.add("is-loaded");
            }}
          />
        </picture>

        {/* Hairline dourada no topo */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 -z-10 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, color-mix(in oklab, var(--brand-gold) 85%, transparent) 50%, transparent)",
          }}
        />

        <div className="relative mx-auto w-full max-w-6xl px-4 md:px-8 pt-4 md:pt-5 pb-4 md:pb-5">
          <nav aria-label="Trilha" className="mb-2 flex items-center gap-2 text-[14px] font-semibold text-white">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-white transition-colors hover:border-brand-gold hover:bg-brand-gold hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy"
            >
              Início
            </Link>
            <ChevronRight aria-hidden className="h-4 w-4 text-white/60" />
            <span className="inline-flex items-center rounded-lg border border-brand-gold bg-brand-gold px-3 py-1.5 text-brand-navy">
              Buscar
            </span>
          </nav>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-gold bg-brand-gold px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-brand-navy">
              <Search className="h-3 w-3" aria-hidden />
              Comparador de preços
            </div>
            <h1 className="text-[20px] md:text-[24px] font-bold leading-tight text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.65)]">
              Buscar <span className="text-brand-gold">preço</span> por nome
            </h1>
          </div>
          <p className="mt-2 inline-block max-w-2xl rounded-md bg-brand-navy/75 px-2.5 py-1 text-[12.5px] md:text-[13.5px] font-medium leading-snug text-white ring-1 ring-white/10 backdrop-blur-[2px] [text-shadow:0_1px_4px_rgba(0,0,0,0.55)]">
            Consulte preço médio, mínimo e onde comprar mais barato em Feijó.
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {hasQuery ? (
              <ShareButton
                title={`PreçoCerto — ${q}`}
                text={`Veja preços comparados de "${q}" no PreçoCerto`}
              />
            ) : null}
            <FreeQuotaBadge variant="inline" />
          </div>

          <div className="mt-3">
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
        </div>
      </section>


      <div className="mx-auto w-full max-w-7xl px-4 md:px-8 pt-4 md:pt-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-6">

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


  const inputBase =
    "h-9 w-24 rounded-md border-0 bg-transparent px-2 text-[13px] font-medium text-foreground tabular-nums placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50 transition-colors";

  return (
    <div className="ml-auto flex flex-wrap items-center gap-2">
      <div
        className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-0.5 shadow-sm transition-colors focus-within:border-brand-gold focus-within:ring-2 focus-within:ring-brand-gold/30"
        role="group"
        aria-label="Faixa de preço"
      >
        <span className="select-none pr-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
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
      <button
        type="button"
        onClick={clearAll}
        disabled={!dirty}
        className="inline-flex h-9 items-center rounded-lg px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground transition-colors hover:text-brand-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold disabled:cursor-not-allowed disabled:text-muted-foreground disabled:opacity-60"
        aria-label="Limpar filtros"
      >
        Limpar
      </button>
    </div>
  );
}




