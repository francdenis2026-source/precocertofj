import { describe, it, expect } from "vitest";
import { parseProductSize, computeUnitPrice } from "@/lib/unit-price";

describe("parseProductSize", () => {
  it("detecta gramas simples", () => {
    const p = parseProductSize("Biscoito Cream Cracker 200g");
    expect(p).toMatchObject({ packCount: 1, unitSize: 200, unitSizeUnit: "g", baseUnit: "kg" });
  });

  it("converte kg → g", () => {
    const p = parseProductSize("Arroz Tio João 5kg");
    expect(p).toMatchObject({ unitSize: 5000, unitSizeUnit: "g", totalSize: 5000, baseUnit: "kg" });
  });

  it("converte L → ml", () => {
    const p = parseProductSize("Refrigerante Cola 2L");
    expect(p).toMatchObject({ unitSize: 2000, unitSizeUnit: "ml", baseUnit: "L" });
  });

  it("detecta multipack Nxsize e mantém tamanho unitário", () => {
    const p = parseProductSize("Sazon Pack 6x60g");
    expect(p).toMatchObject({
      packCount: 6,
      unitSize: 60,
      unitSizeUnit: "g",
      totalSize: 360,
      baseUnit: "kg",
    });
  });

  it("multipack com litros: cx 12x1L", () => {
    const p = parseProductSize("Leite Longa Vida cx 12x1L");
    expect(p).toMatchObject({ packCount: 12, unitSize: 1000, totalSize: 12000, baseUnit: "L" });
  });

  it("prefere o último tamanho quando há dois no nome", () => {
    // "Arroz 5kg tipo 1" — só 5kg
    const p = parseProductSize("Arroz Camil tipo 1 5kg");
    expect(p?.unitSize).toBe(5000);
  });

  it("retorna null quando não há tamanho detectável", () => {
    expect(parseProductSize("Pão francês")).toBeNull();
    expect(parseProductSize("Banana prata")).toBeNull();
    expect(parseProductSize("")).toBeNull();
  });

  it("usa fallback quando o nome não tem tamanho", () => {
    const p = parseProductSize("Produto Genérico", { sizeValue: 500, sizeUnit: "g" });
    expect(p).toMatchObject({ unitSize: 500, unitSizeUnit: "g", baseUnit: "kg" });
  });
});

describe("computeUnitPrice", () => {
  it("R$/kg para pacote de 1kg", () => {
    const u = computeUnitPrice(10, "Açúcar Cristal 1kg");
    expect(u?.perBase).toBeCloseTo(10);
    expect(u?.base).toBe("kg");
    expect(u?.label).toMatch(/10,00\/kg/);
    expect(u?.isPack).toBe(false);
  });

  it("R$/L para 2L", () => {
    const u = computeUnitPrice(8, "Refrigerante Cola 2L");
    expect(u?.base).toBe("L");
    expect(u?.perBase).toBeCloseTo(4);
  });


  it("multipack: calcula perBase pelo total E perPack pela unidade", () => {
    const u = computeUnitPrice(24, "Refri Lata 6x350ml");
    expect(u?.isPack).toBe(true);
    // total = 6*350 = 2100ml = 2.1L → 24/2.1 ≈ 11.428
    expect(u?.perBase).toBeCloseTo(24 / 2.1, 2);
    expect(u?.base).toBe("L");
    // perPack = 24/6 = 4
    expect(u?.perPack).toBeCloseTo(4);
    expect(u?.perPackLabel).toContain("350ml");
  });

  it("R$/un quando produto é contado", () => {
    const u = computeUnitPrice(6, "Pilha AA 4un");
    expect(u?.base).toBe("un");
    expect(u?.perBase).toBeCloseTo(1.5);
  });

  it("retorna null quando não há tamanho detectável", () => {
    expect(computeUnitPrice(5, "Pão francês")).toBeNull();
  });

  it("retorna null quando preço é 0 ou negativo", () => {
    expect(computeUnitPrice(0, "Arroz 1kg")).toBeNull();
    expect(computeUnitPrice(-1, "Arroz 1kg")).toBeNull();
    expect(computeUnitPrice(null, "Arroz 1kg")).toBeNull();
  });

  it("precisão maior para valores muito baixos (< R$ 0,10)", () => {
    // sachet 5g por R$ 0,25 → R$ 50,00/kg (não baixo). Testar caso baixo:
    const u = computeUnitPrice(2, "Sal 5kg");
    expect(u?.label).toMatch(/0,40\/kg/);
  });

  // ---------------------------------------------------------------------
  // Limite de extrapolação — regra vigente em src/lib/unit-price.ts:
  // rótulos em g/ml só viram R$/kg ou R$/L quando o TOTAL alcança 1 kg / 1 L.
  // Abaixo disso a projeção é enganosa (um sachê de 60g não vale R$ 41,66/kg
  // no mundo real), então `computeUnitPrice` devolve null.
  // Rótulos nativos (kg, L, litro) e contagem (un) NÃO sofrem esse corte.
  // ---------------------------------------------------------------------
  it("não extrapola R$/kg para totais abaixo de 1kg (temperos, sachês, pacotes pequenos)", () => {
    expect(computeUnitPrice(2.5, "Tempero Sazón 60g")).toBeNull();
    expect(computeUnitPrice(1.2, "Fermento em pó 25g")).toBeNull();
    // 200g e 500g também ficam abaixo do limite de 1kg
    expect(computeUnitPrice(4, "Biscoito 200g")).toBeNull();
    expect(computeUnitPrice(9, "Café Torrado 500g")).toBeNull();
  });

  it("não extrapola R$/L para totais abaixo de 1L (essências, sachês, garrafas pequenas)", () => {
    expect(computeUnitPrice(3, "Essência de baunilha 30ml")).toBeNull();
    expect(computeUnitPrice(8, "Óleo de Soja 900ml")).toBeNull();
    expect(computeUnitPrice(5, "Suco 500ml")).toBeNull();
  });

  it("extrapola quando o total em g/ml alcança 1kg / 1L", () => {
    expect(computeUnitPrice(10, "Feijão Carioca 1000g")?.base).toBe("kg");
    expect(computeUnitPrice(12, "Detergente 1500ml")?.base).toBe("L");
  });

  it("multipack soma o total antes de aplicar o limite", () => {
    // 2 x 300g = 600g → abaixo de 1kg, sem R$/kg
    expect(computeUnitPrice(7, "Presunto pack 2x300g")).toBeNull();
    // 6 x 350ml = 2,1L → acima de 1L, calcula normalmente
    expect(computeUnitPrice(24, "Refri Lata 6x350ml")?.base).toBe("L");
  });

  it("rótulos nativos em kg/L ignoram o limite (0,5kg, meio litro)", () => {
    expect(computeUnitPrice(6, "Picanha 0,5kg")?.base).toBe("kg");
    expect(computeUnitPrice(4, "Leite 0,5L")?.base).toBe("L");
  });

  it("contagem em unidades nunca é cortada pelo limite", () => {
    const u = computeUnitPrice(6, "Pilha AA 4un");
    expect(u?.base).toBe("un");
    expect(u?.perBase).toBeCloseTo(1.5);
  });
});

