import { normalize, tokenizeQuery, buildTokenMatcher, matchKind, type SearchMode, type MatchReason } from "./search-tokens";

export type ScanLike = {
  product_name: string;
  price_captured: number | null;
  market_name?: string;
  created_at?: string;
};

/**
 * Filtra uma lista de scans baseada em tokens da query.
 */
export function filterByTokens<T extends ScanLike>(
  rows: T[],
  query: string,
  mode: SearchMode = "strict"
): { tokens: string[]; list: T[] } {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return { tokens, list: rows };

  const matcher = buildTokenMatcher(tokens);
  const list = rows.filter((r) => {
    if (r.price_captured === null) return false;
    return matcher(normalize(r.product_name), mode);
  });

  return { tokens, list };
}

/**
 * Pontuação de relevância para um nome de produto.
 */
export function scoreProductName(
  productName: string,
  tokens: string[],
  brand?: string | null,
  query?: string,
  category?: string | null
): { score: number; reasons: MatchReason[] } {
  if (tokens.length === 0 && !category) return { score: 1, reasons: [] };
  
  const nameNorm = normalize(productName);
  const queryNorm = query ? normalize(query) : "";
  const brandNorm = brand ? normalize(brand) : "";
  const catNorm = category ? normalize(category) : "";

  let exact = 0;
  let prefix = 0;
  let brandHit = 0;
  let categoryHit = false;
  
  const reasons: MatchReason[] = [];

  // Match por categoria (peso alto se a busca for por categoria)
  if (catNorm && nameNorm.includes(catNorm)) {
    categoryHit = true;
    reasons.push({ token: category!, kind: "prefix" });
  }

  for (const raw of tokens) {
    const t = normalize(raw);
    if (!t) continue;
    
    const k = matchKind(t, nameNorm);
    if (k === "exact") exact++;
    else if (k === "prefix") prefix++;

    if (brandNorm && matchKind(t, brandNorm) === "exact") {
      brandHit++;
      reasons.push({ token: t, kind: "brand" });
    } else if (k !== "none") {
      reasons.push({ token: t, kind: k });
    }
  }

  const total = tokens.length || 1;
  const allInName = (exact + prefix) >= total ? 1 : 0;
  
  const nameWordsList = nameNorm.split(/[^a-z0-9]+/).filter(Boolean);
  const nameWords = nameWordsList.length;

  const leadingTokenHits = tokens.reduce((acc, token, idx) => {
    const word = nameWordsList[idx];
    return word && word === normalize(token) ? acc + 1 : acc;
  }, 0);

  const exactQueryBonus = queryNorm && nameNorm === queryNorm ? 15 : 0;
  const phraseBonus = queryNorm && exactQueryBonus === 0 && nameNorm.includes(queryNorm) ? 5.0 : 0;
  const startsWithBonus = queryNorm && exactQueryBonus === 0 && phraseBonus === 0 && nameNorm.startsWith(queryNorm) ? 3.0 : 0;
  
  const categoryBonus = categoryHit ? 8.0 : 0;
  const densityBonus = nameWords > 0 ? Math.min(1, total / nameWords) : 0;
  
  const extra = Math.max(0, nameWords - total - 3);
  const penalty = extra > 0 ? Math.min(2.0, extra * 0.3) : 0;

  const score = 
    exactQueryBonus +
    phraseBonus +
    startsWithBonus +
    categoryBonus +
    4.0 * (exact / total) +
    1.5 * (prefix / total) +
    3.0 * (brandHit / total) +
    1.5 * (leadingTokenHits / total) +
    1.0 * allInName +
    0.5 * densityBonus -
    penalty;

  return { score, reasons };
}

/**
 * Agrupa scans por nome de produto e calcula score.
 */
export function groupAndScore<T extends ScanLike>(
  rows: T[],
  tokens: string[],
  query?: string
) {
  const groups = new Map<string, {
    productName: string;
    scans: T[];
    score: number;
    reasons: MatchReason[];
  }>();

  for (const r of rows) {
    const norm = normalize(r.product_name);
    let g = groups.get(norm);
    if (!g) {
      const { score, reasons } = scoreProductName(r.product_name, tokens, null, query);
      g = { productName: r.product_name, scans: [], score, reasons };
      groups.set(norm, g);
    }
    g.scans.push(r);
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (Math.abs(a.score - b.score) > 0.1) return b.score - a.score;
    return b.scans.length - a.scans.length;
  });
}
