/**
 * Utilidades de CPF: validação de dígito verificador + máscara.
 * Usadas no client (form) e no server (validator do createServerFn).
 */

export function stripCpf(input: string): string {
  return (input ?? "").replace(/\D/g, "");
}

export function maskCpf(input: string): string {
  const d = stripCpf(input).slice(0, 11);
  const p1 = d.slice(0, 3);
  const p2 = d.slice(3, 6);
  const p3 = d.slice(6, 9);
  const p4 = d.slice(9, 11);
  let out = p1;
  if (d.length > 3) out += "." + p2;
  if (d.length > 6) out += "." + p3;
  if (d.length > 9) out += "-" + p4;
  return out;
}

export function maskPhone(input: string): string {
  const d = (input ?? "").replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function maskCep(input: string): string {
  const d = (input ?? "").replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

/**
 * Valida CPF por dígito verificador. Rejeita sequências repetidas
 * (000..., 111...) e comprimento != 11.
 */
export function isValidCpf(input: string): boolean {
  return validateCpfDetailed(input).valid;
}

export type CpfValidationResult =
  | { valid: true; digits: string }
  | { valid: false; reason: "empty" | "incomplete" | "repeated" | "checksum"; message: string };

/**
 * Validação detalhada com motivo específico do erro — usada para exibir
 * mensagens direcionadas no formulário.
 */
export function validateCpfDetailed(input: string): CpfValidationResult {
  const cpf = stripCpf(input);
  if (cpf.length === 0) {
    return { valid: false, reason: "empty", message: "Informe seu CPF." };
  }
  if (cpf.length < 11) {
    return {
      valid: false,
      reason: "incomplete",
      message: `CPF incompleto — faltam ${11 - cpf.length} dígito${11 - cpf.length > 1 ? "s" : ""}.`,
    };
  }
  if (/^(\d)\1{10}$/.test(cpf)) {
    return {
      valid: false,
      reason: "repeated",
      message: "CPF inválido — sequências como 111.111.111-11 não são aceitas.",
    };
  }

  const calcCheck = (base: string, weightStart: number): number => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) {
      sum += parseInt(base[i], 10) * (weightStart - i);
    }
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };

  const d1 = calcCheck(cpf.slice(0, 9), 10);
  const d2 = calcCheck(cpf.slice(0, 10), 11);
  if (d1 !== parseInt(cpf[9], 10) || d2 !== parseInt(cpf[10], 10)) {
    return {
      valid: false,
      reason: "checksum",
      message: "CPF inválido — dígitos verificadores não conferem. Confira os números digitados.",
    };
  }
  return { valid: true, digits: cpf };
}

/**
 * Gera o "email oculto" usado no Supabase Auth para logins baseados em CPF.
 * O cliente nunca vê este valor.
 */
export function cpfToEmail(cpf: string): string {
  return `cpf-${stripCpf(cpf)}@precocerto.local`;
}
