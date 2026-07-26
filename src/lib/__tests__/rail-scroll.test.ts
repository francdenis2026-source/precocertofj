import { describe, expect, it, beforeEach, vi } from "vitest";
import { createRailController, type RailState } from "@/lib/rail-scroll";

/** Cria um trilho fake com métricas de layout controláveis (jsdom não faz layout). */
function makeRail(clientWidth: number, scrollWidth: number, items = 12) {
  const el = document.createElement("div");
  const ul = document.createElement("ul");
  for (let i = 0; i < items; i++) {
    const a = document.createElement("a");
    a.setAttribute("data-rail-item", "");
    a.href = "#";
    if (i === 3) a.setAttribute("aria-current", "page");
    a.scrollIntoView = vi.fn();
    ul.appendChild(a);
  }
  el.appendChild(ul);
  document.body.appendChild(el);

  let cw = clientWidth;
  let sw = scrollWidth;
  Object.defineProperty(el, "clientWidth", { get: () => cw, configurable: true });
  Object.defineProperty(el, "scrollWidth", { get: () => sw, configurable: true });
  el.scrollBy = vi.fn();

  return {
    el,
    resize(nextClient: number, nextScroll = sw) {
      cw = nextClient;
      sw = nextScroll;
      window.dispatchEvent(new Event("resize"));
    },
  };
}

function drag(el: HTMLElement, from: number, to: number) {
  el.dispatchEvent(
    new PointerEvent("pointerdown", { clientX: from, button: 0, bubbles: true }),
  );
  window.dispatchEvent(new PointerEvent("pointermove", { clientX: to, bubbles: true }));
  window.dispatchEvent(new PointerEvent("pointerup", { clientX: to, bubbles: true }));
}

describe("trilho de categorias", () => {
  let state: RailState;
  beforeEach(() => {
    document.body.innerHTML = "";
    state = { canPrev: false, canNext: false };
  });

  it("detecta bordas e evita recorte em telas estreitas e largas", () => {
    const rail = makeRail(320, 1200);
    const c = createRailController(rail.el, (s) => (state = s));

    expect(state).toEqual({ canPrev: false, canNext: true });

    // tela larga o suficiente: nada oculto, setas somem
    rail.resize(1200);
    expect(state).toEqual({ canPrev: false, canNext: false });

    // volta ao mobile: seta direita reaparece
    rail.resize(360);
    expect(state.canNext).toBe(true);
    c.destroy();
  });

  it("rola por botão respeitando os limites após redimensionar", () => {
    const rail = makeRail(300, 1200);
    const c = createRailController(rail.el, (s) => (state = s));

    c.scrollByPage(1);
    expect(rail.el.scrollLeft).toBe(210); // 70% de 300
    expect(state.canPrev).toBe(true);

    rail.resize(600);
    c.scrollByPage(1);
    expect(rail.el.scrollLeft).toBe(600); // 210 + 420

    // não passa do fim
    c.scrollByPage(1);
    c.scrollByPage(1);
    expect(rail.el.scrollLeft).toBe(600);
    expect(state.canNext).toBe(false);

    // volta ao início sem valores negativos
    c.scrollByPage(-1);
    c.scrollByPage(-1);
    c.scrollByPage(-1);
    expect(rail.el.scrollLeft).toBe(0);
    expect(state.canPrev).toBe(false);
    c.destroy();
  });

  it("rola por arraste do mouse, inclusive após redimensionar", () => {
    const rail = makeRail(400, 1000);
    const c = createRailController(rail.el, (s) => (state = s));

    drag(rail.el, 500, 300);
    expect(rail.el.scrollLeft).toBe(200);

    rail.resize(900);
    drag(rail.el, 500, 200);
    expect(rail.el.scrollLeft).toBe(100); // limitado a scrollWidth - clientWidth
    c.destroy();
  });

  it("navega pelo teclado movendo o foco entre as categorias", () => {
    const rail = makeRail(320, 1200);
    const c = createRailController(rail.el, (s) => (state = s));
    const items = Array.from(rail.el.querySelectorAll<HTMLElement>("[data-rail-item]"));

    expect(c.handleKey("ArrowRight")).toBe(true);
    expect(document.activeElement).toBe(items[0]);

    c.handleKey("ArrowRight");
    expect(document.activeElement).toBe(items[1]);

    c.handleKey("ArrowLeft");
    expect(document.activeElement).toBe(items[0]);

    c.handleKey("End");
    expect(document.activeElement).toBe(items[items.length - 1]);

    rail.resize(360);
    c.handleKey("Home");
    expect(document.activeElement).toBe(items[0]);

    expect(c.handleKey("Tab")).toBe(false);
    c.destroy();
  });

  it("centraliza a categoria ativa", () => {
    const rail = makeRail(320, 1200);
    const c = createRailController(rail.el, (s) => (state = s));
    const active = rail.el.querySelector<HTMLElement>('[aria-current="page"]')!;
    c.centerActive();
    expect(active.scrollIntoView).toHaveBeenCalled();
    c.destroy();
  });
});
