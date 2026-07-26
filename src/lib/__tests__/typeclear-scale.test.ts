import { describe, expect, it } from "vitest";
import {
  MIN_ANY_PX,
  MIN_READABLE_PX,
  READABLE_TOKENS,
  fluid,
  minFontPx,
  tc,
  type TcToken,
} from "../typeclear";

const tokens = Object.keys(tc) as TcToken[];

describe("TypeClear — escala responsiva", () => {
  it("todo token usa clamp() fluido", () => {
    for (const t of tokens) {
      expect(tc[t], t).toMatch(/text-\[calc\(clamp\([^\]]+\)\]/);
    }
  });

  it("todo token respeita a variável de escala do modo de leitura", () => {
    for (const t of tokens) {
      expect(tc[t], t).toContain("var(--tc-scale,1)");
    }
  });


  it("nenhum token fica abaixo do piso absoluto", () => {
    for (const t of tokens) {
      expect(minFontPx(t), t).not.toBeNull();
      expect(minFontPx(t)!, t).toBeGreaterThanOrEqual(MIN_ANY_PX);
    }
  });

  it("tokens de leitura respeitam o piso de legibilidade", () => {
    for (const t of READABLE_TOKENS) {
      expect(minFontPx(t)!, t).toBeGreaterThanOrEqual(MIN_READABLE_PX);
    }
  });

  it("o máximo é sempre maior que o mínimo (escala cresce)", () => {
    for (const t of tokens) {
      const m = tc[t].match(/clamp\((\d+(?:\.\d+)?)px,[^,]+,(\d+(?:\.\d+)?)px\)/);
      expect(m, t).not.toBeNull();
      expect(Number(m![2]), t).toBeGreaterThan(Number(m![1]));
    }
  });

  it("nenhum token embute espaçamento (padding/margin/gap)", () => {
    for (const t of tokens) {
      expect(tc[t], t).not.toMatch(/(^|\s)(p|m|gap|space)[xytrbl]?-/);
    }
  });

  it("fluid() interpola corretamente entre as âncoras", () => {
    const cls = fluid(12, 16, 380, 1280);
    const m = cls.match(/clamp\(12px,(.+)px_\+_(.+)vw,16px\)/);
    expect(m).not.toBeNull();
    const base = Number(m![1]);
    const vw = Number(m![2]);
    const at = (w: number) => base + (vw / 100) * w;
    expect(at(380)).toBeCloseTo(12, 2);
    expect(at(1280)).toBeCloseTo(16, 2);
  });
});
