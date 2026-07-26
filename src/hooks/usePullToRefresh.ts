import { useCallback, useEffect, useRef, useState } from "react";

type Options = {
  onRefresh: () => Promise<unknown> | void;
  /** distância em px que dispara o refresh */
  threshold?: number;
  /** distância máxima de arrasto */
  maxPull?: number;
  /** desativa em desktop */
  enabled?: boolean;
};

/**
 * Hook de pull-to-refresh para mobile — otimizado para não travar o scroll.
 *
 * Regras de performance (importantes):
 *  • Listeners são registrados UMA vez (dependências estáveis via refs).
 *  • `touchmove` nunca chama setState direto: o valor é acumulado em ref e
 *    publicado no máximo 1x por frame (requestAnimationFrame).
 *  • Enquanto a página não está no topo, o handler retorna imediatamente —
 *    zero re-render durante o scroll normal.
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 72,
  maxPull = 110,
  enabled = true,
}: Options) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const startY = useRef<number | null>(null);
  const active = useRef(false);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);
  const frame = useRef<number | null>(null);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const publish = useCallback((value: number) => {
    pullRef.current = value;
    if (frame.current != null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      setPull((prev) => (Math.abs(prev - pullRef.current) < 1 ? prev : pullRef.current));
    });
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    // Apenas dispositivos com toque
    if (!("ontouchstart" in window)) return;

    const onStart = (e: TouchEvent) => {
      if (refreshingRef.current) return;
      if (window.scrollY > 2) {
        active.current = false;
        return;
      }
      startY.current = e.touches[0].clientY;
      active.current = true;
    };

    const onMove = (e: TouchEvent) => {
      if (!active.current || startY.current == null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        // Usuário está rolando para baixo: encerra o gesto e sai do caminho.
        active.current = false;
        startY.current = null;
        if (pullRef.current !== 0) publish(0);
        return;
      }
      publish(Math.min(maxPull, dy * 0.55));
    };

    const onEnd = () => {
      if (!active.current) return;
      active.current = false;
      startY.current = null;
      const reached = pullRef.current >= threshold;
      if (reached && !refreshingRef.current) {
        refreshingRef.current = true;
        setRefreshing(true);
        publish(threshold);
        void (async () => {
          try {
            await onRefreshRef.current();
          } finally {
            refreshingRef.current = false;
            setRefreshing(false);
            publish(0);
          }
        })();
      } else {
        publish(0);
      }
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
      if (frame.current != null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [enabled, threshold, maxPull, publish]);

  return { pull, refreshing, progress: Math.min(1, pull / threshold) };
}
