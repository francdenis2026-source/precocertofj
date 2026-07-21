/**
 * Guarda intenção de "adicionar ao carrinho" antes do login.
 * Usado quando um visitante não autenticado clica em "Adicionar à cesta":
 * salvamos aqui, mandamos para /login e, ao voltar autenticado para /,
 * o item é adicionado automaticamente.
 */

const KEY = "precocerto:pending-cart";

export type PendingCartItem = {
  catalogId?: string;
  slug?: string;
  quantity?: number;
  label?: string;
};

export function setPendingCartItem(item: PendingCartItem): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(item));
  } catch {
    /* storage indisponível */
  }
}

export function readPendingCartItem(): PendingCartItem | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingCartItem;
    if (!parsed || (!parsed.catalogId && !parsed.slug)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingCartItem(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function hasPendingCartItem(): boolean {
  return readPendingCartItem() !== null;
}
