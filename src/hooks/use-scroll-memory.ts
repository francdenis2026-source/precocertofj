import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

/**
 * Memória de rolagem por chave.
 *
 * Guarda o `scrollTop` do contêiner para cada chave (ex.: aba + página) e o
 * restaura ao voltar para a mesma chave — inclusive depois de trocar de rota
 * ou recarregar a página, quando `storageKey` é informado (sessionStorage).
 */
export function useScrollMemory<T extends HTMLElement>(key: string, storageKey?: string) {
  const nodeRef = useRef<T | null>(null);
  const mapRef = useRef<Map<string, number>>(new Map());
  const keyRef = useRef(key);
  const loaded = useRef(false);
  const frame = useRef<number | null>(null);

  // Hidrata a memória persistida uma única vez (client-only).
  if (!loaded.current && typeof window !== "undefined") {
    loaded.current = true;
    if (storageKey) {
      try {
        const raw = window.sessionStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, number>;
          for (const [k, v] of Object.entries(parsed)) {
            if (typeof v === "number" && Number.isFinite(v)) mapRef.current.set(k, v);
          }
        }
      } catch {
        /* memória de rolagem é best-effort */
      }
    }
  }

  const persist = useCallback(() => {
    if (!storageKey || typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(
        storageKey,
        JSON.stringify(Object.fromEntries(mapRef.current)),
      );
    } catch {
      /* quota/privacidade: ignora */
    }
  }, [storageKey]);

  const attach = useCallback((node: T | null) => {
    nodeRef.current = node;
  }, []);

  // Registra a posição enquanto o usuário rola.
  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;
    const onScroll = () => {
      if (frame.current != null) return;
      frame.current = window.requestAnimationFrame(() => {
        frame.current = null;
        mapRef.current.set(keyRef.current, node.scrollTop);
      });
    };
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      node.removeEventListener("scroll", onScroll);
      if (frame.current != null) window.cancelAnimationFrame(frame.current);
      frame.current = null;
      mapRef.current.set(keyRef.current, node.scrollTop);
      persist();
    };
  }, [persist]);

  // Restaura ao trocar de chave (aba/página) e guarda a posição anterior.
  useLayoutEffect(() => {
    const node = nodeRef.current;
    const prev = keyRef.current;
    if (node && prev !== key) mapRef.current.set(prev, node.scrollTop);
    keyRef.current = key;
    if (!node) return;
    const target = mapRef.current.get(key) ?? 0;
    node.scrollTop = target;
    // Reaplica após o layout das linhas virtualizadas assentar.
    const raf = window.requestAnimationFrame(() => {
      if (nodeRef.current) nodeRef.current.scrollTop = target;
    });
    persist();
    return () => window.cancelAnimationFrame(raf);
  }, [key, persist]);

  return { setRef: attach };
}
