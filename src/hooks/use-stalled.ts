import { useEffect, useState } from "react";

/**
 * Retorna `true` quando um carregamento passa do tempo esperado.
 * Usado para transformar spinners infinitos em um aviso claro com
 * botão de "Tentar novamente".
 */
export function useStalled(active: boolean, delayMs = 6000) {
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    if (!active) {
      setStalled(false);
      return;
    }
    const t = window.setTimeout(() => setStalled(true), delayMs);
    return () => window.clearTimeout(t);
  }, [active, delayMs]);

  return stalled;
}
