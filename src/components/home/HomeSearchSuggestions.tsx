import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Search, ArrowRight, TrendingDown, Loader2 } from "lucide-react";
import {
  suggestProducts,
  type ProductSuggestion,
} from "@/lib/product-suggest.functions";
import { searchProductPrice } from "@/lib/price-search.functions";
import { consumeGuest, isGuestAtLimit } from "@/lib/guest-quota";

type Props = {
  query: string;
  isLoggedOut: boolean;
  onBlocked: () => void;
  /** Quando true, o dropdown fica visível (input em foco). */
  open: boolean;
  onClose: () => void;
};

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Dropdown de autocomplete com preços — aparece embaixo do campo de busca
 * da homepage enquanto o usuário digita. Consulta produtos por nome e
 * busca o menor preço atual de cada sugestão para dar contexto imediato.
 *
 * Regras:
 * - Só aparece com query ≥ 2 caracteres.
 * - Debounce de 220ms e cancelamento (AbortController) para evitar lag.
 * - Visitantes com cota esgotada veem os nomes borrados + CTA.
 * - Clique em uma sugestão consome 1 uso da cota (se visitante) e navega
 *   para a página de resultados.
 */
export function HomeSearchSuggestions({
  query,
  isLoggedOut,
  onBlocked,
  open,
  onClose,
}: Props) {
  const navigate = useNavigate();
  const runSuggest = useServerFn(suggestProducts);
  const runSearch = useServerFn(searchProductPrice);

  const [items, setItems] = React.useState<
    Array<ProductSuggestion & { minPrice?: number | null; market?: string | null }>
  >([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  const q = query.trim();
  const canQuery = open && q.length >= 2;

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
      setLoading(true);
      setErr(null);
      try {
        const suggestions = await runSuggest({
          data: { query: q },
          signal: ctrl.signal as any,
        } as any);
        if (ctrl.signal.aborted) return;
        const base = (suggestions ?? []).slice(0, 6);
        // Enriquece com o menor preço atual — busca em paralelo, tolerante a falha.
        const enriched = await Promise.all(
          base.map(async (s) => {
            try {
              const r: any = await runSearch({
                data: { query: s.displayName, pureOnly: true },
                signal: ctrl.signal as any,
              } as any);
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
      } catch (e: any) {
        if (ctrl.signal.aborted) return;
        setErr(e?.message ?? "Falha ao buscar sugestões");
        setItems([]);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 220);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q, canQuery, runSuggest, runSearch]);

  if (!open || q.length < 2) return null;

  const blocked = isLoggedOut && isGuestAtLimit();

  const handlePick = (term: string) => {
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
  };

  return (
    <div
      role="listbox"
      className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-[62vh] overflow-hidden rounded-2xl border shadow-2xl"
      style={{
        background: "#ffffff",
        borderColor: "color-mix(in oklab, #d4a24c 45%, transparent)",
        color: "#0f172a",
      }}
    >
      {loading && items.length === 0 ? (
        <div className="flex items-center gap-2 px-4 py-3 text-[13px] text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Procurando “{q}”…
        </div>
      ) : err ? (
        <div className="px-4 py-3 text-[13px] text-rose-600">{err}</div>
      ) : items.length === 0 ? (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => handlePick(q)}
          className="flex w-full items-center gap-2 px-4 py-3 text-left text-[13.5px] font-medium hover:bg-slate-50"
        >
          <Search className="h-4 w-4 text-slate-400" />
          Ver todos os resultados para “<strong>{q}</strong>”
          <ArrowRight className="ml-auto h-4 w-4 text-slate-400" />
        </button>
      ) : (
        <ul className="max-h-[54vh] overflow-y-auto">
          {items.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handlePick(s.displayName)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
              >
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg border bg-slate-50"
                  style={{ borderColor: "#e2e8f0" }}
                >
                  {s.imageUrl ? (
                    <img
                      src={s.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <Search className="h-4 w-4 text-slate-400" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={
                      "block truncate text-[14px] font-semibold leading-tight " +
                      (blocked ? "select-none blur-sm" : "")
                    }
                  >
                    {s.displayName}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-slate-500">
                    {s.brand ? (
                      <span className="truncate">{s.brand}</span>
                    ) : null}
                    {s.category ? (
                      <>
                        {s.brand ? <span aria-hidden>·</span> : null}
                        <span className="truncate">{s.category}</span>
                      </>
                    ) : null}
                    {s.isFuzzy ? (
                      <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                        Similar
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="ml-2 flex shrink-0 flex-col items-end">
                  {typeof s.minPrice === "number" ? (
                    <span
                      className={
                        "inline-flex items-center gap-1 text-[13.5px] font-bold tabular-nums " +
                        (blocked ? "select-none blur-sm" : "")
                      }
                      style={{ color: "#0b2444" }}
                    >
                      <TrendingDown className="h-3.5 w-3.5" style={{ color: "#0ea36b" }} />
                      {BRL(s.minPrice)}
                    </span>
                  ) : (
                    <span className="text-[11.5px] text-slate-400">preço a partir de —</span>
                  )}
                  {s.market ? (
                    <span
                      className={
                        "mt-0.5 max-w-[140px] truncate text-[10.5px] text-slate-500 " +
                        (blocked ? "select-none blur-sm" : "")
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
        className="flex items-center justify-between border-t px-3 py-2 text-[11.5px]"
        style={{ borderColor: "#e2e8f0", background: "#f8fafc" }}
      >
        <span className="text-slate-500">
          {blocked
            ? "Cadastre-se para ver preços sem limite."
            : "Enter para ver a lista completa"}
        </span>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => handlePick(q)}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] font-bold uppercase tracking-wide"
          style={{ background: "#d4a24c", color: "#0b2444" }}
        >
          Buscar “{q}”
          <ArrowRight className="h-3 w-3" strokeWidth={2.6} />
        </button>
      </div>
    </div>
  );
}
