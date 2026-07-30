/**
 * Região do usuário para enriquecer eventos de busca (`search_query`).
 *
 * Lê a mesma chave persistida por `useUserLocation` (sessionStorage) sem
 * montar o hook — assim qualquer chamada de `trackEvent` pode anexar a
 * região sem depender do ciclo de vida do React.
 */
import { NEIGHBORHOOD_LABELS_BY_KEY, normalizeNeighborhood } from "@/lib/geo-labels";

const STORAGE_KEY = "pc:user-location:v1";

/** Chave normalizada do bairro atual, ou `null` quando desconhecida. */
export function getStoredRegionKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { neighborhoodKey?: string | null };
    const key = normalizeNeighborhood(parsed?.neighborhoodKey ?? null);
    return key ? key : null;
  } catch {
    return null;
  }
}

/** Rótulo amigável de uma chave de região. */
export function regionLabel(key: string | null | undefined): string {
  if (!key) return "Sem região";
  return NEIGHBORHOOD_LABELS_BY_KEY[key] ?? key.replace(/\b\w/g, (c) => c.toUpperCase());
}
