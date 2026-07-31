import { useEffect, useRef } from "react";

/**
 * Atalhos de teclado do painel do cliente.
 *
 * Formato da combinação: `"alt+b"`, `"alt+shift+1"`, `"escape"`, `"/"`.
 * Regras:
 *  • combinações sem modificador (ex.: `"/"`) são ignoradas enquanto o foco
 *    estiver em campos editáveis, para não atrapalhar a digitação;
 *  • `Escape` sempre dispara (é o gesto universal de "fechar/limpar");
 *  • os handlers ficam em ref, então o listener não é recriado a cada render.
 */
export type HotkeyMap = Record<string, (event: KeyboardEvent) => void>;

const isEditable = (el: EventTarget | null) => {
  const node = el as HTMLElement | null;
  if (!node || !node.tagName) return false;
  const tag = node.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    node.isContentEditable === true
  );
};

const comboOf = (e: KeyboardEvent) => {
  const parts: string[] = [];
  if (e.ctrlKey) parts.push("ctrl");
  if (e.metaKey) parts.push("meta");
  if (e.altKey) parts.push("alt");
  if (e.shiftKey) parts.push("shift");
  parts.push(e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase());
  return parts.join("+");
};

export function useHotkeys(map: HotkeyMap, enabled = true) {
  const ref = useRef(map);
  ref.current = map;

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const combo = comboOf(e);
      const handler = ref.current[combo];
      if (!handler) return;
      const bare = !e.altKey && !e.ctrlKey && !e.metaKey;
      if (bare && e.key !== "Escape" && isEditable(e.target)) return;
      e.preventDefault();
      handler(e);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}

/** Rótulo legível de um atalho, para tooltips e legendas. */
export function hotkeyLabel(combo: string) {
  return combo
    .split("+")
    .map((p) =>
      p === "alt"
        ? "Alt"
        : p === "shift"
          ? "Shift"
          : p === "ctrl"
            ? "Ctrl"
            : p === "escape"
              ? "Esc"
              : p.toUpperCase(),
    )
    .join(" + ");
}
