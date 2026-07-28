import { describe, it, expect } from "vitest";
import {
  isValidTab,
  validateTabSearch,
  tabLabel,
} from "@/components/admin/adminTabs.utils";

const TABS = [
  { key: "a" as const, label: "Aba A" },
  { key: "b" as const, label: "Aba B" },
  { key: "c" as const, label: "Aba C" },
];

describe("adminTabs.utils — validação e fallback de ?tab=", () => {
  it("aceita chave existente", () => {
    expect(isValidTab("a", TABS)).toBe(true);
    expect(validateTabSearch({ tab: "b" }, TABS, "a")).toEqual({ tab: "b" });
  });

  it("cai no fallback quando ?tab= é inexistente", () => {
    expect(validateTabSearch({ tab: "zzz" }, TABS, "a")).toEqual({ tab: "a" });
  });

  it("cai no fallback quando ?tab= está ausente", () => {
    expect(validateTabSearch({}, TABS, "b")).toEqual({ tab: "b" });
  });

  it("cai no fallback com tipos inesperados", () => {
    expect(validateTabSearch({ tab: 42 }, TABS, "c")).toEqual({ tab: "c" });
    expect(validateTabSearch({ tab: null }, TABS, "c")).toEqual({ tab: "c" });
    expect(validateTabSearch({ tab: undefined }, TABS, "c")).toEqual({ tab: "c" });
  });

  it("nunca retorna aba fora do conjunto declarado", () => {
    for (const raw of ["", " ", "A", "A/B", "../x", "1"]) {
      const { tab } = validateTabSearch({ tab: raw }, TABS, "a");
      expect(TABS.map((t) => t.key)).toContain(tab);
    }
  });

  it("tabLabel devolve o rótulo humanizado", () => {
    expect(tabLabel(TABS, "b")).toBe("Aba B");
  });
});
