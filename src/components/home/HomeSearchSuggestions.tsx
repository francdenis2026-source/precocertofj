import * as React from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { fetchPriceSearch, fetchSuggestions } from "@/lib/search-cache";
import { Search, ArrowRight, TrendingDown, Loader2, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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
  function HomeSearchSuggestions({ query, isLoggedOut, onBlocked, open, onClose, anchorRef }, ref) {
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
          const suggestions = await fetchSuggestions(qc, runSuggest as never, q, ctrl.signal);
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
          setItems(enriched);
          qc.setQueryData(enrichedKey, enriched, { updatedAt: Date.now() });
        } catch (e: any) {
          if (ctrl.signal.aborted) return;
          setErr(e?.message ?? "Falha ao buscar sugestões");
          setItems([]);
        } finally {
          if (!ctrl.signal.aborted) setLoading(false);
        }
      }, 180);
      return () => {
        clearTimeout(timer);
        ctrl.abort();
      };
    }, [q, canQuery, runSuggest, runSearch, qc]);

    const blocked = isLoggedOut && isGuestAtLimit();

    const handlePick = React.useCallback(
      (term: string) => {
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
      [isLoggedOut, navigate, onBlocked, onClose],
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
            setActive(cur + 1 >= list.length ? -1 : cur + 1);
            return true;
          }
          if (e.key === "ArrowUp") {
            if (list.length === 0) return false;
            e.preventDefault();
            setActive(cur <= -1 ? list.length - 1 : cur - 1);
            return true;
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onClose();
            return true;
          }
          if (e.key === "Enter" && cur >= 0 && list[cur]) {
            e.preventDefault();
            handlePick(list[cur].displayName);
            return true;
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
      <AnimatePresence>
        {visible && rect && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed z-[80] flex flex-col overflow-hidden rounded-[12px] border border-[var(--border-subtle)] shadow-2xl"
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
          <div className="flex items-center gap-2 px-3 py-2.5 text-[12.5px] text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Procurando “{q}”…
          </div>
        ) : err ? (
          <div className="px-3 py-2.5 text-[12.5px] text-rose-600">{err}</div>
        ) : items.length === 0 ? (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handlePick(q)}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-medium transition-colors hover:bg-slate-700"
          >
            <Search className="h-4 w-4 text-primary" />
            Nenhum produto com esse nome — ver todos os resultados para “<strong>{q}</strong>”
            <ArrowRight className="ml-auto h-4 w-4 text-primary" />

          </button>
        ) : (
          <ul
            ref={listRef}
            id={LISTBOX_ID}
            role="listbox"
            aria-label="Sugestões de produtos"
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            {items.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  id={optionId(i)}
                  role="option"
                  aria-selected={active === i}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => handlePick(s.displayName)}
                  className={
                    "flex w-full items-center gap-2.5 border-l-[3px] px-3 py-2 text-left transition-all duration-200 " +
                    (active === i
                      ? "border-l-primary bg-primary text-primary-foreground"
                      : "border-l-transparent hover:bg-slate-700")

                  }
                >
                  <span
                    className={
                      "grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg border " +
                      (active === i
                        ? "border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/15 shadow-[0_0_10px_rgba(108,92,231,0.2)]"
                        : s.imageUrl
                          ? "border-slate-700 bg-slate-800"
                          : "border-primary/30 bg-slate-800")
                    }
                  >
                    {s.imageUrl ? (
                      <img
                        src={s.imageUrl}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                      />
                    ) : (
                      <span
                        aria-hidden
                        className={
                          "text-[12px] font-black uppercase leading-none tracking-tight " +
                          (active === i ? "text-white" : "text-primary")
                        }
                      >
                        {(s.displayName || "?").trim().charAt(0)}
                      </span>
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={
                        "block truncate text-[13.5px] font-semibold leading-tight " +
                        (blocked ? "select-none blur-sm" : "")
                      }
                    >
                      {s.displayName}
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
                      <span
                        className={
                          "inline-flex items-center gap-1 text-[13px] font-bold tabular-nums " +
                          (blocked ? "select-none blur-sm" : "") +
                          (active === i ? " text-primary-foreground" : " text-primary")
                        }
                      >
                        <TrendingDown
                          className={cn("h-3.5 w-3.5", active === i ? "text-primary-foreground" : "text-savings")}
                        />


                        {BRL(s.minPrice)}
                      </span>
                    ) : (
                      <span className={active === i ? "text-[11px] text-primary-foreground/60" : "text-[11px] text-muted-foreground/50"}>—</span>
                    )}
                    {s.market ? (
                      <span
                        className={
                          "mt-0.5 max-w-[190px] truncate text-[11px] leading-none " +
                          (blocked ? "select-none blur-sm" : "") +
                          (active === i ? " text-primary-foreground/70" : " text-muted-foreground")

                        }
                      >
                        {s.market}
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
            onClick={() => handlePick(q)}
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
    );

    return createPortal(panel, document.body);
  },
);
