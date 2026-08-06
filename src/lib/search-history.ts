/**
 * Histórico de buscas (últimas consultas).
 *
 * Regra de privacidade: só persistimos o histórico para usuários autenticados.
 * Visitantes anônimos usam um armazenamento apenas em memória — ou seja, o
 * histórico desaparece ao atualizar/fechar a página, e nada é gravado no
 * navegador. Use `setSearchHistoryPersistence(true)` após confirmar a sessão.
 */
const KEY = "precocerto:search-history:v1";
const MAX_ITEMS = 15; // Increased for better history tracking

export type SearchHistoryEntry = {
  query: string;
  at: number; // epoch ms
};

let persistEnabled = false;
let memoryStore: SearchHistoryEntry[] = [];

/** Ativa (usuário logado) ou desativa (visitante) a persistência local. */
export function setSearchHistoryPersistence(enabled: boolean): void {
  if (enabled === persistEnabled) return;
  persistEnabled = enabled;
  if (!enabled) {
    memoryStore = [];
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(KEY);
        window.localStorage.removeItem("search:recent-queries");
      } catch {
        /* ignore */
      }
    }
  }
}

export function isSearchHistoryPersistent(): boolean {
  return persistEnabled;
}

function sanitize(list: unknown): SearchHistoryEntry[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter(
      (e): e is SearchHistoryEntry =>
        !!e &&
        typeof (e as SearchHistoryEntry).query === "string" &&
        typeof (e as SearchHistoryEntry).at === "number",
    )
    .slice(0, MAX_ITEMS);
}

function safeRead(): SearchHistoryEntry[] {
  if (!persistEnabled) return memoryStore.slice(0, MAX_ITEMS);
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    return sanitize(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

function safeWrite(entries: SearchHistoryEntry[]): void {
  const next = entries.slice(0, MAX_ITEMS);
  if (!persistEnabled) {
    memoryStore = next;
    return;
  }
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota / privacy mode — ignore */
  }
}

export function getSearchHistory(): SearchHistoryEntry[] {
  return safeRead();
}

export function pushSearchHistory(rawQuery: string): SearchHistoryEntry[] {
  const q = rawQuery.trim().replace(/\s{2,}/g, " ");
  if (q.length < 2) return safeRead();
  const now = Date.now();
  const prev = safeRead().filter((e) => e.query.toLowerCase() !== q.toLowerCase());
  const next = [{ query: q, at: now }, ...prev].slice(0, MAX_ITEMS);
  safeWrite(next);
  return next;
}

export function removeSearchHistory(query: string): SearchHistoryEntry[] {
  const q = query.trim().toLowerCase();
  const next = safeRead().filter((e) => e.query.toLowerCase() !== q);
  safeWrite(next);
  return next;
}

export function clearSearchHistory(): void {
  safeWrite([]);
}
