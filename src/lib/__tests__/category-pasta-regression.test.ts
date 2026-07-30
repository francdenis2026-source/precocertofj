import { describe, it, expect } from "vitest";
import { classifyCategory } from "@/lib/product-category";
import { CATEGORY_DEFS } from "@/lib/category-hub";
import { categoryBySlug, productInCategory } from "@/lib/category-hub";
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

describe("nichos: construção e hortifrúti não misturam produtos", () => {
  const construcao = categoryBySlug("construcao")!;
  const hortifruti = categoryBySlug("hortifruti")!;

  it("não coloca itens de mercado em Construção", () => {
    for (const name of [
      "Macarrão Parafuso Miragina 500g",
      "Tinta Nugget Preta",
      "Lâmpada LED 9W",
      "Areia Refinada Açúcar",
    ]) {
      expect(productInCategory(construcao, { name, unit: null }, false)).toBe(false);
    }
  });

  it("mantém material de obra real em Construção", () => {
    expect(
      productInCategory(construcao, { name: "Cimento CP II 50kg", unit: "sc" }, false),
    ).toBe(true);
  });

  it("não coloca aromas/temperos em Hortifrúti", () => {
    for (const name of [
      "Lava-Louças Minuano Maçã 500ml",
      "Tempero Alho e Sal Sazon 300g",
      "Molho de Tomate Quero 340g",
      "Suco de Uva Dafruta 1L",
    ]) {
      expect(productInCategory(hortifruti, { name, unit: null }, false)).toBe(false);
    }
  });

  it("mantém hortifrúti real", () => {
    for (const name of ["Banana Prata kg", "Tomate kg", "Ovos brancos 30un"]) {
      expect(productInCategory(hortifruti, { name, unit: "kg" }, false)).toBe(true);
    }
  });
});
