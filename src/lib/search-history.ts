/**
 * Persistência local do histórico de buscas do usuário.
 * Guarda as últimas consultas em localStorage para sugerir rapidamente
 * antes do usuário digitar. Sem PII e sem dependências do backend.
 */
const KEY = "precocerto:search-history:v1";
const MAX_ITEMS = 8;

export type SearchHistoryEntry = {
  query: string;
  at: number; // epoch ms
};

function safeRead(): SearchHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e): e is SearchHistoryEntry =>
          !!e &&
          typeof (e as SearchHistoryEntry).query === "string" &&
          typeof (e as SearchHistoryEntry).at === "number",
      )
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function safeWrite(entries: SearchHistoryEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX_ITEMS)));
  } catch {
    /* quota / privacy mode — ignore */
  }
}

export function getSearchHistory(): SearchHistoryEntry[] {
  return safeRead();
}

export function pushSearchHistory(rawQuery: string): SearchHistoryEntry[] {
  const q = rawQuery.trim().replace(/\s{2,}/g, " ").toUpperCase();
  if (q.length < 2) return safeRead();
  const now = Date.now();
  const prev = safeRead().filter((e) => e.query !== q);
  const next = [{ query: q, at: now }, ...prev].slice(0, MAX_ITEMS);
  safeWrite(next);
  return next;
}

export function removeSearchHistory(query: string): SearchHistoryEntry[] {
  const q = query.trim().toUpperCase();
  const next = safeRead().filter((e) => e.query !== q);
  safeWrite(next);
  return next;
}

export function clearSearchHistory(): void {
  safeWrite([]);
}
