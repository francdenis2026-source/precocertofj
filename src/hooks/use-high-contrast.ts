import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "pc-hc";

function apply(enabled: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("hc", enabled);
}

function readInitial(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "1") return true;
  if (stored === "0") return false;
  // Sem preferência salva → respeita prefers-contrast: more
  try {
    return window.matchMedia("(prefers-contrast: more)").matches;
  } catch {
    return false;
  }
}

/**
 * Modo alto contraste (WCAG AAA).
 * Persiste em localStorage e respeita `prefers-contrast: more` na 1ª visita.
 */
export function useHighContrast() {
  const [enabled, setEnabled] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = readInitial();
    setEnabled(initial);
    apply(initial);
    setMounted(true);
  }, []);

  const setValue = useCallback((next: boolean) => {
    setEnabled(next);
    apply(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* ignora quotas */
    }
  }, []);

  const toggle = useCallback(() => setValue(!enabled), [enabled, setValue]);

  return { enabled, toggle, set: setValue, mounted };
}
