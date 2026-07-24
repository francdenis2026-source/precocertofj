/**
 * Sistema unificado de "intenções pendentes de autenticação".
 *
 * Quando um visitante sem sessão dispara uma ação que exige login (favoritar,
 * denunciar preço, etc.), guardamos a intenção aqui, mandamos para /login e,
 * depois do login, a tela alvo consome a intenção e executa a ação
 * automaticamente. Assim o usuário não precisa refazer o clique.
 *
 * Diferente de `pending-cart.ts` (específico da cesta), este módulo é genérico
 * — cada consumidor decide como executar sua intenção via `consumeAuthIntent`.
 */

const KEY = "precocerto:auth-intent";

export type AuthIntentKind =
  | "favorite-panel"       // Favoritar produto do Painel de Preços (home)
  | "favorite-item"        // Favoritar item do catálogo
  | "favorite-district"    // Favoritar bairro no mapa
  | "report-price"         // Denunciar preço em melhores-precos
  | "checkout-plan";       // Assinar plano

export type AuthIntent = {
  kind: AuthIntentKind;
  /** Payload livre — cada consumidor tipa o seu. */
  payload?: Record<string, unknown>;
  /** Rota para onde voltar após o login (mesma origem, começando com "/"). */
  returnTo?: string;
  /** Timestamp — intenções antigas (>15min) são descartadas. */
  ts: number;
};

const MAX_AGE_MS = 15 * 60 * 1000;

export function setAuthIntent(
  intent: Omit<AuthIntent, "ts"> & { ts?: number },
): void {
  if (typeof window === "undefined") return;
  try {
    const full: AuthIntent = { ...intent, ts: intent.ts ?? Date.now() };
    window.sessionStorage.setItem(KEY, JSON.stringify(full));
  } catch {
    /* sessionStorage indisponível */
  }
}

export function readAuthIntent(): AuthIntent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthIntent;
    if (!parsed || !parsed.kind) return null;
    if (Date.now() - (parsed.ts ?? 0) > MAX_AGE_MS) {
      window.sessionStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearAuthIntent(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Consome (lê + apaga) uma intenção pendente de um tipo específico.
 * Retorna null quando não há intenção do tipo pedido.
 */
export function consumeAuthIntent<K extends AuthIntentKind>(
  kind: K,
): AuthIntent | null {
  const current = readAuthIntent();
  if (!current || current.kind !== kind) return null;
  clearAuthIntent();
  return current;
}
