/**
 * Módulo compartilhado de tokenização/normalização de busca.
 * Usado no backend (price-search.functions) e no frontend (HighlightMatch,
 * scoring) — precisa permanecer isomórfico (sem React, sem Supabase).
 */

export type SearchMode = "strict" | "loose";

export const STOPWORDS: ReadonlySet<string> = new Set([
  "de", "da", "do", "das", "dos", "em", "com", "sem", "e", "para", "tipo", "sabor",
  "un", "und", "pc", "pct", "pacote",
  "kg", "g", "gr", "ml", "l", "lt", "litro", "litros",
]);

/** Regex de unidades reconhecidas (para colar número+unidade). */
const UNIT_RE = /(\d+(?:[.,]\d+)?)\s*(kg|g|mg|ml|l|lt|litros?|un|und|unidades?|pct|pack|cx|kit)\b/gi;

/**
 * Cola pares "número + unidade" separados por espaço num único token
 * (ex.: "1 kg" → "1kg", "500 ml" → "500ml", "2 litros" → "2l") e
 * normaliza a unidade para forma curta. Aplicada tanto na query quanto
 * no nome do produto para que a comparação seja consistente
 * independentemente do espaçamento usado pelo digitador.
 */
function compactSizes(text: string): string {
  return text.replace(UNIT_RE, (_m, num: string, unit: string) => {
    const u = unit.toLowerCase();
    const short =
      u === "litro" || u === "litros" || u === "lt" ? "l" :
      u === "und" || u === "unidade" || u === "unidades" ? "un" :
      u;
    return `${num.replace(",", ".")}${short}`;
  });
}

/** NFD → remove diacríticos → lower → cola tamanhos → colapsa whitespace. */
export function normalize(text: string): string {
  if (!text) return "";
  const base = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return compactSizes(base).replace(/\s+/g, " ").trim();
}

/**
 * Tokeniza a query do usuário aplicando a MESMA regra em backend/frontend.
 * - Divide em [^a-z0-9]+
 * - Remove stopwords (`de`, `em`, `com`, `kg`, ...)
 * - Mantém tokens ≥ 2 chars para não perder termos compostos curtos
 *   essenciais após normalização, como "pó" → "po" em "leite em pó".
 */
export function tokenizeQuery(query: string): string[] {
  const n = normalize(query);
  if (!n) return [];
  const raw = n.split(/[^a-z0-9]+/).filter(Boolean);
  return raw.filter((t) => {
    if (t.length < 2) return false;
    if (STOPWORDS.has(t)) return false;
    // Tokens puramente numéricos não representam nome de produto (ruído,
    // códigos, preço). "1kg"/"500ml" continuam válidos porque a unidade
    // colada preserva as letras.
    if (/^\d+$/.test(t)) return false;
    return true;
  });
}

/**
 * Query enxuta para pré-filtros de banco/autocomplete.
 *
 * Mantém a query original para pontuação e sinônimos, mas usa tokens efetivos
 * para evitar que conectivos de palavras compostas ("de", "em") façam o
 * banco descartar produtos válidos antes do filtro principal da aplicação.
 */
export function buildSearchLookupQuery(query: string): string {
  const tokens = tokenizeQuery(query);
  return tokens.length > 0 ? tokens.join(" ") : normalize(query);
}

const RE_ESCAPE = /[.*+?^${}()|[\]\\]/g;
function escapeRegex(s: string): string {
  return s.replace(RE_ESCAPE, "\\$&");
}

/**
 * Cria a regex de match para 1 token contra um texto já normalizado.
 *
 * Regra de segurança contra falsos positivos em buscas curtas:
 * - `strict` (default): palavra inteira sempre (`\bTOKEN\b`).
 *   Ex.: "sal" NÃO casa "salsicha".
 * - `loose`: prefixo de palavra (`\bTOKEN`) MAS apenas se o token tem
 *   ≥ 3 caracteres. Tokens de 1–2 chars ainda são exigidos como palavra
 *   inteira para não virarem substring de qualquer coisa.
 *
 * Independente do modo, tokens com ≥ 6 caracteres ganham prefixo (para
 * casar plurais/variações — "iogurte" ~ "iogurtes").
 */
export function buildTokenMatcher(token: string, mode: SearchMode = "strict"): RegExp {
  const t = normalize(token);
  const esc = escapeRegex(t);
  const longEnough = t.length >= 6;
  const loose = mode === "loose" && t.length >= 3;
  if (longEnough || loose) return new RegExp(`\\b${esc}`, "i");
  return new RegExp(`\\b${esc}\\b`, "i");
}

export type MatchKind = "exact" | "prefix" | "none";

/**
 * Classifica como o token casou no texto (já ou não normalizado).
 * - `exact`: palavra inteira.
 * - `prefix`: início de palavra mas não a palavra inteira.
 * - `none`: sem match.
 */
export function matchKind(token: string, text: string): MatchKind {
  const n = normalize(text);
  const t = normalize(token);
  if (!t || !n) return "none";
  const esc = escapeRegex(t);
  if (new RegExp(`\\b${esc}\\b`, "i").test(n)) return "exact";
  if (new RegExp(`\\b${esc}`, "i").test(n)) return "prefix";
  return "none";
}

export type MatchReason = { token: string; kind: "exact" | "prefix" | "brand" };

/**
 * Retorna as razões de match para renderização ("por que este resultado
 * apareceu"). `brand` é adicionado quando o token bate exatamente com
 * a marca do catálogo (informada separadamente).
 */
export function computeMatchReasons(
  tokens: string[],
  text: string,
  brand?: string | null,
): MatchReason[] {
  const reasons: MatchReason[] = [];
  const brandNorm = brand ? normalize(brand) : "";
  for (const raw of tokens) {
    const t = normalize(raw);
    if (!t) continue;
    if (brandNorm && new RegExp(`\\b${escapeRegex(t)}\\b`, "i").test(brandNorm)) {
      reasons.push({ token: t, kind: "brand" });
      continue;
    }
    const k = matchKind(t, text);
    if (k !== "none") reasons.push({ token: t, kind: k });
  }
  return reasons;
}
