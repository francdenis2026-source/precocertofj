/**
 * Modo de animações reduzidas da busca.
 *
 * Combina a preferência do sistema (`prefers-reduced-motion`) com uma
 * preferência manual persistida em `localStorage`. Quando ativo, a classe
 * `pc-reduce-motion` desliga transições/animações dentro de `.pc-search-scope`,
 * eliminando qualquer efeito visual que possa parecer "flicker".
 */
import { useCallback, useEffect, useState } from "react";

const KEY = "pc:search:reduced-motion";

export function readStoredReducedMotion(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === "1") return true;
    if (raw === "0") return false;
  } catch {
    /* ignore */
  }
  return null;
}

export function systemPrefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useReducedMotion() {
  // SSR e primeira renderização sempre `false` para evitar mismatch de hidratação.
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const stored = readStoredReducedMotion();
    setEnabled(stored ?? systemPrefersReducedMotion());
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { reducedMotion: enabled, toggleReducedMotion: toggle };
}
