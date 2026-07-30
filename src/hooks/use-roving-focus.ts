import { useCallback, useRef } from "react";

/**
 * Foco itinerante (roving tabindex) para grupos de controles horizontais ou
 * verticais — abas, chips de filtro e listas de ações.
 *
 * Regras WAI-ARIA aplicadas:
 *  • apenas um item do grupo é tabulável por vez (`tabIndex 0`), os demais −1;
 *  • setas movem o foco dentro do grupo (com loop);
 *  • Home/End vão ao primeiro/último item;
 *  • Tab sai do grupo inteiro, como esperado por leitores de tela.
 *
 * Uso:
 *   const roving = useRovingFocus(items.length, index, setIndex);
 *   <div {...roving.groupProps}> {items.map((it, i) => (
 *      <button key={it.id} {...roving.itemProps(i)} />
 *   ))} </div>
 */
export function useRovingFocus(
  count: number,
  activeIndex: number,
  onActivate: (index: number) => void,
  orientation: "horizontal" | "vertical" | "both" = "horizontal",
) {
  const refs = useRef<Array<HTMLElement | null>>([]);

  const focusIndex = useCallback(
    (index: number) => {
      if (count === 0) return;
      const next = (index + count) % count;
      refs.current[next]?.focus();
      onActivate(next);
    },
    [count, onActivate],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      const horiz = orientation !== "vertical";
      const vert = orientation !== "horizontal";
      switch (e.key) {
        case "ArrowRight":
          if (!horiz) return;
          e.preventDefault();
          focusIndex(index + 1);
          break;
        case "ArrowLeft":
          if (!horiz) return;
          e.preventDefault();
          focusIndex(index - 1);
          break;
        case "ArrowDown":
          if (!vert) return;
          e.preventDefault();
          focusIndex(index + 1);
          break;
        case "ArrowUp":
          if (!vert) return;
          e.preventDefault();
          focusIndex(index - 1);
          break;
        case "Home":
          e.preventDefault();
          focusIndex(0);
          break;
        case "End":
          e.preventDefault();
          focusIndex(count - 1);
          break;
        default:
      }
    },
    [count, focusIndex, orientation],
  );

  return {
    itemProps: (index: number) => ({
      ref: (el: HTMLElement | null) => {
        refs.current[index] = el;
      },
      tabIndex: index === activeIndex ? 0 : -1,
      onKeyDown: (e: React.KeyboardEvent) => onKeyDown(e, index),
    }),
    focusIndex,
  };
}
