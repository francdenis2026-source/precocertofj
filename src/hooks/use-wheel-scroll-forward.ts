import { useEffect, useRef } from "react";

/**
 * Encaminha a rolagem do mouse para o painel rolável mais próximo.
 *
 * O painel do cliente usa "janela única": a página não rola e apenas os corpos
 * internos (`.pc-panel-body`) têm barra de rolagem. Quando o ponteiro estava
 * sobre um cabeçalho, uma borda, um gráfico ou um card sem rolagem própria, o
 * evento `wheel` não encontrava nenhum contêiner rolável e a tela parecia
 * travada. Aqui interceptamos esse caso e aplicamos o delta no painel rolável
 * mais próximo (ancestral ou, na falta dele, o painel visível sob o cursor).
 *
 * Custo: o handler roda a cada evento de roda (dezenas por segundo), então
 * evitamos `getComputedStyle` em massa. Usamos apenas medidas geométricas
 * (baratas) e agendamos a aplicação do delta em `requestAnimationFrame`, para
 * não bloquear a thread principal — era essa varredura cara que fazia a
 * interface "travar" ao rolar sobre a barra lateral.
 */
const SCROLLER = ".pc-panel-body, [data-wheel-scroller]";
/** Regiões que cuidam da própria rolagem — não encaminhamos nada nelas. */
const SELF_MANAGED = "[data-sidebar], [data-radix-scroll-area-viewport], [role='dialog']";

/** Barato: só geometria. Elementos com overflow visível não "sobram" altura. */
function canScrollVertically(el: HTMLElement) {
  return el.scrollHeight - el.clientHeight > 1;
}

/** Sobe pela árvore procurando algo que realmente possa rolar. */
function nearestScrollable(start: Element | null, root: HTMLElement) {
  let node: Element | null = start;
  while (node && node !== root.parentElement) {
    if (node instanceof HTMLElement && canScrollVertically(node)) {
      const oy = node.style.overflowY || "";
      // Só consultamos o estilo computado do candidato (1 chamada), não de
      // todos os ancestrais, e apenas quando ele tem altura excedente.
      const computed = oy || getComputedStyle(node).overflowY;
      if (computed === "auto" || computed === "scroll") return node;
    }
    node = node.parentElement;
  }
  return null;
}

/** Painel rolável cuja coluna está sob o cursor (fallback do fallback). */
function scrollerUnderPointer(root: HTMLElement, x: number) {
  const candidates = Array.from(root.querySelectorAll<HTMLElement>(SCROLLER)).filter(
    canScrollVertically,
  );
  if (!candidates.length) return null;
  const column = candidates.find((el) => {
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right;
  });
  return column ?? candidates[0] ?? null;
}

export function useWheelScrollForward<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    let pending = 0;
    let frame = 0;
    let target: HTMLElement | null = null;

    const flush = () => {
      frame = 0;
      const scroller = target;
      const dy = pending;
      pending = 0;
      target = null;
      if (!scroller || !dy) return;
      const max = scroller.scrollHeight - scroller.clientHeight;
      scroller.scrollTop = Math.max(0, Math.min(max, scroller.scrollTop + dy));
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.defaultPrevented) return;
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      if (!dy) return;

      const el = e.target instanceof Element ? e.target : null;
      // Áreas que gerenciam a própria rolagem (barra lateral, diálogos) ficam
      // inteiramente a cargo do navegador.
      if (el?.closest(SELF_MANAGED)) return;
      // Já existe um contêiner rolável no caminho? Deixa o navegador cuidar.
      if (nearestScrollable(el, root)) return;

      const scroller = scrollerUnderPointer(root, e.clientX);
      if (!scroller) return;

      const max = scroller.scrollHeight - scroller.clientHeight;
      const next = Math.max(0, Math.min(max, scroller.scrollTop + dy));
      if (next === scroller.scrollTop) return;

      e.preventDefault();
      target = scroller;
      pending += dy;
      if (!frame) frame = requestAnimationFrame(flush);
    };

    root.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      root.removeEventListener("wheel", onWheel);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return ref;
}
