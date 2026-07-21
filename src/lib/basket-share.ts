import type { EssentialKey } from "./basket.functions";

/**
 * Codificação compacta do estado da cesta na URL (querystring).
 * Formato de quantidades: "arroz:2,feijao:1,cafe:3"
 * Formato de filtros: JSON serializado curto.
 */

export type ShareableBasketState = {
  mode?: "compare" | "budget" | "manual";
  quantities?: Partial<Record<EssentialKey, number>>;
  budget?: number;
  city?: string;
  radiusKm?: number;
  minCoverage?: number;
  missingMode?: "zero" | "ignore" | "estimate";
};

export function encodeQuantities(qty: Partial<Record<string, number>>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(qty)) {
    const n = Math.max(0, Math.min(20, Math.floor(Number(v) || 0)));
    if (n > 0) parts.push(`${k}:${n}`);
  }
  return parts.join(",");
}

export function decodeQuantities(raw: string): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw) return out;
  for (const seg of raw.split(",")) {
    const [k, v] = seg.split(":");
    if (!k) continue;
    const n = Math.max(0, Math.min(20, Math.floor(Number(v) || 0)));
    if (n > 0) out[k.trim()] = n;
  }
  return out;
}

/**
 * Constrói uma URL absoluta compartilhável para o estado atual da cesta.
 */
export function buildShareUrl(
  origin: string,
  state: ShareableBasketState,
): string {
  const params = new URLSearchParams();
  if (state.mode) params.set("mode", state.mode);
  if (state.quantities) {
    const q = encodeQuantities(state.quantities);
    if (q) params.set("q", q);
  }
  if (state.budget && state.budget > 0) params.set("budget", String(state.budget));
  if (state.city) params.set("city", state.city);
  if (state.radiusKm && state.radiusKm > 0)
    params.set("radius", String(state.radiusKm));
  if (state.minCoverage && state.minCoverage > 0)
    params.set("mincov", String(state.minCoverage));
  if (state.missingMode && state.missingMode !== "zero")
    params.set("miss", state.missingMode);
  const qs = params.toString();
  return qs ? `${origin}/cesta-basica?${qs}` : `${origin}/cesta-basica`;
}
