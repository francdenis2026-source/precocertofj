/**
 * Controlador de rolagem horizontal do trilho de categorias.
 *
 * Isolado do React para permitir testes de rolagem por botão, arraste,
 * roda do mouse e teclado — inclusive após redimensionamento da tela.
 */

export type RailState = { canPrev: boolean; canNext: boolean };

export type RailController = {
  /** Recalcula se há conteúdo oculto à esquerda/direita. */
  sync: () => RailState;
  /** Rola uma "página" do trilho (usado pelos botões de seta). */
  scrollByPage: (dir: -1 | 1) => void;
  /** Move o foco entre os itens; devolve true quando tratou a tecla. */
  handleKey: (key: string) => boolean;
  /** Centraliza o item ativo (aria-current="page"). */
  centerActive: (behavior?: ScrollBehavior) => void;
  destroy: () => void;
};

const ITEM_SELECTOR = "[data-rail-item]";
const EDGE = 4;

export function createRailController(
  el: HTMLElement,
  onState: (s: RailState) => void,
): RailController {
  const items = () => Array.from(el.querySelectorAll<HTMLElement>(ITEM_SELECTOR));

  const sync = (): RailState => {
    const state: RailState = {
      canPrev: el.scrollLeft > EDGE,
      canNext: el.scrollLeft + el.clientWidth < el.scrollWidth - EDGE,
    };
    onState(state);
    return state;
  };

  const scrollByPage = (dir: -1 | 1) => {
    const step = Math.max(180, Math.round(el.clientWidth * 0.7));
    if (typeof el.scrollBy === "function") {
      el.scrollBy({ left: dir * step, behavior: "smooth" });
    }
    // jsdom (e navegadores sem smooth) não movem scrollLeft sozinhos.
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    el.scrollLeft = Math.min(max, Math.max(0, el.scrollLeft + dir * step));
    sync();
  };

  const centerActive = (behavior: ScrollBehavior = "auto") => {
    const active = el.querySelector<HTMLElement>('[aria-current="page"]');
    active?.scrollIntoView?.({ inline: "center", block: "nearest", behavior });
  };

  const handleKey = (key: string) => {
    const list = items();
    if (list.length === 0) return false;
    const idx = list.findIndex((n) => n === el.ownerDocument.activeElement);
    let next: number;
    if (key === "ArrowRight") next = idx < 0 ? 0 : Math.min(list.length - 1, idx + 1);
    else if (key === "ArrowLeft") next = idx < 0 ? 0 : Math.max(0, idx - 1);
    else if (key === "Home") next = 0;
    else if (key === "End") next = list.length - 1;
    else return false;

    const target = list[next];
    target?.focus?.();
    target?.scrollIntoView?.({ inline: "center", block: "nearest", behavior: "smooth" });
    sync();
    return true;
  };

  // --- roda do mouse (vertical -> horizontal) ---
  const onWheel = (e: WheelEvent) => {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const before = el.scrollLeft;
    el.scrollLeft = Math.min(max, Math.max(0, before + e.deltaY));
    if (el.scrollLeft !== before) e.preventDefault();
    sync();
  };

  // --- arraste com o mouse ---
  let down = false;
  let moved = false;
  let startX = 0;
  let startScroll = 0;

  const onDown = (e: PointerEvent) => {
    if (e.pointerType === "touch" || e.button !== 0) return;
    down = true;
    moved = false;
    startX = e.clientX;
    startScroll = el.scrollLeft;
  };
  const onMove = (e: PointerEvent) => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (!moved && Math.abs(dx) < 4) return;
    moved = true;
    el.style.cursor = "grabbing";
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    el.scrollLeft = Math.min(max, Math.max(0, startScroll - dx));
    sync();
  };
  const onUp = () => {
    if (!down) return;
    down = false;
    el.style.cursor = "";
    if (moved) {
      const block = (ev: Event) => ev.preventDefault();
      el.addEventListener("click", block, { capture: true, once: true });
      setTimeout(() => el.removeEventListener("click", block, true), 0);
    }
    moved = false;
  };

  const onScroll = () => sync();

  el.addEventListener("wheel", onWheel, { passive: false });
  el.addEventListener("pointerdown", onDown);
  el.addEventListener("scroll", onScroll);
  const win = el.ownerDocument.defaultView;
  win?.addEventListener("pointermove", onMove);
  win?.addEventListener("pointerup", onUp);
  win?.addEventListener("resize", sync);

  let ro: ResizeObserver | undefined;
  if (typeof ResizeObserver !== "undefined") {
    ro = new ResizeObserver(() => sync());
    ro.observe(el);
    const inner = el.firstElementChild;
    if (inner) ro.observe(inner);
  }

  sync();

  return {
    sync,
    scrollByPage,
    handleKey,
    centerActive,
    destroy() {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("scroll", onScroll);
      win?.removeEventListener("pointermove", onMove);
      win?.removeEventListener("pointerup", onUp);
      win?.removeEventListener("resize", sync);
      ro?.disconnect();
    },
  };
}
