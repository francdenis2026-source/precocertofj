/**
 * Cota de uso para visitantes (não cadastrados).
 *
 * Regra: cada ação (busca, comparação, etc.) tem um limite de 3 usos
 * armazenados em localStorage. Após atingir o limite, o app deve
 * bloquear a ação e sugerir cadastro/login.
 *
 * Usuários autenticados não passam por essa checagem.
 */

export const GUEST_LIMIT = 3;
const KEY = "pc:guest-usage:v1";

export type GuestAction =
  | "search"
  | "compare"
  | "product-view"
  | "alert"
  | "export"
  | "favorite"
  | "generic";

type Store = {
  v: 1;
  /** contagem por ação */
  actions: Record<string, number>;
  /** termos únicos consumidos por ação (para não contar duplicata) */
  uniques: Record<string, string[]>;
};

function read(): Store {
  if (typeof window === "undefined") return { v: 1, actions: {}, uniques: {} };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { v: 1, actions: {}, uniques: {} };
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      v: 1,
      actions: parsed.actions ?? {},
      uniques: parsed.uniques ?? {},
    };
  } catch {
    return { v: 1, actions: {}, uniques: {} };
  }
}

function write(s: Store): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage cheio ou bloqueado: cota vira "0" no próximo ciclo — sem erro visível */
  }
}

export function getGuestCount(action: GuestAction): number {
  return read().actions[action] ?? 0;
}

export function guestRemaining(action: GuestAction): number {
  return Math.max(0, GUEST_LIMIT - getGuestCount(action));
}

export function isGuestAtLimit(action: GuestAction): boolean {
  return getGuestCount(action) >= GUEST_LIMIT;
}

/**
 * Consome 1 uso de `action`. Se `unique` for informado, só conta a
 * primeira vez que aquele termo aparece (evita contar refresh/reload).
 * Retorna `{ blocked }` — quando `blocked=true`, a ação NÃO deve prosseguir.
 */
export function consumeGuest(
  action: GuestAction,
  unique?: string,
): { blocked: boolean; count: number; remaining: number } {
  const s = read();
  const key = unique?.trim().toLowerCase();
  if (key) {
    const list = s.uniques[action] ?? [];
    if (list.includes(key)) {
      const count = s.actions[action] ?? 0;
      return { blocked: count > GUEST_LIMIT, count, remaining: Math.max(0, GUEST_LIMIT - count) };
    }
    s.uniques[action] = [...list, key].slice(-20);
  }
  const current = s.actions[action] ?? 0;
  if (current >= GUEST_LIMIT) {
    return { blocked: true, count: current, remaining: 0 };
  }
  const next = current + 1;
  s.actions[action] = next;
  write(s);
  return { blocked: false, count: next, remaining: Math.max(0, GUEST_LIMIT - next) };
}

/** Reseta a cota (usado ao concluir cadastro/login). */
export function resetGuestQuota(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
