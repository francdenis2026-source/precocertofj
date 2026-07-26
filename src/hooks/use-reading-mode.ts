import { useCallback, useEffect, useState } from "react";
import { READING_SCALE } from "@/lib/typeclear";

const STORAGE_KEY = "pc:reading-mode";

function apply(on: boolean) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.reading = on ? "on" : "off";
  root.style.setProperty("--tc-scale", on ? String(READING_SCALE) : "1");
}

/**
 * Modo de leitura: amplia toda a tipografia TypeClear (~+12%) mantendo a
 * mesma altura de página. A compensação acontece via CSS (`html[data-reading=on]`):
 * folgas verticais reduzidas e `line-clamp` mais agressivo nos textos de apoio.
 */
export function useReadingMode() {
  const [enabled, setEnabled] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let initial = false;
    try {
      initial = window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      initial = false;
    }
    setEnabled(initial);
    apply(initial);
    setHydrated(true);
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      apply(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* storage indisponível — modo continua válido na sessão */
      }
      return next;
    });
  }, []);

  return { enabled, hydrated, toggle };
}
