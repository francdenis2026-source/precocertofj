import { useCallback } from "react";
import { useSession } from "@/hooks/useSession";

const STORAGE_KEY = "pc.teaser.quota.v1";
const SEEN_KEY = "pc.teaser.quota.seen.v1";
const EVENT_NAME = "pc:teaser-quota-changed";
const DEFAULT_LIMIT = 3;

function readCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    return Number(window.sessionStorage.getItem(STORAGE_KEY) ?? "0") || 0;
  } catch {
    return 0;
  }
}

function writeCount(value: number): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, String(value));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    /* ignore */
  }
}

function readSeen(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.sessionStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function writeSeen(set: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SEEN_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

/**
 * Cota de "curiosidade" por sessão para visitantes.
 * - Usuários autenticados nunca estouram a cota.
 * - `consume()` gasta 1 unidade — use em cliques reais (revelar detalhes,
 *   abrir comparativo etc.), não em `useEffect` de carregamento de página.
 * - `consumeOnce(key)` só gasta uma vez por `key` na sessão (ideal para
 *   "primeira visita a produto X"), evitando gastar de novo em refresh.
 * - Todos os hooks montados escutam `pc:teaser-quota-changed` para
 *   refletir mudanças em tempo real (badge, listas, paywall inline).
 */
export function useTeaserQuota(limit: number = DEFAULT_LIMIT) {
  const { loading } = useSession();
  // Busca é 100% grátis para qualquer usuário — visitante ou autenticado.
  // O cadastro só é exigido em fluxos de comparação de listas de preços.
  // Mantemos a API do hook para não quebrar chamadas existentes.
  const reset = useCallback(() => {
    writeCount(0);
    writeSeen(new Set());
  }, []);
  return {
    used: 0,
    limit,
    remaining: limit,
    exceeded: false,
    isVisitor: false,
    consume: () => {},
    consumeOnce: (_key: string) => false,
    reset,
    loading,
  };
}
