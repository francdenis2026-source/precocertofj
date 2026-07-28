/**
 * Utilitário compartilhado para validar o parâmetro `?tab=` dos hubs admin.
 *
 * Garante fallback consistente para a aba padrão quando o usuário abrir um
 * hub com uma aba inexistente (evita telas vazias ou UI inconsistente).
 *
 * Uso típico dentro de `validateSearch` de uma rota:
 *
 *   validateSearch: (s) => validateTabSearch(s, TABS, "completo"),
 */
export type TabDef<K extends string = string> = { key: K; label: string };

export function isValidTab<K extends string>(
  value: unknown,
  tabs: ReadonlyArray<TabDef<K>>,
): value is K {
  if (typeof value !== "string") return false;
  return tabs.some((t) => t.key === value);
}

export function validateTabSearch<K extends string>(
  raw: Record<string, unknown>,
  tabs: ReadonlyArray<TabDef<K>>,
  fallback: K,
): { tab: K } {
  const candidate = raw?.tab;
  if (isValidTab(candidate, tabs)) return { tab: candidate };
  return { tab: fallback };
}

export function tabLabel<K extends string>(
  tabs: ReadonlyArray<TabDef<K>>,
  key: K,
): string {
  return tabs.find((t) => t.key === key)?.label ?? key;
}
