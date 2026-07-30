import { describe, it, expect } from "vitest";
import { classifyCategory } from "@/lib/product-category";
import { CATEGORY_DEFS } from "@/lib/category-hub";
describe("x", () => {
  it("sabao", () => {
    expect(classifyCategory("Sabão em Pasta Assolan 500ml")).toBe("limpeza");
  });
  it("hub", () => {
    const p = CATEGORY_DEFS.find(c=>c.slug==="papelaria")!.productRe!;
    for (const n of ["sabao em pasta assolan 500ml","doce de leite c coco em pasta nero 400g"]) expect(p.test(n)).toBe(false);
    for (const n of ["caderno capa dura 96f","pasta polionda oficio"]) expect(p.test(n)).toBe(true);
  });
});
