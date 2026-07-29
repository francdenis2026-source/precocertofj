/**
 * Cota diária de uso para visitantes (não cadastrados).
 *
 * Regras:
 * - Limite GLOBAL de 5 ações por dia (soma de buscas, comparações,
 *   favoritos, alertas, exports, etc). O contador reseta à meia-noite
 *   local automaticamente na próxima leitura.
 * - Ações repetidas com o mesmo `unique` no mesmo dia não são cobradas de
 *   novo (evita contar refresh/reload/duplo clique).
 * - Persistência redundante em 3 camadas: localStorage + sessionStorage +
 *   cookie. A leitura pega o MAIOR valor entre elas, impedindo burla ao
 *   limpar apenas uma. Abas do mesmo dispositivo compartilham a cota via
 *   BroadcastChannel + storage event.
 * - Usuários autenticados nunca passam por essa checagem.
 */

// TEMP: limite de cota de visitante desativado a pedido do usuário.
// Para reativar, restaure GUEST_DAILY_LIMIT = 5 e remova GUEST_QUOTA_DISABLED.
export const GUEST_QUOTA_DISABLED = true;
export const GUEST_DAILY_LIMIT = GUEST_QUOTA_DISABLED ? Number.MAX_SAFE_INTEGER : 5;
/** @deprecated Alias mantido por compatibilidade. Use GUEST_DAILY_LIMIT. */
export const GUEST_LIMIT = GUEST_DAILY_LIMIT;

const LS_KEY = "pc:guest-usage:v2";
const COOKIE_KEY = "pc_gq";
const CHANNEL = "pc:guest-quota";
const SYNC_EVENT = "pc:guest-quota:sync";

export type GuestAction =
  | "search"
  | "compare"
  | "product-view"
  | "alert"
  | "export"
  | "favorite"
  | "generic";

type Store = {
  v: 2;
  /** Data local YYYY-MM-DD do último consumo. */
  day: string;
  /** Total de ações consumidas no dia (soma de todas as ações). */
  used: number;
  /** IDs únicos já cobrados nesse dia (não contar duplicata). */
  uniques: string[];
};

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function fresh(): Store {
  return { v: 2, day: today(), used: 0, uniques: [] };
}

function normalize(x: unknown): Store {
  const src = (x ?? {}) as Partial<Store> & Record<string, unknown>;
  const day = today();
  if (src.day !== day) return fresh();
  const used = Math.max(0, Math.floor(Number(src.used) || 0));
  const uniques = Array.isArray(src.uniques)
    ? (src.uniques as unknown[]).filter((v): v is string => typeof v === "string").slice(-60)
    : [];
  return { v: 2, day, used, uniques };
}

function readCookie(): Store | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)pc_gq=([^;]+)/);
  if (!m) return null;
  try {
    return normalize(JSON.parse(decodeURIComponent(m[1])));
  } catch {
    return null;
  }
}

function writeCookie(s: Store): void {
  if (typeof document === "undefined") return;
  const exp = new Date();
  exp.setDate(exp.getDate() + 2);
  try {
    document.cookie = `${COOKIE_KEY}=${encodeURIComponent(
      JSON.stringify(s),
    )}; expires=${exp.toUTCString()}; path=/; SameSite=Lax`;
  } catch {
    /* noop */
  }
}

function readSlot(storage: Storage | null): Store | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(LS_KEY);
    if (!raw) return null;
    return normalize(JSON.parse(raw));
  } catch {
    return null;
  }
}

function read(): Store {
  if (typeof window === "undefined") return fresh();
  const slots: Store[] = [];
  const ls = readSlot(window.localStorage);
  const ss = readSlot(window.sessionStorage);
  const ck = readCookie();
  if (ls) slots.push(ls);
  if (ss) slots.push(ss);
  if (ck) slots.push(ck);
  if (slots.length === 0) return fresh();

  const day = today();
  const merged: Store = { v: 2, day, used: 0, uniques: [] };
  for (const s of slots) {
    if (s.day !== day) continue;
    if (s.used > merged.used) merged.used = s.used;
    for (const u of s.uniques) if (!merged.uniques.includes(u)) merged.uniques.push(u);
  }
  merged.uniques = merged.uniques.slice(-60);
  return merged;
}

let channel: BroadcastChannel | null = null;
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (ev) => {
      if (ev.data && (ev.data as { type?: string }).type === "sync") {
        try {
          window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: ev.data.store }));
        } catch {
          /* noop */
        }
      }
    };
  } catch {
    channel = null;
  }
}

// Escuta storage event: quando outra aba altera o localStorage, dispara
// evento custom para as UIs revalidarem o contador.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== LS_KEY) return;
    try {
      window.dispatchEvent(
        new CustomEvent(SYNC_EVENT, { detail: e.newValue ? JSON.parse(e.newValue) : null }),
      );
    } catch {
      /* noop */
    }
  });
}

function write(s: Store): void {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify(s);
  try {
    window.localStorage.setItem(LS_KEY, payload);
  } catch {
    /* noop */
  }
  try {
    window.sessionStorage.setItem(LS_KEY, payload);
  } catch {
    /* noop */
  }
  writeCookie(s);
  try {
    channel?.postMessage({ type: "sync", store: s });
  } catch {
    /* noop */
  }
  try {
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: s }));
  } catch {
    /* noop */
  }
}

/** Total de ações consumidas hoje (independente de qual `action`). */
export function getGuestCount(_action?: GuestAction): number {
  return read().used;
}

/** Ações restantes hoje. */
export function guestRemaining(_action?: GuestAction): number {
  return Math.max(0, GUEST_DAILY_LIMIT - read().used);
}

/** true quando o visitante já esgotou a cota diária. */
export function isGuestAtLimit(_action?: GuestAction): boolean {
  if (GUEST_QUOTA_DISABLED) return false;
  return read().used >= GUEST_DAILY_LIMIT;
}

/**
 * Consome 1 uso da cota global. Se `unique` for informado, o mesmo
 * identificador (por ação) só é cobrado uma vez por dia — refresh/reload
 * não gastam cota extra.
 * Retorna `{ blocked }` — quando `blocked=true`, a ação NÃO deve prosseguir.
 */
export function consumeGuest(
  action: GuestAction,
  unique?: string,
): { blocked: boolean; count: number; remaining: number } {
  const s = read();
  const key = unique ? `${action}:${unique.trim().toLowerCase()}` : undefined;

  if (key && s.uniques.includes(key)) {
    // já foi cobrado hoje: não gasta cota, mas respeita o bloqueio global.
    const blocked = s.used >= GUEST_DAILY_LIMIT;
    return { blocked, count: s.used, remaining: Math.max(0, GUEST_DAILY_LIMIT - s.used) };
  }

  if (s.used >= GUEST_DAILY_LIMIT) {
    return { blocked: true, count: s.used, remaining: 0 };
  }

  const next: Store = {
    v: 2,
    day: s.day,
    used: s.used + 1,
    uniques: key ? [...s.uniques, key].slice(-60) : s.uniques,
  };
  write(next);
  return {
    blocked: false,
    count: next.used,
    remaining: Math.max(0, GUEST_DAILY_LIMIT - next.used),
  };
}

/** Reseta a cota (usado ao concluir cadastro/login). */
export function resetGuestQuota(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LS_KEY);
  } catch {
    /* noop */
  }
  try {
    window.sessionStorage.removeItem(LS_KEY);
  } catch {
    /* noop */
  }
  try {
    document.cookie = `${COOKIE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
  } catch {
    /* noop */
  }
  try {
    channel?.postMessage({ type: "sync", store: fresh() });
  } catch {
    /* noop */
  }
}

/**
 * Subscreve mudanças no contador (usado por UIs para mostrar "restam X").
 * Retorna função de unsubscribe.
 */
export function onGuestQuotaChange(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(SYNC_EVENT, handler as EventListener);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(SYNC_EVENT, handler as EventListener);
    window.removeEventListener("storage", handler);
  };
}
