import { useCallback, useEffect, useRef } from "react";

/**
 * Navegação 100% por teclado na lista de resultados da busca.
 *
 * - Roving tabindex: apenas um card fica na ordem de tabulação (o primeiro,
 *   ou o último focado). Tab entra/sai da lista em um único passo, mantendo a
 *   ordem consistente inclusive quando a busca vem de "Buscas em alta".
 * - ↑/↓ (e PageUp/PageDown, Home/End) movem o foco entre os cards.
 * - Enter (ou "o") abre os detalhes do produto focado.
 * - "c" alterna a comparação; "e" expande/recolhe a lista de mercados.
 */
export function useResultsKeyboardNav({
  containerRef,
  enabled = true,
  autoFocusFirst = false,
  resultsKey,
}: {
  containerRef: React.RefObject<HTMLElement | null>;
  enabled?: boolean;
  /** Move o foco para o primeiro resultado assim que a lista aparece. */
  autoFocusFirst?: boolean;
  /** Muda quando a lista de resultados é recalculada (query/filtros). */
  resultsKey?: string;
}) {
  const autoFocusedFor = useRef<string | null>(null);

  const cards = useCallback((): HTMLElement[] => {
    const root = containerRef.current;
    if (!root) return [];
    return Array.from(root.querySelectorAll<HTMLElement>("[data-result-card]"));
  }, [containerRef]);

  const applyRoving = useCallback(
    (activeIndex = 0) => {
      const list = cards();
      list.forEach((el, i) => {
        el.tabIndex = i === activeIndex ? 0 : -1;
      });
      return list;
    },
    [cards],
  );

  // Reaplica o roving tabindex sempre que a lista muda.
  useEffect(() => {
    if (!enabled) return;
    const list = applyRoving(0);
    if (list.length === 0) return;
    if (!autoFocusFirst) return;
    const key = resultsKey ?? "";
    if (autoFocusedFor.current === key) return;
    autoFocusedFor.current = key;
    const id = window.setTimeout(() => {
      const first = cards()[0];
      first?.focus({ preventScroll: false });
    }, 80);
    return () => window.clearTimeout(id);
  }, [enabled, applyRoving, autoFocusFirst, resultsKey, cards]);

  const focusAt = useCallback(
    (index: number) => {
      const list = cards();
      if (list.length === 0) return;
      const next = Math.max(0, Math.min(list.length - 1, index));
      applyRoving(next);
      const el = list[next];
      el.focus({ preventScroll: true });
      el.scrollIntoView({ block: "nearest" });
    },
    [cards, applyRoving],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (!enabled) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const card = target.closest<HTMLElement>("[data-result-card]");
      if (!card) return;

      // Atalhos só valem quando o foco está no card (não dentro de um
      // controle interno como input/botão) — Tab continua natural lá dentro.
      const onCard = target === card;
      const list = cards();
      const index = list.indexOf(card);
      if (index < 0) return;

      const click = (selector: string) => {
        const el = card.querySelector<HTMLElement>(selector);
        if (!el) return false;
        el.click();
        return true;
      };

      switch (event.key) {
        case "ArrowDown":
          if (!onCard) return;
          event.preventDefault();
          focusAt(index + 1);
          return;
        case "ArrowUp":
          if (!onCard) return;
          event.preventDefault();
          focusAt(index - 1);
          return;
        case "PageDown":
          if (!onCard) return;
          event.preventDefault();
          focusAt(index + 5);
          return;
        case "PageUp":
          if (!onCard) return;
          event.preventDefault();
          focusAt(index - 5);
          return;
        case "Home":
          if (!onCard) return;
          event.preventDefault();
          focusAt(0);
          return;
        case "End":
          if (!onCard) return;
          event.preventDefault();
          focusAt(list.length - 1);
          return;
        case "Enter":
          if (!onCard) return;
          if (click("[data-card-open]")) event.preventDefault();
          return;
        default:
          break;
      }

      if (!onCard || event.altKey || event.ctrlKey || event.metaKey) return;
      const key = event.key.toLowerCase();
      if (key === "o" && click("[data-card-open]")) event.preventDefault();
      else if (key === "c" && click("[data-card-compare]")) event.preventDefault();
      else if (key === "e" && click("[data-card-expand]")) event.preventDefault();
    },
    [enabled, cards, focusAt],
  );

  return { onKeyDown, focusFirst: () => focusAt(0) };
}
