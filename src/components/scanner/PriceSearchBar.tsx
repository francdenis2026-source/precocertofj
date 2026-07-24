import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { searchProductPrice, type PriceSearchResult, type PriceSuggestion, type ProductGroup } from "@/lib/price-search.functions";
import { suggestProducts, type ProductSuggestion } from "@/lib/product-suggest.functions";
import {
  clearSearchHistory,
  getSearchHistory,
  pushSearchHistory,
  removeSearchHistory,
  type SearchHistoryEntry,
} from "@/lib/search-history";
import { Clock, Crown, Search, ShoppingBag, Sparkles, TrendingDown, X } from "lucide-react";
import { FairPriceBadge } from "@/components/product/FairPriceBadge";
import { HighlightMatch } from "@/components/search/HighlightMatch";
import { MatchReasonBadges } from "@/components/search/MatchReasonBadges";
import { SearchInterpretationSummary } from "@/components/search/SearchInterpretationSummary";
import { UnitPriceBadge } from "@/components/product/UnitPriceBadge";
import { computeUnitPrice } from "@/lib/unit-price";
import { ProductQuickActions } from "@/components/product/ProductQuickActions";
import { StoreBadge, StoreColorBar } from "@/components/brand/StoreBadge";
import { tokenizeQuery, type SearchMode, type MatchReason } from "@/lib/search-tokens";
import { ProductCompareDialog, CompareTray } from "@/components/search/ProductCompareDialog";
import { useLocalStorageState } from "@/hooks/use-local-storage";
// TeaserCard removido: resultados de busca são públicos e mostram nomes dos mercados
import { LockOverlay } from "@/components/paywall/LockOverlay";
import { PaywallInline } from "@/components/paywall/PaywallInline";
import { useTeaserQuota } from "@/hooks/use-teaser-quota";
import { useSession } from "@/hooks/useSession";
import { isTeaserLocked } from "@/lib/teaser-rule";





/**
 * Normaliza o texto do usuário: apenas comprime whitespace.
 * A caixa das letras é preservada como o usuário digitou; a busca no
 * servidor é case-insensitive via `unaccent`/lower.
 */
function normalizeInput(v: string): string {
  return v.replace(/\s{2,}/g, " ");
}

/**
 * Frase curta explicando por que este é o mais barato — usada nos tooltips
 * dos badges de estabelecimento. Retorna `null` quando não há média válida
 * para comparar (evita mensagens vazias ou enganosas).
 */
function buildCheapestReason(price: number, avg: number | null | undefined): string | null {
  if (typeof avg !== "number" || !Number.isFinite(avg) || avg <= 0) {
    return "Menor preço encontrado nesta busca";
  }
  const diff = avg - price;
  if (diff <= 0.01) return "Menor preço encontrado nesta busca";
  const pct = Math.round((diff / avg) * 100);
  const money = `R$ ${diff.toFixed(2).replace(".", ",")}`;
  return `${money} abaixo da média (-${pct}%)`;
}



type SortMode = "cheapest" | "unit" | "recent" | "kind" | "spread";

export function PriceSearchBar({
  initialQuery = "",
  mode = "strict",
  pureOnly = false,
  brandFilter = "",
  priceMin,
  priceMax,
  onQueryChange,
}: {
  initialQuery?: string;
  mode?: SearchMode;
  pureOnly?: boolean;
  brandFilter?: string;
  priceMin?: number;
  priceMax?: number;
  onQueryChange?: (q: string) => void;
}) {

  const runSearch = useServerFn(searchProductPrice);
  const runSuggest = useServerFn(suggestProducts);



  const { user } = useSession();
  const isVisitor = !user;
  const quota = useTeaserQuota(3);
  const [quotaBlocked, setQuotaBlocked] = useState(false);

  const [query, setQuery] = useState(normalizeInput(initialQuery));
  const [rawResult, setResult] = useState<PriceSearchResult | null>(null);
  const result = useMemo<PriceSearchResult | null>(() => {
    if (!rawResult) return rawResult;
    const brandNeedle = brandFilter.trim().toLowerCase();
    const hasMin = typeof priceMin === "number" && Number.isFinite(priceMin);
    const hasMax = typeof priceMax === "number" && Number.isFinite(priceMax);
    if (!brandNeedle && !hasMin && !hasMax) return rawResult;
    const groups = rawResult.groups
      .map((g) => {
        const prices = (g.prices ?? []).filter((p) => {
          if (hasMin && p.price < (priceMin as number)) return false;
          if (hasMax && p.price > (priceMax as number)) return false;
          if (brandNeedle) {
            const hay = `${g.productName ?? ""} ${p.marketName ?? ""}`.toLowerCase();
            if (!hay.includes(brandNeedle)) return false;
          }
          return true;
        });
        if (prices.length === 0) return null;
        const nums = prices.map((p) => p.price);
        const min = Math.min(...nums);
        const max = Math.max(...nums);
        const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
        return { ...g, prices, min, max, avg, samples: prices.length };
      })
      .filter(Boolean) as ProductGroup[];
    return { ...rawResult, groups };
  }, [rawResult, brandFilter, priceMin, priceMax]);


  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();


  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [sortMode, setSortMode] = useLocalStorageState<SortMode>(
    "search:sort-mode",
    "cheapest",
    {
      validate: (v): v is SortMode =>
        v === "cheapest" || v === "unit" || v === "recent" || v === "kind" || v === "spread",
    },
  );
  const [kindFilter, setKindFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useLocalStorageState<"product" | "market" | "matrix">(
    "pc:search:groupBy",
    "product",
    { validate: (v): v is "product" | "market" | "matrix" => v === "product" || v === "market" || v === "matrix" },
  );


  // Seleção para comparar produtos (2 a 3). Guarda o nome do grupo — a
  // busca já garante nomes únicos por catálogo dentro dos resultados.
  const [compareSelection, setCompareSelection] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  /**
   * Paginação por categoria: mostra `PAGE_SIZE` grupos e revela mais quando o
   * usuário clica em "Mostrar mais". Reset quando a query, filtros ou ordenação
   * mudam — evita esperar ("virtualização" leve com paginação incremental).
   */
  const PAGE_SIZE = 6;
  const [pageByCat, setPageByCat] = useState<Record<string, number>>({});
  useEffect(() => {
    setPageByCat({});
  }, [query, kindFilter, categoryFilter]);

  const toggleCompare = (name: string) => {
    setCompareSelection((prev) => {
      if (prev.includes(name)) return prev.filter((n) => n !== name);
      if (prev.length >= 3) return prev; // limite de 3
      return [...prev, name];
    });
  };
  const clearCompare = () => setCompareSelection([]);


  const autoRan = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestSeq = useRef(0);

  // Hydrate history from localStorage on mount (client-only).
  // Also recover any characters the user typed BEFORE React hydration
  // finished attaching the onChange handler — without this, the first
  // 1–2 keystrokes on a fresh page load are silently discarded because
  // React resets the DOM value to the controlled state ("").
  useEffect(() => {
    setHistory(getSearchHistory());
    const el = inputRef.current;
    if (el && el.value && el.value !== query) {
      setQuery(normalizeInput(el.value));
      setShowSuggest(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runQuery = (q: string) => {
    setErr(null);
    setShowSuggest(false);
    setHistory(pushSearchHistory(q));
    // A busca em si é grátis — só bloqueamos quando o visitante já esgotou
    // a cota em outras ações (ex.: abrir detalhes de produtos). Isso evita
    // "queimar" créditos apenas por carregar a página com ?q=... na URL.
    if (isVisitor && quota.exceeded) {
      setQuotaBlocked(true);
      setResult(null);
      return;
    }
    setQuotaBlocked(false);
    // Só debita cota quando o visitante realmente digita e envia uma busca
    // manual — auto-run vindo da URL não custa (`consumeOnce` por termo).
    if (isVisitor) quota.consumeOnce(`search:${q.toLowerCase()}`);
    startTransition(() => {
      runSearch({ data: { query: q, mode, pureOnly } })
        .then((r) => setResult(r))
        .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)));
    });
  };




  useEffect(() => {
    if (autoRan.current) return;
    const q = normalizeInput(initialQuery).trim();
    if (q.length >= 2) {
      autoRan.current = true;
      runQuery(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  // Re-executa a busca quando o usuário troca modo/filtro após já ter resultado.
  useEffect(() => {
    if (!result) return;
    const q = normalizeInput(query).trim();
    if (q.length >= 2) runQuery(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, pureOnly]);

  // Debounced autocomplete
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const seq = ++suggestSeq.current;
    const t = window.setTimeout(() => {
      runSuggest({ data: { query: q } })
        .then((rows) => {
          if (seq !== suggestSeq.current) return;
          setSuggestions(rows);
          setActiveIdx(-1);
        })
        .catch(() => {
          if (seq !== suggestSeq.current) return;
          setSuggestions([]);
        });
    }, 180);
    return () => window.clearTimeout(t);
  }, [query, runSuggest]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showSuggest) return;
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setShowSuggest(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showSuggest]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // Prefer live DOM value — covers the case where React state has not yet
    // caught up with the input (pre-hydration typing, IME composition, etc.).
    const raw = inputRef.current?.value ?? query;
    const q = normalizeInput(raw).trim();
    if (q.length < 2) {
      setErr("Digite ao menos 2 caracteres");
      return;
    }
    if (q !== query) setQuery(q);
    runQuery(q);
  };

  const setInputValue = (v: string) => {
    if (inputRef.current) inputRef.current.value = v;
    setQuery(v);
    onQueryChange?.(v);
  };

  const clear = () => {
    setInputValue("");
    setResult(null);
    setErr(null);
    setSuggestions([]);
    setShowSuggest(false);
    inputRef.current?.focus();
  };

  const chooseSuggestion = (s: ProductSuggestion) => {
    const next = normalizeInput(s.displayName);
    setInputValue(next);
    setShowSuggest(false);
    runQuery(next);
  };

  const chooseHistory = (q: string) => {
    const next = normalizeInput(q);
    setInputValue(next);
    setShowSuggest(false);
    runQuery(next);
  };

  const removeHistoryItem = (e: React.MouseEvent, q: string) => {
    e.preventDefault();
    e.stopPropagation();
    setHistory(removeSearchHistory(q));
  };

  const clearAllHistory = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clearSearchHistory();
    setHistory([]);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggest || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      chooseSuggestion(suggestions[activeIdx]);
    } else if (e.key === "Escape") {
      setShowSuggest(false);
    }
  };

  const fmt = (n: number | null | undefined) =>
    typeof n === "number" ? `R$ ${n.toFixed(2).replace(".", ",")}` : "—";

  const trimmed = query.trim();
  const showList = showSuggest && suggestions.length > 0 && trimmed.length >= 2;
  const showHistory =
    showSuggest && trimmed.length < 2 && history.length > 0;

  // "Você quis dizer …?" — when every suggestion returned came from the trigram
  // (fuzzy) fallback, the top row is our best guess for what the user meant to
  // type. We only surface it when the similarity is meaningful and clearly
  // different from what was typed, to avoid nagging on exact matches.
  const didYouMean = useMemo(() => {
    if (suggestions.length === 0) return null;
    if (!suggestions.every((s) => s.isFuzzy)) return null;
    const top = suggestions[0];
    if (!top || top.similarity < 0.3) return null;
    const typed = trimmed
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const suggested = top.displayName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    if (suggested === typed) return null;
    return top;
  }, [suggestions, trimmed]);

  const highlightTokens = useMemo(() => tokenizeQuery(query), [query]);



  return (
    <section className="pc-search-scope relative isolate z-40 rounded-2xl border border-primary/20 bg-surface p-3 sm:rounded-3xl sm:p-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color-mix(in_oklab,var(--color-accent)_70%,transparent)] to-transparent"
      />
      <div className="mb-2 flex items-center gap-2">
        <Search className="h-3.5 w-3.5 text-accent-strong" strokeWidth={1.5} aria-hidden="true" />
        <span
          role="note"
          aria-label="Passo 01: Pesquisar preço"
          className="inline-flex items-center gap-1 rounded-full border border-accent-strong/40 bg-accent/10 px-2 py-0.5 font-sans text-[9.5px] font-semibold uppercase tracking-[0.16em] text-accent-strong"
        >
          <span aria-hidden="true" className="tabular-nums">01</span>
          <span aria-hidden="true" className="opacity-70">·</span>
          <span aria-hidden="true">Pesquisar preço</span>
        </span>
      </div>


      <form onSubmit={submit} className="flex items-center gap-2" autoComplete="off">
        <div className="relative flex-1" ref={containerRef}>
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            enterKeyHint="search"
            defaultValue={normalizeInput(initialQuery)}
            onChange={(e) => {
              const next = normalizeInput(e.target.value.slice(0, 80));
              // Keep DOM in sync (React does not for uncontrolled inputs after
              // programmatic writes) — see clear()/chooseSuggestion which write
              // to inputRef.current.value directly.
              setQuery(next);
              setShowSuggest(true);
              onQueryChange?.(next);
            }}
            onFocus={() => setShowSuggest(true)}
            onKeyDown={onKeyDown}
            placeholder="ex.: Leite integral 1L"
            maxLength={80}
            spellCheck={false}
            autoCapitalize="sentences"
            autoCorrect="off"
            role="combobox"
            aria-expanded={showList || showHistory}
            aria-autocomplete="list"
            aria-controls="price-search-suggestions"
            className="focus-ring w-full rounded-full border border-primary/20 bg-background px-3 py-2 pr-8 text-sm tracking-wide text-foreground placeholder:text-muted-foreground"
            aria-label="Nome do produto"
          />
          {query && (
            <button
              type="button"
              onClick={clear}
              aria-label="Limpar"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {showHistory && (
            <div
              className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-72 overflow-auto rounded-2xl border border-primary/20 bg-background shadow-lg"
              role="listbox"
              aria-label="Buscas recentes"
            >
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Buscas recentes
                </span>
                <button
                  type="button"
                  onMouseDown={clearAllHistory}
                  className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
                >
                  Limpar
                </button>
              </div>
              <ul>
                {history.map((h) => (
                  <li key={h.query} role="option" aria-selected={false}>
                    <div className="group flex items-center gap-2 px-3 py-2 text-left text-sm text-foreground transition hover:bg-primary/5">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                      <button
                        type="button"
                        onClick={() => chooseHistory(h.query)}
                        className="min-w-0 flex-1 truncate text-left uppercase tracking-wide"
                      >
                        {h.query}
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => removeHistoryItem(e, h.query)}
                        aria-label={`Remover ${h.query} do histórico`}
                        className="shrink-0 rounded-full p-1 text-muted-foreground opacity-0 transition hover:text-foreground group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {showList && (
            <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-80 overflow-auto rounded-2xl border border-primary/20 bg-background shadow-lg">
              {didYouMean && (
                <button
                  type="button"
                  onClick={() => chooseSuggestion(didYouMean)}
                  className="flex w-full items-start gap-2 border-b border-border bg-warning/10 px-3 py-2 text-left transition hover:bg-warning/20"
                >
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" strokeWidth={1.75} />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-warning dark:text-warning">
                      Você quis dizer
                    </p>
                    <p className="truncate text-[13px] font-semibold uppercase tracking-wide text-foreground">
                      {didYouMean.displayName}?
                    </p>
                  </div>
                </button>
              )}
              <ul
                id="price-search-suggestions"
                role="listbox"
              >

              {suggestions.map((s, i) => {
                const locked = isVisitor && isTeaserLocked(s.id, i);
                const btn = (
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => chooseSuggestion(s)}
                    className={
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition " +
                      (i === activeIdx
                        ? "bg-primary/10 text-foreground"
                        : "text-foreground hover:bg-primary/5")
                    }
                  >
                    {s.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.imageUrl}
                        alt=""
                        loading="lazy"
                        className="h-8 w-8 shrink-0 rounded-md border border-border object-contain bg-background"
                      />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/30">
                        <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium uppercase tracking-wide">
                        <HighlightMatch text={s.displayName} tokens={highlightTokens} />
                      </p>
                      <p className="truncate font-mono text-[10px] text-muted-foreground">
                        {[s.brand, s.category].filter(Boolean).join(" · ") || "Produto"}
                      </p>
                    </div>
                  </button>
                );
                return (
                  <li key={s.id} role="option" aria-selected={i === activeIdx}>
                    {locked ? (
                      <div className="relative h-[52px]">
                        <LockOverlay locked variant="compact">
                          {btn}
                        </LockOverlay>
                      </div>
                    ) : (
                      btn
                    )}
                  </li>
                );
              })}

              </ul>
            </div>
          )}

        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full border border-[color-mix(in_oklab,var(--pc-home-gold)_65%,transparent)] bg-[var(--pc-home-gold)] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-[#08122a] shadow-[0_8px_20px_-12px_color-mix(in_oklab,var(--pc-home-gold)_75%,transparent)] transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-home-gold)] disabled:opacity-60"
        >
          {pending ? "…" : "Buscar"}
        </button>
      </form>


      {err && (
        <p
          role="alert"
          aria-live="assertive"
          className="mt-2 flex items-start gap-1.5 rounded-lg border border-destructive/40 bg-destructive/10 px-2 py-1.5 font-mono text-[10px] text-destructive-foreground"
        >
          <span aria-hidden="true">⚠</span>
          <span className="min-w-0">{err}</span>
        </p>
      )}

      {quotaBlocked && !err && (
        <div className="mt-3">
          <PaywallInline
            title="Você usou suas 3 buscas grátis"
            subtitle="Crie sua conta em 30 segundos e continue pesquisando preços sem limite."
          />
        </div>
      )}

      {/* Loading skeleton — só quando ainda não há resultado (evita piscar durante refetch) */}
      {pending && !result && !err && !quotaBlocked && (
        <div
          className="mt-3 space-y-2"
          aria-busy="true"
          aria-live="polite"
          aria-label="Carregando resultados"
        >
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg border border-primary/10 bg-background" />
            ))}
          </div>
          <div className="h-16 animate-pulse rounded-xl border border-primary/10 bg-background" />
          {/* Skeleton específico para lista com ordinais pill — reduz layout shift */}
          <ul className="space-y-2" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <li
                key={i}
                className="flex items-center gap-2 rounded-xl border border-primary/10 bg-background p-2"
              >
                <span className="h-7 w-7 shrink-0 animate-pulse rounded-full border border-accent-strong/20 bg-accent/10" />
                <span className="h-7 w-7 shrink-0 animate-pulse rounded-full border border-border bg-muted/40" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <span className="block h-3 w-2/3 animate-pulse rounded bg-muted/50" />
                  <span className="block h-2 w-1/3 animate-pulse rounded bg-muted/40" />
                </div>
                <span className="h-5 w-16 shrink-0 animate-pulse rounded bg-muted/40" />
              </li>
            ))}
          </ul>
        </div>
      )}

      {result && !err && !quotaBlocked && (
        <div className="mt-3 space-y-2" aria-live="polite">
          <SearchInterpretationSummary
            query={query}
            tokens={highlightTokens}
            onEdit={() => {
              inputRef.current?.focus();
              inputRef.current?.select();
            }}
            onQueryChange={(next) => {
              const normalized = normalizeInput(next).trim();
              setInputValue(normalized);
              if (normalized.length >= 2) runQuery(normalized);
              else {
                setResult(null);
                inputRef.current?.focus();
              }
            }}
          />

          {result.canonicalGroup && result.excludedByPureFilter > 0 && (
            <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
              Filtro <span className="text-primary">“{result.canonicalGroup}” puro</span> ativo — {result.excludedByPureFilter} item(s) com o termo apenas como ingrediente foram ocultados.
            </p>
          )}
          {result.samples === 0 ? (
            <>
              <p className="rounded-lg border border-border bg-background p-3 text-center font-mono text-[10px] text-muted-foreground">
                Nenhum preço encontrado para “{result.query}”. Faça um scan para
                cadastrar o primeiro.
              </p>
              {didYouMean && (
                <button
                  type="button"
                  onClick={() => chooseSuggestion(didYouMean)}
                  className="flex w-full items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-left transition hover:bg-warning/20"
                >
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" strokeWidth={1.75} />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-warning dark:text-warning">
                      Você quis dizer
                    </p>
                    <p className="truncate text-sm font-semibold uppercase tracking-wide text-foreground">
                      {didYouMean.displayName}?
                    </p>
                    <p className="font-mono text-[9px] text-muted-foreground">
                      Clique para buscar com esta correção
                    </p>
                  </div>
                </button>
              )}
            </>
          ) : (

            <>
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Média" value={fmt(result.avg)} />
                <Stat
                  label="Mínimo"
                  value={fmt(result.min)}
                  icon={<TrendingDown className="h-3 w-3 text-neon" />}
                />
                <Stat label="Amostras" value={String(result.samples)} />
              </div>

              {result.cheapest && (
                <Link
                  to="/produto-publico/$slug"
                  params={{ slug: result.query }}
                  className="relative block rounded-xl border border-border bg-card p-2.5 transition hover:border-accent-strong/60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="inline-flex items-center gap-1 rounded-md bg-accent-strong px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent-foreground">
                      <Crown className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                      Preço mais barato
                    </p>
                    <FairPriceBadge
                      price={result.cheapest.price}
                      min={result.min}
                      avg={result.avg}
                      max={result.max}
                      size="sm"
                    />
                  </div>
                  <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-foreground">
                    <StoreBadge
                      name={result.cheapest.marketName}
                      logoUrl={result.cheapest.marketLogoUrl}
                      brandColor={result.cheapest.marketBrandColor}
                      size="xs"
                      isCheapest
                      cheapestReason={buildCheapestReason(result.cheapest.price, result.avg)}
                    />
                    <span className="market-name truncate text-[13px]">{result.cheapest.marketName}</span>
                  </p>
                  <p className="mt-0.5 text-[22px] font-bold leading-tight tracking-tight tabular-nums text-foreground">
                    {fmt(result.cheapest.price)}
                  </p>
                </Link>
              )}



              {/* Product details area (from catalog) */}
              {result.suggestions.length > 0 && (
                <ProductDetailsCard suggestion={result.suggestions[0]} highlightTokens={highlightTokens} />
              )}

              {/* Quick filters */}
              {(() => {
                const catByCatalog = new Map<string, string>();
                const catByName = new Map<string, string>();
                for (const s of result.suggestions) {
                  if (s.category) {
                    catByCatalog.set(s.id, s.category);
                    catByName.set(s.displayName.toLowerCase(), s.category);
                  }
                }
                const buckets = new Map<string, typeof result.groups>();
                for (const g of result.groups) {
                  const cat =
                    (g.catalogId && catByCatalog.get(g.catalogId)) ||
                    catByName.get(g.productName.toLowerCase()) ||
                    "Outros";
                  const arr = buckets.get(cat) ?? [];
                  arr.push(g);
                  buckets.set(cat, arr);
                }
                const availableCategories = Array.from(buckets.keys()).sort();
                // Ordena buckets por MENOR preço mínimo (mais barato primeiro),
                // depois por relevância (tamanho do grupo). Isso destaca as
                // categorias com melhores oportunidades no topo.
                const ordered = Array.from(buckets.entries()).sort((a, b) => {
                  const minA = a[1].reduce((m, g) => Math.min(m, g.min), Number.POSITIVE_INFINITY);
                  const minB = b[1].reduce((m, g) => Math.min(m, g.min), Number.POSITIVE_INFINITY);
                  if (minA !== minB) return minA - minB;
                  return b[1].length - a[1].length;
                });
                const filteredOrdered = categoryFilter
                  ? ordered.filter(([cat]) => cat === categoryFilter)
                  : ordered;
                const showHeaders = filteredOrdered.length > 1;
                return (
                  <>
                    <QuickFilters
                      sortMode={sortMode}
                      onSort={setSortMode}
                      kinds={Array.from(
                        new Set(
                          result.markets
                            .map((m) => m.marketKind)
                            .filter((k): k is string => Boolean(k)),
                        ),
                      )}
                      kindFilter={kindFilter}
                      onKind={setKindFilter}
                      categories={availableCategories}
                      categoryFilter={categoryFilter}
                      onCategory={setCategoryFilter}
                      groupBy={groupBy}
                      onGroupBy={setGroupBy}
                    />


                    {groupBy === "market" && result.groups.length > 0 ? (
                      <MarketGroupedResults
                        groups={filteredOrdered.flatMap(([, gs]) => gs)}
                        kindFilter={kindFilter}
                        fmt={fmt}
                        globalMin={result.min}
                        highlightTokens={highlightTokens}
                      />
                    ) : null}

                    {groupBy === "product" && result.groups.length > 0 ? (

                      <div className="space-y-2">
                        {filteredOrdered.map(([cat, groups]) => {
                          // Ordena os grupos por menor preço ASC (mais barato primeiro),
                          // depois por relevância (samples DESC como proxy).
                          const sortedGroups = [...groups].sort((a, b) => {
                            if (a.min !== b.min) return a.min - b.min;
                            return b.samples - a.samples;
                          });
                          return (
                            <div key={cat} className="space-y-1.5">
                              {showHeaders ? (
                                <div className="flex items-center gap-2 px-0.5">
                                  <span className="text-[11px] font-semibold text-accent-strong">
                                    {cat}
                                  </span>
                                  <span className="h-px flex-1 bg-border" aria-hidden="true" />
                                  <span className="text-[11px] text-muted-foreground">
                                    {sortedGroups.length} item{sortedGroups.length > 1 ? "s" : ""}
                                  </span>
                                </div>
                              ) : null}

                              {(() => {
                                const shown = pageByCat[cat] ?? PAGE_SIZE;
                                const visibleGroups = sortedGroups.slice(0, shown);
                                const hidden = Math.max(0, sortedGroups.length - visibleGroups.length);
                                return (
                                  <>
                                    {visibleGroups.map((g) => {
                                      const filtered = kindFilter
                                        ? g.prices.filter((p) => p.marketKind === kindFilter)
                                        : g.prices;
                                      const sorted = sortPrices(filtered, sortMode, g.productName);
                                      if (sorted.length === 0) return null;
                                      return (
                                        <ProductGroupCard
                                          key={g.productName}
                                          productName={g.productName}
                                          samples={g.samples}
                                          min={g.min}
                                          avg={g.avg}
                                          max={g.max}
                                          globalMin={result.min}
                                          globalAvg={result.avg}
                                          globalMax={result.max}
                                          prices={sorted}
                                          fmt={fmt}
                                          catalogId={g.catalogId}
                                          highlightTokens={highlightTokens}
                                          matchReasons={g.matchReasons}
                                          isCompareSelected={compareSelection.includes(g.productName)}
                                          canSelectCompare={
                                            compareSelection.includes(g.productName) || compareSelection.length < 3
                                          }
                                          onToggleCompare={() => toggleCompare(g.productName)}
                                        />
                                      );
                                    })}
                                    {hidden > 0 ? (
                                      <AutoLoadMore
                                        onLoad={() =>
                                          setPageByCat((prev) => ({
                                            ...prev,
                                            [cat]: (prev[cat] ?? PAGE_SIZE) + PAGE_SIZE,
                                          }))
                                        }
                                        hidden={hidden}
                                        pageSize={PAGE_SIZE}
                                        category={cat}
                                      />
                                    ) : null}
                                  </>
                                );
                              })()}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </>
                );
              })()}

              {result.groups.length === 0 && (

                result.markets.length > 0 && (
                  <div className="divide-y divide-[color-mix(in_oklab,var(--color-accent)_18%,transparent)] border-t border-[color-mix(in_oklab,var(--color-accent)_25%,transparent)]">

                    {result.markets.map((m, mi) => {
                      const isCheapest = result.min != null && m.priceMin === result.min;
                      const rowInner = (
                        <>
                          <StoreColorBar name={m.marketName} brandColor={m.marketBrandColor} className="ml-0" />
                          <span
                            role="img"
                            aria-label={`Posição ${mi + 1}`}
                            className="my-auto grid h-7 w-7 shrink-0 place-items-center rounded-full border border-accent-strong/40 bg-accent/10 font-sans text-[10.5px] font-semibold tabular-nums text-accent-strong"
                          >
                            <span aria-hidden="true">{String(mi + 1).padStart(2, "0")}</span>
                          </span>

                          <StoreBadge
                            name={m.marketName}
                            logoUrl={m.marketLogoUrl}
                            brandColor={m.marketBrandColor}
                            size="sm"
                            className="my-auto"
                            isCheapest={isCheapest}
                            cheapestReason={
                              isCheapest ? buildCheapestReason(m.priceMin, result.avg) : null
                            }
                          />
                          <div className="min-w-0 flex-1 self-center">
                            <p className="market-name truncate text-[13px]">
                              {m.marketName}
                            </p>


                            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                              {m.samples} scan{m.samples > 1 ? "s" : ""}
                              <span aria-hidden="true" className="mx-1 text-accent-strong/50">·</span>
                              média {fmt(m.priceAvg)}
                              {m.establishmentId ? (
                                <>
                                  <span aria-hidden="true" className="mx-1 text-accent-strong/50">·</span>
                                  <span className="text-primary">ver produtos →</span>
                                </>
                              ) : null}
                            </p>
                          </div>
                          <FairPriceBadge
                            price={m.priceMin}
                            min={result.min}
                            avg={result.avg}
                            max={result.max}
                            size="sm"
                            className="self-center"
                          />
                          <div className="shrink-0 self-center text-right">
                            {isCheapest && (
                              <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-accent-strong">
                                Menor
                              </p>
                            )}
                            <p className="font-display text-[16px] font-semibold leading-tight tabular-nums text-foreground">
                              {fmt(m.priceMin)}
                            </p>
                          </div>
                        </>
                      );
                      const rowClass = "group flex items-stretch gap-2 bg-transparent pr-2 py-2 pl-0";
                      return (
                        <div key={m.marketName}>
                          {m.establishmentId ? (
                            <Link
                              to="/loja/$id"
                              params={{ id: m.establishmentId }}
                              search={query ? { q: query } : {}}
                              className={`${rowClass} transition hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30`}
                              aria-label={`Ver produtos de ${m.marketName}${query ? ` — filtrando por “${query}”` : ""}`}
                            >
                              {rowInner}
                            </Link>
                          ) : (
                            <div className={rowClass}>{rowInner}</div>
                          )}
                        </div>
                      );
                    })}

                  </div>

                )
              )}
            </>
          )}
        </div>
      )}

      <CompareTray
        count={compareSelection.length}
        onOpen={() => setCompareOpen(true)}
        onClear={clearCompare}
      />

      {compareOpen && compareSelection.length >= 2 && result ? (
        <ProductCompareDialog
          entries={compareSelection
            .map((name) => {
              const g = result.groups.find((gr) => gr.productName === name);
              if (!g) return null;
              return {
                productName: g.productName,
                slug: g.productName,
                prices: g.prices.map((p) => ({
                  marketName: p.marketName,
                  price: p.price,
                  when: p.when,
                })),
              };
            })
            .filter((x): x is NonNullable<typeof x> => x !== null)}
          onClose={() => setCompareOpen(false)}
          onRefresh={() => {
            const q = normalizeInput(query).trim();
            if (q.length >= 2) runQuery(q);
          }}
          onRemove={(name) => {
            setCompareSelection((prev) => {
              const next = prev.filter((n) => n !== name);
              if (next.length < 2) setCompareOpen(false);
              return next;
            });
          }}
        />
      ) : null}
    </section>
  );
}


function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="relative rounded-lg border border-border bg-card px-2 py-1.5">
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {icon} {label}
      </p>
      <p className="mt-0.5 text-[17px] font-bold leading-tight tracking-tight tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}


/**
 * Auto-load-more sentinel — dispara `onLoad()` quando entra na viewport,
 * evitando cliques manuais em listas longas mas mantendo fallback acessível.
 */
function AutoLoadMore({
  onLoad,
  hidden,
  pageSize,
  category,
}: {
  onLoad: () => void;
  hidden: number;
  pageSize: number;
  category: string;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            onLoadRef.current();
            break;
          }
        }
      },
      { rootMargin: "240px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <button
      ref={ref}
      type="button"
      onClick={onLoad}
      className="mt-1 w-full rounded-lg border border-dashed border-border bg-background/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      aria-label={`Carregar mais itens em ${category}`}
    >
      Carregando mais {Math.min(pageSize, hidden)} · restam {hidden}
    </button>
  );
}


// HighlightMatch é importado de `@/components/search/HighlightMatch` para
// manter a mesma lógica de tokens/acentos do backend.


type PricePoint = {
  marketName: string;
  marketKind: string | null;
  marketLogoUrl: string | null;
  marketBrandColor: string | null;
  price: number;
  when: string;
};

function sortPrices(prices: PricePoint[], mode: SortMode, productName?: string): PricePoint[] {
  const arr = [...prices];
  if (mode === "cheapest") arr.sort((a, b) => a.price - b.price);
  else if (mode === "unit") {
    // Ordena por preço unitário normalizado (R$/kg ou R$/L). Itens sem
    // tamanho detectável ficam no fim, mantendo a ordem por menor preço.
    const perBase = (p: PricePoint) => {
      const u = computeUnitPrice(p.price, productName);
      return u ? u.perBase : Number.POSITIVE_INFINITY;
    };
    arr.sort((a, b) => {
      const ua = perBase(a);
      const ub = perBase(b);
      if (ua === ub) return a.price - b.price;
      return ua - ub;
    });
  } else if (mode === "recent")
    arr.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());
  else if (mode === "kind")
    arr.sort(
      (a, b) =>
        (a.marketKind ?? "zzz").localeCompare(b.marketKind ?? "zzz") ||
        a.price - b.price,
    );
  else if (mode === "spread") {
    // "Menor variação" — na lista de preços de um grupo, isso equivale a
    // ordenar do preço mais próximo da mediana para o mais distante, útil
    // quando o usuário quer entender rapidamente o consenso de mercado.
    const sorted = [...prices].sort((a, b) => a.price - b.price);
    const median = sorted.length ? sorted[Math.floor(sorted.length / 2)].price : 0;
    arr.sort((a, b) => Math.abs(a.price - median) - Math.abs(b.price - median));
  }
  return arr;
}

function QuickFilters({
  sortMode,
  onSort,
  kinds,
  kindFilter,
  onKind,
  categories,
  categoryFilter,
  onCategory,
  groupBy,
  onGroupBy,
}: {
  sortMode: SortMode;
  onSort: (m: SortMode) => void;
  kinds: string[];
  kindFilter: string | null;
  onKind: (k: string | null) => void;
  categories: string[];
  categoryFilter: string | null;
  onCategory: (c: string | null) => void;
  groupBy: "product" | "market";
  onGroupBy: (g: "product" | "market") => void;
}) {
  const chip = (active: boolean) =>
    "rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-wide transition " +
    (active
      ? "border-primary bg-primary/15 text-primary"
      : "border-border bg-background text-muted-foreground hover:text-foreground");
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
        Agrupar
      </span>
      <button type="button" className={chip(groupBy === "product")} onClick={() => onGroupBy("product")}>
        Por produto
      </button>
      <button type="button" className={chip(groupBy === "market")} onClick={() => onGroupBy("market")}>
        Por mercado
      </button>
      <span className="ml-2 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
        Ordenar
      </span>

      <button type="button" className={chip(sortMode === "cheapest")} onClick={() => onSort("cheapest")}>
        Menor preço
      </button>
      <button
        type="button"
        className={chip(sortMode === "unit")}
        onClick={() => onSort("unit")}
      >
        Menor R$/kg ou /L
      </button>
      <button type="button" className={chip(sortMode === "spread")} onClick={() => onSort("spread")}>
        Menor variação
      </button>
      <button type="button" className={chip(sortMode === "recent")} onClick={() => onSort("recent")}>
        Mais recente
      </button>
      {kinds.length > 0 && (
        <button type="button" className={chip(sortMode === "kind")} onClick={() => onSort("kind")}>
          Por tipo
        </button>
      )}
      {categories.length > 1 && (
        <>
          <span className="ml-2 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            Categoria
          </span>
          <button
            type="button"
            className={chip(categoryFilter === null)}
            onClick={() => onCategory(null)}
          >
            Todas
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={chip(categoryFilter === c)}
              onClick={() => onCategory(categoryFilter === c ? null : c)}
            >
              {c}
            </button>
          ))}
        </>
      )}
      {kinds.length > 0 && (
        <>
          <span className="ml-2 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            Tipo
          </span>
          <button type="button" className={chip(kindFilter === null)} onClick={() => onKind(null)}>
            Todos
          </button>
          {kinds.map((k) => (
            <button
              key={k}
              type="button"
              className={chip(kindFilter === k)}
              onClick={() => onKind(kindFilter === k ? null : k)}
            >
              {k}
            </button>
          ))}
        </>
      )}
    </div>
  );
}

function ProductDetailsCard({
  suggestion,
  highlightTokens,
}: {
  suggestion: PriceSuggestion;
  highlightTokens: string[];
}) {
  return (
    <div className="relative rounded-xl border border-border bg-card p-3">
      <div className="flex items-start gap-3">
        {suggestion.imageUrl ? (
          <img
            src={suggestion.imageUrl}
            alt={suggestion.displayName}
            loading="lazy"
            className="h-16 w-16 shrink-0 rounded-lg border border-border object-contain bg-background"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/30">
            <ShoppingBag className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-strong">
            Produto encontrado
          </p>
          <p className="mt-0.5 truncate text-[15px] font-semibold tracking-tight text-foreground">
            <HighlightMatch text={suggestion.displayName} tokens={highlightTokens} />
          </p>
          <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
            {[suggestion.brand, suggestion.category].filter(Boolean).join(" · ") ||
              "Sem informações adicionais"}
          </p>
          {suggestion.matchReasons.length > 0 && (
            <MatchReasonBadges reasons={suggestion.matchReasons} className="mt-1" />
          )}

          <div className="mt-2 flex flex-wrap gap-2">
            <ProductQuickActions
              catalogId={suggestion.id}
              slug={suggestion.displayName}
              label={suggestion.displayName}
            />
            <Link
              to="/produto-publico/$slug"
              params={{ slug: suggestion.displayName }}
              className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[10px] tracking-wide text-primary hover:bg-primary/20"
            >
              Ver informações completas
            </Link>
            <Link
              to="/produto-publico/$slug"
              params={{ slug: suggestion.displayName }}
              hash="historico"
              className="rounded-full border border-border bg-background px-3 py-1 font-mono text-[10px] tracking-wide text-foreground hover:bg-primary/5"
            >
              Histórico de preços
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductGroupCard({
  catalogId,
  productName,
  samples,
  min,
  avg,
  max,
  globalMin,
  globalAvg,
  globalMax,
  prices,
  fmt,
  highlightTokens,
  matchReasons,
  isCompareSelected = false,
  canSelectCompare = true,
  onToggleCompare,
}: {
  catalogId: string | null;
  productName: string;
  samples: number;
  min: number;
  avg: number;
  max: number;
  globalMin: number | null;
  globalAvg: number | null;
  globalMax: number | null;
  prices: PricePoint[];
  fmt: (n: number | null | undefined) => string;
  highlightTokens: string[];
  matchReasons: MatchReason[];
  isCompareSelected?: boolean;
  canSelectCompare?: boolean;
  onToggleCompare?: () => void;
}) {
  // Mercado mais barata dentro deste grupo — usada para destaque no cabeçalho.
  const cheapestInGroup = useMemo(() => {
    if (prices.length === 0) return null;
    return prices.reduce((best, cur) => (cur.price < best.price ? cur : best), prices[0]);
  }, [prices]);

  return (
    <div className="relative rounded-xl border border-border bg-card p-2">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold tracking-tight text-foreground">
            <HighlightMatch text={productName} tokens={highlightTokens} />
          </p>
          <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
            <span className="font-semibold text-foreground">menor</span> {fmt(min)}
            <span aria-hidden="true" className="mx-1 opacity-40">·</span>
            média {fmt(avg)}
            <span aria-hidden="true" className="mx-1 opacity-40">·</span>
            máx {fmt(max)}
            <span aria-hidden="true" className="mx-1 opacity-40">·</span>
            {samples} preço{samples > 1 ? "s" : ""}
          </p>
          {cheapestInGroup ? (
            <p className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-md border border-accent-strong/40 bg-accent/10 px-1.5 py-0.5 text-[12px] text-foreground">
              <Crown className="h-3 w-3 shrink-0 text-accent-strong" strokeWidth={2} aria-hidden="true" />
              <StoreBadge
                name={cheapestInGroup.marketName}
                logoUrl={cheapestInGroup.marketLogoUrl}
                brandColor={cheapestInGroup.marketBrandColor}
                size="xs"
              />
              <span className="truncate">
                Mais barato em <span className="market-name text-[12px]">{cheapestInGroup.marketName}</span> · <span className="font-semibold tabular-nums">{fmt(cheapestInGroup.price)}</span>
              </span>
            </p>
          ) : null}
          {matchReasons.length > 0 && (
            <MatchReasonBadges reasons={matchReasons} className="mt-1" />
          )}
        </div>



        <div className="flex shrink-0 items-center gap-1.5">
          {onToggleCompare ? (
            <button
              type="button"
              onClick={onToggleCompare}
              disabled={!isCompareSelected && !canSelectCompare}
              aria-pressed={isCompareSelected}
              aria-label={
                isCompareSelected
                  ? `Remover ${productName} da comparação`
                  : `Adicionar ${productName} à comparação`
              }
              className={
                "rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest transition " +
                (isCompareSelected
                  ? "border-accent-strong bg-accent-strong text-accent-foreground"
                  : "border-primary/40 bg-background text-muted-foreground hover:border-primary/70 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60")

              }
            >
              {isCompareSelected ? "✓ Comparar" : "+ Comparar"}
            </button>
          ) : null}
          <ProductQuickActions catalogId={catalogId} slug={productName} label={productName} />
          <Link
            to="/produto-publico/$slug"
            params={{ slug: productName }}
            className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 font-mono text-[9px] tracking-wide text-primary hover:bg-primary/10"
          >
            Detalhes
          </Link>
        </div>
      </div>

      <ul className="mt-1 divide-y divide-border/60 border-t border-border/60">
        {prices.map((p, i) => {
          const isCheapest = globalMin != null && p.price === globalMin;
          return (
            <li
              key={`${p.marketName}-${p.when}-${i}`}
              className={
                "relative flex items-stretch gap-2 pr-2 py-1.5 pl-0 " +
                (isCheapest ? "bg-accent/8" : "bg-transparent")
              }
            >
              <StoreColorBar name={p.marketName} brandColor={p.marketBrandColor} />
              {isCheapest ? (
                <span
                  role="img"
                  aria-label="Menor preço"
                  title="Menor preço"
                  className="my-auto grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-strong text-accent-foreground"
                >
                  <Crown className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                </span>
              ) : (
                <span
                  role="img"
                  aria-label={`Posição ${i + 1}`}
                  className="my-auto grid h-6 w-6 shrink-0 place-items-center rounded-full border border-border bg-muted/30 text-[10px] font-semibold tabular-nums text-muted-foreground"
                >
                  <span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                </span>
              )}


              <StoreBadge
                name={p.marketName}
                logoUrl={p.marketLogoUrl}
                brandColor={p.marketBrandColor}
                size="sm"
                className="my-auto"
                isCheapest={isCheapest}
                cheapestReason={
                  isCheapest ? buildCheapestReason(p.price, globalAvg) : null
                }
              />
              <div className="min-w-0 flex-1 self-center">
                <p className="market-name truncate text-[13px]">
                  {p.marketName}
                </p>


                <p className="truncate text-[11px] text-muted-foreground">
                  {(p.marketKind ?? "Estabelecimento")}
                  <span aria-hidden="true" className="mx-1 opacity-40">·</span>
                  {new Date(p.when).toLocaleDateString("pt-BR")}
                </p>
              </div>

              <FairPriceBadge
                price={p.price}
                min={globalMin}
                avg={globalAvg}
                max={globalMax}
                size="sm"
                className="self-center"
              />
              <div className="shrink-0 self-center text-right">
                {isCheapest && (
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-accent-strong">
                    Menor
                  </p>
                )}
                <p className="text-[15px] font-bold leading-tight tabular-nums text-foreground">
                  {fmt(p.price)}
                </p>

                <UnitPriceBadge
                  price={p.price}
                  productName={productName}
                  className="mt-0.5"
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// -----------------------------------------------------------------------------
// MarketGroupedResults — organiza os resultados por mercado (estabelecimento).
// Cada mercado vira uma seção com logo + nome; produtos ordenados por menor
// preço; mercados ordenados por menor preço do topo. Mantém a identidade
// navy/gold do sistema (sem cor "por marca"), destacando o mercado com o
// menor preço global via um selo dourado.
// -----------------------------------------------------------------------------
function MarketGroupedResults({
  groups,
  kindFilter,
  fmt,
  globalMin,
  highlightTokens,
}: {
  groups: ProductGroup[];
  kindFilter: string | null;
  fmt: (n: number) => string;
  globalMin: number | null;
  highlightTokens: string[];
}) {
  type Row = {
    productName: string;
    catalogId: string | null;
    price: PricePoint;
  };
  type Bucket = {
    marketName: string;
    logoUrl: string | null;
    minPrice: number;
    rows: Row[];
  };

  const bucketsMap = new Map<string, Bucket>();
  for (const g of groups) {
    const prices = kindFilter
      ? g.prices.filter((p) => p.marketKind === kindFilter)
      : g.prices;
    for (const p of prices) {
      const key = p.marketName;
      let b = bucketsMap.get(key);
      if (!b) {
        b = {
          marketName: p.marketName,
          logoUrl: p.marketLogoUrl,
          minPrice: p.price,
          rows: [],
        };
        bucketsMap.set(key, b);
      }
      if (p.price < b.minPrice) b.minPrice = p.price;
      if (!b.logoUrl && p.marketLogoUrl) b.logoUrl = p.marketLogoUrl;
      b.rows.push({ productName: g.productName, catalogId: g.catalogId, price: p });
    }
  }

  const buckets = Array.from(bucketsMap.values())
    .map((b) => ({
      ...b,
      rows: [...b.rows].sort((a, z) => a.price.price - z.price.price),
    }))
    .sort((a, z) => a.minPrice - z.minPrice);

  if (buckets.length === 0) return null;

  return (
    <div className="space-y-3">
      {buckets.map((b, idx) => {
        const isCheapest = globalMin != null && b.minPrice === globalMin;
        return (
          <section
            key={b.marketName}
            className={
              "overflow-hidden rounded-xl border shadow-sm " +
              (isCheapest
                ? "border-brand-gold/70 bg-[color-mix(in_oklab,var(--color-brand-gold)_5%,var(--card))]"
                : "border-border/60 bg-card/70")
            }
          >
            <header className="flex items-center gap-3 border-b border-border/50 bg-background/40 px-3 py-2.5">
              <span
                className="grid h-8 w-8 flex-none place-items-center rounded-md border border-brand-gold/30 bg-background overflow-hidden"
                aria-hidden="true"
              >
                {b.logoUrl ? (
                  <img
                    src={b.logoUrl}
                    alt=""
                    className="h-full w-full object-contain p-0.5"
                    loading="lazy"
                  />
                ) : (
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="market-name truncate text-[13.5px] font-semibold text-foreground">
                    {b.marketName}
                  </span>
                  {isCheapest ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-gold/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-brand-gold">
                      <Crown className="h-3 w-3" /> Menor preço
                    </span>
                  ) : (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">
                      #{idx + 1}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                  {b.rows.length} {b.rows.length === 1 ? "produto" : "produtos"} · a partir de{" "}
                  <span className="font-semibold tabular-nums text-foreground">{fmt(b.minPrice)}</span>
                </p>
              </div>
            </header>
            <ul className="divide-y divide-border/50">
              {b.rows.map((r, i) => (
                <li
                  key={`${r.productName}-${r.price.when}-${i}`}
                  className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-brand-gold/5"
                >
                  <StoreColorBar name={b.marketName} brandColor={r.price.marketBrandColor} />
                  <Link
                    to="/produto/$slug"
                    params={{ slug: r.productName }}
                    className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-foreground hover:text-brand-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold rounded"
                  >
                    <HighlightMatch text={r.productName} tokens={highlightTokens} />
                  </Link>
                  <span className="whitespace-nowrap text-[14px] font-bold tabular-nums text-foreground">
                    {fmt(r.price.price)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
