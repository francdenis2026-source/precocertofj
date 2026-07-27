/**
 * Cache em memória (por instância de servidor) para os indicadores do admin.
 *
 * Objetivo: quando o administrador alterna filtros rapidamente — e volta para
 * um intervalo já consultado — a resposta sai do cache em vez de refazer a
 * varredura de scans no banco.
 *
 * Invalidação:
 *  - TTL curto (padrão 90s);
 *  - `bumpAdminInsightsVersion()` invalida tudo (usado pelo botão "Atualizar"
 *    e por rotinas que gravam novos preços).
 */

type Entry<T> = { value: T; expiresAt: number; version: number };

const store = new Map<string, Entry<unknown>>();
let version = 1;
const MAX_ENTRIES = 40;

export const bumpAdminInsightsVersion = () => {
  version += 1;
  store.clear();
};

export const adminInsightsVersion = () => version;

export async function cachedAdminData<T>(
  key: string,
  ttlMs: number,
  compute: () => Promise<T>,
  opts?: { force?: boolean },
): Promise<T> {
  const now = Date.now();
  if (!opts?.force) {
    const hit = store.get(key) as Entry<T> | undefined;
    if (hit && hit.version === version && hit.expiresAt > now) return hit.value;
  }
  const value = await compute();
  if (store.size >= MAX_ENTRIES) {
    // descarta a entrada mais antiga
    const oldest = [...store.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt)[0];
    if (oldest) store.delete(oldest[0]);
  }
  store.set(key, { value, expiresAt: now + ttlMs, version });
  return value;
}
