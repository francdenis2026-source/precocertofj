/**
 * Shared formatting helpers.
 *
 * Prefer these over inline `toLocaleString` calls scattered through the app
 * so that currency/date formatting stays consistent everywhere.
 */

/** Format a number as Brazilian Real (BRL) currency. */
export const brl = (n: number): string =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Format a number with pt-BR grouping and optional fraction digits. */
export const formatNumber = (n: number, fractionDigits = 0): string =>
  n.toLocaleString("pt-BR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
