import { describe, it, expect } from "vitest";
import {
  resolveSynonymGroup,
  nameHasExcludedToken,
  nameMatchesAnySynonym,
  nameStartsWithPrimarySynonym,
} from "../search-synonyms";
import { buildTokenMatcher, normalize, tokenizeQuery } from "../search-tokens";

describe("search-synonyms", () => {
  it("resolve grupo canônico 'sal' a partir de tokens da busca", () => {
    const g = resolveSynonymGroup(["sal"]);
    expect(g?.canonical).toBe("sal");
  });

  it("não resolve grupo para termos não cadastrados", () => {
    expect(resolveSynonymGroup(["shampoo"])).toBeNull();
  });

  it("nameMatchesAnySynonym aceita 'sal refinado' e 'sal grosso'", () => {
    const g = resolveSynonymGroup(["sal"])!;
    expect(nameMatchesAnySynonym("Sal Refinado 1kg", g)).toBe(true);
    expect(nameMatchesAnySynonym("SAL GROSSO CISNE", g)).toBe(true);
    expect(nameMatchesAnySynonym("Sal Nota 10 Moído 1kg", g)).toBe(true);
  });

  it("nameHasExcludedToken remove 'margarina c/sal' e 'biscoito água e sal'", () => {
    const g = resolveSynonymGroup(["sal"])!;
    expect(nameHasExcludedToken("Margarina c/sal Qualy 500g", g)).toBe(true);
    expect(nameHasExcludedToken("Biscoito Água e Sal Marilan", g)).toBe(true);
    expect(nameHasExcludedToken("Salsicha Perdigão", g)).toBe(true);
    // item puro NÃO deve ser excluído
    expect(nameHasExcludedToken("Sal Refinado Cisne 1kg", g)).toBe(false);
  });

  it("resolve grupo 'acucar' e exclui 'adoçante'", () => {
    const g = resolveSynonymGroup(["acucar"])!;
    expect(g).toBeTruthy();
    expect(nameHasExcludedToken("Adoçante Zero Açúcar", g)).toBe(true);
    expect(nameHasExcludedToken("Açúcar Cristal União 1kg", g)).toBe(false);
  });

  it("prioriza leite como produto principal, não como ingrediente ou atributo", () => {
    const g = resolveSynonymGroup(["leite"])!;
    expect(nameStartsWithPrimarySynonym("Leite UHT Italac Integral 1L", g)).toBe(true);
    expect(nameStartsWithPrimarySynonym("Leite Integral Piracanjuba 1L", g)).toBe(true);
    expect(nameStartsWithPrimarySynonym("Doce de Leite Junco 400g", g)).toBe(false);
    expect(nameStartsWithPrimarySynonym("Sabonete Nivea Proteína Leite 85g", g)).toBe(false);
  });

  describe("query contendo termo de exclusão desativa o grupo canônico", () => {
    // Regressão: buscar "leite em pó" antes casava com o grupo "leite" e
    // o próprio filtro de exclusão do grupo removia os produtos desejados.
    it("busca 'leite em pó' NÃO deve resolver para o grupo 'leite'", () => {
      const tokens = tokenizeQuery("leite em pó");
      const g = resolveSynonymGroup(tokens, undefined, "leite em pó");
      expect(g).toBeNull();
    });

    it("busca 'creme de leite' NÃO deve resolver para o grupo 'leite'", () => {
      const tokens = tokenizeQuery("creme de leite");
      const g = resolveSynonymGroup(tokens, undefined, "creme de leite");
      expect(g).toBeNull();
    });

    it("busca 'doce de leite' NÃO deve resolver para o grupo 'leite'", () => {
      const tokens = tokenizeQuery("doce de leite");
      const g = resolveSynonymGroup(tokens, undefined, "doce de leite");
      expect(g).toBeNull();
    });

    it("busca 'leite de coco' NÃO deve resolver para o grupo 'leite'", () => {
      const tokens = tokenizeQuery("leite de coco");
      const g = resolveSynonymGroup(tokens, undefined, "leite de coco");
      expect(g).toBeNull();
    });

    it("busca 'leite condensado' NÃO deve resolver para o grupo 'leite'", () => {
      const tokens = tokenizeQuery("leite condensado");
      const g = resolveSynonymGroup(tokens, undefined, "leite condensado");
      expect(g).toBeNull();
    });

    it("busca simples 'leite' continua resolvendo para o grupo 'leite'", () => {
      const tokens = tokenizeQuery("leite");
      const g = resolveSynonymGroup(tokens, undefined, "leite");
      expect(g?.canonical).toBe("leite");
    });

    it("busca 'sal' resolve normalmente (sem exclusão presente)", () => {
      const tokens = tokenizeQuery("sal refinado");
      const g = resolveSynonymGroup(tokens, undefined, "sal refinado");
      expect(g?.canonical).toBe("sal");
    });

    it("busca 'sal salsicha' NÃO resolve para o grupo 'sal' (contém excluído)", () => {
      const tokens = tokenizeQuery("sal salsicha");
      const g = resolveSynonymGroup(tokens, undefined, "sal salsicha");
      expect(g).toBeNull();
    });
  });

  describe("integração — produtos de leite aparecem na busca por 'leite em pó'", () => {
    // Simula o pipeline usado em price-search / comparison-search:
    // 1) tokeniza query;  2) resolve grupo (com query bruta);
    // 3) se houver grupo, aplica filtros de sinônimo puro.
    const catalog = [
      "Leite em Pó Ninho Integral Lata 380g",
      "Leite em Pó Itambé Integral Lata 380g",
      "Leite em Pó Piracanjuba Integral Sachê 400g",
      "Leite em Pó Desnatado Itambé 800g",
      "Leite UHT Italac Integral 1L",
      "Doce de Leite Junco 400g",
      "Creme de Leite Itambé 300g",
    ];

    function runSearch(query: string): string[] {
      const tokens = tokenizeQuery(query);
      const matchers = tokens.map((t: string) => buildTokenMatcher(t, "strict"));
      const group = resolveSynonymGroup(tokens, undefined, query);
      return catalog.filter((name) => {
        const n = normalize(name);
        if (!matchers.every((re: RegExp) => re.test(n))) return false;
        if (!group) return true;
        return (
          nameStartsWithPrimarySynonym(name, group) &&
          !nameHasExcludedToken(name, group)
        );
      });
    }

    it("'leite em pó' retorna todos os leites em pó do catálogo", () => {
      const results = runSearch("leite em pó");
      expect(results).toContain("Leite em Pó Ninho Integral Lata 380g");
      expect(results).toContain("Leite em Pó Itambé Integral Lata 380g");
      expect(results).toContain("Leite em Pó Piracanjuba Integral Sachê 400g");
      expect(results).toContain("Leite em Pó Desnatado Itambé 800g");
    });

    it("'creme de leite' retorna o creme de leite (não filtrado pelo grupo 'leite')", () => {
      const results = runSearch("creme de leite");
      expect(results).toContain("Creme de Leite Itambé 300g");
    });

    it("'doce de leite' retorna o doce de leite (não filtrado pelo grupo 'leite')", () => {
      const results = runSearch("doce de leite");
      expect(results).toContain("Doce de Leite Junco 400g");
    });
  });
});
