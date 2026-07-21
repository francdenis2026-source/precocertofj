/**
 * Encurta nomes de mercados para exibição compacta em cards.
 * Ex.: "Mercantil Wanderley" → "Wanderley"
 *      "Supermercado Central" → "Central"
 *      "Mercado São João" → "São João"
 */
const PREFIXES = [
  "mercantil",
  "supermercado",
  "supermercados",
  "hipermercado",
  "mercado",
  "mini mercado",
  "minimercado",
  "empório",
  "emporio",
  "atacadão",
  "atacadao",
  "atacado",
];

export function shortenStoreName(name: string | null | undefined): string {
  if (!name) return "";
  const raw = name.trim();
  const lower = raw.toLowerCase();
  for (const p of PREFIXES) {
    if (lower.startsWith(p + " ")) {
      return raw.slice(p.length + 1).trim();
    }
  }
  return raw;
}
