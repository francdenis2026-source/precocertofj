import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Search, ArrowRight, Store, Loader2, TrendingUp, X, CornerDownLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { fetchPriceSearch, fetchSuggestions } from "@/lib/search-cache";
import { suggestProducts, type ProductSuggestion } from "@/lib/product-suggest.functions";
import { searchProductPrice } from "@/lib/price-search.functions";
import { listTrendingSearches } from "@/lib/search-trends.functions";

type Enriched = ProductSuggestion & { minPrice?: number | null; market?: string | null };

const MAX_ITEMS = 6;
const LISTBOX_ID = "smart-search-listbox";

const BRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Barra de busca da homepage — versão reconstruída.
 *
 * Diferenças em relação à antiga: o painel de sugestões é renderizado inline
 * (posicionamento absoluto dentro do próprio wrapper), sem portal, sem medição
 * de retângulo e sem backdrop fixo. Era essa combinação que roubava o foco do
 * campo e travava a digitação.
 */
export function SmartSearchBar({ compact = false, onFocusChange }: { compact?: boolean; onFocusChange?: (focused: boolean) => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const runSuggest = useServerFn(suggestProducts);
  const runSearch = useServerFn(searchProductPrice);

  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<Enriched[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [active, setActive] = React.useState(-1);

  const wrapRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  const term = q.trim();
  const canQuery = term.length >= 1;


  const { data: trending } = useQuery({
    queryKey: ["search", "trending", "home"],
    queryFn: () => (listTrendingSearches as any)({ data: { limit: 8 } }),
    staleTime: 5 * 60_000,
  });

  // Fecha ao clicar fora — sem interferir no foco do input.
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        onFocusChange?.(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  React.useEffect(() => setActive(-1), [term]);

  React.useEffect(() => {
    if (!canQuery) {
      setItems([]);
      setLoading(false);
      setError(null);
      abortRef.current?.abort();
      return;
    }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const base = ((await fetchSuggestions(qc, runSuggest as never, term, ctrl.signal)) ?? []).slice(0, MAX_ITEMS);
        if (ctrl.signal.aborted) return;
        setItems(base.map((s) => ({ ...s, minPrice: null, market: null })));

        // Chamada paralela otimizada
        const enriched = await Promise.all(
          base.map(async (s) => {
            try {
              const r: any = await fetchPriceSearch<any>(
                qc,
                runSearch as never,
                { query: s.displayName, pureOnly: true },
                ctrl.signal,
              );
              const g = r?.groups?.[0];
              const cheapest = g?.prices?.[0];
              return {
                ...s,
                minPrice: typeof g?.min === "number" ? g.min : cheapest?.price ?? null,
                market: cheapest?.marketName ?? null,
              };
            } catch {
              return { ...s, minPrice: null, market: null };
            }
          }),
        );
        if (ctrl.signal.aborted) return;
        enriched.sort((a, b) => {
          if (a.minPrice == null) return 1;
          if (b.minPrice == null) return -1;
          return a.minPrice - b.minPrice;
        });
        setItems(enriched);
      } catch (e: any) {
        if (!ctrl.signal.aborted) {
          setError(e?.message ?? "Pesquisa indisponível no momento");
          setItems([]);
        }
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 80);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [term, canQuery, qc, runSuggest, runSearch]);

  const go = React.useCallback(
    (value: string) => {
      const v = value.trim();
      if (!v) return;
      setOpen(false);
      if (onFocusChange) onFocusChange(false);
      inputRef.current?.blur();
      navigate({ to: "/buscar", search: { q: v } as any });
    },
    [navigate, onFocusChange],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || items.length === 0) {
      if (e.key === "Escape") setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((c) => (c + 1 >= items.length ? 0 : c + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((c) => (c <= 0 ? items.length - 1 : c - 1));
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      onFocusChange?.(false);
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      go(items[active].displayName);
    }
  };

  const showPanel = open && (canQuery || (trending?.length ?? 0) > 0);

  return (
    <div ref={wrapRef} className="relative w-full max-w-2xl mx-auto isolate z-50">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(active >= 0 && items[active] ? items[active].displayName : q);
        }}
        role="search"
        className={cn(
          "group relative flex items-center gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] pl-4 pr-1.5 shadow-lg transition-all duration-300",
          "focus-within:border-[var(--brand-primary)] focus-within:ring-1 focus-within:ring-[var(--brand-primary)]",
          compact ? "h-12" : "h-14 sm:h-[68px]",
        )}
      >
        <Search
          aria-hidden="true"
          className={cn(
            "shrink-0 text-[var(--text-tertiary)] transition-colors group-focus-within:text-[var(--brand-primary)]",
            compact ? "h-4 w-4" : "h-5 w-5",
          )}
        />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            onFocusChange?.(true);
          }}
          onFocus={() => {
            setOpen(true);
            onFocusChange?.(true);
          }}
          onKeyDown={onKeyDown}
          type="text"
          autoComplete="off"
          placeholder="Pesquise um produto e veja onde é mais barato"
          aria-label="Pesquisar produtos"
          aria-expanded={showPanel}
          aria-controls={LISTBOX_ID}
          aria-autocomplete="list"
          role="combobox"
          className={cn(
            "flex-1 min-w-0 bg-transparent outline-none font-medium text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]",
            compact ? "text-[13px]" : "text-sm sm:text-base",
          )}
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              inputRef.current?.focus();
            }}
            aria-label="Limpar pesquisa"
            className="shrink-0 rounded-full p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          type="submit"
          className={cn(
            "shrink-0 rounded-[var(--radius-md)] bg-[var(--brand-primary)] px-5 font-semibold tracking-[-0.01em] text-[var(--text-on-brand)] transition-all hover:bg-[var(--pc-brand-primary-soft)] active:scale-[0.98]",
            compact ? "h-9 text-[14px]" : "h-11 text-[15px] sm:h-12",
          )}
        >
          Pesquisar
        </button>
      </form>

      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-[-12px] right-[-12px] top-[-12px] z-[100] overflow-hidden rounded-2xl border border-[var(--brand-primary)]/20 bg-[var(--bg-surface)] text-left shadow-[0_32px_80px_-16px_rgba(11,30,58,0.7)] min-w-[320px] lg:min-w-[440px]"
          >
            <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-5 py-3.5 flex items-center justify-between">
               <span className="text-[11px] font-black uppercase tracking-[0.15em] text-[var(--brand-primary)]">Inteligência de Busca</span>
               {loading && <Loader2 className="h-3 w-3 animate-spin text-[var(--brand-primary)]" />}
            </div>

            <div className="p-1">
            {!canQuery ? (

              <div className="p-4">
                <p className="mb-3 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                  <TrendingUp className="h-3 w-3" /> Pesquisas em alta
                </p>
                <div className="flex flex-wrap gap-2">
                  {(trending ?? []).slice(0, 8).map((t: any) => (
                    <button
                      key={t.query}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => go(t.query)}
                      className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-all hover:border-[var(--brand-primary)]/40 hover:text-[var(--brand-primary)]"
                    >
                      {t.query}
                    </button>
                  ))}
                </div>
              </div>
            ) : loading && items.length === 0 ? (
              <div className="flex items-center gap-3 px-5 py-6 text-sm text-[var(--text-secondary)]">
                <Loader2 className="h-4 w-4 animate-spin text-[var(--brand-primary)]" />
                Pesquisando lojas em Feijó…
              </div>
            ) : error ? (
              <div role="alert" className="px-5 py-6 text-center">
                <p className="mb-3 text-sm font-bold text-[var(--text-primary)]">Pesquisa indisponível no momento</p>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setQ((v) => `${v} `)}
                  className="rounded-lg border border-[var(--brand-primary)] px-4 py-2 text-[11px] font-black uppercase tracking-wider text-[var(--brand-primary)]"
                >
                  Tentar novamente
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="px-5 py-6 text-center">
                <p className="mb-1 text-sm font-bold text-[var(--text-primary)]">Nenhum resultado para “{term}”</p>
                <p className="mb-4 text-xs text-[var(--text-secondary)]">Este produto pode ainda não ter sido registrado.</p>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => go(term)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-[11px] font-black uppercase tracking-wider text-white"
                >
                  Pesquisar mesmo assim <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <ul
                id={LISTBOX_ID}
                role="listbox"
                aria-label="Sugestões de produtos"
                className="max-h-[480px] overflow-y-auto overscroll-contain py-1"
              >
                {items.map((s, i) => (
                  <li key={s.id} role="none">
                    <button
                      type="button"
                      role="option"
                      aria-selected={active === i}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(s.displayName)}
                      className={cn(
                        "flex w-full items-center gap-3 border-l-[3px] px-4 py-2.5 text-left transition-colors",
                        active === i
                          ? "border-l-[var(--brand-primary)] bg-[var(--brand-primary)]/8"
                          : "border-l-transparent hover:bg-[var(--bg-surface-elevated)]",
                      )}
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)]">
                        {s.imageUrl ? (
                          <img src={s.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <span aria-hidden="true" className="text-xs font-black text-[var(--brand-primary)]">
                            {(s.displayName || "?").trim().charAt(0).toUpperCase()}
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">{s.displayName}</span>
                        <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-[var(--text-tertiary)]">
                          {s.market ? (
                            <>
                              <Store className="h-3 w-3" /> {s.market}
                            </>
                          ) : (
                            s.category ?? "Catálogo"
                          )}
                        </span>
                      </span>
                      {typeof s.minPrice === "number" ? (
                        <span className="shrink-0 text-right">
                          <span className="block text-sm font-black text-[var(--brand-primary)]">{BRL(s.minPrice)}</span>
                          {i === 0 && (
                            <span className="text-[9px] font-black uppercase tracking-wider text-[var(--pc-brand-accent)]">Menor preço</span>
                          )}
                        </span>
                      ) : loading ? (
                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[var(--text-tertiary)]" />
                      ) : null}
                    </button>
                  </li>
                ))}
                <li className="flex items-center justify-between border-t border-[var(--border-subtle)] px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                  <span className="flex items-center gap-1.5">
                    <CornerDownLeft className="h-3 w-3" /> Enter para ver tudo
                  </span>
                  <span>↑ ↓ para navegar</span>
                </li>
              </ul>
            )}
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>

  );
}