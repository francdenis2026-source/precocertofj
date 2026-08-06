import * as React from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { fetchPriceSearch, fetchSuggestions } from "@/lib/search-cache";
import { normalize, tokenizeQuery } from "@/lib/search-tokens";
import { Search, ArrowRight, TrendingDown, Loader2, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { trackEvent } from "@/lib/analytics-events";
import { Skeleton } from "@/components/ui/skeleton";

import {
  suggestProducts,
  type ProductSuggestion,
} from "@/lib/product-suggest.functions";
import { searchProductPrice } from "@/lib/price-search.functions";
import { consumeGuest, isGuestAtLimit } from "@/lib/guest-quota";

export type HomeSearchSuggestionsHandle = {
  /**
   * Trata teclas vindas do input do hero. Retorna `true` quando a tecla foi
   * consumida pelo dropdown (o formulário não deve submeter nesse caso).
   */
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => boolean;
};

type Props = {
  query: string;
  isLoggedOut: boolean;
  onBlocked: () => void;
  /** Quando true, o dropdown fica visível (input em foco). */
  open: boolean;
  onClose: () => void;
  /**
   * Elemento âncora (a moldura do campo de busca). O painel é renderizado em
   * portal no `body` porque a homepage usa containers com `overflow-hidden`
   * que cortavam o dropdown posicionado de forma absoluta.
   */
  anchorRef: React.RefObject<HTMLElement | null>;
  className?: string;
};

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Máximo de sugestões — lista curta cabe na tela sem cobrir o conteúdo. */
const MAX_ITEMS = 6;
const LISTBOX_ID = "home-search-suggestions";
const optionId = (i: number) => `${LISTBOX_ID}-opt-${i}`;


/**
 * Dropdown de autocomplete com preços — aparece embaixo do campo de busca
 * da homepage enquanto o usuário digita.
 *
 * Regras:
 * - Só aparece com query ≥ 2 caracteres.
 * - Live search com debounce curto (140ms) e cancelamento (AbortController).
 * - Lista curta (6 itens) renderizada em portal para não ser cortada.
 * - Navegação por teclado: ↓/↑ movem, Enter abre o item ativo, Esc fecha.
 * - Visitantes com cota esgotada veem os nomes borrados + CTA.
 */
export const HomeSearchSuggestions = React.forwardRef<HomeSearchSuggestionsHandle, Props>(
  function HomeSearchSuggestions({ query, isLoggedOut, onBlocked, open, onClose, anchorRef, className }, ref) {
    const navigate = useNavigate();
    const runSuggest = useServerFn(suggestProducts);
    const runSearch = useServerFn(searchProductPrice);
    const qc = useQueryClient();

    const [items, setItems] = React.useState<
      Array<ProductSuggestion & { minPrice?: number | null; market?: string | null }>
    >([]);
    const [loading, setLoading] = React.useState(false);
    const [err, setErr] = React.useState<string | null>(null);
    /** -1 = nenhuma sugestão ativa (Enter faz a busca livre pelo termo). */
    const [active, setActive] = React.useState(-1);
    const abortRef = React.useRef<AbortController | null>(null);
    const listRef = React.useRef<HTMLUListElement | null>(null);

    const q = query.trim();
    const canQuery = open && q.length >= 2;

    React.useEffect(() => {
      setActive(-1);
    }, [q, open]);

    React.useEffect(() => {
      if (!canQuery) {
        setItems([]);
        setLoading(false);
        setErr(null);
        abortRef.current?.abort();
        return;
      }
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const timer = setTimeout(async () => {
        try {
          const startTime = performance.now();
          const suggestions = await fetchSuggestions(qc, runSuggest as never, q, ctrl.signal);
          const suggestTime = performance.now() - startTime;
          
          if (import.meta.env.PROD) {
            trackEvent("search_suggest_load", { 
              query: q, 
              duration_ms: Math.round(suggestTime),
              count: suggestions?.length || 0 
            });
          }
          if (ctrl.signal.aborted) return;
          const base = (suggestions ?? []).slice(0, MAX_ITEMS);
          
          // Se já temos no cache enriquecido, não precisa mostrar loading ou "nomes puros"
          const enrichedKey = ["search", "enriched-suggestions", q];
          const cachedEnriched = qc.getQueryData(enrichedKey);
          
          if (cachedEnriched) {
            setItems(cachedEnriched as any);
            return;
          }

          setItems(base.map((s) => ({ ...s, minPrice: null, market: null })));
          setLoading(true);
          setErr(null);

          const enriched = await Promise.all(
            base.map(async (s) => {
              try {
                const r: any = await fetchPriceSearch<any>(
                  qc,
                  runSearch as never,
                  { query: s.displayName, pureOnly: true },
                  ctrl.signal,
                );
                const first = r?.groups?.[0];
                const cheapest = first?.prices?.[0];
                return {
                  ...s,
                  minPrice: typeof first?.min === "number" ? first.min : cheapest?.price ?? null,
                  market: cheapest?.marketName ?? null,
                };
              } catch {
                return { ...s, minPrice: null, market: null };
              }
            }),
          );
          if (ctrl.signal.aborted) return;
          const sortedEnriched = enriched.sort((a, b) => {
            if (a.minPrice === null) return 1;
            if (b.minPrice === null) return -1;
            if (a.minPrice !== b.minPrice) return a.minPrice - b.minPrice;
            return (a.market || "").localeCompare(b.market || "");
          });
          if (ctrl.signal.aborted) return;
          setItems(sortedEnriched);
          qc.setQueryData(enrichedKey, sortedEnriched, { updatedAt: Date.now() });

          if (import.meta.env.PROD) {
             const enrichTime = performance.now() - startTime;
             trackEvent("search_enrich_complete", { 
               query: q, 
               total_duration_ms: Math.round(enrichTime),
               cheapest: sortedEnriched[0]?.minPrice,
               market: sortedEnriched[0]?.market
             });
          }
        } catch (e: any) {
          if (ctrl.signal.aborted) return;
          setErr(e?.message ?? "Falha ao buscar sugestões");
          setItems([]);
        } finally {
          if (!ctrl.signal.aborted) setLoading(false);
        }
      }, 120);
      return () => {
        clearTimeout(timer);
        ctrl.abort();
      };
    }, [q, canQuery, runSuggest, runSearch, qc]);

    const blocked = isLoggedOut && isGuestAtLimit();

    const handlePick = React.useCallback(
      (suggestion: ProductSuggestion & { minPrice?: number | null; market?: string | null }) => {
        const term = suggestion.displayName;
        if (import.meta.env.PROD) {
          trackEvent("search_suggest_click", { 
            query: q, 
            selection: term,
            price: suggestion.minPrice,
            market: suggestion.market,
            is_cheapest: items[0]?.id === suggestion.id
          });
        }
        if (isLoggedOut) {
          const { blocked: b } = consumeGuest("search", term);
          if (b) {
            onBlocked();
            onClose();
            return;
          }
        }
        onClose();
        navigate({ to: "/buscar", search: { q: term } as any });
      },
      [isLoggedOut, navigate, onBlocked, onClose, q, items],
    );

    // Mantém o item ativo visível dentro do trilho rolável.
    React.useEffect(() => {
      if (active < 0) return;
      listRef.current
        ?.querySelectorAll<HTMLElement>("[role='option']")
        [active]?.scrollIntoView({ block: "nearest" });
    }, [active]);

    const visible = open && q.length >= 2;
    const itemsRef = React.useRef(items);
    itemsRef.current = items;
    const activeRef = React.useRef(active);
    activeRef.current = active;
    const visibleRef = React.useRef(visible);
    visibleRef.current = visible;

    React.useImperativeHandle(
      ref,
      () => ({
        handleKeyDown: (e) => {
          if (!visibleRef.current) return false;
          const list = itemsRef.current;
          const cur = activeRef.current;
          if (e.key === "ArrowDown") {
            if (list.length === 0) return false;
            e.preventDefault();
            const next = cur + 1 >= list.length ? 0 : cur + 1;
            setActive(next);
            return true;
          }
          if (e.key === "ArrowUp") {
            if (list.length === 0) return false;
            e.preventDefault();
            const prev = cur <= 0 ? list.length - 1 : cur - 1;
            setActive(prev);
            return true;
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onClose();
            return true;
          }
          if (e.key === "Enter") {
            if (cur >= 0 && list[cur]) {
              e.preventDefault();
              handlePick(list[cur]);
              return true;
            }
            // Se não houver item ativo, deixa o formulário submeter para a busca global
            return false;
          }
          return false;
        },
      }),
      [handlePick, onClose],
    );

    // Mede a âncora (campo de busca) para posicionar o painel em `position: fixed`.
    const [rect, setRect] = React.useState<{ left: number; top: number; width: number; maxH: number } | null>(
      null,
    );
    React.useEffect(() => {
      if (!visible) return;
      const measure = () => {
        const el = anchorRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const gap = 8;
        const top = r.bottom + gap;
        setRect({
          left: r.left,
          top,
          width: r.width,
          maxH: Math.max(180, window.innerHeight - top - 16),
        });
      };
      measure();
      window.addEventListener("resize", measure);
      window.addEventListener("scroll", measure, true);
      return () => {
        window.removeEventListener("resize", measure);
        window.removeEventListener("scroll", measure, true);
      };
    }, [visible, anchorRef, items.length, loading]);

    if (!visible || typeof document === "undefined") return null;

    const panel = (
      <FocusTrap active={visible && !!rect}>
        <AnimatePresence>
          {visible && rect && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className={cn("fixed z-[110] flex flex-col overflow-hidden rounded-[16px] border border-[var(--border-subtle)] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]", className)}
            style={{
              left: rect.left,
              top: rect.top,
              width: rect.width,
              maxHeight: rect.maxH,
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
            }}
          >

        {loading && items.length === 0 ? (
          <div className="p-4 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-10 w-10 rounded-lg bg-[var(--bg-surface-elevated)] shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-3/4 rounded-full bg-[var(--bg-surface-elevated)]" />
                  <div className="h-2.5 w-1/4 rounded-full bg-[var(--bg-surface-elevated)]" />
                </div>
              </div>
            ))}
          </div>
        ) : err ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            role="alert"
            aria-live="polite"
            className="px-6 py-10 text-center"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
              <Search className="h-7 w-7" aria-hidden="true" />
            </div>
            <p className="mb-2 text-base font-bold text-[var(--text-primary)]">Ops! Não conseguimos buscar agora</p>
            <p className="mb-6 text-sm text-[var(--text-secondary)]">Ocorreu um erro ao carregar as sugestões. Pode ser sua conexão ou uma instabilidade momentânea.</p>
            <button 
              onClick={() => window.location.reload()}
              autoFocus
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-primary)] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white hover:brightness-110 active:scale-95 transition-all shadow-md focus-visible:ring-4 focus-visible:ring-[var(--brand-primary)]/20 outline-none"
            >
              Tentar Novamente
            </button>
          </motion.div>
        ) : items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            role="status"
            aria-live="polite"
            className="flex flex-col items-center justify-center px-6 py-10 text-center"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
              <Search className="h-7 w-7" aria-hidden="true" />
            </div>
            <p className="mb-2 text-base font-bold text-[var(--text-primary)]">“{q}” não encontrado</p>
            <p className="mb-6 text-sm text-[var(--text-secondary)]">Não encontramos resultados exatos para este termo em nosso catálogo atual.</p>
            <button
              onClick={() => handlePick({ id: "q", displayName: q, minPrice: null, market: null, brand: null, category: null, imageUrl: null, isFuzzy: false, similarity: 0 })}
              autoFocus
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--brand-primary)] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/5 active:scale-95 transition-all focus-visible:ring-4 focus-visible:ring-[var(--brand-primary)]/20 outline-none"
            >
              Fazer busca global
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </motion.div>
        ) : (
          <ul
            ref={listRef}
            id={LISTBOX_ID}
            role="listbox"
            aria-label="Sugestões de produtos"
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            {items.map((s, i) => (
              <li key={s.id} role="none">
                <button
                  type="button"
                  id={optionId(i)}
                  role="option"
                  aria-selected={active === i}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => handlePick(s)}
                  className={
                    "flex w-full items-center gap-2.5 border-l-[3px] px-3 py-2.5 text-left transition-all duration-300 ease-out outline-none focus-visible:bg-[var(--brand-primary)]/10 " +
                    (active === i
                      ? "border-l-[var(--brand-primary)] bg-[var(--brand-primary)]/8 text-[var(--text-primary)] translate-x-1"
                      : "border-l-transparent hover:bg-[var(--bg-surface-elevated)]")
                  }
                >
                  <span
                    className={
                      "grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg border transition-all duration-300 " +
                      (active === i
                        ? "border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/15 shadow-[0_0_10px_rgba(108,92,231,0.2)] scale-105"
                        : s.imageUrl
                          ? "border-[var(--border-subtle)] bg-[var(--bg-base)]"
                          : "border-[var(--brand-primary)]/30 bg-[var(--bg-base)]")
                    }
                  >
                    {s.imageUrl ? (
                      <img
                        src={s.imageUrl}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-500"
                        loading="lazy"
                        aria-hidden="true"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className={
                          "text-[12px] font-black uppercase leading-none tracking-tight transition-colors " +
                          (active === i ? "text-[var(--text-primary)]" : "text-[var(--brand-primary)]")
                        }
                      >
                        {(s.displayName || "?").trim().charAt(0)}
                      </span>
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={
                        "block truncate text-[15px] font-medium leading-tight transition-colors " +
                        (active === i ? "text-[var(--text-primary)] font-bold" : "text-[var(--text-secondary)]") +
                        (blocked ? "select-none blur-sm" : "")
                      }
                    >
                      {(() => {
                        const name = s.displayName;
                        const tokens = tokenizeQuery(query);
                        if (tokens.length === 0) return name;
                        
                        // Escapa caracteres especiais de regex em cada token
                        const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                        
                        // Cria uma regex que busca qualquer um dos tokens (normalizados)
                        // A busca deve ser case-insensitive e considerar acentos (via normalização)
                        // Como o DOM usa o nome original, precisamos de uma estratégia de substituição cuidadosa.
                        
                        // Estratégia simples: Highlight case-insensitive do primeiro token significativo
                        // Para um sistema profissional de highlight, costuma-se usar uma lib ou regex complexa.
                        const parts = name.split(new RegExp(`(${tokens.map(esc).join('|')})`, 'gi'));
                        return parts.map((part, index) => {
                          const isMatch = tokens.some(t => normalize(part) === normalize(t));
                          return isMatch ? (
                            <span key={index} className="text-[var(--brand-primary)] font-bold">{part}</span>
                          ) : part;
                        });
                      })()}
                    </span>
                    <span
                      className={
                        "mt-0.5 flex items-center gap-1.5 truncate text-[11px] leading-none " +
                        (active === i ? "text-primary-foreground/80" : "text-muted-foreground")

                      }
                    >
                      {s.brand ? <span className="truncate">{s.brand}</span> : null}
                      {s.category ? (
                        <>
                          {s.brand ? <span aria-hidden>·</span> : null}
                          <span className="truncate">{s.category}</span>
                        </>
                      ) : null}
                      {s.isFuzzy ? (
                        <span
                          className={
                            "rounded-full px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide " +
                            (active === i
                              ? "bg-white/20 text-white"
                              : "bg-amber-100 text-amber-800")
                          }
                        >
                          Similar
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <span className="ml-1 flex shrink-0 flex-col items-end">
                    {typeof s.minPrice === "number" ? (
                      <div className="flex flex-col items-end">
                        {i === 0 && items.length > 1 && (
                          <span className="mb-1 rounded-full bg-[var(--brand-primary)]/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-[var(--brand-primary)] animate-pulse">
                            Melhor Preço
                          </span>
                        )}
                        <span
                          className={
                            "inline-flex items-center gap-1 text-[14px] font-black tabular-nums " +
                            (blocked ? "select-none blur-sm" : "") +
                            (active === i ? " text-[var(--text-primary)]" : " text-[var(--brand-primary)]")
                          }
                        >
                          <TrendingDown
                            className={cn("h-3.5 w-3.5", active === i ? "text-[var(--text-primary)]" : "text-[var(--brand-primary)]")}
                          />
                          {BRL(s.minPrice)}
                        </span>
                      </div>
                    ) : (
                      <span className={active === i ? "text-[11px] text-[var(--text-primary)]/60" : "text-[11px] text-[var(--text-tertiary)]/50"}>—</span>
                    )}
                    {s.market ? (
                      <span
                        className={
                          "mt-0.5 max-w-[190px] truncate text-[10px] font-medium leading-none " +
                          (blocked ? "select-none blur-sm" : "") +
                          (active === i ? " text-[var(--text-primary)]/70" : " text-[var(--text-tertiary)]")
                        }
                      >
                        no {s.market}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div
          className="flex shrink-0 items-center justify-between gap-2 border-t px-3 py-1.5 text-[11px]"
          style={{ borderColor: "var(--border-subtle)", background: "var(--bg-base)" }}
        >

          <span className="truncate text-muted-foreground">

            {blocked ? (
              "Cadastre-se para ver preços sem limite."
            ) : (
              <>
                <kbd className="rounded border border-border bg-background px-1 font-sans">↑</kbd>{" "}
                <kbd className="rounded border border-border bg-background px-1 font-sans">↓</kbd>{" "}

                navegar ·{" "}
                <CornerDownLeft className="inline h-3 w-3 align-[-2px]" aria-hidden /> abrir
              </>
            )}
          </span>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handlePick({ id: "q", displayName: q, minPrice: null, market: null, brand: null, category: null, imageUrl: null, isFuzzy: false, similarity: 0 })}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold uppercase tracking-wide transition-all hover:scale-105 active:scale-95"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >

            Ver tudo
            <ArrowRight className="h-3 w-3" strokeWidth={2.6} />
          </button>
        </div>
        </motion.div>
      )}
    </AnimatePresence>
  </FocusTrap>
);

return createPortal(panel, document.body);
}
);

function FocusTrap({ children, active }: { children: React.ReactNode; active: boolean }) {
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const root = rootRef.current;
      if (!root) return;

      const focusables = root.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [active]);

  return <div ref={rootRef} className="contents">{children}</div>;
}
