/**
 * Validação de força de PIN de 6 dígitos.
 * Rejeita: comprimento incorreto, não-numérico, repetidos (000000) e
 * sequências crescentes/decrescentes (123456, 654321).
 */

export type PinValidationResult =
  | { valid: true; digits: string }
  | { valid: false; reason: "empty" | "length" | "non_numeric" | "repeated" | "sequential"; message: string };

export function validatePin(input: string): PinValidationResult {
  const raw = (input ?? "").trim();
  if (raw.length === 0) {
    return { valid: false, reason: "empty", message: "Informe o PIN de 6 dígitos." };
  }
  if (!/^\d+$/.test(raw)) {
    return { valid: false, reason: "non_numeric", message: "O PIN deve conter apenas números." };
  }
  if (raw.length !== 6) {
    return {
      valid: false,
      reason: "length",
      message:
        raw.length < 6
          ? `PIN incompleto — faltam ${6 - raw.length} dígito${6 - raw.length > 1 ? "s" : ""}.`
          : "O PIN deve ter exatamente 6 dígitos.",
    };
  }
  if (/^(\d)\1{5}$/.test(raw)) {
    return {
      valid: false,
      reason: "repeated",
      message: "PIN muito fraco — evite dígitos repetidos como 000000 ou 111111.",
    };
  }
  // Sequência crescente ou decrescente estrita (123456, 234567, 654321)
  let asc = true;
  let desc = true;
  for (let i = 1; i < raw.length; i++) {
    const diff = raw.charCodeAt(i) - raw.charCodeAt(i - 1);
    if (diff !== 1) asc = false;
    if (diff !== -1) desc = false;
  }
  if (asc || desc) {
    return {
      valid: false,
      reason: "sequential",
      message: "PIN muito fraco — evite sequências como 123456 ou 654321.",
    };
  }
  return { valid: true, digits: raw };
}

export function isStrongPin(input: string): boolean {
  return validatePin(input).valid;
}
