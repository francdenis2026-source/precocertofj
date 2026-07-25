/**
 * Estimativa de custo (em créditos Lovable) das chamadas de IA do app.
 *
 * Preços por 1M de tokens (USD) dos modelos usados via AI Gateway.
 * 1 crédito Lovable ≈ US$ 0,10 — usado apenas para converter a estimativa
 * em créditos; os valores reais podem variar levemente por chamada.
 */
export const CREDIT_USD = 0.1;

type Rate = { inUsdPerM: number; outUsdPerM: number };

const RATES: Record<string, Rate> = {
  "google/gemini-2.5-flash-lite": { inUsdPerM: 0.1, outUsdPerM: 0.4 },
  "google/gemini-2.5-flash": { inUsdPerM: 0.3, outUsdPerM: 2.5 },
  "google/gemini-3.6-flash": { inUsdPerM: 0.3, outUsdPerM: 2.5 },
};

const DEFAULT_RATE: Rate = { inUsdPerM: 0.3, outUsdPerM: 2.5 };

export function rateFor(model: string): Rate {
  return RATES[model] ?? DEFAULT_RATE;
}

/** Converte tokens em créditos Lovable estimados. */
export function creditsForTokens(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const r = rateFor(model);
  const usd =
    (Math.max(0, promptTokens) / 1_000_000) * r.inUsdPerM +
    (Math.max(0, completionTokens) / 1_000_000) * r.outUsdPerM;
  return usd / CREDIT_USD;
}

/** Aproxima tokens a partir do texto (≈ 4 caracteres por token em pt-BR). */
export function approxTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Formata créditos para exibição (sempre com pelo menos 3 decimais úteis). */
export function formatCredits(credits: number): string {
  if (credits <= 0) return "0";
  if (credits < 0.001) return "< 0,001";
  const digits = credits < 0.01 ? 4 : credits < 1 ? 3 : 2;
  return credits.toFixed(digits).replace(".", ",");
}
