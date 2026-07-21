/**
 * Regra de acesso do "cadeado curioso" para visitantes não autenticados.
 *
 * Regra atual: **todos os preços ficam bloqueados** para quem não tem conta.
 * O visitante enxerga a estrutura da lista, mas os valores só são revelados
 * após criar uma conta gratuita (30 dias grátis).
 *
 * Usuários autenticados: o hook `useTeaserAccess` retorna `locked=false`
 * imediatamente e este módulo não é consultado.
 */

export function isTeaserLocked(
  _id: string | null | undefined,
  _index: number,
): boolean {
  return true;
}
