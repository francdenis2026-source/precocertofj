import { createFileRoute, Link, useNavigate, useRouter, retainSearchParams } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useCallback, useEffect, useRef, useState } from "react";
import { PriceSearchBar } from "@/components/scanner/PriceSearchBar";
import { MobileNav } from "@/components/nav/MobileNav";
import { ArrowLeft } from "lucide-react";
import type { SearchMode } from "@/lib/search-tokens";
import { FreeQuotaBadge } from "@/components/paywall/FreeQuotaBadge";
import { QuickFilterBar } from "@/components/search/QuickFilterBar";
import { ShareButton, SignupCTA } from "@/components/ds";
import { useSession } from "@/hooks/useSession";
import { trackEvent } from "@/lib/analytics-events";
import { ListingShell, InternalPageHeader } from "@/components/layout";
import { EmptyState, RouteError } from "@/components/feedback";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon } from "lucide-react";

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
  const router = useRouter();
  const { user } = useSession();

  const goBack = useCallback(() => {
    try {
      const canGoBack =
        typeof window !== "undefined" &&
        window.history.length > 1 &&
        document.referrer &&
        new URL(document.referrer).origin === window.location.origin;
      if (canGoBack) {
        router.history.back();
        return;
      }
    } catch {
      /* ignore */
    }
    navigate({ to: "/" });
  }, [navigate, router]);

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
  const clearFilters = () =>
    navigate({
      search: (prev: Record<string, unknown>) => {
        const s: Record<string, unknown> = { ...prev };
        delete s.brand;
        delete s.min;
        delete s.max;
        return s;
      },
      replace: true,
    });


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

  const urlSyncTimer = useRef<number | null>(null);
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




  return (
    <div
      className={
        "pc-search-scope min-h-[100dvh] bg-background pb-[calc(var(--mobile-nav-height)+1rem)] text-foreground" +
        (legacyTheme ? " pc-search-legacy" : "")
      }
    >
      <div className="mx-auto max-w-3xl px-4 md:px-6 pt-3 md:pt-4">
        <InternalPageHeader
          breadcrumbs={[{ label: "Início", to: "/" }, { label: "Buscar" }]}
          title="Buscar preço por nome"
          highlight="preço"
          description="Preço médio, mínimo e onde está mais barato."
          actions={
            <>
              <button
                type="button"
                onClick={toggleLegacyTheme}
                className="pc-search-theme-toggle"
                data-legacy={legacyTheme ? "true" : "false"}
                aria-pressed={legacyTheme}
                title={legacyTheme ? "Ver paleta Navy/Gold (nova)" : "Ver paleta Ciano (atual)"}
              >
                <span className="pc-dot" aria-hidden="true" />
                {legacyTheme ? "Ciano" : "Navy/Gold"}
              </button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={goBack}
                aria-label="Voltar"
                className="h-8 px-2 text-[12px]"
              >
                <ArrowLeft className="mr-1 h-3.5 w-3.5" strokeWidth={2} />
                Voltar
              </Button>
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

        <ListingShell density="sm" className="mb-2">
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
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border/60 bg-card/50 px-3 py-2">
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
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <input
                type="text"
                inputMode="text"
                maxLength={40}
                placeholder="Marca"
                defaultValue={brandFilter}
                onBlur={(e) => setBrand(e.currentTarget.value.trim())}
                onKeyDown={(e) => { if (e.key === "Enter") setBrand(e.currentTarget.value.trim()); }}
                aria-label="Marca"
                className="h-8 w-28 rounded-md border border-border bg-background px-2 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder="R$ min"
                defaultValue={search.min}
                onBlur={(e) => setMinPrice(e.currentTarget.value.trim())}
                onKeyDown={(e) => { if (e.key === "Enter") setMinPrice(e.currentTarget.value.trim()); }}
                aria-label="Preço mínimo"
                className="h-8 w-20 rounded-md border border-border bg-background px-2 text-[12px] tabular-nums text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder="R$ max"
                defaultValue={search.max}
                onBlur={(e) => setMaxPrice(e.currentTarget.value.trim())}
                onKeyDown={(e) => { if (e.key === "Enter") setMaxPrice(e.currentTarget.value.trim()); }}
                aria-label="Preço máximo"
                className="h-8 w-20 rounded-md border border-border bg-background px-2 text-[12px] tabular-nums text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              {hasFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex h-8 items-center rounded-full border border-border bg-background px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Limpar filtros"
                >
                  Limpar
                </button>
              ) : null}
            </div>
          </div>

          {!hasQuery && (
            <EmptyState
              className="mt-2"
              icon={SearchIcon}
              title="Digite para começar"
              message="Escreva o nome de um produto (arroz, feijão, café…) e veja os preços comparados nos mercados cadastrados."
            />
          )}
        </ListingShell>


        {hasQuery && !user ? (
          <SignupCTA context="save-comparison" className="mt-6" />
        ) : (
          <div className="mt-6 text-center">
            <Link
              to="/"
              className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-primary"
            >
              Voltar ao início
            </Link>
          </div>
        )}
      </div>
      <MobileNav />
    </div>
  );
}
