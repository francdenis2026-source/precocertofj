/**
 * Rate-limit client-side para tentativas de login.
 *
 * Observação: o backend não expõe primitiva padrão de rate-limit; este limite
 * é uma proteção UX/ad-hoc armazenada em localStorage por CPF. Reduz ataques
 * casuais de brute-force no mesmo navegador — não substitui defesa em camada
 * de servidor, que virá em outra iteração se necessário.
 */

const STORAGE_KEY = "pc.login.attempts.v1";
export const MAX_ATTEMPTS = 5;
export const BLOCK_MINUTES = 5;
const BLOCK_MS = BLOCK_MINUTES * 60 * 1000;

type AttemptRecord = {
  cpf: string; // digits only
  count: number;
  blockedUntil: number | null; // epoch ms
  lastAttempt: number;
};

type Store = Record<string, AttemptRecord>;

function readStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Store;
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota / private mode — ignora */
  }
}

export type BlockStatus = {
  blocked: boolean;
  remainingMs: number;
  remainingSeconds: number;
  attemptsUsed: number;
  attemptsLeft: number;
};

export function getBlockStatus(cpfDigits: string): BlockStatus {
  const store = readStore();
  const rec = store[cpfDigits];
  const now = Date.now();
  if (!rec) {
    return {
      blocked: false,
      remainingMs: 0,
      remainingSeconds: 0,
      attemptsUsed: 0,
      attemptsLeft: MAX_ATTEMPTS,
    };
  }
  if (rec.blockedUntil && rec.blockedUntil > now) {
    const remainingMs = rec.blockedUntil - now;
    return {
      blocked: true,
      remainingMs,
      remainingSeconds: Math.ceil(remainingMs / 1000),
      attemptsUsed: rec.count,
      attemptsLeft: 0,
    };
  }
  return {
    blocked: false,
    remainingMs: 0,
    remainingSeconds: 0,
    attemptsUsed: rec.count,
    attemptsLeft: Math.max(0, MAX_ATTEMPTS - rec.count),
  };
}

export function registerFailure(cpfDigits: string): BlockStatus {
  const store = readStore();
  const now = Date.now();
  const prev = store[cpfDigits];
  const count = (prev?.count ?? 0) + 1;
  const blockedUntil = count >= MAX_ATTEMPTS ? now + BLOCK_MS : null;
  store[cpfDigits] = {
    cpf: cpfDigits,
    count,
    blockedUntil,
    lastAttempt: now,
  };
  writeStore(store);
  return getBlockStatus(cpfDigits);
}

export function clearAttempts(cpfDigits: string): void {
  const store = readStore();
  if (store[cpfDigits]) {
    delete store[cpfDigits];
    writeStore(store);
  }
}

export function formatCountdown(remainingSeconds: number): string {
  const m = Math.floor(remainingSeconds / 60);
  const s = remainingSeconds % 60;
  if (m <= 0) return `${s}s`;
  return `${m}min ${s.toString().padStart(2, "0")}s`;
}
