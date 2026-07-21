/**
 * Lógica pura de filtragem/pontuação de resultados de busca.
 * Não depende de Supabase nem de React — isolada para testes unitários.
 */

import {
  buildTokenMatcher,
  computeMatchReasons,
  matchKind,
  normalize,
  tokenizeQuery,
  type MatchReason,
  type SearchMode,
} from "./search-tokens";

export type ScanLike = {
  product_name: string | null;
  price_captured: number | null;
  market_name: string | null;
  created_at: string;
  // marca opcional (usada para bonificar match de marca).
  brand?: string | null;
};

export type ScoredGroup = {
  productName: string;
  brand: string | null;
  score: number;
  matchReasons: MatchReason[];
  rows: ScanLike[];
};

/** Filtra scans exigindo TODOS os tokens em modo strict/loose. */
export function filterByTokens<T extends ScanLike>(
  rows: T[],
  query: string,
  mode: SearchMode = "strict",
): { tokens: string[]; matchers: RegExp[]; list: T[] } {
  const tokens = tokenizeQuery(query);
  const matchers = tokens.map((t) => buildTokenMatcher(t, mode));
  if (matchers.length === 0) return { tokens, matchers, list: rows };
  const list = rows.filter((r) => {
    if (r.price_captured == null || Number(r.price_captured) <= 0) return false;
    const n = normalize(r.product_name ?? "");
    if (!n) return false;
    return matchers.every((re) => re.test(n));
  });
  return { tokens, matchers, list };
}

/**
 * Pontuação de relevância para um nome de produto.
 * Prioriza correspondência exata; penaliza nomes muito longos/ruidosos.
 *
 *   score =
 *       2.0 * (tokens exatos / total)
 *     + 0.8 * (tokens prefixo / total)
 *     + 1.5 * (tokens exatos na marca / total)
 *     + 0.3 * (todos aparecem no nome)
 *     - 0.5 * (nome tem > 3 palavras extras)
 */
export function scoreProductName(
  productName: string,
  tokens: string[],
  brand?: string | null,
  query?: string,
): { score: number; reasons: MatchReason[] } {
  if (tokens.length === 0) return { score: 1, reasons: [] };
  const nameNorm = normalize(productName);
  const queryNorm = query ? normalize(query) : "";
  const brandNorm = brand ? normalize(brand) : "";
  let exact = 0;
  let prefix = 0;
  let brandHit = 0;
  const reasons: MatchReason[] = [];
  for (const raw of tokens) {
    const t = normalize(raw);
    if (!t) continue;
    const k = matchKind(t, nameNorm);
    if (k === "exact") exact++;
    else if (k === "prefix") prefix++;
    // Bônus separado para marca.
    if (brandNorm && matchKind(t, brandNorm) === "exact") {
      brandHit++;
      reasons.push({ token: t, kind: "brand" });
    } else if (k !== "none") {
      reasons.push({ token: t, kind: k });
    }
  }
  const total = tokens.length;
  const allInName = exact + prefix >= total ? 1 : 0;
  const nameWordsList = nameNorm.split(/[^a-z0-9]+/).filter(Boolean);
  const nameWords = nameWordsList.length;
  const leadingTokenHits = tokens.reduce((acc, token, idx) => {
    const word = nameWordsList[idx];
    return word && word === normalize(token) ? acc + 1 : acc;
  }, 0);
  const exactQueryBonus = queryNorm && nameNorm === queryNorm ? 6 : 0;
  const phraseBonus =
    queryNorm && exactQueryBonus === 0 && new RegExp(`(^|[^a-z0-9])${queryNorm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(nameNorm)
      ? 2.5
      : 0;
  const startsWithBonus =
    queryNorm && exactQueryBonus === 0 && phraseBonus === 0 && nameNorm.startsWith(queryNorm)
      ? 1.4
      : 0;
  const densityBonus = nameWords > 0 ? Math.min(1, total / nameWords) : 0;
  const extra = Math.max(0, nameWords - total - 3);
  const penalty = extra > 0 ? Math.min(1.5, extra * 0.25) : 0;
  const score =
    exactQueryBonus +
    phraseBonus +
    startsWithBonus +
    3.2 * (exact / total) +
    0.9 * (prefix / total) +
    2.2 * (brandHit / total) +
    0.7 * (leadingTokenHits / total) +
    0.6 * allInName +
    0.4 * densityBonus -
    penalty;
  return { score, reasons };
}

/**
 * Agrupa scans filtrados por nome (case/acento-insensível) e devolve
 * grupos ordenados por relevância → nº de amostras → menor preço.
 */
export function groupAndScore<T extends ScanLike>(
  filteredList: T[],
  tokens: string[],
  query?: string,
): ScoredGroup[] {
  const byKey = new Map<string, { display: string; brand: string | null; rows: T[] }>();
  for (const r of filteredList) {
    const raw = (r.product_name ?? "").trim();
    if (!raw) continue;
    const key = normalize(raw);
    const cur = byKey.get(key) ?? { display: raw, brand: r.brand ?? null, rows: [] };
    cur.rows.push(r);
    if (!cur.brand && r.brand) cur.brand = r.brand;
    byKey.set(key, cur);
  }
  const groups: ScoredGroup[] = Array.from(byKey.values()).map((g) => {
    const { score, reasons } = scoreProductName(g.display, tokens, g.brand, query);
    return {
      productName: g.display,
      brand: g.brand,
      score,
      matchReasons: reasons,
      rows: g.rows,
    };
  });
  groups.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.rows.length !== a.rows.length) return b.rows.length - a.rows.length;
    const aMin = Math.min(...a.rows.map((r) => Number(r.price_captured)));
    const bMin = Math.min(...b.rows.map((r) => Number(r.price_captured)));
    return aMin - bMin;
  });
  return groups;
}

/** Helper de conveniência: reason-set pronto para renderização. */
export function reasonsFor(text: string, tokens: string[], brand?: string | null) {
  return computeMatchReasons(tokens, text, brand);
}
