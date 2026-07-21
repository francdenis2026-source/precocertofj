export type Verdict = "barato" | "justo" | "caro" | "unknown";

/**
 * Compute a verdict from captured price vs. average market price.
 *  - < -10% : barato
 *  - within ±10%: justo
 *  - > +10%: caro
 */
export function computeVerdict(
  captured: number | null | undefined,
  average: number | null | undefined,
): { verdict: Verdict; diffPct: number | null } {
  if (!captured || !average || average <= 0) {
    return { verdict: "unknown", diffPct: null };
  }
  const diffPct = ((captured - average) / average) * 100;
  if (diffPct < -10) return { verdict: "barato", diffPct };
  if (diffPct > 10) return { verdict: "caro", diffPct };
  return { verdict: "justo", diffPct };
}

export const verdictLabel: Record<Verdict, string> = {
  barato: "BARATO",
  justo: "JUSTO",
  caro: "CARO",
  unknown: "SEM DADOS",
};

export const verdictColor: Record<Verdict, string> = {
  barato: "bg-savings text-savings-foreground",
  justo: "bg-primary text-primary-foreground",
  caro: "bg-destructive text-destructive-foreground",
  unknown: "bg-muted text-muted-foreground",
};
