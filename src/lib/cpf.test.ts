import { describe, it, expect } from "vitest";
import { stripCpf, maskCpf, maskPhone, maskCep, isValidCpf, cpfToEmail } from "./cpf";

describe("stripCpf", () => {
  it("remove tudo que não é dígito", () => {
    expect(stripCpf("123.456.789-09")).toBe("12345678909");
    expect(stripCpf(" 123 abc 456 ")).toBe("123456");
    expect(stripCpf("")).toBe("");
  });
  it("tolera null/undefined", () => {
    expect(stripCpf(undefined as unknown as string)).toBe("");
    expect(stripCpf(null as unknown as string)).toBe("");
  });
});

describe("maskCpf", () => {
  it("formata progressivamente", () => {
    expect(maskCpf("1")).toBe("1");
    expect(maskCpf("123")).toBe("123");
    expect(maskCpf("1234")).toBe("123.4");
    expect(maskCpf("1234567")).toBe("123.456.7");
    expect(maskCpf("12345678909")).toBe("123.456.789-09");
  });
  it("trunca em 11 dígitos", () => {
    expect(maskCpf("12345678909999")).toBe("123.456.789-09");
  });
  it("aceita input já mascarado (copiar/colar)", () => {
    expect(maskCpf("123.456.789-09")).toBe("123.456.789-09");
  });
  it("permite limpar o campo", () => {
    expect(maskCpf("")).toBe("");
  });
});

describe("maskPhone", () => {
  it("formata celular", () => {
    expect(maskPhone("11987654321")).toBe("(11) 98765-4321");
    expect(maskPhone("1198765432")).toBe("(11) 9876-5432");
    expect(maskPhone("11")).toBe("11");
  });
});

describe("maskCep", () => {
  it("formata cep", () => {
    expect(maskCep("80010000")).toBe("80010-000");
    expect(maskCep("80010")).toBe("80010");
  });
});

describe("isValidCpf — dígito verificador", () => {
  it("aceita CPFs reconhecidamente válidos", () => {
    // Gerados com o algoritmo oficial
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("52998224725")).toBe(true);
    expect(isValidCpf("111.444.777-35")).toBe(true);
  });
  it("rejeita sequências repetidas", () => {
    expect(isValidCpf("00000000000")).toBe(false);
    expect(isValidCpf("11111111111")).toBe(false);
    expect(isValidCpf("99999999999")).toBe(false);
  });
  it("rejeita comprimento errado", () => {
    expect(isValidCpf("")).toBe(false);
    expect(isValidCpf("123")).toBe(false);
    expect(isValidCpf("529982247250")).toBe(false);
  });
  it("rejeita dígito verificador incorreto", () => {
    expect(isValidCpf("529.982.247-26")).toBe(false);
    expect(isValidCpf("111.444.777-30")).toBe(false);
  });
});

describe("cpfToEmail", () => {
  it("gera email interno consistente", () => {
    expect(cpfToEmail("529.982.247-25")).toBe("cpf-52998224725@precocerto.local");
    expect(cpfToEmail("52998224725")).toBe("cpf-52998224725@precocerto.local");
  });
});

/**
 * Testes de "integração" que replicam a validação do createServerFn.
 * O `.inputValidator` chama exatamente essas funções — se elas passarem,
 * o backend também aceita/rejeita o mesmo input.
 */
describe("backend validators (mesma lógica do createServerFn)", () => {
  function validateSignUpCpf(raw: string): string {
    const cpf = stripCpf(raw);
    if (!isValidCpf(cpf)) throw new Error("CPF inválido");
    return cpf;
  }

  it("aceita CPF válido, retorna somente dígitos", () => {
    expect(validateSignUpCpf("529.982.247-25")).toBe("52998224725");
  });
  it("lança para CPF inválido", () => {
    expect(() => validateSignUpCpf("111.111.111-11")).toThrow("CPF inválido");
    expect(() => validateSignUpCpf("123")).toThrow("CPF inválido");
    expect(() => validateSignUpCpf("")).toThrow("CPF inválido");
  });
});
