/**
 * Fair-price score — how good the current price is vs historical range.
 *
 * Uses (avg - price) / (avg - min) so:
 *  - price == min  → score 1.0  (great)
 *  - price == avg  → score 0.0
 *  - price >  avg  → score < 0  (bad)
 * Tone bands:
 *  - great: score >= 0.5  (green)
 *  - fair : score >= 0    (yellow)
 *  - bad  : score <  0    (red)
 */

export type FairPriceInput = {
  price: number | null | undefined;
  min: number | null | undefined;
  avg: number | null | undefined;
  max?: number | null | undefined;
};

export type FairPriceTone = "great" | "fair" | "bad";

export type FairPriceScore = {
  score: number; // -Infinity..1
  tone: FairPriceTone;
  label: string; // pt-BR user-facing
  diffPct: number | null; // vs avg; negative = below avg
};

const finite = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n);

export function computeFairPrice(input: FairPriceInput): FairPriceScore | null {
  const { price, min, avg } = input;
  if (!finite(price) || !finite(avg) || !finite(min) || avg <= 0) return null;
  if (price <= 0) return null;

  const range = Math.max(avg - min, 0.0001);
  const score = (avg - price) / range;
  const diffPct = ((price - avg) / avg) * 100;

  let tone: FairPriceTone;
  let label: string;
  if (score >= 0.5) {
    tone = "great";
    label = "Preço ótimo";
  } else if (score >= 0) {
    tone = "fair";
    label = "Preço justo";
  } else {
    tone = "bad";
    label = "Acima da média";
  }

  return { score, tone, label, diffPct };
}
