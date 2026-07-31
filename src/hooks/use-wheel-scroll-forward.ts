import { useEffect, useRef } from "react";

/**
 * Encaminha a rolagem do mouse para o painel rolável mais próximo.
 *
 * O painel do cliente usa "janela única": a página não rola e apenas os corpos
 * internos (`.pc-panel-body`) têm barra de rolagem. Quando o ponteiro estava
 * sobre um cabeçalho, uma borda, um gráfico ou um card sem rolagem própria, o
 * evento `wheel` não encontrava nenhum contêiner rolável e a tela parecia
 * travada. Aqui interceptamos esse caso e aplicamos o delta no painel rolável
 * mais próximo (ancestral ou, na falta dele, o painel visível sob o cursor).
 */
const SCROLLER = ".pc-panel-body, [data-wheel-scroller]";

function isScrollable(el: Element) {
  const style = getComputedStyle(el);
  const oy = style.overflowY;
  if (oy !== "auto" && oy !== "scroll") return false;
  return el.scrollHeight - el.clientHeight > 1;
}

/** Sobe pela árvore procurando algo que realmente possa rolar. */
function nearestScrollable(start: Element | null, root: HTMLElement) {
  let node: Element | null = start;
  while (node && node !== root.parentElement) {
    if (node instanceof HTMLElement && isScrollable(node)) return node;
    node = node.parentElement;
  }
  return null;
}

/** Painel rolável cuja coluna está sob o cursor (fallback do fallback). */
function scrollerUnderPointer(root: HTMLElement, x: number, y: number) {
  const candidates = Array.from(root.querySelectorAll<HTMLElement>(SCROLLER)).filter(isScrollable);
  if (!candidates.length) return null;
  const column = candidates.find((el) => {
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right;
  });
  return column ?? candidates[0] ?? null;
}

export function useWheelScrollForward<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.defaultPrevented) return;
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      if (!dy) return;

      const target = e.target instanceof Element ? e.target : null;
      // Já existe um contêiner rolável no caminho? Deixa o navegador cuidar.
      if (nearestScrollable(target, root)) return;

      const scroller = scrollerUnderPointer(root, e.clientX, e.clientY);
      if (!scroller) return;

      const max = scroller.scrollHeight - scroller.clientHeight;
      const next = Math.max(0, Math.min(max, scroller.scrollTop + dy));
      if (next === scroller.scrollTop) return;
      scroller.scrollTop = next;
      e.preventDefault();
    };

    root.addEventListener("wheel", onWheel, { passive: false });
    return () => root.removeEventListener("wheel", onWheel);
  }, []);

  return ref;
}
