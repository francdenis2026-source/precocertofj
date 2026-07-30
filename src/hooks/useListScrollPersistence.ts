import { useCallback, useEffect, useRef } from "react";

/**
 * Persiste (e restaura) a posição de rolagem interna de um trilho de lista.
 *
 * Por que sessionStorage: a posição é relevante apenas dentro da sessão de
 * navegação atual — não deve vazar entre abas nem sobreviver ao fechamento do
 * navegador. Falhas de acesso (modo privado, storage bloqueado) são engolidas
 * de propósito: persistência de scroll nunca pode quebrar a página.
 */
export function useListScrollPersistence<T extends HTMLElement>(
  ref: React.MutableRefObject<T | null>,
  /** Chave estável por lista/rota. */
  storageKey: string,
  /** Só restaura quando os itens já estiverem no DOM. */
  ready: boolean,
) {
  const restoredRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const read = useCallback((): number | null => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return null;
      const value = Number(raw);
      return Number.isFinite(value) && value >= 0 ? value : null;
    } catch {
      return null;
    }
  }, [storageKey]);

  // Restauração única, após a primeira renderização com conteúdo.
  useEffect(() => {
    if (!ready || restoredRef.current) return;
    const el = ref.current;
    if (!el) return;
    const saved = read();
    restoredRef.current = true;
    if (saved == null || saved === 0) return;
    // Dois frames: garante que a altura do conteúdo já esteja calculada.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (ref.current) ref.current.scrollTop = saved;
      });
    });
  }, [ready, ref, read]);

  // Grava com throttle por animation frame (evita escrita a cada evento).
  const persistScroll = useCallback(
    (el: HTMLElement) => {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        try {
          sessionStorage.setItem(storageKey, String(Math.round(el.scrollTop)));
        } catch {
          /* storage indisponível — ignorar */
        }
      });
    },
    [storageKey],
  );

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  return { persistScroll };
}
