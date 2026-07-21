import { describe, it, expect } from "vitest";
import {
  buildTokenMatcher,
  buildSearchLookupQuery,
  computeMatchReasons,
  matchKind,
  normalize,
  tokenizeQuery,
} from "@/lib/search-tokens";

describe("normalize", () => {
  it("remove acentos, mantém texto original em lower-case", () => {
    expect(normalize("Açaí Orgânico")).toBe("acai organico");
    expect(normalize("  ÁRVORE   AZUL  ")).toBe("arvore azul");
    expect(normalize("")).toBe("");
  });
});

describe("tokenizeQuery", () => {
  it("remove stopwords e mantém tokens de conteúdo", () => {
    expect(tokenizeQuery("de com sal e água")).toEqual(["sal", "agua"]);
  });

  it("aceita tokens ≥ 3 chars", () => {
    expect(tokenizeQuery("sal")).toEqual(["sal"]);
    expect(tokenizeQuery("cha")).toEqual(["cha"]);
    expect(tokenizeQuery("oleo")).toEqual(["oleo"]);
  });

  it("fallback: usa tokens ≥ 2 quando não sobra nada com ≥ 3", () => {
    expect(tokenizeQuery("ok")).toEqual(["ok"]);
  });

  it("preserva termos compostos curtos e remove conectivos", () => {
    expect(tokenizeQuery("leite em pó")).toEqual(["leite", "po"]);
    expect(tokenizeQuery("creme de leite")).toEqual(["creme", "leite"]);
  });

  it("descarta stopwords mesmo no fallback", () => {
    expect(tokenizeQuery("de")).toEqual([]);
  });

  it("string vazia devolve []", () => {
    expect(tokenizeQuery("")).toEqual([]);
  });
});

describe("buildSearchLookupQuery", () => {
  it("gera query sem conectivos para não quebrar compostos no banco", () => {
    expect(buildSearchLookupQuery("leite em pó")).toBe("leite po");
    expect(buildSearchLookupQuery("creme de leite")).toBe("creme leite");
  });
});

describe("buildTokenMatcher (strict)", () => {
  const strict = (t: string) => buildTokenMatcher(t, "strict");

  it("'sal' não casa 'salsicha' nem 'salgadinho'", () => {
    expect(strict("sal").test("salsicha sadia")).toBe(false);
    expect(strict("sal").test("salgadinho cheetos")).toBe(false);
  });

  it("'sal' casa 'sal grosso' e 'sal refinado'", () => {
    expect(strict("sal").test("sal grosso")).toBe(true);
    expect(strict("sal").test("sal refinado")).toBe(true);
  });

  it("'cha' não casa 'chapeu' nem 'chaveiro'", () => {
    expect(strict("cha").test("chapeu de palha")).toBe(false);
    expect(strict("cha").test("chaveiro tico")).toBe(false);
  });

  it("'cha' casa 'cha verde'", () => {
    expect(strict("cha").test("cha verde")).toBe(true);
  });

  it("'oleo' não casa 'oleoso'", () => {
    expect(strict("oleo").test("oleoso creme")).toBe(false);
  });

  it("'oleo' casa 'oleo de soja'", () => {
    expect(strict("oleo").test("oleo de soja")).toBe(true);
  });

  it("token longo (≥6) permite prefixo mesmo em strict", () => {
    // "iogurte" ~ "iogurtes" (plural)
    expect(strict("iogurte").test("iogurtes naturais")).toBe(true);
  });

  it("'arroz' casa 'arroz branco'", () => {
    expect(strict("arroz").test("arroz branco tio joao")).toBe(true);
  });
});

describe("buildTokenMatcher (loose)", () => {
  const loose = (t: string) => buildTokenMatcher(t, "loose");

  it("token ≥ 3 chars permite prefixo em loose", () => {
    expect(loose("arr").test("arroz branco")).toBe(true);
    expect(loose("oleo").test("oleoso creme")).toBe(true);
  });

  it("loose ainda respeita fronteira de palavra", () => {
    // 'sal' em loose casa prefixo — 'salsicha' começa com 'sal'.
    expect(loose("sal").test("salsicha")).toBe(true);
    // Mas dentro do meio da palavra segue sendo bloqueado.
    expect(loose("sicha").test("salsicha")).toBe(false);
  });
});

describe("matchKind", () => {
  it("classifica palavra inteira como exact", () => {
    expect(matchKind("sal", "Sal grosso")).toBe("exact");
  });

  it("classifica prefixo (palavra maior) como prefix", () => {
    expect(matchKind("arr", "Arroz branco")).toBe("prefix");
  });

  it("retorna none quando não encontra", () => {
    expect(matchKind("xyz", "arroz branco")).toBe("none");
    // Substring no meio da palavra também é none (não é word-boundary).
    expect(matchKind("roz", "arroz")).toBe("none");
  });

  it("é acento-insensível", () => {
    expect(matchKind("acucar", "Açúcar refinado")).toBe("exact");
  });
});

describe("computeMatchReasons", () => {
  it("marca brand quando token bate a marca do catálogo", () => {
    const reasons = computeMatchReasons(["ninho"], "Leite Ninho Integral", "Ninho");
    // 'ninho' aparece em marca → deve ser classificado como brand (prioritário)
    expect(reasons.find((r) => r.token === "ninho")?.kind).toBe("brand");
  });

  it("marca exact quando token bate palavra do nome mas não a marca", () => {
    const reasons = computeMatchReasons(["leite"], "Leite Ninho Integral", "Ninho");
    expect(reasons.find((r) => r.token === "leite")?.kind).toBe("exact");
  });

  it("ignora tokens sem match", () => {
    expect(computeMatchReasons(["xyz"], "Sal grosso")).toEqual([]);
  });
});
