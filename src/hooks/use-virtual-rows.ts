import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Virtualização simples para listas de linhas com altura fixa.
 *
 * Renderiza apenas a janela visível (+ overscan) e compensa o restante com
 * espaçadores no topo/base, mantendo a barra de rolagem no tamanho correto.
 */
export function useVirtualRows({
  count,
  rowHeight,
  overscan = 4,
}: {
  count: number;
  rowHeight: number;
  overscan?: number;
}) {
  const scrollRef = useRef<HTMLElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState(0);
  const frame = useRef<number | null>(null);

  const setRef = useCallback((node: HTMLElement | null) => {
    scrollRef.current = node;
    if (node) {
      setViewport(node.clientHeight);
      setScrollTop(node.scrollTop);
    }
  }, []);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    const onScroll = () => {
      if (frame.current != null) return;
      frame.current = window.requestAnimationFrame(() => {
        frame.current = null;
        setScrollTop(node.scrollTop);
      });
    };

    node.addEventListener("scroll", onScroll, { passive: true });

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => setViewport(node.clientHeight))
        : null;
    ro?.observe(node);
    setViewport(node.clientHeight);

    return () => {
      node.removeEventListener("scroll", onScroll);
      ro?.disconnect();
      if (frame.current != null) window.cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [setViewport]);

  // Sem medida ainda (SSR/primeiro paint): renderiza uma janela mínima segura.
  const visible = viewport > 0 ? Math.ceil(viewport / rowHeight) : Math.min(count, 8);
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const end = Math.min(count, start + visible + overscan * 2);

  return {
    setRef,
    start,
    end,
    padTop: start * rowHeight,
    padBottom: Math.max(0, (count - end) * rowHeight),
  };
}
