import { createFileRoute, Link, useNavigate, useRouter, retainSearchParams } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useCallback, useEffect, useRef } from "react";
import { PriceSearchBar } from "@/components/scanner/PriceSearchBar";
import { MobileNav } from "@/components/nav/MobileNav";
import { ArrowLeft } from "lucide-react";
import type { SearchMode } from "@/lib/search-tokens";
import { FreeQuotaBadge } from "@/components/paywall/FreeQuotaBadge";
import { QuickFilterBar } from "@/components/search/QuickFilterBar";
import { ShareButton, SignupCTA } from "@/components/ds";
import { useSession } from "@/hooks/useSession";
import { trackEvent } from "@/lib/analytics-events";
import { PageHeader, ListingShell, ListingToolbar } from "@/components/layout";
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
    <div className="min-h-[100dvh] bg-background pb-[calc(var(--mobile-nav-height)+1rem)] text-foreground">
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        <PageHeader
          breadcrumbs={[{ label: "Início", to: "/" }, { label: "Buscar" }]}
          title="Buscar preço por nome"
          description="Preço médio, mínimo e onde está mais barato — sem precisar tirar foto."
          actions={
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={goBack}
                aria-label="Voltar para a seção anterior"
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" strokeWidth={2} />
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

        <ListingShell density="md" className="mb-2">
          <ListingToolbar
            filters={
              <>
                <QuickFilterBar<SearchMode>
                  label="Match"
                  ariaLabel="Modo de correspondência"
                  value={mode}
                  onChange={(next) => chooseMode(next ?? "strict")}
                  size="sm"
                  options={[
                    {
                      value: "strict",
                      label: "Estrita",
                      hint: "Palavra inteira — evita falsos positivos em buscas curtas",
                    },
                    {
                      value: "loose",
                      label: "Parcial",
                      hint: "Permite prefixo (tokens ≥ 3 caracteres)",
                    },
                  ]}
                />
                <QuickFilterBar<"pure" | "all">
                  label="Filtro"
                  ariaLabel="Filtro de item puro"
                  value={pureOnly ? "pure" : "all"}
                  onChange={(next) => setPure(next === "pure")}
                  size="sm"
                  options={[
                    {
                      value: "pure",
                      label: "Somente item puro",
                      hint: "Remove itens em que a palavra aparece só como ingrediente",
                    },
                    { value: "all", label: "Incluir ingredientes" },
                  ]}
                />
              </>
            }
          />

          <PriceSearchBar
            initialQuery={q}
            mode={mode}
            pureOnly={pureOnly}
            onQueryChange={syncQueryToUrl}
          />

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
