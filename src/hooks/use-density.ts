import { useCallback, useEffect, useState } from "react";

export type Density = "comfortable" | "compact";

const STORAGE_KEY = "pc:density";

function isDensity(v: unknown): v is Density {
  return v === "comfortable" || v === "compact";
}

function apply(mode: Density) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.density = mode;
}

/**
 * Densidade da área do cliente (Confortável / Compacta).
 *
 * Só troca as variáveis de espaçamento (`--pc-gap`, `--pc-pad-*`,
 * `--pc-panel-min`) consumidas pelas utilities `.pc-*` em `styles.css`.
 * A tipografia (TypeClear) não muda, então a hierarquia visual e a
 * legibilidade permanecem iguais nos dois modos.
 */
export function useDensity() {
  const [density, setDensity] = useState<Density>("comfortable");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let initial: Density = "comfortable";
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (isDensity(raw)) initial = raw;
    } catch {
      /* storage indisponível */
    }
    setDensity(initial);
    apply(initial);
    setHydrated(true);
  }, []);

  const change = useCallback((next: Density) => {
    setDensity(next);
    apply(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage indisponível — vale para a sessão */
    }
  }, []);

  const toggle = useCallback(() => {
    change(density === "compact" ? "comfortable" : "compact");
  }, [density, change]);

  return { density, hydrated, setDensity: change, toggle };
}
