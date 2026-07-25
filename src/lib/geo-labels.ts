// Neighborhood label helpers shared between geolocation UI and geo utilities.

export const NEIGHBORHOOD_LABELS_BY_KEY: Record<string, string> = {
  centro: "Centro",
  "segundo distrito": "Segundo Distrito",
};

export function normalizeNeighborhood(v: string | null | undefined): string {
  return (v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
