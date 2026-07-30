import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { usePricesRealtime } from "@/hooks/usePricesRealtime";
import { useListScrollPersistence } from "@/hooks/useListScrollPersistence";
import { LiveUpdateBadge, useLivePulse } from "@/components/ui/live-update-badge";
import { SearchGlassScrim } from "@/components/search/SearchGlassScrim";
import { Price } from "@/components/ds/Price";
import { Link } from "@tanstack/react-router";
import { searchProductPrice, type PriceSearchResult, type PriceSuggestion, type ProductGroup } from "@/lib/price-search.functions";
import { suggestProducts, type ProductSuggestion } from "@/lib/product-suggest.functions";
import {
  clearSearchHistory,
  getSearchHistory,
  pushSearchHistory,
  removeSearchHistory,
  setSearchHistoryPersistence,
  type SearchHistoryEntry,
} from "@/lib/search-history";

import { ChevronDown, ChevronUp, Clock, Crown, MapPin, Search, ShoppingBag, Sparkles, X } from "lucide-react";
import { FairPriceBadge } from "@/components/product/FairPriceBadge";
import { CreatePriceAlertButton } from "@/components/alerts/CreatePriceAlertButton";

import { HighlightMatch } from "@/components/search/HighlightMatch";
import { AnchoredDropdown } from "@/components/search/AnchoredDropdown";
import { MatchReasonBadges } from "@/components/search/MatchReasonBadges";
import { SearchInterpretationSummary } from "@/components/search/SearchInterpretationSummary";
import { UnitPriceBadge } from "@/components/product/UnitPriceBadge";
import { computeUnitPrice } from "@/lib/unit-price";
import { pickBestValue, type BestValueResult } from "@/lib/best-value";
import { BestValueBadge } from "@/components/ds/BestValueBadge";

import { ProductQuickActions } from "@/components/product/ProductQuickActions";
import { StoreBadge, StoreColorBar } from "@/components/brand/StoreBadge";
import { readableTextOn } from "@/lib/color-contrast";
import { tokenizeQuery, type SearchMode, type MatchReason } from "@/lib/search-tokens";
import { ProductCompareDialog, CompareTray } from "@/components/search/ProductCompareDialog";
import {
  SearchEmptyState,
  type EmptyFilterShortcut,
} from "@/components/search/SearchEmptyState";
import { ProductQuickModal } from "@/components/home/ProductQuickModal";
import { useLocalStorageState } from "@/hooks/use-local-storage";
import { PaywallInline } from "@/components/paywall/PaywallInline";
import { useTeaserQuota } from "@/hooks/use-teaser-quota";
import { useSession } from "@/hooks/useSession";
import { LazyImage } from "@/components/media/LazyImage";






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



type SortMode = "relevance" | "cheapest" | "highest" | "unit" | "recent" | "kind" | "spread" | "savings";

export function PriceSearchBar({
  initialQuery = "",
  mode = "strict",
  pureOnly = false,
  brandFilter = "",
  priceMin,
  priceMax,
  onQueryChange,
  filterShortcuts = [],
  activeFilterCount = 0,
  onClearFilters,
  sort: sortProp,
  category: categoryProp,
  onSortChange,
  onCategoryChange,
  focusProduct = null,
  focusMarket = null,
  onFocusChange,
  fitResults = false,
}: {
  initialQuery?: string;
  mode?: SearchMode;
  pureOnly?: boolean;
  brandFilter?: string;
  priceMin?: number;
  priceMax?: number;
  onQueryChange?: (q: string) => void;
  /** Atalhos exibidos no estado vazio para afrouxar filtros da rota. */
  filterShortcuts?: EmptyFilterShortcut[];
  activeFilterCount?: number;
  onClearFilters?: () => void;
  /** Ordenação controlada externamente (URL). Quando ausente, cai no localStorage. */
  sort?: SortMode;
  /** Filtro de categoria controlado externamente (URL). Quando ausente, cai no localStorage. */
  category?: string | null;
  onSortChange?: (mode: SortMode) => void;
  onCategoryChange?: (category: string | null) => void;
  /** Produto selecionado (slug do nome). Quando definido, o card recebe
   * scrollIntoView + foco de teclado, e o accordion abre expandido. */
  focusProduct?: string | null;
  /** Estabelecimento selecionado (nome normalizado) dentro do produto focado. */
  focusMarket?: string | null;
  /** Disparado quando o usuário clica num card para atualizar a URL. */
  onFocusChange?: (product: string | null, market: string | null) => void;
  /** Faz a busca ocupar a altura disponível da rota, com resultados rolando internamente. */
  fitResults?: boolean;
}) {


  const runSearch = useServerFn(searchProductPrice);
  const runSuggest = useServerFn(suggestProducts);



  const { user, loading: sessionLoading } = useSession();
  const isVisitor = !user;
  const quota = useTeaserQuota(3);
  const [quotaBlocked, setQuotaBlocked] = useState(false);

  const [query, setQuery] = useState(normalizeInput(initialQuery));
  const [rawResult, setResult] = useState<PriceSearchResult | null>(null);
  const [marketFilter, setMarketFilter] = useState<string | null>(null);
  // Reset market filter whenever a new search is issued (query changes).
  useEffect(() => { setMarketFilter(null); }, [initialQuery]);
  const result = useMemo<PriceSearchResult | null>(() => {
    if (!rawResult) return rawResult;
    const brandNeedle = brandFilter.trim().toLowerCase();
    const hasMin = typeof priceMin === "number" && Number.isFinite(priceMin);
    const hasMax = typeof priceMax === "number" && Number.isFinite(priceMax);
    const marketNeedle = (marketFilter ?? "").trim().toLowerCase();
    if (!brandNeedle && !hasMin && !hasMax && !marketNeedle) return rawResult;
    const groups = rawResult.groups
      .map((g) => {
        const prices = (g.prices ?? []).filter((p) => {
          if (hasMin && p.price < (priceMin as number)) return false;
          if (hasMax && p.price > (priceMax as number)) return false;
          if (marketNeedle && (p.marketName ?? "").toLowerCase() !== marketNeedle) return false;
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
  }, [rawResult, brandFilter, priceMin, priceMax, marketFilter]);


  const [err, setErr] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);


  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [sortMode, setSortMode] = useLocalStorageState<SortMode>(
    "search:sort-mode",
    "cheapest",
    {
      validate: (v): v is SortMode =>
        v === "relevance" || v === "cheapest" || v === "highest" || v === "unit" || v === "recent" || v === "kind" || v === "spread" || v === "savings",
    },
  );
  const [kindFilter, setKindFilter] = useState<string | null>(null);
  /**
   * Filtro de disponibilidade: não há campo de estoque na base, então usamos a
   * recência da coleta como melhor proxy disponível ("preço visto há ≤ X dias").
   */
  const [freshness, setFreshness] = useLocalStorageState<"all" | "30" | "7">(
    "search:freshness",
    "all",
    { validate: (v): v is "all" | "30" | "7" => v === "all" || v === "30" || v === "7" },
  );

  const [categoryFilter, setCategoryFilter] = useLocalStorageState<string | null>(
    "search:category-filter",
    null,
    { validate: (v): v is string | null => v === null || typeof v === "string" },
  );
  const [groupBy, setGroupBy] = useLocalStorageState<"product" | "market" | "matrix">(
    "pc:search:groupBy",
    "product",
    { validate: (v): v is "product" | "market" | "matrix" => v === "product" || v === "market" || v === "matrix" },
  );

  // Sincroniza props controladas (URL) com o estado interno. Quando o pai
  // envia `sort`/`category`, tratamos como fonte de verdade e propagamos as
  // mudanças do usuário via callbacks (URL → estado → URL, sem loops).
  useEffect(() => {
    if (sortProp && sortProp !== sortMode) setSortMode(sortProp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortProp]);
  useEffect(() => {
    if (categoryProp !== undefined && categoryProp !== categoryFilter) {
      setCategoryFilter(categoryProp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryProp]);

  const handleSortChange = useCallback(
    (next: SortMode) => {
      setSortMode(next);
      onSortChange?.(next);
    },
    [setSortMode, onSortChange],
  );
  const handleCategoryChange = useCallback(
    (next: string | null) => {
      setCategoryFilter(next);
      onCategoryChange?.(next);
    },
    [setCategoryFilter, onCategoryChange],
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

  /**
   * Trilho de resultados: rolagem interna própria. Guardamos a posição por
   * termo pesquisado (sessionStorage) para que voltar de um produto não jogue
   * o usuário de volta ao topo da lista.
   */
  const resultsRef = useRef<HTMLDivElement>(null);
  const resultsScrollKey = `pc:buscar:resultados:${
    normalizeInput(query).trim().toLowerCase() || "vazio"
  }`;
  const { persistScroll } = useListScrollPersistence(
    resultsRef,
    resultsScrollKey,
    !!rawResult,
  );

  /**
   * Navegação por teclado entre os cards de produto. Setas movem o foco,
   * Home/End vão para o primeiro/último. Ignoramos quando o foco está num
   * campo de texto para não atrapalhar a digitação.
   */
  const onResultsKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") {
      return;
    }
    const root = resultsRef.current;
    if (!root) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest("input,textarea,select,[contenteditable='true']")) return;
    const cards = Array.from(root.querySelectorAll<HTMLElement>("[data-result-card]"));
    if (cards.length === 0) return;
    const current = cards.findIndex((c) => c.contains(document.activeElement));
    let next: number;
    if (e.key === "ArrowDown") next = current < 0 ? 0 : Math.min(current + 1, cards.length - 1);
    else if (e.key === "ArrowUp") next = current <= 0 ? 0 : current - 1;
    else if (e.key === "Home") next = 0;
    else next = cards.length - 1;
    e.preventDefault();
    const el = cards[next];
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: "nearest" });
  };

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestSeq = useRef(0);
  const suggestAbort = useRef<AbortController | null>(null);
  /** Sequência da busca principal — descarta respostas fora de ordem. */
  const searchSeq = useRef(0);
  const searchAbort = useRef<AbortController | null>(null);
  const lastSearchKey = useRef<string | null>(null);

  // Auto-correção: quando a busca retorna vazia e temos uma sugestão fuzzy
  // com boa similaridade, re-executamos automaticamente com o termo corrigido
  // e exibimos um aviso permitindo voltar ao original.
  const [autoCorrected, setAutoCorrected] = useState<{ from: string; to: string } | null>(null);
  const lastAutoCorrectFor = useRef<string | null>(null);


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

  // Histórico só é persistido para usuários autenticados; visitantes usam
  // memória volátil (o histórico é limpo a cada recarregamento da página).
  useEffect(() => {
    if (sessionLoading) return;
    setSearchHistoryPersistence(!!user);
    setHistory(getSearchHistory());
  }, [sessionLoading, user]);


  const runQuery = (q: string, opts?: { force?: boolean; fresh?: boolean; silent?: boolean }) => {
    setErr(null);
    // `silent` = busca disparada enquanto o usuário ainda digita: não fecha a
    // lista de sugestões, não grava histórico e não debita cota do visitante.
    if (!opts?.silent) {
      setShowSuggest(false);
      setHistory(pushSearchHistory(q));
    }
    // A busca em si é grátis — só bloqueamos quando o visitante já esgotou
    // a cota em outras ações (ex.: abrir detalhes de produtos). Isso evita
    // "queimar" créditos apenas por carregar a página com ?q=... na URL.
    if (isVisitor && quota.exceeded) {
      setQuotaBlocked(true);
      setResult(null);
      setIsSearching(false);
      return;
    }
    setQuotaBlocked(false);
    // Evita refetch idêntico (mesmo termo + mesmos filtros) — principal fonte
    // de "flicker" quando a URL sincroniza enquanto o usuário digita.
    const key = `${q.toLowerCase()}|${mode}|${pureOnly ? 1 : 0}`;
    onQueryChange?.(q);
    if (!opts?.force && lastSearchKey.current === key) return;
    lastSearchKey.current = key;
    // Só debita cota quando o visitante realmente digita e envia uma busca
    // manual — auto-run vindo da URL não custa (`consumeOnce` por termo).
    if (isVisitor && !opts?.silent) quota.consumeOnce(`search:${q.toLowerCase()}`);
    // Cancela a requisição anterior ainda em voo.
    searchAbort.current?.abort();
    const ctrl = new AbortController();
    searchAbort.current = ctrl;
    const seq = ++searchSeq.current;
    setIsSearching(true);
    runSearch({ data: { query: q, mode, pureOnly, fresh: !!opts?.fresh }, signal: ctrl.signal })
      .then((r) => {
        if (seq !== searchSeq.current) return; // resposta obsoleta
        setResult(r);
      })
      .catch((e: unknown) => {
        if (seq !== searchSeq.current || ctrl.signal.aborted) return;
        setErr(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (seq === searchSeq.current) setIsSearching(false);
      });
  };

  // Cancela requisições pendentes ao desmontar.
  useEffect(
    () => () => {
      searchAbort.current?.abort();
      suggestAbort.current?.abort();
    },
    [],
  );

  // Preços novos chegando (tempo real): reexecuta a busca atual ignorando
  // caches, sem recarregar a página.
  const queryRef = useRef("");
  queryRef.current = query;
  const live = useLivePulse();
  usePricesRealtime(() => {
    const q = normalizeInput(queryRef.current).trim();
    if (q.length < 2) return;
    live.ping();
    runQuery(q, { force: true, fresh: true });
  });

  // Busca enquanto digita: a partir de 3 caracteres a consulta completa já
  // roda em segundo plano (debounce + cancelamento), então ao parar de digitar
  // os resultados já estão prontos — sem precisar apertar Enter.
  useEffect(() => {
    const q = normalizeInput(query).trim();
    if (q.length < 3) return;
    const t = window.setTimeout(() => runQuery(q, { silent: true }), 240);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Auto-busca a partir de `?q=` — só na montagem. Depois disso a URL passa a
  // ser espelho do que o usuário digita; reagir a ela aqui reabriria uma busca
  // "não silenciosa" a cada tecla e fecharia a lista de sugestões.
  useEffect(() => {
    if (autoRan.current) return;
    autoRan.current = true;
    const q = normalizeInput(initialQuery).trim();
    if (q.length >= 2) runQuery(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Re-executa a busca quando o usuário troca modo/filtro após já ter resultado.
  useEffect(() => {
    if (!result) return;
    const q = normalizeInput(query).trim();
    if (q.length >= 2) runQuery(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, pureOnly]);

  // Autocomplete com debounce + cancelamento da requisição anterior.
  // `runSuggest` vem de `useServerFn` e muda de identidade a cada render; se
  // entrasse nas dependências, qualquer re-render (sync de URL, chegada de
  // resultados) reiniciaria o efeito e descartaria a resposta em voo — a lista
  // nunca chegava a aparecer. Por isso ele fica numa ref.
  const runSuggestRef = useRef(runSuggest);
  runSuggestRef.current = runSuggest;
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      suggestAbort.current?.abort();
      setSuggestions([]);
      return;
    }
    const seq = ++suggestSeq.current;
    const t = window.setTimeout(() => {
      suggestAbort.current?.abort();
      const ctrl = new AbortController();
      suggestAbort.current = ctrl;
      runSuggestRef
        .current({ data: { query: q }, signal: ctrl.signal })
        .then((rows) => {
          if (seq !== suggestSeq.current) return;
          setSuggestions(rows);
          setActiveIdx(-1);
        })
        .catch(() => {
          if (seq !== suggestSeq.current || ctrl.signal.aborted) return;
          // Mantém as sugestões anteriores para não piscar a lista.
        });
    }, 120);
    return () => window.clearTimeout(t);
  }, [query]);



  // Auto-correct: se resultado veio vazio e existe termo fuzzy próximo,
  // troca automaticamente por ele (uma única vez por termo original).
  useEffect(() => {
    if (!rawResult) return;
    const q = normalizeInput(query).trim().toLowerCase();
    if (!q || rawResult.groups.length > 0) return;
    if (lastAutoCorrectFor.current === q) return;
    const cand = suggestions.find((s) => s.isFuzzy && s.similarity >= 0.45);
    if (!cand) return;
    const corrected = normalizeInput(cand.displayName);
    if (corrected.trim().toLowerCase() === q) return;
    lastAutoCorrectFor.current = q;
    setAutoCorrected({ from: query, to: corrected });
    setInputValue(corrected);
    runQuery(corrected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawResult, suggestions]);

  // Fechamento ao clicar fora / Esc é responsabilidade do AnchoredDropdown
  // (o painel vive em portal, então um listener baseado em containerRef
  // fecharia a lista antes do clique na sugestão registrar).



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
    runQuery(q, { force: true });
  };

  const setInputValue = (v: string) => {
    if (inputRef.current) inputRef.current.value = v;
    setQuery(v);
  };

  const revertAutoCorrect = () => {
    if (!autoCorrected) return;
    const from = autoCorrected.from;
    setAutoCorrected(null);
    lastAutoCorrectFor.current = normalizeInput(from).trim().toLowerCase() + ":kept";
    setInputValue(from);
    runQuery(from);
  };


  const clear = () => {
    searchAbort.current?.abort();
    searchSeq.current += 1;
    lastSearchKey.current = null;
    setInputValue("");
    setResult(null);
    setErr(null);
    setIsSearching(false);
    setSuggestions([]);
    setShowSuggest(false);
    onQueryChange?.("");
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
    <section
      className={
        "pc-search-scope relative isolate z-40 " +
        (fitResults
          ? "flex h-full min-h-0 flex-col rounded-xl border-0 bg-transparent p-0"
          : "rounded-2xl border border-[color-mix(in_oklab,var(--color-border)_55%,transparent)] bg-surface p-3 sm:rounded-3xl sm:p-4")
      }
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color-mix(in_oklab,var(--color-accent)_70%,transparent)] to-transparent"
      />
      <div className="mb-2 flex items-center gap-2">
        <Search className="h-4 w-4 text-brand-navy dark:text-gold-ink" strokeWidth={2.25} aria-hidden="true" />
        <span
          role="note"
          aria-label="Passo 01: Pesquisar preço"
          className="inline-flex items-center gap-1 rounded-full border border-brand-gold bg-brand-navy px-2 py-0.5 font-sans text-[12.5px] font-medium text-gold-ink gold-on-dark"
        >
          <span aria-hidden="true" className="tabular-nums">01</span>
          <span aria-hidden="true" className="opacity-70">·</span>
          <span aria-hidden="true">Pesquisar preço</span>
        </span>

      </div>


      <form onSubmit={submit} className="flex items-stretch gap-2" autoComplete="off">
        <div className="relative flex-1" ref={containerRef}>
          <Search
            aria-hidden="true"
            strokeWidth={2.25}
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-navy dark:text-gold-ink"
          />
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            enterKeyHint="search"
            defaultValue={normalizeInput(initialQuery)}
            onChange={(e) => {
              const next = normalizeInput(e.target.value.slice(0, 80));
              setQuery(next);
              setShowSuggest(true);
              if (autoCorrected) setAutoCorrected(null);
            }}
            onFocus={() => setShowSuggest(true)}
            onKeyDown={onKeyDown}
            placeholder="Buscar produto ou marca — ex.: Leite integral 1L"
            maxLength={80}
            spellCheck={false}
            autoCapitalize="sentences"
            autoCorrect="off"
            role="combobox"
            aria-expanded={showList || showHistory}
            aria-autocomplete="list"
            aria-controls="price-search-suggestions"
            className="h-11 w-full rounded-full border-2 border-brand-navy/20 bg-background pl-9 pr-9 text-[15px] font-medium tracking-wide text-foreground placeholder:font-normal placeholder:text-muted-foreground/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] transition-colors hover:border-brand-gold/60 focus:border-brand-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/40 dark:border-brand-gold/25"
            aria-label="Nome do produto"
          />

          {query && (
            <button
              type="button"
              onClick={clear}
              aria-label="Limpar"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {/*
            Portal ancorado: no mobile a lista ficava recortada/coberta por
            headers e barras sticky quando era `absolute` dentro da seção.
            O AnchoredDropdown renderiza em `position: fixed` no <body>, com
            reposicionamento em scroll/resize e fechamento por clique fora/Esc.
          */}
          <AnchoredDropdown
            anchorRef={containerRef}
            open={showHistory}
            onClose={() => setShowSuggest(false)}
            maxHeight={220}
            ariaLabel="Últimas buscas"
          >
            <div>
              <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
                <span className="text-[13px] font-medium text-muted-foreground">
                  Últimas buscas
                </span>
                <button
                  type="button"
                  onMouseDown={clearAllHistory}
                  className="rounded px-1 text-[13px] font-medium text-muted-foreground hover:text-foreground"
                >
                  Limpar
                </button>
              </div>
              <div
                role="listbox"
                aria-label="Últimas buscas"
                className="flex flex-wrap gap-1.5 p-2.5"
              >
                {history.map((h) => (
                  <span
                    key={h.query}
                    role="option"
                    aria-selected={false}
                    className="group inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-background py-0.5 pl-2 pr-0.5 text-[13.5px] text-foreground"
                  >
                    <Clock className="h-3 w-3 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                    <button
                      type="button"
                      onClick={() => chooseHistory(h.query)}
                      className="max-w-[11rem] truncate text-left"
                      title={h.query}
                    >
                      {h.query}
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => removeHistoryItem(e, h.query)}
                      aria-label={`Remover ${h.query} do histórico`}
                      className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-primary/10 hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              {isVisitor ? (
                <p className="border-t border-border px-3 py-1.5 text-[13px] text-muted-foreground">
                  Sem conta, o histórico fica só nesta visita — entre para salvá-lo.
                </p>
              ) : null}
            </div>
          </AnchoredDropdown>


          <SearchGlassScrim
            open={showList || showHistory}
            anchorRef={containerRef}
            onDismiss={() => setShowSuggest(false)}
          />

          <AnchoredDropdown
            anchorRef={containerRef}
            open={showList}
            onClose={() => setShowSuggest(false)}
            maxHeight={320}
            ariaLabel="Sugestões de produtos"
          >
            <div>

              {didYouMean && (
                <button
                  type="button"
                  onClick={() => chooseSuggestion(didYouMean)}
                  className="flex w-full items-start gap-2 border-b border-border bg-warning/10 px-3 py-2 text-left transition hover:bg-warning/20"
                >
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" strokeWidth={1.75} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-warning dark:text-warning">
                      Você quis dizer
                    </p>
                    <p className="truncate text-[14.5px] font-semibold text-foreground">
                      {didYouMean.displayName}?
                    </p>
                  </div>
                </button>
              )}
              <ul
                id="price-search-suggestions"
                role="listbox"
              >

              {suggestions.map((s, i) => (
                <li key={s.id} role="option" aria-selected={i === activeIdx}>
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
                      <p className="truncate text-[14.5px] font-medium">
                        {/* "loose" destaca prefixos (ex.: "mante" em "Manteiga") */}
                        <HighlightMatch text={s.displayName} tokens={highlightTokens} mode="loose" />
                      </p>
                      <p className="truncate font-mono text-[12.5px] text-muted-foreground">
                        {[s.brand, s.category].filter(Boolean).join(" · ") ? (
                          <HighlightMatch
                            text={[s.brand, s.category].filter(Boolean).join(" · ")}
                            tokens={highlightTokens}
                            mode="loose"
                            className="rounded bg-accent/20 px-0.5 font-bold text-foreground"
                          />
                        ) : (
                          "Produto"
                        )}
                      </p>
                    </div>
                  </button>
                </li>
              ))}

              </ul>
            </div>
          </AnchoredDropdown>


        </div>
        <button
          type="submit"
          disabled={isSearching}
          aria-label="Buscar"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border-2 border-brand-gold bg-brand-gold px-3.5 text-[13px] font-bold uppercase tracking-[0.14em] text-brand-navy shadow-[0_8px_20px_-10px_color-mix(in_oklab,var(--brand-gold)_80%,transparent)] transition-all duration-150 hover:-translate-y-px hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60 sm:px-5"
        >
          <Search className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
          <span className="hidden sm:inline">{isSearching ? "Buscando…" : "Buscar"}</span>
        </button>
      </form>



      {err && (
        <div
          role="alert"
          aria-live="assertive"
          className="pc-res-card mt-3 border-[color-mix(in_oklab,var(--color-destructive)_38%,transparent)] bg-[color-mix(in_oklab,var(--color-destructive)_7%,transparent)] p-3 sm:p-4"
        >
          <div className="flex items-start gap-2.5">
            <span
              aria-hidden="true"
              className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[color-mix(in_oklab,var(--color-destructive)_45%,transparent)] text-destructive"
            >
              !
            </span>
            <div className="min-w-0 flex-1">
              <p className="pc-res-title">Não foi possível concluir a busca</p>
              <p className="pc-res-meta mt-1 break-words">{err}</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const term = normalizeInput(inputRef.current?.value ?? query).trim();
                    if (term.length >= 2) runQuery(term);
                  }}
                  className="pc-res-store inline-flex h-9 items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--brand-gold)_55%,transparent)] bg-[color-mix(in_oklab,var(--brand-gold)_14%,transparent)] px-3.5 font-semibold text-[var(--pc-gold-ink)] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50"
                >
                  Tentar novamente
                </button>
                <button
                  type="button"
                  onClick={clear}
                  className="pc-res-store inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3.5 font-medium text-foreground transition hover:border-[var(--pc-gold-ink)] hover:text-[var(--pc-gold-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50"
                >
                  Nova busca
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {quotaBlocked && !err && (
        <div className="mt-3">
          <PaywallInline
            title="Você usou suas 3 buscas grátis"
            subtitle="Crie sua conta em 30 segundos e continue pesquisando preços sem limite."
          />
        </div>
      )}

      {/* Loading skeleton — espelha a hierarquia real dos resultados (resumo + cards) */}
      {isSearching && !result && !err && !quotaBlocked && (
        <div
          className={
            "pc-results [content-visibility:auto] " +
            (fitResults
              ? "mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1"
              : "mt-4 min-h-[640px]")
          }
          aria-busy="true"
          aria-live="polite"
          aria-label="Carregando resultados"
        >
          <p className="sr-only">Buscando preços…</p>

          {/* Painel resumo (melhor preço / economia) */}
          <div
            className="animate-pulse rounded-xl border border-[color-mix(in_oklab,var(--color-border)_45%,transparent)] p-3.5 sm:p-4"
            aria-hidden="true"
          >
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              {[0, 1].map((i) => (
                <div key={i} className="space-y-2">
                  <span className="block h-2.5 w-24 rounded bg-muted/50" />
                  <span className="block h-6 w-32 rounded bg-muted/60" />
                  <span className="block h-2.5 w-40 rounded bg-muted/40" />
                </div>
              ))}
            </div>
          </div>

          {/* Cards de produto */}
          <ul className="contents" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="pc-res-card animate-pulse">
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <span className="block h-3.5 w-3/5 rounded bg-muted/55" />
                    <span className="block h-2.5 w-2/5 rounded bg-muted/40" />
                  </div>
                  <div className="flex gap-1.5">
                    <span className="h-6 w-20 rounded-full bg-muted/35" />
                    <span className="hidden h-6 w-16 rounded-full bg-muted/30 sm:block" />
                  </div>
                </div>
                <div className="mt-2.5 space-y-2 border-t border-[color-mix(in_oklab,var(--color-border)_45%,transparent)] pt-2.5">
                  {[0, 1].map((j) => (
                    <div key={j} className="flex items-center gap-2.5">
                      <span className="h-7 w-7 shrink-0 rounded-full bg-muted/40" />
                      <span className="h-3 min-w-0 flex-1 rounded bg-muted/35" />
                      <span className="h-4 w-16 shrink-0 rounded bg-muted/45" />
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>

        </div>
      )}

      {result && !err && !quotaBlocked && (
        <div
          ref={resultsRef}
          onScroll={(e) => persistScroll(e.currentTarget)}
          onKeyDown={onResultsKeyDown}
          className={`${
            fitResults
              ? "mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1 md:space-y-2.5"
              : "mt-4 min-h-[640px] space-y-3 md:space-y-4"
          } [overflow-anchor:none] transition-opacity duration-150 ${isSearching ? "opacity-70" : "opacity-100"}`}
          aria-busy={isSearching || undefined}
          aria-live="polite"
        >
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

          {autoCorrected && (
            <div
              role="status"
              className="flex flex-wrap items-center gap-2 rounded-lg border border-brand-gold/40 bg-brand-gold/10 px-3 py-2 text-[13px] text-foreground"
            >
              <Sparkles className="h-3.5 w-3.5 text-gold-ink" aria-hidden="true" />
              <span>
                Corrigido para{" "}
                <strong className="font-semibold">“{autoCorrected.to}”</strong>. Você digitou{" "}
                <em className="italic text-muted-foreground">“{autoCorrected.from}”</em>.
              </span>
              <button
                type="button"
                onClick={revertAutoCorrect}
                className="ml-auto rounded-md border border-brand-gold/40 bg-background px-2 py-0.5 text-[13px] font-medium text-foreground hover:bg-brand-gold/20 focus-ring"
              >
                Buscar “{autoCorrected.from}” mesmo assim
              </button>
            </div>
          )}

          <MarketLegend
            source={rawResult}
            active={marketFilter}
            onPick={(name) => setMarketFilter((cur) => (cur === name ? null : name))}
          />


          {result.canonicalGroup && result.excludedByPureFilter > 0 && (
            <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 font-mono text-[12.5px] text-muted-foreground">
              Filtro <span className="text-primary">“{result.canonicalGroup}” puro</span> ativo — {result.excludedByPureFilter} item(s) com o termo apenas como ingrediente foram ocultados.
            </p>
          )}
          {result.samples === 0 ? (
            <>
              <SearchEmptyState
                query={result.query}
                recent={history.map((h) => h.query)}
                onSearch={(term) => {
                  const next = normalizeInput(term);
                  setInputValue(next);
                  setShowSuggest(false);
                  runQuery(next);
                }}
                onClearQuery={clear}
                filterShortcuts={filterShortcuts}
                activeFilterCount={activeFilterCount}
                onClearFilters={onClearFilters}
              />

              {didYouMean && (
                <button
                  type="button"
                  onClick={() => chooseSuggestion(didYouMean)}
                  className="flex w-full items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-left transition hover:bg-warning/20"
                >
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" strokeWidth={1.75} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-warning dark:text-warning">
                      Você quis dizer
                    </p>
                    <p className="truncate text-sm font-semibold text-foreground">
                      {didYouMean.displayName}?
                    </p>
                    <p className="font-mono text-[12.5px] text-muted-foreground">
                      Clique para buscar com esta correção
                    </p>
                  </div>
                </button>
              )}
            </>
          ) : (

            <>
              {/* Resumo topo: um único painel com melhor preço, economia e estatísticas */}
              {(() => {
                const rMin = typeof result.min === "number" ? result.min : null;
                const rMax = typeof result.max === "number" ? result.max : null;
                const hasGap = result.cheapest && rMin != null && rMax != null && rMax > rMin;
                const gap = hasGap ? (rMax as number) - (rMin as number) : 0;
                const pct = hasGap ? Math.round((gap / (rMax as number)) * 100) : 0;
                const refGroup = result.groups?.find(
                  (g) => g.productName === result.cheapest?.productName,
                );
                const priciestMarket = refGroup
                  ? [...refGroup.prices].sort((a, b) => b.price - a.price)[0]?.marketName ?? null
                  : null;
                const bestProductName = result.cheapest?.productName ?? refGroup?.productName ?? null;
                const bestMarketPrices = refGroup
                  ? [...refGroup.prices].sort((a, b) => a.price - b.price).slice(0, 6)
                  : [];

                return (
                  <section
                    role="region"
                    aria-label={`Melhor resultado: ${fmt(result.cheapest?.price ?? result.min)}`}
                    tabIndex={0}
                    className="pc-best-result relative overflow-hidden rounded-xl border border-brand-gold/40 bg-brand-navy text-white ring-1 ring-brand-gold/20 shadow-[0_10px_40px_-18px_rgba(201,168,76,0.55)] outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-gold/70 to-transparent" />
                    <span aria-hidden className="pointer-events-none absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-brand-gold via-brand-gold/60 to-transparent" />
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-white/[0.03] px-3.5 py-1.5">
                      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-gold-ink">
                        <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-brand-gold shadow-[0_0_8px_rgba(201,168,76,0.9)]" />
                        Melhor resultado
                      </span>
                      {hasGap ? (
                        <span
                          role="status"
                          aria-label={`Economia estimada de ${pct} por cento comprando pelo menor preço.`}
                          className="inline-flex items-center gap-1 rounded-full border border-brand-gold/40 bg-brand-gold/10 px-2 py-[2px] text-[12px] font-bold uppercase tracking-[0.08em] text-gold-ink"
                        >
                          Economize {pct}% hoje
                        </span>
                      ) : (
                        <span className="text-[12.5px] font-medium uppercase tracking-wider text-white/85">
                          destaque da busca
                        </span>
                      )}
                    </div>


                    <div className="grid gap-3 px-3.5 py-3 sm:grid-cols-2 sm:gap-4">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-[12.5px] font-medium text-gold-ink/90">
                          Menor preço agora
                          <LiveUpdateBadge active={live.active} tone="onDark" />
                        </p>
                        <Price
                          as="p"
                          size="xl"
                          tone="onhero"
                          value={result.cheapest?.price ?? result.min}
                          className="mt-1"
                        />

                        {result.cheapest ? (
                          <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[13px] text-white/85">
                            <StoreBadge
                              name={result.cheapest.marketName}
                              logoUrl={result.cheapest.marketLogoUrl}
                              brandColor={result.cheapest.marketBrandColor}
                              size="xs"
                              isCheapest
                              cheapestReason={buildCheapestReason(result.cheapest.price, result.avg)}
                            />
                            <span className="truncate">
                              {result.cheapest.productName ? (
                                <span className="font-medium text-white">
                                  {result.cheapest.productName}
                                </span>
                              ) : null}
                              {result.cheapest.productName ? " · " : ""}
                              em{" "}
                              <span className="font-semibold text-white">
                                {result.cheapest.marketName}
                              </span>
                            </span>
                          </p>
                        ) : null}
                      </div>

                      {hasGap ? (
                        <div className="min-w-0 border-t border-white/10 pt-3 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
                          <p className="text-[12.5px] font-medium text-gold-ink/90">Economia estimada</p>
                          <p className="pc-num pc-num--onhero mt-1 text-[26px] font-bold leading-none">
                            <Price value={gap} size="sm" />
                            <span className="pc-num pc-num--onhero ml-1.5 align-middle text-[13px] font-bold opacity-90">
                              −{pct}%
                            </span>
                          </p>

                          <p className="mt-1.5 truncate text-[13px] text-white/85 tabular-nums">
                            mesmo produto · mais caro <Price value={rMax} size="xs" tone="muted" />
                            {priciestMarket ? (
                              <> em <span className="font-semibold text-white/90">{priciestMarket}</span></>
                            ) : null}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    {bestProductName && bestMarketPrices.length > 1 ? (
                      <div className="border-t border-white/10 bg-white/[0.025] px-3.5 py-2">
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-gold-ink/90">
                            Onde encontrar este produto
                          </p>
                          <p className="text-[12px] font-medium text-white/85 tabular-nums">
                            {refGroup?.prices.length ?? 0} estabelecimento{(refGroup?.prices.length ?? 0) > 1 ? "s" : ""}
                          </p>
                        </div>
                        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                          {bestMarketPrices.map((p, i) => (
                            <button
                              key={`${p.marketName}-${p.when}-${i}`}
                              type="button"
                              onClick={() => onFocusChange?.(bestProductName, p.marketName)}
                              className={
                                "grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border px-2 py-1.5 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-brand-gold " +
                                (i === 0
                                  ? "border-brand-gold/65 bg-brand-gold/12"
                                  : "border-white/12 bg-white/[0.045] hover:border-brand-gold/35 hover:bg-white/[0.07]")
                              }
                              aria-label={`${p.marketName}: ${fmt(p.price)}${i === 0 ? ", menor preço" : ""}`}
                            >
                              <span className="flex min-w-0 items-center gap-1.5">
                                {i === 0 ? (
                                  <Crown className="h-3 w-3 shrink-0 text-gold-ink" strokeWidth={2.25} aria-hidden />
                                ) : (
                                  <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full border border-white/18 text-[11.5px] font-bold text-white/85 tabular-nums">
                                    {i + 1}
                                  </span>
                                )}
                                <span className="truncate text-[13px] font-semibold text-white/90">
                                  {p.marketName}
                                </span>
                              </span>
                              <Price
                                size="sm"
                                tone="onhero"
                                value={p.price}
                                className="text-gold-ink"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {/* Estatísticas — faixa única, sem cards repetidos */}
                    <dl className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 bg-white/[0.04]">
                      {[
                        { k: "Preço médio", v: fmt(result.avg) },
                        { k: "Menor preço", v: fmt(result.min) },
                        { k: "Preços comparados", v: String(result.samples) },
                      ].map((s) => (
                        <div key={s.k} className="min-w-0 px-3.5 py-2">
                          <dt className="truncate text-[12.5px] font-medium text-white/85">{s.k}</dt>
                          <dd className="pc-num pc-num--onhero mt-0.5 text-[16px] font-bold leading-none">
                            {s.v}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>

                );
              })()}




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
                // Disponibilidade: mantém só preços coletados dentro da janela
                // escolhida e recalcula as estatísticas do grupo.
                const maxAgeDays = freshness === "all" ? null : Number(freshness);
                /* Deduplica grupos que representam o mesmo produto com grafias
                   diferentes (acento/caixa/espaços). Sem isso, buscas vindas de
                   "Buscas em alta" podiam listar o mesmo item mais de uma vez. */
                const dedupedGroups = (() => {
                  const byKey = new Map<string, ProductGroup>();
                  for (const g of result.groups) {
                    const key = normalizeNameKey(g.productName) || g.productName.toLowerCase();
                    const cur = byKey.get(key);
                    if (!cur) {
                      byKey.set(key, g);
                      continue;
                    }
                    const seen = new Set(
                      cur.prices.map((p) => `${p.marketName}|${p.when}|${p.price}`),
                    );
                    const prices = [
                      ...cur.prices,
                      ...g.prices.filter(
                        (p) => !seen.has(`${p.marketName}|${p.when}|${p.price}`),
                      ),
                    ];
                    const vals = prices.map((p) => p.price);
                    byKey.set(key, {
                      ...cur,
                      catalogId: cur.catalogId ?? g.catalogId,
                      prices,
                      samples: prices.length,
                      min: Math.min(...vals),
                      max: Math.max(...vals),
                      avg: vals.reduce((s, v) => s + v, 0) / vals.length,
                      lastSeen:
                        new Date(g.lastSeen).getTime() > new Date(cur.lastSeen).getTime()
                          ? g.lastSeen
                          : cur.lastSeen,
                      matchReasons: Array.from(
                        new Set([...(cur.matchReasons ?? []), ...(g.matchReasons ?? [])]),
                      ) as ProductGroup["matchReasons"],
                    });
                  }
                  return Array.from(byKey.values());
                })();
                const visibleGroups =
                  maxAgeDays == null
                    ? dedupedGroups
                    : dedupedGroups
                        .map((g) => {
                          const prices = g.prices.filter((p) => daysSince(p.when) <= maxAgeDays);
                          if (prices.length === 0) return null;
                          const vals = prices.map((p) => p.price);
                          return {
                            ...g,
                            prices,
                            samples: prices.length,
                            min: Math.min(...vals),
                            max: Math.max(...vals),
                            avg: vals.reduce((s, v) => s + v, 0) / vals.length,
                          };
                        })
                        .filter((g): g is ProductGroup => g !== null);
                const buckets = new Map<string, typeof result.groups>();
                for (const g of visibleGroups) {
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
                const sortLabelMap: Record<SortMode, string> = {
                  cheapest: "Menor preço",
                  highest: "Maior preço",
                  relevance: "Relevância",
                  recent: "Novidade",
                  savings: "Maior economia",
                  unit: "Preço por unidade",
                  kind: "Tipo de mercado",
                  spread: "Maior variação",
                };
                const visibleCount = filteredOrdered.reduce(
                  (n, [, gs]) => n + gs.length,
                  0,
                );
                const announcement =
                  visibleCount === 0
                    ? `Nenhum resultado para "${query}"${
                        categoryFilter ? ` na categoria ${categoryFilter}` : ""
                      }. Ajuste os filtros ou tente outro termo.`
                    : `${visibleCount} ${
                        visibleCount === 1 ? "produto encontrado" : "produtos encontrados"
                      } para "${query}", ordenados por ${sortLabelMap[sortMode] ?? sortMode}${
                        categoryFilter ? `, filtrando por ${categoryFilter}` : ""
                      }${kindFilter ? `, mercados do tipo ${kindFilter}` : ""}.`;
                return (
                  <>
                    <p
                      role="status"
                      aria-live="polite"
                      aria-atomic="true"
                      className="sr-only"
                    >
                      {announcement}
                    </p>
                    <QuickFilters
                      sortMode={sortMode}
                      onSort={handleSortChange}
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
                      onCategory={handleCategoryChange}
                      groupBy={groupBy}
                      onGroupBy={setGroupBy}
                      freshness={freshness}
                      onFreshness={setFreshness}
                    />

                    {/* Resumo do que está sendo filtrado — linguagem simples,
                        sem jargão, sempre visível acima dos resultados. */}
                    {(() => {
                      const parts: string[] = [];
                      const term = normalizeInput(query).trim();
                      if (term) parts.push(`nome com “${term}”`);
                      if (categoryFilter) parts.push(`categoria ${categoryFilter}`);
                      if (kindFilter) parts.push(`tipo de mercado ${kindFilter}`);
                      if (marketFilter) parts.push(`mercado ${marketFilter}`);
                      if (brandFilter.trim()) parts.push(`marca ${brandFilter.trim()}`);
                      if (typeof priceMin === "number" && Number.isFinite(priceMin)) {
                        parts.push(`a partir de R$ ${priceMin.toFixed(2).replace(".", ",")}`);
                      }
                      if (typeof priceMax === "number" && Number.isFinite(priceMax)) {
                        parts.push(`até R$ ${priceMax.toFixed(2).replace(".", ",")}`);
                      }
                      if (freshness !== "all") {
                        parts.push(`preços dos últimos ${freshness} dias`);
                      }
                      const canReset =
                        !!categoryFilter || !!kindFilter || !!marketFilter || freshness !== "all";
                      return (
                        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 px-0.5 text-[13px] leading-snug text-muted-foreground">
                          <span className="font-semibold text-foreground tabular-nums">
                            {visibleCount}
                          </span>
                          <span>
                            {visibleCount === 1 ? "produto encontrado" : "produtos encontrados"}
                          </span>
                          <span aria-hidden className="opacity-40">
                            ·
                          </span>
                          <span>
                            {parts.length > 0
                              ? `filtrando por ${parts.join(" · ")}`
                              : "sem filtros ativos"}
                          </span>
                          <span aria-hidden className="opacity-40">
                            ·
                          </span>
                          <span>ordenado por {sortLabelMap[sortMode] ?? sortMode}</span>
                          {canReset && (
                            <button
                              type="button"
                              onClick={() => {
                                handleCategoryChange(null);
                                setKindFilter(null);
                                setMarketFilter(null);
                                setFreshness("all");
                              }}
                              className="ml-auto rounded-full border border-border px-2 py-[1px] text-[12.5px] font-semibold text-foreground transition-colors hover:border-brand-gold hover:text-[var(--pc-gold-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                            >
                              Limpar filtros da lista
                            </button>
                          )}
                        </p>
                      );
                    })()}



                    {result.groups.length > 0 && visibleGroups.length === 0 ? (
                      <div className="pc-res-card mt-2">
                        <p className="pc-res-title">Nenhum preço nessa janela de tempo</p>
                        <p className="pc-res-meta mt-1">
                          Não há preços coletados nos últimos {maxAgeDays} dias para esta busca.
                        </p>
                        <button
                          type="button"
                          onClick={() => setFreshness("all")}
                          className="pc-res-label mt-2 rounded-full border border-border bg-background px-2.5 py-1 text-foreground hover:border-[var(--pc-gold-ink)] hover:text-[var(--pc-gold-ink)]"
                        >
                          Mostrar todos os períodos
                        </button>
                      </div>
                    ) : null}

                    {groupBy === "market" && visibleGroups.length > 0 ? (

                      <MarketGroupedResults
                        groups={filteredOrdered.flatMap(([, gs]) => gs)}
                        kindFilter={kindFilter}
                        fmt={fmt}
                        globalMin={result.min}
                        sortMode={sortMode}
                        highlightTokens={highlightTokens}
                      />
                    ) : null}

                    {groupBy === "matrix" && visibleGroups.length > 0 ? (
                      <MatrixCompareResults
                        groups={filteredOrdered.flatMap(([, gs]) => gs)}
                        kindFilter={kindFilter}
                        fmt={fmt}
                        highlightTokens={highlightTokens}
                        query={query}
                        isAuthenticated={!!user}
                      />
                    ) : null}


                    {groupBy === "product" && visibleGroups.length > 0 ? (

                      <div className="pc-results">
                        {filteredOrdered.map(([cat, groups]) => {
                          // Ordena grupos com critérios explícitos por modo:
                          //  • relevance → score de similaridade do nome (exato,
                          //    marca, prefixo, tokens, variações) primeiro; preço
                          //    e amostragem como desempate consistente.
                          //  • recent    → data mais recente (lastSeen) primeiro,
                          //    preço e amostragem como desempate.
                          //  • savings   → maior amplitude (max−min) primeiro.
                          //  • demais    → menor preço, depois mais amostras.
                          const lastSeenTime = (g: ProductGroup) =>
                            g.lastSeen ? new Date(g.lastSeen).getTime() : 0;
                          const sortedGroups = [...groups].sort((a, b) => {
                            if (sortMode === "relevance") {
                              const sa = scoreRelevance(a, query);
                              const sb = scoreRelevance(b, query);
                              if (sa !== sb) return sb - sa;
                              if (a.min !== b.min) return a.min - b.min;
                              return b.samples - a.samples;
                            }
                            if (sortMode === "recent") {
                              const ta = lastSeenTime(a);
                              const tb = lastSeenTime(b);
                              if (ta !== tb) return tb - ta;
                              if (a.min !== b.min) return a.min - b.min;
                              return b.samples - a.samples;
                            }
                            if (sortMode === "savings") {
                              const sa = (a.max ?? a.min) - a.min;
                              const sb = (b.max ?? b.min) - b.min;
                              if (sa !== sb) return sb - sa;
                            }
                            if (sortMode === "highest") {
                              const am = a.max ?? a.min;
                              const bm = b.max ?? b.min;
                              if (am !== bm) return bm - am;
                              return b.samples - a.samples;
                            }
                            if (a.min !== b.min) return a.min - b.min;
                            return b.samples - a.samples;
                          });

                          /* Melhor custo-benefício da categoria: menor R$/kg
                             (ou R$/L) entre os produtos listados. Só aparece
                             quando as embalagens têm tamanhos diferentes —
                             ver src/lib/best-value.ts. */
                          const bestValue = pickBestValue(
                            sortedGroups.map((g) => ({
                              key: g.productName,
                              name: g.productName,
                              price: g.min,
                            })),
                          );

                          return (

                            <div key={cat} className="pc-results">
                              {showHeaders ? (
                                (() => {
                                  const catMin = sortedGroups.reduce(
                                    (m, g) => Math.min(m, g.min),
                                    Number.POSITIVE_INFINITY,
                                  );
                                  return (
                                    <div className="sticky top-0 z-10 -mx-0.5 flex items-center gap-2 rounded-md border border-border/60 bg-background/85 px-2 py-1.5 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
                                      <span
                                        className="font-serif text-[16px] italic leading-none text-[var(--pc-gold-ink)]"
                                        data-no-translate
                                      >
                                        {cat}
                                      </span>
                                      {Number.isFinite(catMin) ? (
                                        <span
                                          className="inline-flex items-center gap-1 rounded-full border border-brand-gold/40 bg-brand-navy px-2 py-[2px] text-[12px] font-bold uppercase tracking-[0.08em] text-gold-ink"
                                          title={`Menor preço nesta categoria: ${fmt(catMin)}`}
                                          aria-label={`Menor preço na categoria ${cat}: ${fmt(catMin)}`}
                                        >
                                          <Crown className="h-3 w-3" strokeWidth={2} aria-hidden />
                                          <span className="pc-num"><Price value={catMin} size="sm" /></span>
                                        </span>
                                      ) : null}
                                      <span className="h-px flex-1 bg-border" aria-hidden="true" />
                                      <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground tabular-nums">
                                        {sortedGroups.length} item{sortedGroups.length > 1 ? "s" : ""}
                                      </span>
                                    </div>
                                  );
                                })()
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
                                          bestValue={
                                            bestValue && bestValue.key === g.productName
                                              ? bestValue
                                              : null
                                          }
                                          isCompareSelected={compareSelection.includes(g.productName)}
                                          canSelectCompare={
                                            compareSelection.includes(g.productName) || compareSelection.length < 3
                                          }
                                          onToggleCompare={() => toggleCompare(g.productName)}
                                          focused={
                                            !!focusProduct &&
                                            g.productName.toLowerCase() === focusProduct.toLowerCase()
                                          }
                                          focusedMarket={
                                            !!focusProduct &&
                                            g.productName.toLowerCase() === focusProduct.toLowerCase()
                                              ? focusMarket
                                              : null
                                          }
                                          onSelect={onFocusChange ?? undefined}
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

              {result.groups.length === 0 && result.markets.length === 0 && (
                <SearchEmptyState
                  query={query}
                  recent={history.map((h) => h.query)}
                  onSearch={(term) => {
                    const next = normalizeInput(term);
                    setInputValue(next);
                    setShowSuggest(false);
                    runQuery(next);
                  }}
                  onClearQuery={clear}
                  filterShortcuts={filterShortcuts}
                  activeFilterCount={activeFilterCount}
                  onClearFilters={onClearFilters}
                />
              )}


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
                            className="my-auto grid h-7 w-7 shrink-0 place-items-center rounded-full border border-accent-strong/40 bg-accent/10 font-sans text-[12.5px] font-semibold tabular-nums text-accent-strong"
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
                            <p className="market-name truncate text-[14px]">
                              {m.marketName}
                            </p>


                            <p className="text-[13px] font-medium text-muted-foreground">
                              {m.samples} scan{m.samples > 1 ? "s" : ""}
                              <span aria-hidden="true" className="mx-1 text-accent-strong/50">·</span>
                              média <Price value={m.priceAvg} size="xs" tone="muted" />
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
                              <p className="text-[12.5px] font-medium text-accent-strong">
                                Menor
                              </p>
                            )}
                            <p className="font-display text-[17px] font-semibold leading-tight tabular-nums text-foreground">
                              <Price value={m.priceMin} size="sm" />
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






/**
 * Botão explícito de "mostrar mais" — substituiu o carregamento automático por
 * scroll (que deixava a página infinitamente alta). O usuário decide quando
 * revelar o próximo lote, mantendo a página com altura previsível.
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
  return (
    <button
      type="button"
      onClick={onLoad}
      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-[13px] font-medium text-foreground transition hover:border-[var(--pc-gold-ink)] hover:text-[var(--pc-gold-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      aria-label={`Mostrar mais itens em ${category}`}
    >
      Mostrar mais {Math.min(pageSize, hidden)} de {hidden} restantes
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
  establishmentId?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  price: number;
  when: string;
};


/** Dias inteiros desde a coleta do preço (0 = hoje). */
function daysSince(when: string): number {
  const t = new Date(when).getTime();
  if (!Number.isFinite(t)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

/** Rótulo curto de recência: "hoje", "há 3 dias", "há 2 meses". */
function freshnessLabel(when: string): string {
  const d = daysSince(when);
  if (!Number.isFinite(d)) return "sem data";
  if (d <= 0) return "hoje";
  if (d === 1) return "ontem";
  if (d < 30) return `há ${d} dias`;
  const months = Math.round(d / 30);
  if (months < 12) return `há ${months} ${months === 1 ? "mês" : "meses"}`;
  const years = Math.round(months / 12);
  return `há ${years} ano${years > 1 ? "s" : ""}`;
}

/** Classe de disponibilidade estimada pela recência da coleta. */
function availabilityTone(when: string): "fresh" | "recent" | "stale" {
  const d = daysSince(when);
  if (d <= 7) return "fresh";
  if (d <= 30) return "recent";
  return "stale";
}


/**
 * Score de relevância para ordenação de grupos de produto:
 * - Match exato de token no nome → 4 pts
 * - Match por prefixo/variação (1L, integral) → 2 pts
 * - Match de marca → 3 pts
 * - Bônus por conter todos os tokens da query no nome → 3 pts
 * - Bônus leve por número de amostras (log) → até 1 pt
 */
function scoreRelevance(g: ProductGroup, query: string): number {
  const q = normalizeInput(query).trim().toLowerCase();
  if (!q) return 0;
  const name = (g.productName ?? "").toLowerCase();
  const tokens = q.split(/\s+/).filter((t) => t.length >= 2);
  let score = 0;
  for (const r of g.matchReasons ?? []) {
    if (r.kind === "exact") score += 4;
    else if (r.kind === "brand") score += 3;
    else if (r.kind === "prefix") score += 2;
  }
  const allTokensInName = tokens.length > 0 && tokens.every((t) => name.includes(t));
  if (allTokensInName) score += 3;
  // Variações (1L, 500g, integral, desnatado…) — pequenos bônus se aparecem
  // tanto na query quanto no nome.
  const variationTerms = ["1l", "2l", "500ml", "500g", "1kg", "2kg", "integral", "desnatado", "semidesnatado", "light", "zero"];
  for (const v of variationTerms) {
    if (q.includes(v) && name.includes(v)) score += 1;
  }
  score += Math.min(1, Math.log10(1 + (g.samples ?? 0)) * 0.5);
  return score;
}

function sortPrices(prices: PricePoint[], mode: SortMode, productName?: string): PricePoint[] {
  const arr = [...prices];
  // Empate de preço → o preço coletado mais recentemente vem primeiro.
  const byRecency = (a: PricePoint, b: PricePoint) =>
    new Date(b.when).getTime() - new Date(a.when).getTime();
  if (mode === "cheapest" || mode === "relevance" || mode === "savings")
    arr.sort((a, b) => a.price - b.price || byRecency(a, b));
  else if (mode === "highest")
    arr.sort((a, b) => b.price - a.price || byRecency(a, b));
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
      if (ua === ub) return a.price - b.price || byRecency(a, b);
      return ua - ub;
    });
  } else if (mode === "recent")
    arr.sort((a, b) => byRecency(a, b) || a.price - b.price);
  else if (mode === "kind")
    arr.sort(
      (a, b) =>
        (a.marketKind ?? "zzz").localeCompare(b.marketKind ?? "zzz") ||
        a.price - b.price ||
        byRecency(a, b),
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
  freshness,
  onFreshness,
}: {
  sortMode: SortMode;
  onSort: (m: SortMode) => void;
  kinds: string[];
  kindFilter: string | null;
  onKind: (k: string | null) => void;
  categories: string[];
  categoryFilter: string | null;
  onCategory: (c: string | null) => void;
  groupBy: "product" | "market" | "matrix";
  onGroupBy: (g: "product" | "market" | "matrix") => void;
  freshness: "all" | "30" | "7";
  onFreshness: (v: "all" | "30" | "7") => void;
}) {
  const chip = (active: boolean) =>
    "rounded-full border px-2.5 py-1 font-mono text-[12.5px] tracking-wide transition " +
    (active
      ? "border-primary bg-primary/15 text-primary"
      : "border-border bg-background text-muted-foreground hover:text-foreground");
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[13px] font-medium text-muted-foreground">
        Agrupar
      </span>
      <button type="button" className={chip(groupBy === "product")} onClick={() => onGroupBy("product")}>
        Por produto
      </button>
      <button type="button" className={chip(groupBy === "market")} onClick={() => onGroupBy("market")}>
        Por mercado
      </button>
      <button type="button" className={chip(groupBy === "matrix")} onClick={() => onGroupBy("matrix")}>
        Comparar lado a lado
      </button>
      <span className="ml-2 text-[13px] font-medium text-muted-foreground">
        Ordenar
      </span>

      <button type="button" className={chip(sortMode === "relevance")} onClick={() => onSort("relevance")}>
        Relevância
      </button>
      <button type="button" className={chip(sortMode === "cheapest")} onClick={() => onSort("cheapest")}>
        Menor preço
      </button>
      <button type="button" className={chip(sortMode === "highest")} onClick={() => onSort("highest")}>
        Maior preço
      </button>
      <button
        type="button"
        className={chip(sortMode === "unit")}
        onClick={() => onSort("unit")}
      >
        Menor R$/kg ou /L
      </button>
      <button type="button" className={chip(sortMode === "savings")} onClick={() => onSort("savings")}>
        Maior economia
      </button>
      <button type="button" className={chip(sortMode === "spread")} onClick={() => onSort("spread")}>
        Menor variação
      </button>
      <button type="button" className={chip(sortMode === "recent")} onClick={() => onSort("recent")}>
        Mais recente
      </button>
      <span aria-hidden className="mx-0.5 h-4 w-px self-center bg-border" />
      <button
        type="button"
        className={chip(freshness === "all")}
        onClick={() => onFreshness("all")}
        title="Mostra preços de qualquer período"
      >
        Todos os preços
      </button>
      <button
        type="button"
        className={chip(freshness === "30")}
        onClick={() => onFreshness("30")}
        title="Só preços vistos nos últimos 30 dias"
      >
        Vistos em 30 dias
      </button>
      <button
        type="button"
        className={chip(freshness === "7")}
        onClick={() => onFreshness("7")}
        title="Só preços vistos nos últimos 7 dias"
      >
        Vistos em 7 dias
      </button>

      {kinds.length > 0 && (
        <button type="button" className={chip(sortMode === "kind")} onClick={() => onSort("kind")}>
          Por tipo
        </button>
      )}
      {categories.length > 1 && (
        <>
          <span className="ml-2 text-[13px] font-medium text-muted-foreground">
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
          <span className="ml-2 text-[13px] font-medium text-muted-foreground">
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
    <div className="relative rounded-lg border border-border bg-card px-2.5 py-2">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2.5">
        {suggestion.imageUrl ? (
          <LazyImage
            src={suggestion.imageUrl}
            alt={suggestion.displayName}
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-md border border-border bg-background object-contain"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted/30">
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
            <p className="truncate text-[14.5px] font-semibold tracking-tight text-foreground">
              <HighlightMatch text={suggestion.displayName} tokens={highlightTokens} />
            </p>
            {([suggestion.brand, suggestion.category].filter(Boolean).join(" · ") || "") && (
              <span className="truncate text-[13px] text-muted-foreground">
                {[suggestion.brand, suggestion.category].filter(Boolean).join(" · ")}
              </span>
            )}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <ProductQuickActions
              catalogId={suggestion.id}
              slug={suggestion.displayName}
              label={suggestion.displayName}
            />
            <Link
              to="/produto-publico/$slug"
              params={{ slug: suggestion.displayName }}
              className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[12.5px] font-medium text-primary hover:bg-primary/20"
            >
              Detalhes
            </Link>
            <Link
              to="/produto-publico/$slug"
              params={{ slug: suggestion.displayName }}
              hash="historico"
              className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[12.5px] font-medium text-foreground hover:bg-primary/5"
            >
              Histórico
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

}

// -----------------------------------------------------------------------------
// CompareMatrix — visualização lado a lado dos mercados mais baratos do
// produto selecionado. Exibida apenas quando o card está em foco (via URL) e
// há pelo menos dois mercados para comparar. Mostra, por coluna:
//   • nome do mercado (com destaque para o mais barato / focado);
//   • preço com token .pc-price (alto contraste);
//   • diferença absoluta contra o menor preço da lista;
//   • economia percentual contra o maior preço da lista;
//   • faixa mín↔máx do produto ao rodapé.
// A grade rola horizontalmente em telas estreitas para preservar densidade
// sem quebrar as métricas em várias linhas.
// -----------------------------------------------------------------------------
function CompareMatrix({
  productName,
  prices,
  globalMin,
  globalMax,
  fmt,
  onPick,
  focusedMarket,
}: {
  productName: string;
  prices: PricePoint[];
  globalMin: number;
  globalMax: number;
  fmt: (n: number | null | undefined) => string;
  onPick?: (marketName: string) => void;
  focusedMarket?: string | null;
}) {
  // Por padrão exibimos os 4 mercados mais baratos — cabem em uma linha até
  // ~640px sem exigir scroll horizontal. Usuário pode expandir para ver todos.
  const [expanded, setExpanded] = useState(false);
  const sorted = useMemo(
    () => [...prices].sort((a, b) => a.price - b.price),
    [prices],
  );
  const COLLAPSED_LIMIT = 4;
  const canExpand = sorted.length > COLLAPSED_LIMIT;
  const top = expanded ? sorted : sorted.slice(0, COLLAPSED_LIMIT);
  const hiddenCount = Math.max(0, sorted.length - COLLAPSED_LIMIT);
  const cheapest = top[0]?.price ?? globalMin;
  const spreadPct =
    globalMax > 0 && globalMin > 0 ? ((globalMax - globalMin) / globalMax) * 100 : 0;

  return (
    <section
      aria-label={`Comparação lado a lado dos mercados mais baratos para ${productName}`}
      className="mt-2 rounded-xl border border-brand-gold/40 bg-[color-mix(in_oklab,var(--brand-gold)_6%,var(--pc-surface-1))] p-2 shadow-sm"
    >
      <header className="mb-1.5 flex flex-wrap items-baseline justify-between gap-1.5 px-1">
        <h4 className="text-[12.5px] font-bold uppercase tracking-[0.14em] text-[var(--pc-gold-ink)]">
          Comparação lado a lado
        </h4>
        <p className="text-[12.5px] font-medium text-muted-foreground">
          <span className="font-semibold text-foreground">Faixa</span>{" "}
          <span className="pc-num tabular-nums"><Price value={globalMin} size="sm" /></span>
          <span aria-hidden className="mx-1 opacity-40">↔</span>
          <span className="pc-num tabular-nums"><Price value={globalMax} size="sm" /></span>
          {spreadPct > 0 ? (
            <span className="ml-1.5 rounded-full bg-accent-strong px-1.5 py-[1px] text-[12.5px] font-bold uppercase tracking-wider text-accent-foreground">
              economia até {spreadPct.toFixed(0)}%
            </span>
          ) : null}
        </p>
      </header>

      <div
        role="table"
        aria-label="Preços por mercado"
        className={
          expanded
            ? "grid gap-1.5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
            : "grid gap-1.5 overflow-x-auto"
        }
        style={
          expanded
            ? undefined
            : { gridTemplateColumns: `repeat(${top.length}, minmax(140px, 1fr))` }
        }
      >
        
        {top.map((p, i) => {
          const isCheapest = p.price === cheapest;
          const cheapestCount = top.filter((x) => x.price === cheapest).length;
          const isFocused =
            !!focusedMarket &&
            (p.marketName ?? "").toLowerCase() === focusedMarket.toLowerCase();
          const diffAbs = p.price - cheapest;
          const savingsPct =
            globalMax > 0 ? ((globalMax - p.price) / globalMax) * 100 : 0;
          const tieSuffix = isCheapest && cheapestCount > 1
            ? ` — empate com ${cheapestCount - 1} outro${cheapestCount - 1 === 1 ? "" : "s"}`
            : "";
          const label = `${p.marketName ?? "Mercado"}: ${fmt(p.price)}${
            isCheapest ? `, menor preço${tieSuffix}` : `, ${fmt(diffAbs)} a mais que o menor`
          }`;
          return (
            <button
              key={`${p.marketName}-${i}`}
              type="button"
              role="cell"
              aria-label={label}
              aria-pressed={isFocused}
              onClick={() => onPick?.(p.marketName ?? "")}
              className={
                "group flex flex-col gap-1 rounded-lg border p-2 text-left transition outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-brand-gold " +
                (isCheapest
                  ? "border-brand-gold bg-brand-navy text-white shadow-sm"
                  : isFocused
                    ? "border-brand-gold/60 bg-[color-mix(in_oklab,var(--brand-gold)_10%,transparent)]"
                    : "border-border/70 bg-background hover:border-brand-gold/50")
              }
              data-cheapest={isCheapest ? "true" : "false"}
            >
              <div className="flex items-center gap-1.5">
                {isCheapest ? (
                  <span
                    aria-hidden
                    className="grid h-4.5 w-4.5 place-items-center rounded-full bg-brand-gold text-brand-navy"
                  >
                    <Crown className="h-2.5 w-2.5" strokeWidth={2.5} />
                  </span>
                ) : (
                  <span
                    aria-hidden
                    className="grid h-4.5 w-4.5 place-items-center rounded-full border border-border text-[12.5px] font-bold tabular-nums text-muted-foreground"
                  >
                    {i + 1}
                  </span>
                )}
                <span
                  className={
                    "truncate text-[13px] font-semibold " +
                    (isCheapest ? "text-white" : "text-foreground")
                  }
                  title={p.marketName ?? ""}
                >
                  {p.marketName ?? "—"}
                </span>
              </div>
              <Price
                as="p"
                size="lg"
                value={p.price}
                tone={isCheapest ? "onhero" : "default"}
                className={isCheapest ? "text-white" : "text-foreground"}
              />
              <div className="flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-wider">
                {isCheapest ? (
                  <span
                    className={
                      "rounded-full bg-brand-gold px-1.5 py-[1px] text-[12.5px] font-bold text-brand-navy"
                    }
                  >
                    Menor preço
                  </span>
                ) : (
                  <span
                    className="rounded-full border border-border/80 bg-background px-1.5 py-[1px] text-muted-foreground"
                    title={`Você pagaria ${fmt(diffAbs)} a mais do que no mercado mais barato`}
                  >
                    +<Price value={diffAbs} size="sm" />
                  </span>
                )}
                {savingsPct > 0 && !isCheapest ? (
                  <span
                    className="rounded-full bg-emerald-100 px-1.5 py-[1px] text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200"
                    title="Economia versus o maior preço da lista"
                  >
                    −{savingsPct.toFixed(0)}%
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
      {canExpand ? (
        <div className="mt-2 flex items-center justify-between gap-2 px-1">
          <p
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="text-[12.5px] font-medium text-muted-foreground"
          >
            {expanded
              ? `Mostrando todos os ${sorted.length} mercados`
              : `Mostrando os ${COLLAPSED_LIMIT} mais baratos de ${sorted.length}`}
          </p>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="inline-flex h-7 items-center gap-1.5 rounded-full border border-brand-gold/60 bg-[color-mix(in_oklab,var(--brand-gold)_10%,transparent)] px-2.5 text-[12.5px] font-bold uppercase tracking-[0.12em] text-[var(--pc-gold-ink)] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
          >
            {expanded
              ? "Ver menos"
              : `Ver todos (+${hiddenCount})`}
          </button>
        </div>
      ) : null}
    </section>
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
  bestValue = null,
  isCompareSelected = false,
  canSelectCompare = true,
  onToggleCompare,
  focused = false,
  focusedMarket = null,
  onSelect,
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
  /** Preenchido apenas no produto com melhor R$/unidade da categoria. */
  bestValue?: BestValueResult | null;
  isCompareSelected?: boolean;
  canSelectCompare?: boolean;
  onToggleCompare?: () => void;
  /** Card em foco (via URL). Recebe scrollIntoView + foco de teclado. */
  focused?: boolean;
  /** Nome do mercado destacado dentro do card (via URL). */
  focusedMarket?: string | null;
  /** Disparado quando o usuário seleciona o card ou um mercado interno,
   * para sincronizar `?product=&market=` na URL do container. */
  onSelect?: (product: string, market: string | null) => void;
}) {
  // Mercado mais barato dentro deste grupo — usado para destaque no cabeçalho.
  const cheapestInGroup = useMemo(() => {
    if (prices.length === 0) return null;
    return prices.reduce((best, cur) => (cur.price < best.price ? cur : best), prices[0]);
  }, [prices]);

  // Sem depender de rolagem interna: mostramos todos os mercados por padrão
  // na visualização; se a lista for enorme, ainda mantemos um "colapso
  // higiênico" acima de 24 itens para preservar densidade visual.
  const COLLAPSED = 24;
  const [expanded, setExpanded] = useState(focused);
  const visiblePrices = expanded || focused ? prices : prices.slice(0, COLLAPSED);
  const hiddenPrices = prices.length - visiblePrices.length;
  // Conta quantos mercados empatam no menor preço global — permite destacar
  // todos os vencedores e comunicar o empate por acessibilidade.
  const cheapestCount = useMemo(
    () => (globalMin == null ? 0 : prices.filter((p) => p.price === globalMin).length),
    [prices, globalMin],
  );
  // Painéis de detalhes abertos por mercado — uma expansão por linha permite
  // ver endereço, bairro, tipo do estabelecimento e validade da coleta sem
  // esconder outras informações da lista.
  const [openDetails, setOpenDetails] = useState<Set<string>>(() => new Set());
  const toggleDetails = useCallback((key: string) => {
    setOpenDetails((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);
  const cardRef = useRef<HTMLDivElement>(null);


  // Quando o card entra em foco por URL, expande, faz scroll suave e move o
  // foco do teclado para o card — restaurando o estado da UI a partir do link.
  useEffect(() => {
    if (!focused) return;
    const el = cardRef.current;
    if (!el) return;
    try {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch {
      el.scrollIntoView();
    }
    // Foco só quando o card não está em nenhuma parte do documento com foco
    // ainda; evita roubar foco do usuário no meio de outra interação.
    if (!el.contains(document.activeElement)) {
      window.setTimeout(() => el.focus({ preventScroll: true }), 60);
    }
  }, [focused]);




  return (
    <div
      ref={cardRef}
      id={`pc-group-${encodeURIComponent(productName)}`}
      data-result-card=""
      tabIndex={-1}
      data-focused={focused ? "true" : undefined}
      onClick={(e) => {
        // Só marca o card como selecionado ao clicar no cabeçalho/vazio.
        // Cliques em botões/links dentro do card continuam com o comportamento
        // nativo (o handler dispara apenas quando o target é o próprio card).
        if (!onSelect) return;
        const target = e.target as HTMLElement;
        if (target.closest("a,button,input,select,textarea,[role=button]")) return;
        onSelect(productName, null);
      }}
      className={
        "pc-res-card relative outline-none focus-visible:ring-2 focus-visible:ring-brand-gold " +
        (focused
          ? "ring-2 ring-brand-gold/70 shadow-[0_0_0_1px_var(--brand-gold)] scroll-mt-24"
          : "")
      }
    >
      <div className="mb-1.5 flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">

        <div className="min-w-0 flex-1 order-1">

          <p className="pc-res-title truncate">
            <HighlightMatch text={productName} tokens={highlightTokens} />
          </p>
          <p className="pc-res-meta mt-0.5 truncate">
            <span className="font-semibold text-foreground">menor</span> <span className="pc-num font-bold text-foreground"><Price value={min} size="sm" /></span>
            <span aria-hidden="true" className="mx-1 opacity-40">·</span>
            média <span className="pc-num text-foreground/85"><Price value={avg} size="xs" tone="muted" /></span>
            <span aria-hidden="true" className="mx-1 opacity-40">·</span>
            máx <span className="pc-num text-foreground/85"><Price value={max} size="xs" tone="muted" /></span>
            <span aria-hidden="true" className="mx-1 opacity-40">·</span>
            {samples} preço{samples > 1 ? "s" : ""}
          </p>
          {cheapestInGroup ? (
            <p className="pc-res-meta mt-1 inline-flex max-w-full items-center gap-1.5 rounded-md border border-[color-mix(in_oklab,var(--brand-gold)_38%,transparent)] bg-[color-mix(in_oklab,var(--brand-gold)_10%,transparent)] px-1.5 py-0.5 text-foreground">
              <Crown
                className="h-3 w-3 shrink-0 text-[var(--pc-gold-ink)]"
                strokeWidth={2}
                aria-hidden="true"
              />
              <StoreBadge
                name={cheapestInGroup.marketName}
                logoUrl={cheapestInGroup.marketLogoUrl}
                brandColor={cheapestInGroup.marketBrandColor}
                size="xs"
              />
              <span className="truncate">
                Mais barato em{" "}
                <span className="market-name">{cheapestInGroup.marketName}</span>{" "}
                ·{" "}
                <span className="font-semibold tabular-nums">
                  <Price value={cheapestInGroup.price} size="sm" />
                </span>
              </span>
            </p>
          ) : null}
          {matchReasons.length > 0 && (
            <MatchReasonBadges reasons={matchReasons} className="mt-1" />
          )}
          {bestValue ? <BestValueBadge result={bestValue} className="mt-1" /> : null}
        </div>

        <div className="order-2 flex flex-wrap items-center gap-1 sm:shrink-0 sm:flex-nowrap sm:justify-end">
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
                "pc-res-label rounded-full border px-2 py-1 transition " +
                (isCompareSelected
                  ? "border-accent-strong bg-accent-strong text-accent-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-[var(--pc-gold-ink)] hover:text-[var(--pc-gold-ink)] disabled:cursor-not-allowed disabled:opacity-60")
              }
            >
              {isCompareSelected ? "✓ Comparar" : "+ Comparar"}
            </button>
          ) : null}
          <ProductQuickActions catalogId={catalogId} slug={productName} label={productName} />
          <CreatePriceAlertButton
            compact
            triggerLabel="Alerta"
            productKey={productName}
            productName={productName}
            displayName={productName}
            defaultTargetPrice={cheapestInGroup?.price ?? min}
            defaultDirection="drop"
            defaultThresholdPct={5}
          />
          <Link
            to="/produto-publico/$slug"
            params={{ slug: productName }}
            className="pc-res-label rounded-full border border-border bg-background px-2 py-1 text-foreground hover:border-[var(--pc-gold-ink)] hover:text-[var(--pc-gold-ink)]"
          >
            Detalhes
          </Link>

        </div>
      </div>

      {focused && prices.length >= 2 ? (
        <CompareMatrix
          productName={productName}
          prices={prices}
          globalMin={globalMin ?? min}
          globalMax={globalMax ?? max}
          fmt={fmt}
          onPick={(marketName) => onSelect?.(productName, marketName)}
          focusedMarket={focusedMarket}
        />
      ) : null}

      <div className="mt-2 flex items-center justify-between gap-2 border-t border-[color-mix(in_oklab,var(--color-border)_70%,transparent)] pt-1.5">
        <p className="pc-res-label text-foreground">
          Onde tem este produto
          <span className="ml-1 font-semibold tabular-nums text-muted-foreground">
            {prices.length} estabelecimento{prices.length > 1 ? "s" : ""}
          </span>
        </p>
        {!expanded && hiddenPrices > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded-full border border-brand-gold/45 bg-[color-mix(in_oklab,var(--brand-gold)_10%,transparent)] px-2 py-0.5 text-[12.5px] font-semibold text-[var(--pc-gold-ink)] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
          >
            Ver todos
          </button>
        ) : null}
      </div>

      <ul
        role="list"
        aria-label={`Mercados com ${productName}`}
        className="pc-market-price-grid mt-1 grid gap-1 md:grid-cols-2 xl:grid-cols-3"
      >
        {visiblePrices.map((p, i) => {

          const isCheapest = globalMin != null && p.price === globalMin;
          const isFocusedMarket =
            !!focusedMarket &&
            (p.marketName ?? "").toLowerCase() === focusedMarket.toLowerCase();
          const handleSelect = () => onSelect?.(productName, p.marketName ?? null);
          const rowKey = `${p.marketName}-${p.when}-${i}`;
          const detailsOpen = openDetails.has(rowKey);
          const localizacao = [p.neighborhood, p.city].filter(Boolean).join(" · ");
          const priceDate = new Date(p.when).toLocaleDateString("pt-BR");
          const tieSuffix =
            isCheapest && cheapestCount > 1 ? ` (empate com ${cheapestCount - 1} ${cheapestCount - 1 === 1 ? "mercado" : "mercados"})` : "";
          const rowAriaLabel = `${p.marketName ?? "Mercado"}: ${fmt(p.price)}${
            isCheapest ? ` — menor preço${tieSuffix}` : ""
          }${localizacao ? `, ${localizacao}` : ""}`;
          return (
            <li
              key={rowKey}
              role={onSelect ? "button" : "listitem"}
              tabIndex={onSelect ? 0 : undefined}
              aria-label={rowAriaLabel}
              aria-current={isFocusedMarket ? "true" : undefined}
              className={
                "pc-res-row relative flex flex-col cursor-pointer rounded-lg border px-1.5 outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-brand-gold " +
                (isCheapest
                  ? "border-brand-gold bg-[color-mix(in_oklab,var(--brand-gold)_14%,transparent)] shadow-[0_0_0_1px_var(--brand-gold)] ring-1 ring-brand-gold/50 "
                  : "border-[color-mix(in_oklab,var(--color-border)_58%,transparent)] bg-background/75 hover:border-brand-gold/40 ") +
                (isFocusedMarket ? "bg-[color-mix(in_oklab,var(--brand-gold)_10%,transparent)]" : "")
              }
              data-cheapest={isCheapest ? "true" : "false"}
              data-cheapest-tie={isCheapest && cheapestCount > 1 ? "true" : undefined}
              data-focused-market={isFocusedMarket ? "true" : undefined}
              onClick={(e) => {
                if (!onSelect) return;
                const target = e.target as HTMLElement;
                if (target.closest("a,button,input,select,textarea,[role=button]")) return;
                handleSelect();
              }}
              onKeyDown={(e) => {
                if (!onSelect) return;
                if (e.key !== "Enter" && e.key !== " ") return;
                const target = e.target as HTMLElement;
                if (target !== e.currentTarget) return;
                e.preventDefault();
                handleSelect();
              }}
            >
              {isCheapest ? (
                <span
                  role="img"
                  aria-label={cheapestCount > 1 ? `Menor preço — empate com ${cheapestCount - 1} outro${cheapestCount - 1 === 1 ? "" : "s"}` : "Menor preço"}
                  className="pointer-events-none absolute -top-2 right-2 z-10 inline-flex items-center gap-1 rounded-full border border-brand-gold bg-brand-navy px-2 py-[2px] text-[12.5px] font-bold uppercase tracking-[0.14em] text-gold-ink shadow-sm"
                >
                  <Crown className="h-2.5 w-2.5" strokeWidth={2.25} aria-hidden="true" />
                  <span>{cheapestCount > 1 ? `Menor preço · empate ${cheapestCount}` : "Menor preço"}</span>
                </span>
              ) : null}
              <div className="pc-res-row-main flex items-center gap-1.5">
                <StoreColorBar name={p.marketName} brandColor={p.marketBrandColor} />
                {isCheapest ? (
                  <span
                    role="img"
                    aria-label={cheapestCount > 1 ? "Menor preço (empate)" : "Menor preço"}
                    title={cheapestCount > 1 ? "Menor preço — empate" : "Menor preço"}
                    className="my-auto grid h-5.5 w-5.5 shrink-0 place-items-center rounded-full bg-accent-strong text-accent-foreground"
                  >
                    <Crown className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                  </span>
                ) : (
                  <span
                    role="img"
                    aria-label={`Posição ${i + 1}`}
                    className="my-auto grid h-5.5 w-5.5 shrink-0 place-items-center rounded-full border border-border bg-muted/40 text-[12.5px] font-semibold tabular-nums text-muted-foreground"
                  >
                    <span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                  </span>
                )}

                <StoreBadge
                  name={p.marketName}
                  logoUrl={p.marketLogoUrl}
                  brandColor={p.marketBrandColor}
                  size="xs"
                  className="my-auto"
                  isCheapest={isCheapest}
                  cheapestReason={isCheapest ? buildCheapestReason(p.price, globalAvg) : null}
                />
                <div className="min-w-0 flex-1 self-center">
                  <p className="market-name pc-res-store truncate">{p.marketName}</p>
                  <p className="pc-res-meta truncate">
                    {p.marketKind ?? "Estabelecimento"}
                    <span aria-hidden="true" className="mx-1 opacity-40">·</span>
                    <span
                      title={`Preço coletado em ${priceDate}`}
                      data-freshness={availabilityTone(p.when)}
                      className="data-[freshness=stale]:opacity-60 data-[freshness=fresh]:text-[var(--pc-gold-ink)]"
                    >
                      atualizado {freshnessLabel(p.when)}
                    </span>
                  </p>
                </div>

                <FairPriceBadge
                  price={p.price}
                  min={globalMin}
                  avg={globalAvg}
                  max={globalMax}
                  size="sm"
                  className="hidden self-center xl:inline-flex"
                />
                <div className="shrink-0 self-center text-right">
                  {/* O selo "Melhor oferta" (coroa, canto superior) já comunica o
                      menor preço; um rótulo extra aqui duplicava a informação e
                      colidia com o selo absoluto. */}
                  <Price as="p" size="md" value={p.price} className="justify-end" />
                  <UnitPriceBadge price={p.price} productName={productName} className="mt-0.5" />
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDetails(rowKey);
                  }}
                  aria-expanded={detailsOpen}
                  aria-controls={`pc-row-details-${encodeURIComponent(rowKey)}`}
                  aria-label={detailsOpen ? "Recolher detalhes do produto neste mercado" : "Ver detalhes do produto neste mercado"}
                  className="my-auto ml-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition hover:border-[var(--pc-gold-ink)] hover:text-[var(--pc-gold-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                >
                  {detailsOpen ? (
                    <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </button>
              </div>

              {detailsOpen ? (
                <div
                  id={`pc-row-details-${encodeURIComponent(rowKey)}`}
                  className="mt-1.5 rounded-md border border-[color-mix(in_oklab,var(--brand-gold)_30%,transparent)] bg-[color-mix(in_oklab,var(--brand-gold)_6%,transparent)] px-2 py-1.5 text-[13px] leading-snug"
                  onClick={(e) => e.stopPropagation()}
                >
                  <dl className="grid grid-cols-1 gap-x-3 gap-y-0.5 sm:grid-cols-2">
                    <div className="flex gap-1">
                      <dt className="font-semibold text-muted-foreground">Produto:</dt>
                      <dd className="min-w-0 flex-1 truncate text-foreground">{productName}</dd>
                    </div>
                    <div className="flex gap-1">
                      <dt className="font-semibold text-muted-foreground">Preço:</dt>
                      <dd className="pc-num font-semibold text-foreground"><Price value={p.price} size="sm" /></dd>
                    </div>
                    <div className="flex gap-1">
                      <dt className="font-semibold text-muted-foreground">Tipo:</dt>
                      <dd className="truncate text-foreground">{p.marketKind ?? "Estabelecimento"}</dd>
                    </div>
                    <div className="flex gap-1">
                      <dt className="font-semibold text-muted-foreground">Coletado em:</dt>
                      <dd className="tabular-nums text-foreground">
                        {priceDate}
                        <span className="ml-1 text-muted-foreground">({freshnessLabel(p.when)})</span>
                      </dd>
                    </div>
                    {localizacao ? (
                      <div className="flex gap-1 sm:col-span-2">
                        <dt className="font-semibold text-muted-foreground">
                          <MapPin className="mr-0.5 inline h-3 w-3 -translate-y-px" aria-hidden="true" />
                          Local:
                        </dt>
                        <dd className="min-w-0 flex-1 truncate text-foreground">{localizacao}</dd>
                      </div>
                    ) : null}
                    {p.address ? (
                      <div className="flex gap-1 sm:col-span-2">
                        <dt className="font-semibold text-muted-foreground">Endereço:</dt>
                        <dd className="min-w-0 flex-1 truncate text-foreground">{p.address}</dd>
                      </div>
                    ) : null}
                  </dl>
                  <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[12.5px] text-muted-foreground">
                    <span>
                      Marca, peso/embalagem e código de barras (quando houver) aparecem na ficha completa do produto.
                    </span>
                    <Link
                      to="/produto-publico/$slug"
                      params={{ slug: productName }}
                      className="rounded-full border border-brand-gold/45 bg-[color-mix(in_oklab,var(--brand-gold)_10%,transparent)] px-2 py-0.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--pc-gold-ink)] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                    >
                      Ver ficha
                    </Link>
                    {p.establishmentId ? (
                      <Link
                        to="/loja/$id"
                        params={{ id: p.establishmentId }}
                        className="rounded-full border border-border bg-background px-2 py-0.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-foreground transition hover:border-[var(--pc-gold-ink)] hover:text-[var(--pc-gold-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                      >
                        Ver mercado
                      </Link>
                    ) : null}
                  </p>
                </div>
              ) : null}
            </li>
          );
        })}

      </ul>
      {hiddenPrices > 0 || expanded ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1 text-[13px] font-medium text-muted-foreground transition hover:border-[var(--pc-gold-ink)] hover:text-[var(--pc-gold-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          {expanded
            ? "Ver menos mercados"
            : `Ver os outros ${hiddenPrices} mercado${hiddenPrices > 1 ? "s" : ""}`}
        </button>
      ) : null}

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
  sortMode,
  highlightTokens,
}: {
  groups: ProductGroup[];
  kindFilter: string | null;
  fmt: (n: number | null | undefined) => string;
  globalMin: number | null;
  sortMode: SortMode;
  highlightTokens: string[];
}) {
  type Row = {
    productName: string;
    catalogId: string | null;
    price: PricePoint;
    /** Este mercado tem o menor preço da plataforma para este produto. */
    isBest: boolean;
  };
  type Bucket = {
    marketName: string;
    logoUrl: string | null;
    brandColor: string | null;
    kind: string | null;
    minPrice: number;
    maxPrice: number;
    /** Nº de produtos em que este mercado tem o menor preço. */
    bestCount: number;
    /** Soma de (preço mais caro − preço daqui) nos produtos comparáveis. */
    savings: number;
    /** Soma de (preço daqui − melhor preço) nos produtos comparáveis. */
    gapToBest: number;
    rows: Row[];
  };


  const [marketPage, setMarketPage] = useState(4);
  const [onlyMarket, setOnlyMarket] = useState<string | null>(null);

  /** Melhor e pior preço de cada produto entre todos os mercados do resultado. */
  const spread = new Map<string, { best: number; worst: number }>();
  for (const g of groups) {
    const prices = kindFilter
      ? g.prices.filter((p) => p.marketKind === kindFilter)
      : g.prices;
    for (const p of prices) {
      const cur = spread.get(g.productName);
      if (!cur) spread.set(g.productName, { best: p.price, worst: p.price });
      else {
        if (p.price < cur.best) cur.best = p.price;
        if (p.price > cur.worst) cur.worst = p.price;
      }
    }
  }

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
          brandColor: p.marketBrandColor ?? null,
          kind: p.marketKind ?? null,
          minPrice: p.price,
          maxPrice: p.price,
          bestCount: 0,
          savings: 0,
          gapToBest: 0,
          rows: [],
        };
        bucketsMap.set(key, b);
      }
      if (p.price < b.minPrice) b.minPrice = p.price;
      if (p.price > b.maxPrice) b.maxPrice = p.price;
      if (!b.logoUrl && p.marketLogoUrl) b.logoUrl = p.marketLogoUrl;
      if (!b.brandColor && p.marketBrandColor) b.brandColor = p.marketBrandColor;
      if (!b.kind && p.marketKind) b.kind = p.marketKind;

      const sp = spread.get(g.productName);
      // Só faz sentido marcar "melhor" quando há mais de um preço para comparar.
      const isBest = !!sp && sp.worst > sp.best && p.price <= sp.best + 0.0001;

      if (sp && sp.worst > sp.best) {
        if (isBest) b.bestCount += 1;
        b.savings += Math.max(0, sp.worst - p.price);
        b.gapToBest += Math.max(0, p.price - sp.best);
      }
      b.rows.push({ productName: g.productName, catalogId: g.catalogId, price: p, isBest });
    }
  }

  const allBuckets = Array.from(bucketsMap.values())
    .map((b) => ({
      ...b,
      rows: [...b.rows].sort((a, z) => a.price.price - z.price.price),
    }))
    .sort((a, z) => {
      if (sortMode === "savings") {
        if (a.savings !== z.savings) return z.savings - a.savings;
      }
      if (a.bestCount !== z.bestCount) return z.bestCount - a.bestCount;
      if (a.minPrice !== z.minPrice) return a.minPrice - z.minPrice;
      return z.rows.length - a.rows.length;
    });


  if (allBuckets.length === 0) return null;

  const scoped = onlyMarket
    ? allBuckets.filter((b) => b.marketName === onlyMarket)
    : allBuckets;
  const buckets = scoped.slice(0, onlyMarket ? scoped.length : marketPage);
  const hiddenMarkets = scoped.length - buckets.length;

  return (
    <div className="space-y-2">
      {/* Filtro rápido por estabelecimento — compacta a lista sem rolar */}
      {allBuckets.length > 1 ? (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="shrink-0 text-[13px] font-medium text-muted-foreground">Mercado</span>
          <button
            type="button"
            onClick={() => setOnlyMarket(null)}
            className={
              "shrink-0 rounded-full border px-2.5 py-1 text-[12.5px] font-medium transition " +
              (onlyMarket === null
                ? "border-brand-gold bg-brand-gold text-brand-navy"
                : "border-border bg-background text-muted-foreground hover:text-foreground")
            }
          >
            Todos
          </button>
          {allBuckets.map((b) => (
            <button
              key={b.marketName}
              type="button"
              onClick={() => setOnlyMarket(onlyMarket === b.marketName ? null : b.marketName)}
              className={
                "shrink-0 max-w-[46vw] truncate rounded-full border px-2.5 py-1 text-[12.5px] font-medium transition sm:max-w-none " +
                (onlyMarket === b.marketName
                  ? "border-brand-gold bg-brand-gold text-brand-navy"
                  : "border-border bg-background text-muted-foreground hover:text-foreground")
              }
            >
              {b.marketName}
            </button>
          ))}
        </div>
      ) : null}

      <div className="pc-results">
        {buckets.map((b, idx) => (
          <MarketBucketSection
            key={b.marketName}
            rank={allBuckets.indexOf(b) + 1}
            marketName={b.marketName}
            logoUrl={b.logoUrl}
            brandColor={b.brandColor}
            kind={b.kind}
            minPrice={b.minPrice}
            bestCount={b.bestCount}
            savings={b.savings}
            gapToBest={b.gapToBest}
            rows={b.rows}
            isCheapest={globalMin != null && b.minPrice === globalMin}

            fmt={fmt}
            highlightTokens={highlightTokens}
          />
        ))}
      </div>

      {hiddenMarkets > 0 ? (
        <button
          type="button"
          onClick={() => setMarketPage((v) => v + 4)}
          className="w-full rounded-lg border border-[color-mix(in_oklab,var(--color-border)_55%,transparent)] px-3 py-2 text-[13px] font-medium text-muted-foreground transition hover:border-brand-gold hover:text-[var(--pc-gold-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
        >
          Ver mais {Math.min(4, hiddenMarkets)} de {hiddenMarkets} mercados
        </button>
      ) : null}
    </div>
  );
}


/**
 * Seção de um estabelecimento na visão "por mercado".
 * Mostra até 5 produtos por padrão — o resto abre sob demanda, evitando
 * páginas de rolagem interminável.
 */
function MarketBucketSection({
  rank,
  marketName,
  logoUrl,
  brandColor,
  kind,
  minPrice,
  bestCount,
  savings,
  gapToBest,
  rows,
  isCheapest,
  fmt,
  highlightTokens,
}: {
  rank: number;
  marketName: string;
  logoUrl: string | null;
  brandColor: string | null;
  kind: string | null;
  minPrice: number;
  bestCount: number;
  savings: number;
  gapToBest: number;
  rows: { productName: string; catalogId: string | null; price: PricePoint; isBest: boolean }[];

  isCheapest: boolean;
  fmt: (n: number | null | undefined) => string;
  highlightTokens: string[];
}) {
  const COLLAPSED = 4;
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? rows : rows.slice(0, COLLAPSED);
  const hiddenCount = rows.length - visible.length;
  const bar = brandColor && /^#[0-9A-Fa-f]{6}$/.test(brandColor) ? brandColor : null;

  return (
    <section
      className={
        "overflow-hidden rounded-xl border transition-colors " +
        (isCheapest
          ? "border-[color-mix(in_oklab,var(--brand-gold)_46%,transparent)] bg-card/90"
          : "border-[color-mix(in_oklab,var(--color-border)_52%,transparent)] bg-card/80 hover:border-[color-mix(in_oklab,var(--color-border)_80%,transparent)]")
      }
      style={bar ? { boxShadow: `inset 2px 0 0 0 ${bar}` } : undefined}
      aria-label={`Produtos em ${marketName}`}
    >
      {/* Cabeçalho — logo em placa neutra (claro/escuro), nome, categoria e menor preço */}
      <header
        className={
          "flex items-center gap-2.5 border-b px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3 " +
          (isCheapest
            ? "border-[color-mix(in_oklab,var(--brand-gold)_28%,transparent)] bg-[color-mix(in_oklab,var(--brand-gold)_6%,transparent)]"
            : "border-[color-mix(in_oklab,var(--color-border)_45%,transparent)] bg-transparent")
        }
      >
        <StoreBadge
          name={marketName}
          logoUrl={logoUrl}
          brandColor={brandColor}
          size="md"
          className="flex-none"
        />

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <span className="market-name truncate text-[14.5px] font-semibold leading-tight tracking-[-0.012em] text-foreground sm:text-[16px]">
              {marketName}
            </span>
            {isCheapest ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-gold px-1.5 py-0.5 text-[12.5px] font-semibold text-brand-navy sm:px-2 sm:text-[12.5px]">
                <Crown className="h-3 w-3" aria-hidden="true" /> Menor preço
              </span>
            ) : (
              <span className="shrink-0 rounded-full border border-[color-mix(in_oklab,var(--color-border)_60%,transparent)] px-1.5 py-0.5 text-[12.5px] font-medium tabular-nums text-muted-foreground sm:text-[12.5px]">
                {rank}º
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[13px] leading-relaxed text-muted-foreground sm:text-[13px]">
            {kind ? <span className="capitalize">{kind}</span> : "Estabelecimento"} ·{" "}
            {rows.length} {rows.length === 1 ? "produto" : "produtos"} · a partir de{" "}
            <span className="font-semibold tabular-nums text-foreground"><Price value={minPrice} size="sm" /></span>
          </p>

          {/* Destaque de economia por mercado — leve, uma linha, sem caixas pesadas */}
          {bestCount > 0 || savings > 0 || gapToBest > 0 ? (
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] leading-none sm:text-[13px]">
              {bestCount > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_oklab,var(--brand-gold)_45%,transparent)] bg-[color-mix(in_oklab,var(--brand-gold)_12%,transparent)] px-2 py-1 font-semibold text-[var(--pc-gold-ink)]">
                  <Crown className="h-3 w-3" aria-hidden="true" />
                  {bestCount} {bestCount === 1 ? "melhor preço" : "melhores preços"}
                </span>
              ) : null}
              {savings > 0 ? (
                <span className="inline-flex items-center gap-1 py-1 text-muted-foreground">
                  economia de{" "}
                  <strong className="font-semibold tabular-nums text-foreground">
                    <Price value={savings} size="sm" tone="savings" />
                  </strong>{" "}
                  vs. o mais caro
                </span>
              ) : null}
              {gapToBest > 0 ? (
                <span className="inline-flex items-center gap-1 py-1 tabular-nums text-muted-foreground">
                  +<Price value={gapToBest} size="sm" /> acima do melhor
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
      </header>

      <ul className="divide-y divide-[color-mix(in_oklab,var(--color-border)_38%,transparent)]">
        {visible.map((r, i) => (
          <li
            key={`${r.productName}-${r.price.when}-${i}`}
            className="flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-[color-mix(in_oklab,var(--brand-gold)_6%,transparent)] sm:gap-3 sm:px-4 sm:py-2.5"
          >
            <Link
              to="/produto/$slug"
              params={{ slug: r.productName }}
              className="min-w-0 flex-1 truncate rounded text-[13.5px] font-medium leading-relaxed text-foreground hover:text-[var(--pc-gold-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold sm:text-[14.5px]"
            >
              <HighlightMatch text={r.productName} tokens={highlightTokens} />
            </Link>
            {r.isBest ? (
              <span
                className="hidden shrink-0 rounded-full border border-[color-mix(in_oklab,var(--brand-gold)_45%,transparent)] px-1.5 py-0.5 text-[12.5px] font-semibold uppercase tracking-[0.06em] text-[var(--pc-gold-ink)] sm:inline"
                title="Menor preço desta busca para este produto"
              >
                melhor
              </span>
            ) : null}
            <span
              data-freshness={availabilityTone(r.price.when)}
              title={`Preço coletado em ${new Date(r.price.when).toLocaleDateString("pt-BR")}`}
              className="hidden shrink-0 text-[12.5px] text-muted-foreground data-[freshness=stale]:opacity-60 sm:inline"
            >
              {freshnessLabel(r.price.when)}
            </span>

            <Price
              size="sm"
              value={r.price.price}
              className={
                "whitespace-nowrap rounded-md px-1.5 py-1 sm:px-2 " +
                (r.isBest
                  ? "bg-[color-mix(in_oklab,var(--brand-gold)_18%,transparent)]"
                  : "")
              }
            />
          </li>
        ))}

      </ul>


      {hiddenCount > 0 || expanded ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="w-full border-t border-[color-mix(in_oklab,var(--color-border)_45%,transparent)] px-3 py-2 text-[13px] font-medium text-muted-foreground transition hover:text-[var(--pc-gold-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold sm:px-4"
        >
          {expanded
            ? `Mostrar apenas ${COLLAPSED} produtos`
            : `Ver os outros ${hiddenCount} produtos deste mercado`}
        </button>
      ) : null}
    </section>

  );
}



// -----------------------------------------------------------------------------
// MatrixCompareResults — comparação lado a lado (produto × mercado).
// - Grid acessível (role=grid, arrow-key nav, ARIA rowindex/colindex)
// - Rolagem horizontal suave com botões prev/next
// - Seletor de mercados nas colunas
// - Modal de detalhes ao clicar produto/célula
// - Exportar PDF (apenas usuários autenticados)
// -----------------------------------------------------------------------------
function MatrixCompareResults({
  groups,
  kindFilter,
  fmt,
  highlightTokens,
  query,
  isAuthenticated,
}: {
  groups: ProductGroup[];
  kindFilter: string | null;
  fmt: (n: number | null | undefined) => string;
  highlightTokens: string[];
  query: string;
  isAuthenticated: boolean;
}) {
  type Market = { name: string; logoUrl: string | null; brandColor: string | null; kind: string | null; minAcc: number };
  const { allMarkets, cheapestByMarket, allProducts } = useMemo(() => {
    const marketsMap = new Map<string, Market>();
    const cbm = new Map<string, Map<string, number>>();
    for (const g of groups) {
      const prices = kindFilter ? g.prices.filter((p) => p.marketKind === kindFilter) : g.prices;
      if (prices.length === 0) continue;
      const perMarket = new Map<string, number>();
      for (const p of prices) {
        const m = marketsMap.get(p.marketName);
        if (!m) {
          marketsMap.set(p.marketName, {
            name: p.marketName,
            logoUrl: p.marketLogoUrl,
            brandColor: p.marketBrandColor ?? null,
            kind: p.marketKind,
            minAcc: p.price,
          });
        } else {
          if (!m.logoUrl && p.marketLogoUrl) m.logoUrl = p.marketLogoUrl;
          if (!m.brandColor && p.marketBrandColor) m.brandColor = p.marketBrandColor;
          if (p.price < m.minAcc) m.minAcc = p.price;
        }
        const prev = perMarket.get(p.marketName);
        if (prev === undefined || p.price < prev) perMarket.set(p.marketName, p.price);
      }
      cbm.set(g.productName, perMarket);
    }

    const all = Array.from(marketsMap.values()).sort((a, z) => a.minAcc - z.minAcc);
    const prods = groups.filter((g) => cbm.has(g.productName)).sort((a, b) => a.min - b.min);
    return { allMarkets: all, cheapestByMarket: cbm, allProducts: prods };
  }, [groups, kindFilter]);

  // Seleção de mercados visíveis (persistida por busca)
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  useEffect(() => {
    // Reset seleção quando a lista muda de forma significativa
    setHidden((prev) => {
      const names = new Set(allMarkets.map((m) => m.name));
      const kept = new Set<string>();
      for (const h of prev) if (names.has(h)) kept.add(h);
      return kept;
    });
  }, [allMarkets]);

  const markets = useMemo(
    () => allMarkets.filter((m) => !hidden.has(m.name)),
    [allMarkets, hidden],
  );
  const products = allProducts;

  // Modal de detalhes
  const [modalSlug, setModalSlug] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const openProduct = (name: string) => {
    setModalSlug(name);
    setModalOpen(true);
  };

  // Refs para rolagem e navegação por teclado (grid)
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLTableElement>(null);
  const [scrollState, setScrollState] = useState({ canPrev: false, canNext: false });

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    const canPrev = el.scrollLeft > 4;
    const canNext = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setScrollState((s) => (s.canPrev === canPrev && s.canNext === canNext ? s : { canPrev, canNext }));
  };
  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => updateScrollState();
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(() => updateScrollState());
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [markets.length]);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    const step = Math.max(180, Math.round(el.clientWidth * 0.6));
    el.scrollBy({ left: step * dir, behavior: "smooth" });
  };

  // Navegação por teclado no grid: setas + Home/End + PageUp/PageDown
  const focusCell = (row: number, col: number) => {
    const grid = gridRef.current;
    if (!grid) return;
    const rows = grid.querySelectorAll<HTMLElement>('[role="row"]');
    const target = rows[row]?.querySelectorAll<HTMLElement>('[role="rowheader"],[role="gridcell"]')[col];
    target?.focus();
  };
  const onGridKeyDown = (e: React.KeyboardEvent<HTMLTableElement>) => {
    const t = e.target as HTMLElement;
    const row = Number(t.getAttribute("data-row"));
    const col = Number(t.getAttribute("data-col"));
    if (Number.isNaN(row) || Number.isNaN(col)) return;
    const maxRow = products.length; // includes header row 0
    const maxCol = markets.length; // includes rowheader col 0
    let nr = row;
    let nc = col;
    switch (e.key) {
      case "ArrowRight": nc = Math.min(maxCol, col + 1); break;
      case "ArrowLeft": nc = Math.max(0, col - 1); break;
      case "ArrowDown": nr = Math.min(maxRow, row + 1); break;
      case "ArrowUp": nr = Math.max(0, row - 1); break;
      case "Home": nc = 0; break;
      case "End": nc = maxCol; break;
      case "PageDown": nr = Math.min(maxRow, row + 5); break;
      case "PageUp": nr = Math.max(0, row - 5); break;
      default: return;
    }
    e.preventDefault();
    focusCell(nr, nc);
  };

  // Exportar PDF (autenticado)
  const [exporting, setExporting] = useState(false);
  const doExportPdf = async () => {
    if (!isAuthenticated || exporting) return;
    setExporting(true);
    try {
      const { exportRowsToPDF, stampedFilename } = await import("@/lib/export");
      const columns = [
        { key: "product", header: "Produto", accessor: (r: Record<string, string>) => r.product, align: "left" as const },
        ...markets.map((m) => ({
          key: m.name,
          header: m.name,
          accessor: (r: Record<string, string>) => r[m.name] ?? "—",
          align: "right" as const,
        })),
      ];
      const rows = products.map((g) => {
        const row: Record<string, string> = { product: g.productName };
        const perMarket = cheapestByMarket.get(g.productName)!;
        for (const m of markets) {
          const v = perMarket.get(m.name);
          row[m.name] = v == null ? "—" : fmt(v);
        }
        return row;
      });
      await exportRowsToPDF(
        stampedFilename(`comparacao_${query || "busca"}`),
        columns,
        rows,
        {
          title: "Comparação lado a lado",
          subtitle: query ? `Busca: “${query}”` : undefined,
          filters: [
            `Mercados: ${markets.map((m) => m.name).join(", ") || "—"}`,
            kindFilter ? `Tipo: ${kindFilter}` : "Todos os tipos",
            `Produtos: ${products.length}`,
          ],
        },
      );
    } finally {
      setExporting(false);
    }
  };

  if (allMarkets.length === 0 || products.length === 0) return null;

  if (allMarkets.length < 2) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/70 px-3 py-3 text-[13.5px] text-muted-foreground">
        Comparação lado a lado precisa de pelo menos 2 mercados com o mesmo produto. Ajuste os filtros
        para incluir mais estabelecimentos.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Toolbar: seletor de mercados + navegação + exportar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-2.5 py-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-medium text-muted-foreground">
            Colunas
          </span>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Selecionar mercados visíveis">
            {allMarkets.map((m) => {
              const active = !hidden.has(m.name);
              const dot = m.brandColor && /^#[0-9A-Fa-f]{6}$/.test(m.brandColor) ? m.brandColor : undefined;
              return (
                <button
                  key={m.name}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setHidden((prev) => {
                      const next = new Set(prev);
                      if (next.has(m.name)) next.delete(m.name);
                      else next.add(m.name);
                      // Sempre manter ao menos 2 colunas visíveis
                      if (allMarkets.length - next.size < 2) return prev;
                      return next;
                    });
                  }}
                  className={
                    "focus-ring inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12.5px] font-medium transition " +
                    (active
                      ? "border-brand-gold/50 bg-brand-gold/15 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-background/80 line-through")
                  }
                >
                  <span
                    aria-hidden
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: dot ?? "hsl(var(--muted-foreground))" }}
                  />
                  <StoreBadge
                    name={m.name}
                    logoUrl={m.logoUrl}
                    brandColor={m.brandColor}
                    size="xs"
                  />

                  <span className="max-w-[110px] truncate">{m.name}</span>
                </button>
              );
            })}

          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            disabled={!scrollState.canPrev}
            aria-label="Rolar colunas para a esquerda"
            className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-foreground disabled:opacity-40"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            disabled={!scrollState.canNext}
            aria-label="Rolar colunas para a direita"
            className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-foreground disabled:opacity-40"
          >
            ›
          </button>
          <button
            type="button"
            onClick={doExportPdf}
            disabled={!isAuthenticated || exporting}
            aria-label={isAuthenticated ? "Exportar comparação em PDF" : "Entre para exportar em PDF"}
            title={isAuthenticated ? "Exportar em PDF" : "Disponível para usuários cadastrados"}
            className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-brand-gold/40 bg-brand-gold/15 px-2.5 py-1 text-[12.5px] font-semibold text-foreground hover:bg-brand-gold/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exporting ? "Gerando…" : isAuthenticated ? "Exportar PDF" : "Exportar PDF (login)"}
          </button>
        </div>
      </div>

      {/* Grid acessível */}
      <div
        ref={scrollRef}
        className="overflow-x-auto rounded-xl border border-border/60 bg-card/70 shadow-sm scroll-smooth"
        aria-label="Área de rolagem da comparação lado a lado"
      >
        <table
          ref={gridRef}
          role="grid"
          aria-label="Comparação de preços por produto e mercado"
          aria-rowcount={products.length + 1}
          aria-colcount={markets.length + 1}
          onKeyDown={onGridKeyDown}
          className="w-full min-w-[560px] border-collapse text-[14px]"
        >
          <thead>
            <tr role="row" aria-rowindex={1} className="bg-background/40 text-left">
              <th
                role="columnheader"
                scope="col"
                aria-colindex={1}
                data-row={0}
                data-col={0}
                tabIndex={0}
                className="focus-ring sticky left-0 z-10 min-w-[180px] border-b border-border/60 bg-background/80 px-3 py-2.5 text-[13px] font-medium text-muted-foreground backdrop-blur"
              >
                Produto
              </th>
              {markets.map((m, ci) => {
                const bar = m.brandColor && /^#[0-9A-Fa-f]{6}$/.test(m.brandColor) ? m.brandColor : "transparent";
                return (
                  <th
                    key={m.name}
                    role="columnheader"
                    scope="col"
                    aria-colindex={ci + 2}
                    data-row={0}
                    data-col={ci + 1}
                    tabIndex={-1}
                    className="focus-ring min-w-[140px] border-b border-border/60 px-3 py-2 align-bottom"
                    style={{ boxShadow: `inset 0 3px 0 0 ${bar}` }}
                  >
                    <div className="flex items-center gap-2 pt-1">
                      <StoreBadge
                        name={m.name}
                        logoUrl={m.logoUrl}
                        brandColor={m.brandColor}
                        size="sm"
                        className="flex-none"
                      />
                      <span className="market-name truncate text-[13.5px] font-semibold text-foreground">

                        {m.name}
                      </span>
                    </div>
                  </th>
                );
              })}

            </tr>
          </thead>
          <tbody>
            {products.map((g, rowIdx) => {
              const row = cheapestByMarket.get(g.productName)!;
              const rowValues = markets.map((m) => row.get(m.name)).filter((v): v is number => typeof v === "number");
              const rowMin = rowValues.length ? Math.min(...rowValues) : null;
              const rowMax = rowValues.length ? Math.max(...rowValues) : null;
              const zebra = rowIdx % 2 === 1 ? "bg-background/20" : "";
              const productLabel =
                rowMin != null && rowMax != null && rowMax > rowMin
                  ? `${g.productName}. Economia até ${fmt(rowMax - rowMin)}. Abrir detalhes.`
                  : `${g.productName}. Abrir detalhes.`;
              return (
                <tr
                  role="row"
                  aria-rowindex={rowIdx + 2}
                  key={g.productName}
                  className={"border-t border-border/40 " + zebra}
                >
                  <th
                    role="rowheader"
                    scope="row"
                    aria-colindex={1}
                    data-row={rowIdx + 1}
                    data-col={0}
                    tabIndex={-1}
                    className="focus-ring sticky left-0 z-[5] min-w-[180px] bg-card/95 px-3 py-2 text-left align-middle backdrop-blur"
                  >
                    <button
                      type="button"
                      onClick={() => openProduct(g.productName)}
                      aria-label={productLabel}
                      className="block w-full truncate text-left text-[14px] font-medium text-foreground hover:text-gold-ink focus:outline-none rounded"
                    >
                      <HighlightMatch text={g.productName} tokens={highlightTokens} />
                    </button>
                    {rowMin != null && rowMax != null && rowMax > rowMin ? (
                      <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                        Economia até{" "}
                        <span className="font-semibold text-[var(--pc-gold-ink)] tabular-nums">
                          <Price value={rowMax - rowMin} size="sm" tone="savings" />
                        </span>
                      </p>
                    ) : null}
                  </th>
                  {markets.map((m, ci) => {
                    const v = row.get(m.name);
                    const isMin = v != null && rowMin != null && v === rowMin;
                    const isMax = v != null && rowMax != null && v === rowMax && rowMax > (rowMin ?? 0);
                    const cellLabel =
                      v == null
                        ? `${m.name}: sem preço para ${g.productName}`
                        : `${m.name}: ${fmt(v)} para ${g.productName}${isMin ? " — menor preço da linha" : ""}. Ver detalhes.`;
                    return (
                      <td
                        role="gridcell"
                        aria-colindex={ci + 2}
                        aria-label={cellLabel}
                        data-row={rowIdx + 1}
                        data-col={ci + 1}
                        tabIndex={-1}
                        onClick={() => openProduct(g.productName)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openProduct(g.productName);
                          }
                        }}
                        key={m.name}
                        className={
                          "focus-ring cursor-pointer px-3 py-2 align-middle tabular-nums " +
                          (v == null
                            ? "text-center text-[13px] text-muted-foreground/60"
                            : isMin
                              ? "bg-brand-gold/15 text-foreground font-bold"
                              : isMax
                                ? "text-muted-foreground"
                                : "text-foreground")
                        }
                      >
                        {v == null ? (
                          "—"
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {isMin ? (
                              <Crown className="h-3 w-3 text-gold-ink" aria-hidden="true" />
                            ) : null}
                            <span><Price value={v} size="xs" /></span>
                            {rowMin != null && v > rowMin ? (
                              <span
                                title={`${(((v - rowMin) / rowMin) * 100).toFixed(0)}% acima do menor preço`}
                                className="text-[12.5px] font-semibold text-muted-foreground"
                              >
                                +{(((v - rowMin) / rowMin) * 100).toFixed(0)}%
                              </span>
                            ) : null}
                            {isMin && rowMax != null && rowMax > v ? (
                              <span
                                title="Economia frente ao mais caro desta linha"
                                className="text-[12.5px] font-semibold text-[var(--pc-gold-ink)]"
                              >
                                −{(((rowMax - v) / rowMax) * 100).toFixed(0)}%
                              </span>
                            ) : null}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openProduct(g.productName);
                              }}
                              aria-label={`Abrir ${g.productName} em ${m.name}`}
                              className="ml-auto rounded-full border border-border px-1.5 py-0.5 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground transition hover:border-[var(--pc-gold-ink)] hover:text-[var(--pc-gold-ink)]"
                            >
                              Abrir
                            </button>
                          </div>
                        )}

                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[12.5px] text-muted-foreground">
        Dica: navegue com as setas do teclado (↑ ↓ ← →), Home/End e PageUp/PageDown. Enter abre os detalhes.
      </p>

      <ProductQuickModal
        slug={modalSlug}
        open={modalOpen}
        onOpenChange={(v) => {
          setModalOpen(v);
          if (!v) setModalSlug(null);
        }}
        fallbackName={modalSlug ?? undefined}
        queryTokens={highlightTokens}
      />
    </div>
  );
}

/**
 * Legenda compacta dos estabelecimentos presentes nos resultados. Cada chip usa
 * o `brand_color` do mercado; clique alterna o filtro por aquele mercado.
 * Texto e ícones respeitam contraste AA via `readableTextOn`.
 */
function MarketLegend({
  source,
  active,
  onPick,
}: {
  source: PriceSearchResult | null;
  active: string | null;
  onPick: (name: string) => void;
}) {
  const markets = useMemo(() => {
    if (!source) return [] as { name: string; color: string; count: number }[];
    const map = new Map<string, { name: string; color: string; count: number }>();
    for (const g of source.groups) {
      for (const p of g.prices ?? []) {
        const name = p.marketName?.trim();
        if (!name) continue;
        const raw = p.marketBrandColor;
        const color = raw && /^#[0-9A-Fa-f]{6}$/.test(raw) ? raw : "#334155";
        const cur = map.get(name);
        if (cur) cur.count += 1;
        else map.set(name, { name, color, count: 1 });
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [source]);

  if (markets.length < 2) return null;

  return (
    <div
      role="group"
      aria-label="Filtrar por estabelecimento"
      className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border/60 bg-background/60 px-2 py-1.5"
    >
      <span className="pl-1 pr-1 text-[13px] font-medium text-muted-foreground">
        Mercados
      </span>
      {markets.map((m) => {
        const isActive = active === m.name;
        const isDim = active !== null && !isActive;
        const fg = readableTextOn(m.color);
        return (
          <button
            key={m.name}
            type="button"
            onClick={() => onPick(m.name)}
            aria-pressed={isActive}
            title={`${m.name} — ${m.count} preço(s)`}
            className={
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12.5px] font-semibold transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold " +
              (isDim ? "opacity-50 hover:opacity-100" : "opacity-100")
            }
            style={{
              backgroundColor: m.color,
              color: fg,
              borderColor: isActive ? fg : "transparent",
              boxShadow: isActive ? `inset 0 0 0 1px ${fg}` : undefined,
            }}
          >
            <span className="max-w-[120px] truncate">{m.name}</span>
            <span
              className="rounded-full px-1 text-[12.5px] tabular-nums"
              style={{ backgroundColor: `${fg === "#ffffff" ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.35)"}`, color: fg }}
            >
              {m.count}
            </span>
          </button>
        );
      })}
      {active && (
        <button
          type="button"
          onClick={() => onPick(active)}
          className="ml-auto rounded-md px-2 py-0.5 text-[13px] font-medium text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
        >
          Limpar
        </button>
      )}
    </div>
  );
}


