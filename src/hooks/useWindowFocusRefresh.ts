import { useEffect, useRef } from "react";

type Options = {
  enabled: boolean;
  onRefresh: () => void | Promise<unknown>;
  /** Espera antes de disparar depois do foco (evita duplo trigger de focus+visibility). */
  debounceMs?: number;
  /** Distância mínima entre duas execuções (não importa quantos foco chegaram). */
  minIntervalMs?: number;
};

/**
 * Dispara `onRefresh` quando a janela volta a receber foco ou vira visível,
 * com debounce e janela mínima entre execuções para evitar flood ao alternar
 * abas rapidamente.
 */
export function useWindowFocusRefresh({
  enabled,
  onRefresh,
  debounceMs = 5000,
  minIntervalMs = 30_000,
}: Options) {
  const lastRunRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cbRef = useRef(onRefresh);
  cbRef.current = onRefresh;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const trigger = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const now = Date.now();
        if (now - lastRunRef.current < minIntervalMs) return;
        lastRunRef.current = now;
        try {
          void cbRef.current();
        } catch {
          /* callbacks assíncronos com erro são tratados pelo caller */
        }
      }, debounceMs);
    };

    const onFocus = () => trigger();
    const onVisibility = () => {
      if (document.visibilityState === "visible") trigger();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, debounceMs, minIntervalMs]);
}
