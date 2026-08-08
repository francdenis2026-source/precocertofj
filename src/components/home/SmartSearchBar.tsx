import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Search, ArrowRight, Store, Loader2, TrendingUp, X, CornerDownLeft, Zap } from "lucide-react";
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
 * Barra de busca da homepage — versão reconstruída com Backdrop e Foco Absoluto.
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

  // Fecha ao clicar fora
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
  }, [open, onFocusChange]);

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
    <div ref={wrapRef} className="relative w-full max-w-2xl mx-auto z-50">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(active >= 0 && items[active] ? items[active].displayName : q);
        }}
        role="search"
        className={cn(
          "group relative flex items-center gap-2 rounded-2xl border border-[var(--brand-primary)]/30 bg-[var(--bg-surface)]/90 backdrop-blur-2xl pl-4 pr-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500",
          "focus-within:border-[var(--brand-primary)] focus-within:ring-4 focus-within:ring-[var(--brand-primary)]/20 focus-within:bg-[var(--bg-surface)] focus-within:scale-[1.02]",
          compact ? "h-12" : "h-14 sm:h-[80px]",
          open ? "z-[101]" : "z-auto"
        )}
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--pc-brand-primary-soft)] text-white shadow-lg transition-transform duration-500 group-focus-within:scale-110">
          <Search
            aria-hidden="true"
            className={cn(
              "transition-transform group-focus-within:rotate-12",
              compact ? "h-5 w-5" : "h-6 w-6",
            )}
          />
        </div>
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
          placeholder="O que você quer economizar hoje?"
          aria-label="Pesquisar produtos"
          aria-expanded={showPanel}
          aria-controls={LISTBOX_ID}
          aria-autocomplete="list"
          role="combobox"
          className={cn(
            "flex-1 min-w-0 bg-transparent outline-none font-bold text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]/70 placeholder:font-semibold tracking-tight",
            compact ? "text-[15px]" : "text-lg sm:text-xl",
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
            className="shrink-0 rounded-full p-2 text-[var(--text-tertiary)] transition-all hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)]"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        <button
          type="submit"
          className={cn(
            "shrink-0 rounded-xl bg-[var(--brand-primary)] px-8 font-black uppercase tracking-tighter text-[var(--text-on-brand)] shadow-[0_8px_20px_rgba(59,130,246,0.3)] transition-all hover:bg-[var(--pc-brand-primary-soft)] hover:shadow-[0_10px_25px_rgba(59,130,246,0.4)] active:scale-[0.96]",
            compact ? "h-9 text-[12px]" : "h-14 text-[14px] sm:h-16 sm:text-[15px]",
          )}
        >
          Pesquisar
        </button>
      </form>


      <AnimatePresence mode="wait">
        {showPanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-[var(--bg-base)]/80 backdrop-blur-md"
              onMouseDown={() => setOpen(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-0 right-0 top-full mt-4 z-[100] overflow-hidden rounded-[24px] border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)]"
            >
              <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]/30 px-6 py-4 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]">
                       <Zap className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--brand-primary)]">Inteligência PreçoCerto Ativa</span>
                 </div>
                 {loading && <Loader2 className="h-4 w-4 animate-spin text-[var(--brand-primary)]" />}
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
                            "group/item relative flex w-full items-center gap-4 border-l-[4px] px-6 py-4.5 text-left transition-all duration-300",
                            active === i
                              ? "border-l-[var(--brand-primary)] bg-gradient-to-r from-[var(--brand-primary)]/10 to-transparent scale-[1.01] translate-x-1"
                              : "border-l-transparent hover:bg-[var(--bg-surface-elevated)]/50",
                          )}
                        >
                          <div className={cn(
                            "relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border transition-all duration-500",
                            active === i 
                              ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 shadow-lg shadow-[var(--brand-primary)]/20 rotate-3" 
                              : "border-[var(--border-subtle)] bg-[var(--bg-base)]"
                          )}>
                            {s.imageUrl ? (
                              <img src={s.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform group-hover/item:scale-110" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--bg-surface-elevated)] to-[var(--bg-base)]">
                                <span aria-hidden="true" className="text-sm font-black text-[var(--brand-primary)]">
                                  {(s.displayName || "?").trim().charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            {active === i && (
                               <div className="absolute inset-0 bg-[var(--brand-primary)]/10 animate-pulse" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className={cn(
                              "block truncate text-base font-bold tracking-tight transition-colors",
                              active === i ? "text-[var(--brand-primary)]" : "text-[var(--text-primary)]"
                            )}>
                              {s.displayName}
                            </span>
                            <div className="mt-1 flex items-center gap-2 truncate">
                              {s.market ? (
                                <span className={cn(
                                  "inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wider transition-all",
                                  active === i 
                                    ? "bg-[var(--brand-primary)] text-white shadow-md shadow-[var(--brand-primary)]/20" 
                                    : "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                                )}>
                                  <Store className="h-3 w-3" /> {s.market}
                                </span>
                              ) : (
                                <span className="text-[12px] font-semibold text-[var(--text-tertiary)]">{s.category ?? "Produtos Disponíveis"}</span>
                              )}
                            </div>
                          </div>
                          {typeof s.minPrice === "number" ? (
                            <div className="shrink-0 text-right">
                              <div className={cn(
                                "text-lg font-black tracking-tighter transition-all duration-500",
                                active === i ? "scale-110 text-[var(--brand-primary)]" : "text-[var(--text-primary)]"
                              )}>
                                {BRL(s.minPrice)}
                              </div>
                              {i === 0 && (
                                <div className="text-[10px] font-black uppercase tracking-[0.1em] text-[var(--pc-brand-accent)] animate-bounce mt-0.5">Melhor Preço</div>
                              )}
                            </div>
                          ) : loading ? (
                            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--text-tertiary)]" />
                          ) : null}
                        </button>
                      </li>
                    ))}
                    <li className="flex items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]/30 px-6 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-[var(--text-tertiary)]">
                      <span className="flex items-center gap-2">
                        <CornerDownLeft className="h-3 w-3 text-[var(--brand-primary)]" /> <span className="text-[var(--text-secondary)]">Enter</span> para buscar
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="flex gap-0.5">
                          <span className="rounded border border-[var(--border-subtle)] bg-[var(--bg-base)] px-1.5 py-0.5">↑</span>
                          <span className="rounded border border-[var(--border-subtle)] bg-[var(--bg-base)] px-1.5 py-0.5">↓</span>
                        </span>
                        para navegar
                      </span>
                    </li>
                  </ul>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}