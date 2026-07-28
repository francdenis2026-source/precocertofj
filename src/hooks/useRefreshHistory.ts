import { useCallback, useEffect, useState } from "react";

export type RefreshHistoryEntry = {
  ts: number;
  status: "success" | "error" | "timeout";
  durationMs: number;
  errorCode?: string;
  rpc?: string;
};

const KEY_PREFIX = "pc:refresh:";
const MAX_ENTRIES = 10;

function readAll(scope: string): RefreshHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + scope);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is RefreshHistoryEntry =>
        e && typeof e.ts === "number" && typeof e.durationMs === "number",
    );
  } catch {
    return [];
  }
}

/**
 * Persiste os últimos {@link MAX_ENTRIES} refreshes de um painel em localStorage
 * sob a chave `pc:refresh:<scope>`. Sobrevive a recarregamentos e permite
 * exibir a última consulta + histórico curto no tooltip do botão.
 */
export function useRefreshHistory(scope: string) {
  const [history, setHistory] = useState<RefreshHistoryEntry[]>(() => readAll(scope));

  // Sincroniza quando o scope muda (ex: navegação entre painéis).
  useEffect(() => {
    setHistory(readAll(scope));
  }, [scope]);

  const record = useCallback(
    (entry: Omit<RefreshHistoryEntry, "ts"> & { ts?: number }) => {
      const full: RefreshHistoryEntry = {
        ts: entry.ts ?? Date.now(),
        status: entry.status,
        durationMs: entry.durationMs,
        errorCode: entry.errorCode,
        rpc: entry.rpc,
      };
      setHistory((prev) => {
        const next = [full, ...prev].slice(0, MAX_ENTRIES);
        try {
          if (typeof window !== "undefined") {
            window.localStorage.setItem(KEY_PREFIX + scope, JSON.stringify(next));
          }
        } catch {
          /* quota / privacy mode — silencioso */
        }
        return next;
      });
      return full;
    },
    [scope],
  );

  const last = history[0];

  return { history, last, record };
}
