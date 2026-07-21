/**
 * Regras de acesso do cliente:
 *  - trial:   dentro do período grátis de 30 dias
 *  - active:  paid_until no futuro (assinatura mensal ativa)
 *  - expired: trial acabou e não há assinatura válida → paywall
 */

export type AccessStatus = "trial" | "active" | "expired";

export type ProfileForAccess = {
  trial_ends_at: string | null;
  paid_until: string | null;
};

export function getAccessStatus(p: ProfileForAccess | null | undefined): AccessStatus {
  if (!p) return "expired";
  const now = Date.now();
  const paidMs = p.paid_until ? Date.parse(p.paid_until) : 0;
  if (paidMs && paidMs > now) return "active";
  const trialMs = p.trial_ends_at ? Date.parse(p.trial_ends_at) : 0;
  if (trialMs && trialMs > now) return "trial";
  return "expired";
}

export function daysRemaining(iso: string | null | undefined): number {
  if (!iso) return 0;
  const diff = Date.parse(iso) - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

export const PRICE_BRL = 19.9;
export const PRICE_LABEL = "R$ 19,90/mês";
