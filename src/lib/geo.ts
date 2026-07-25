// Geographic utilities — distance estimation for Feijó/AC establishments.
// Uses store lat/lng when available and falls back to neighborhood centroids
// so distance stays useful while store coordinates are not yet cadastrados.

export type LatLng = { lat: number; lng: number };

/**
 * Approximate centroids for known Feijó/AC neighborhoods.
 * These are used only as a fallback when an establishment has no lat/lng
 * captured. Values are intentionally rounded — the goal is a useful "near/far"
 * signal, not a routing-grade coordinate.
 */
const NEIGHBORHOOD_CENTROIDS: Record<string, LatLng> = {
  centro: { lat: -8.1653, lng: -70.3538 },
  "segundo distrito": { lat: -8.1573, lng: -70.348 },
};

const CITY_FALLBACK: LatLng = { lat: -8.1653, lng: -70.3538 }; // Feijó/AC

function normalizeKey(v: string | null | undefined): string {
  return (v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Resolves the best position we have for an establishment:
 * real coords → neighborhood centroid → city fallback.
 */
export function resolveEstablishmentPosition(input: {
  latitude?: number | null;
  longitude?: number | null;
  neighborhood?: string | null;
}): { position: LatLng; source: "exact" | "neighborhood" | "city" } {
  if (
    typeof input.latitude === "number" &&
    typeof input.longitude === "number" &&
    Number.isFinite(input.latitude) &&
    Number.isFinite(input.longitude)
  ) {
    return { position: { lat: input.latitude, lng: input.longitude }, source: "exact" };
  }
  const nb = NEIGHBORHOOD_CENTROIDS[normalizeKey(input.neighborhood)];
  if (nb) return { position: nb, source: "neighborhood" };
  return { position: CITY_FALLBACK, source: "city" };
}

/** Haversine distance in kilometers. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Format distance for UI: <1km → "480 m", else "1,2 km". */
export function formatDistance(km: number): string {
  if (!Number.isFinite(km) || km < 0) return "";
  if (km < 1) {
    const m = Math.max(10, Math.round(km * 1000 / 10) * 10);
    return `${m} m`;
  }
  return `${km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
}

export const KNOWN_NEIGHBORHOODS = Object.keys(NEIGHBORHOOD_CENTROIDS);
