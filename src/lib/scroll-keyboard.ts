/**
 * Acessibilidade de rolagem — navegação completa por teclado.
 *
 * Varre o documento em busca de regiões que realmente rolam (overflow auto/scroll
 * com conteúdo excedente) e as torna operáveis por teclado:
 *  • foco por Tab (tabindex=0) + anel de foco visível (ver `[data-scrollable]` em styles.css);
 *  • ArrowUp/ArrowDown/ArrowLeft/ArrowRight — passo curto;
 *  • PageUp/PageDown/Space/Shift+Space — página (~90% do viewport da região);
 *  • Home/End — início e fim do eixo rolável.
 *
 * Regras:
 *  • não interfere quando o foco está dentro de um campo editável;
 *  • não duplica papéis: elementos já rotulados/interativos mantêm seus atributos;
 *  • respeita `prefers-reduced-motion` (rola sem animação).
 */

const ENHANCED = "data-scrollable";
const STEP = 64;

type Axis = "x" | "y" | "both";

function isEditable(el: Element | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

function scrollableAxis(el: HTMLElement): Axis | null {
  const cs = window.getComputedStyle(el);
  const scrollableY =
    /(auto|scroll|overlay)/.test(cs.overflowY) && el.scrollHeight - el.clientHeight > 8;
  const scrollableX =
    /(auto|scroll|overlay)/.test(cs.overflowX) && el.scrollWidth - el.clientWidth > 8;
  if (scrollableY && scrollableX) return "both";
  if (scrollableY) return "y";
  if (scrollableX) return "x";
  return null;
}

function behavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

/** Trata a tecla para a região rolável. Retorna true quando consumiu o evento. */
export function handleScrollKey(el: HTMLElement, e: KeyboardEvent): boolean {
  const axis = scrollableAxis(el);
  if (!axis) return false;

  const vertical = axis === "y" || axis === "both";
  const horizontal = axis === "x" || axis === "both";
  const pageY = Math.max(el.clientHeight * 0.9, STEP);
  const pageX = Math.max(el.clientWidth * 0.9, STEP);
  let dx = 0;
  let dy = 0;
  let absolute: { top?: number; left?: number } | null = null;

  switch (e.key) {
    case "ArrowDown":
      if (!vertical) return false;
      dy = STEP;
      break;
    case "ArrowUp":
      if (!vertical) return false;
      dy = -STEP;
      break;
    case "ArrowRight":
      if (!horizontal) return false;
      dx = STEP;
      break;
    case "ArrowLeft":
      if (!horizontal) return false;
      dx = -STEP;
      break;
    case "PageDown":
      if (vertical) dy = pageY;
      else dx = pageX;
      break;
    case "PageUp":
      if (vertical) dy = -pageY;
      else dx = -pageX;
      break;
    case " ":
    case "Spacebar":
      if (vertical) dy = e.shiftKey ? -pageY : pageY;
      else dx = e.shiftKey ? -pageX : pageX;
      break;
    case "Home":
      absolute = vertical ? { top: 0 } : { left: 0 };
      break;
    case "End":
      absolute = vertical
        ? { top: el.scrollHeight }
        : { left: el.scrollWidth };
      break;
    default:
      return false;
  }

  if (absolute) {
    el.scrollTo({ ...absolute, behavior: behavior() });
  } else {
    el.scrollBy({ top: dy, left: dx, behavior: behavior() });
  }
  return true;
}

function enhance(el: HTMLElement) {
  if (el.hasAttribute(ENHANCED)) return;
  if (!scrollableAxis(el)) return;
  // Não sequestra elementos que já são controles interativos por si só.
  const tag = el.tagName;
  if (tag === "BUTTON" || tag === "A" || tag === "TEXTAREA" || tag === "SELECT") return;

  el.setAttribute(ENHANCED, "");
  if (!el.hasAttribute("tabindex")) el.tabIndex = 0;
  if (!el.hasAttribute("role") && !el.hasAttribute("aria-hidden")) {
    el.setAttribute("role", "region");
  }
  if (!el.hasAttribute("aria-label") && !el.hasAttribute("aria-labelledby")) {
    el.setAttribute("aria-label", "Área rolável");
  }
}

function unenhanceIfStatic(el: HTMLElement) {
  if (!el.hasAttribute(ENHANCED)) return;
  if (scrollableAxis(el)) return;
  el.removeAttribute(ENHANCED);
  if (el.getAttribute("aria-label") === "Área rolável") el.removeAttribute("aria-label");
  if (el.getAttribute("role") === "region") el.removeAttribute("role");
  el.removeAttribute("tabindex");
}

function scan(root: ParentNode = document) {
  const nodes = root.querySelectorAll<HTMLElement>(
    '[class*="overflow-"], [class*="scroll-"], [style*="overflow"], [data-scrollable]',
  );
  nodes.forEach((el) => {
    if (el.hasAttribute(ENHANCED)) unenhanceIfStatic(el);
    else enhance(el);
  });
}

/** Instala o realçador global. Retorna a função de limpeza. */
export function setupScrollKeyboard(): () => void {
  if (typeof window === "undefined") return () => {};

  const onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target || isEditable(target)) return;
    const region = target.closest<HTMLElement>(`[${ENHANCED}]`);
    if (!region) return;
    // Só age quando a própria região (ou um filho não rolável) tem o foco.
    if (document.activeElement !== region && !region.contains(document.activeElement)) return;
    if (handleScrollKey(region, e)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const idle: typeof window.requestIdleCallback | undefined = window.requestIdleCallback?.bind(window);
  let raf = 0;
  const schedule = () => {
    if (raf) return;
    raf = window.setTimeout(() => {
      raf = 0;
      if (idle) idle(() => scan(), { timeout: 500 });
      else scan();
    }, 180);
  };

  schedule();
  document.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("resize", schedule, { passive: true });

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
    document.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("resize", schedule);
    if (raf) window.clearTimeout(raf);
  };
}
