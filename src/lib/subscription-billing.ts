/**
 * Regra de extensão de `paid_until` aplicada pelo webhook do Mercado Pago
 * quando `external_reference = profile:<uuid>`.
 *
 * - Se o usuário ainda tem uma assinatura vigente (`paidUntil` no futuro),
 *   estende a partir da data existente (empilha períodos).
 * - Caso contrário, estende a partir de "agora".
 * - `planDays` inválido (não numérico ou <= 0) cai para 30 dias.
 */
export function computeNewPaidUntil(params: {
  currentPaidUntil: string | null | undefined;
  planDays: unknown;
  now?: Date;
}): { newPaidUntilIso: string; planDays: number } {
  const now = params.now ?? new Date();
  const rawDays = Number(params.planDays);
  const planDays =
    Number.isFinite(rawDays) && rawDays > 0 ? Math.floor(rawDays) : 30;

  const parsedCurrent = params.currentPaidUntil
    ? Date.parse(params.currentPaidUntil)
    : NaN;

  const base =
    Number.isFinite(parsedCurrent) && parsedCurrent > now.getTime()
      ? parsedCurrent
      : now.getTime();

  const newPaidUntilIso = new Date(
    base + planDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  return { newPaidUntilIso, planDays };
}
