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
import { Badge as DSBadge, ShareButton, SignupCTA } from "@/components/ds";
import { useSession } from "@/hooks/useSession";
import { trackEvent } from "@/lib/analytics-events";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  mode: fallback(z.string(), "strict").default("strict"),
  pure: fallback(z.string(), "1").default("1"),
});

export const Route = createFileRoute("/buscar")({
  validateSearch: zodValidator(searchSchema),
  search: {
    middlewares: [retainSearchParams(["q", "mode", "pure"])],
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
    <div className="mx-auto max-w-xl px-4 py-10 text-center">
      <h1 className="text-lg font-semibold text-foreground">Erro na busca</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <button
        onClick={reset}
        className="mt-4 inline-flex h-9 items-center rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground"
      >
        Tentar novamente
      </button>
    </div>
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

  // Telemetria: mede quantos visitantes vs. usuários chegam a resultados agregados
  // (uma emissão por combinação de query/sessão de página).
  useEffect(() => {
    if (!hasQuery) return;
    if (user) {
      trackEvent("user_view_search", { has_query: true });
    } else {
      trackEvent("visitor_view_search_aggregate", { has_query: true });
    }
  }, [hasQuery, user]);

  // Ao montar sem parâmetros na URL, hidrata a partir do localStorage
  // (preferências históricas do usuário) — mantém compartilhamento por URL
  // e restauração via back/forward.
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

  // Debounced sync of the typed query to the URL. Keeps share links and
  // back/forward in sync WHILE typing without spamming history entries —
  // always uses `replace` so back returns to the previous route.
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
      <div className="mx-auto max-w-3xl px-3 py-4 sm:px-4">
        <header className="mb-3 flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            aria-label="Voltar para a seção anterior"
            onClick={goBack}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border bg-background pl-2 pr-3 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            Voltar
          </button>
          <DSBadge variant="primary" size="sm">
            Buscar
          </DSBadge>
          {hasQuery ? (
            <ShareButton
              className="ml-auto"
              title={`PreçoCerto — ${q}`}
              text={`Veja preços comparados de "${q}" no PreçoCerto`}
            />
          ) : (
            <Link
              to="/"
              className="ml-auto font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary"
            >
              Início
            </Link>
          )}
        </header>

        {/* Compact intro strip — replaces the oversized hero to keep results above the fold. */}
        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-3 py-2 shadow-elev-1">
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold tracking-tight text-foreground">
              Digite e <span className="text-primary">compare</span>
            </p>
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Preço médio · mínimo · onde está mais barato
            </p>
          </div>
          <FreeQuotaBadge variant="inline" />
        </div>


        <div className="mb-3 flex flex-wrap gap-2">
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
        </div>

        <PriceSearchBar
          initialQuery={q}
          mode={mode}
          pureOnly={pureOnly}
          onQueryChange={syncQueryToUrl}
        />

        {hasQuery && !user ? (
          <SignupCTA context="save-comparison" className="mt-6" />
        ) : null}
      </div>
      <MobileNav />
    </div>
  );
}
