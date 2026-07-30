/**
 * Utilitários de código de barras (EAN-8, EAN-13, UPC-A e UPC-E).
 *
 * A IA de visão frequentemente devolve dígitos incompletos ou com ruído
 * ("789 100 031 9543", "O7891000319543"). Aqui normalizamos e validamos o
 * dígito verificador para evitar cadastros com código inválido, que quebram
 * o vínculo entre produtos iguais de estabelecimentos diferentes.
 */

/** Remove tudo que não é dígito e converte confusões comuns de OCR. */
export function sanitizeBarcode(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .trim()
    .replace(/[oO]/g, "0")
    .replace(/[lI|]/g, "1")
    .replace(/\D/g, "");
}

/**
 * Calcula o dígito verificador padrão GS1 (mod 10) para um código sem o
 * último dígito.
 */
function gs1CheckDigit(digitsWithoutCheck: string): number {
  let sum = 0;
  // Pesos alternam 3/1 da direita para a esquerda.
  for (let i = digitsWithoutCheck.length - 1, weight = 3; i >= 0; i -= 1) {
    sum += Number(digitsWithoutCheck[i]) * weight;
    weight = weight === 3 ? 1 : 3;
  }
  return (10 - (sum % 10)) % 10;
}

/** Expande um UPC-E (8 dígitos) para o UPC-A equivalente (12 dígitos). */
function expandUpcE(code: string): string | null {
  if (code.length !== 8 || (code[0] !== "0" && code[0] !== "1")) return null;
  const s = code[0];
  const body = code.slice(1, 7);
  const check = code[6 + 1];
  const last = body[5];
  let middle: string;
  switch (last) {
    case "0":
    case "1":
    case "2":
      middle = `${body.slice(0, 2)}${last}0000${body.slice(2, 5)}`;
      break;
    case "3":
      middle = `${body.slice(0, 3)}00000${body.slice(3, 5)}`;
      break;
    case "4":
      middle = `${body.slice(0, 4)}00000${body[4]}`;
      break;
    default:
      middle = `${body.slice(0, 5)}0000${last}`;
      break;
  }
  return `${s}${middle}${check}`;
}

/** true quando o dígito verificador confere. */
export function isValidBarcode(code: string): boolean {
  if (!/^\d{8}$|^\d{12,14}$/.test(code)) return false;
  const body = code.slice(0, -1);
  const check = Number(code[code.length - 1]);
  return gs1CheckDigit(body) === check;
}

/**
 * Normaliza para o formato canônico usado no banco:
 * - UPC-E vira UPC-A;
 * - UPC-A (12) e GTIN-14 viram EAN-13 quando possível;
 * - retorna `null` se o código não existir ou não passar no dígito verificador.
 *
 * Retornar `null` é intencional: é melhor cadastrar sem código do que com um
 * código errado, que criaria vínculo entre produtos diferentes.
 */
export function normalizeBarcode(raw: string | null | undefined): string | null {
  let code = sanitizeBarcode(raw);
  if (!code) return null;

  if (code.length === 8) {
    const expanded = expandUpcE(code);
    if (expanded && isValidBarcode(expanded)) code = expanded;
  }

  // GTIN-14 com zeros à esquerda é o mesmo produto do EAN-13.
  if (code.length === 14 && code.startsWith("0") && isValidBarcode(code)) {
    code = code.slice(1);
  }
  // UPC-A é um EAN-13 com zero à esquerda.
  if (code.length === 12 && isValidBarcode(code)) {
    code = `0${code}`;
  }

  return isValidBarcode(code) ? code : null;
}
