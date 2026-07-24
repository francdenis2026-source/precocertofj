import { useEffect, useRef, useState } from "react";

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
 * Hook simples de pull-to-refresh para mobile.
 * - Só ativa quando a página já está no topo.
 * - Não interfere com scroll normal.
 * - Retorna { pull, refreshing } para renderizar um indicador visual.
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

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    // Apenas dispositivos com toque
    if (!("ontouchstart" in window)) return;

    const onStart = (e: TouchEvent) => {
      if (refreshing) return;
      if (window.scrollY > 2) return;
      startY.current = e.touches[0].clientY;
      active.current = true;
    };
    const onMove = (e: TouchEvent) => {
      if (!active.current || startY.current == null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        setPull(0);
        return;
      }
      // resistência
      const eased = Math.min(maxPull, dy * 0.55);
      setPull(eased);
    };
    const onEnd = async () => {
      if (!active.current) return;
      active.current = false;
      startY.current = null;
      if (pull >= threshold && !refreshing) {
        setRefreshing(true);
        setPull(threshold);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
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
    };
  }, [enabled, threshold, maxPull, pull, refreshing, onRefresh]);

  return { pull, refreshing, progress: Math.min(1, pull / threshold) };
}
