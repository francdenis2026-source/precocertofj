import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

/**
 * Guardas estáticas do contrato "uma única tela" da página /planos.
 * O E2E real (todas as viewports e rotações) vive em
 * `scripts/planos_viewport_e2e.py`; aqui evitamos regressões de estrutura.
 */
describe("/planos — layout de uma única tela", () => {
  const src = read("src/routes/planos.tsx");
  const css = read("src/styles.css");

  it("mantém o shell travado na viewport, sem rolagem da página", () => {
    expect(src).toContain("data-planos-shell");
    expect(src).toContain("h-[calc(100svh-64px)]");
    expect(src).toContain("md:h-[100svh]");
    expect(src).toContain("overflow-hidden");
  });

  it("mantém a barra de ação em fluxo e identificável pelo E2E", () => {
    expect(src).toContain('data-testid="planos-cta-bar"');
    // a barra não pode ser fixed/absolute (evita clipping e sobreposição)
    expect(src).not.toMatch(/data-testid="planos-cta-bar"[\s\S]{0,220}(fixed|absolute)/);
  });

  it("rola apenas dentro do painel de detalhes", () => {
    expect(src).toMatch(/id="detalhes"[\s\S]{0,400}min-h-0/);
    expect(src).toContain("pc-rail");
  });

  it("marca os cartões para a densificação em telas baixas", () => {
    expect(src).toContain("data-planos-card");
    expect(css).toContain("@media (max-height: 540px)");
    expect(css).toContain("@media (max-height: 440px)");
  });
});

describe("interação profissional (hover, foco e toque)", () => {
  const css = read("src/styles.css");

  it("aplica elevação e parallax no hover apenas em ponteiros finos", () => {
    expect(css).toContain("@media (hover: hover) and (pointer: fine)");
    expect(css).toMatch(/translateY\(-1\.5px\) scale\(1\.02\)/);
  });

  it("tem paridade de foco por teclado", () => {
    expect(css).toMatch(/\[data-clickable\]\s*\n?\):focus-visible/);
  });

  it("tem feedback de toque em dispositivos sem hover", () => {
    expect(css).toContain("@media (hover: none)");
    expect(css).toContain("-webkit-tap-highlight-color: transparent");
  });

  it("respeita prefers-reduced-motion", () => {
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});

describe("contato do desenvolvedor", () => {
  const priv = read("src/routes/privacidade.tsx");

  it("usa o DDD 68", () => {
    expect(priv).toContain("(68) 99203-1340");
    expect(priv).toContain("wa.me/5568992031340");
    expect(priv).not.toContain("5588992031340");
  });
});
