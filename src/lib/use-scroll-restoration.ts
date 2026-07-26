import { useEffect, useRef } from "react";

const PREFIX = "pc-scroll:";

function entryKey() {
  if (typeof window === "undefined") return "";
  const state = window.history.state as { key?: string; __TSR_key?: string } | null;
  const id = state?.key ?? state?.__TSR_key ?? "";
  return `${PREFIX}${id}|${window.location.pathname}${window.location.search}`;
}

/**
 * Salva e restaura a posição de rolagem por entrada do histórico, para que
 * voltar/avançar do navegador reabra a página exatamente onde o usuário estava.
 *
 * @param ready só restaura depois que o conteúdo da página estiver renderizado.
 */
export function useScrollRestoration(ready: boolean) {
  const restored = useRef("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        try {
          window.sessionStorage.setItem(entryKey(), String(window.scrollY));
        } catch {
          /* storage indisponível */
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (!ready || typeof window === "undefined") return;
    const key = entryKey();
    if (restored.current === key) return;
    restored.current = key;
    let saved: string | null = null;
    try {
      saved = window.sessionStorage.getItem(key);
    } catch {
      saved = null;
    }
    if (saved == null) return;
    const y = Number(saved);
    if (!Number.isFinite(y) || y <= 0) return;
    const id = window.requestAnimationFrame(() => window.scrollTo({ top: y }));
    return () => window.cancelAnimationFrame(id);
  }, [ready]);
}
