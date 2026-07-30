import { describe, it, expect } from "vitest";
import { classifyCategory } from "@/lib/product-category";
import { CATEGORY_DEFS } from "@/lib/category-hub";
describe("regressão: \"pasta\" ambíguo", () => {
  it("sabão em pasta é limpeza, não bazar", () => {
    expect(classifyCategory("Sabão em Pasta Assolan 500ml")).toBe("limpeza");
  });
  it("nicho papelaria não captura produtos \"em pasta\"", () => {
    const p = CATEGORY_DEFS.find(c=>c.slug==="papelaria")!.productRe!;
    for (const n of ["sabao em pasta assolan 500ml","doce de leite c coco em pasta nero 400g"]) expect(p.test(n)).toBe(false);
    for (const n of ["caderno capa dura 96f","pasta polionda oficio"]) expect(p.test(n)).toBe(true);
  });
});
