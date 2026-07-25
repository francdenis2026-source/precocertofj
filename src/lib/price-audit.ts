/**
 * Auditoria de consistência de preços do comparador.
 *
 * Roda no cliente a cada busca e detecta as três classes de falha que já
 * causaram divergência entre o card "Menor preço agora" e o ranking:
 *
 *  1. Faixa invertida — `min_price` maior que `max_price` (dado corrompido no
 *     cache de comparação).
 *  2. Divergência entre fontes — o menor preço agregado no cache não bate com
 *     o menor preço da lista detalhada por loja, ou o card exibe preço/loja
 *     diferente do primeiro item do ranking equivalente.
 *  3. Falta de loja no cache — `store_count` promete mais mercados do que a
 *     lista detalhada entrega (ou a lista vem vazia com um menor preço
 *     declarado), o que faz o ranking perder o mercado mais barato.
 *
 * É puro (sem React/rede) para poder ser coberto por testes de integração.
 */

/** Tolerância de centavos — evita alarme por arredondamento de float. */
const EPS = 0.005;

export type AuditStore = {
  store_name: string;
  establishment_id?: string | null;
  price: number;
};

export type AuditRow = {
  display_name: string;
  min_price: number | string | null;
  max_price?: number | string | null;
  cheapest_store?: string | null;
  store_count?: number | string | null;
  stores?: AuditStore[] | null;
};

export type AuditCard = {
  price: number | null;
  storeName?: string | null;
};

export type AuditRanking = {
  label: string;
  cheapest: AuditStore;
  stores: AuditStore[];
};

export type AuditIssueCode =
  | "inverted-range"
  | "source-divergence"
  | "missing-store-in-cache"
  | "card-ranking-divergence"
  | "ranking-unsorted";

export type AuditIssue = {
  code: AuditIssueCode;
  severity: "warn" | "critical";
  product: string;
  message: string;
};

const num = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const brl = (n: number) =>
  `R$ ${n.toFixed(2).replace(".", ",")}`;

/** Auditoria de uma linha do cache de comparação. */
export function auditRow(row: AuditRow): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const product = row.display_name;
  const min = num(row.min_price);
  const max = num(row.max_price);

  if (min != null && max != null && min - max > EPS) {
    issues.push({
      code: "inverted-range",
      severity: "critical",
      product,
      message: `Faixa invertida: menor ${brl(min)} é maior que o maior ${brl(max)}.`,
    });
  }

  const stores = (row.stores ?? []).filter((s) => num(s.price) != null);
  if (stores.length > 0 && min != null) {
    const detailMin = Math.min(...stores.map((s) => Number(s.price)));
    if (Math.abs(detailMin - min) > EPS) {
      issues.push({
        code: "source-divergence",
        severity: "critical",
        product,
        message: `Menor preço do cache (${brl(min)}) difere do menor preço por loja (${brl(detailMin)}).`,
      });
    }
  }

  const declared = Number(row.store_count);
  if (Number.isFinite(declared) && declared > 0) {
    if (stores.length === 0) {
      issues.push({
        code: "missing-store-in-cache",
        severity: "warn",
        product,
        message: `Cache sem detalhamento por loja (${declared} mercado(s) declarados).`,
      });
    } else if (declared > stores.length) {
      issues.push({
        code: "missing-store-in-cache",
        severity: "warn",
        product,
        message: `Faltam ${declared - stores.length} mercado(s) na lista detalhada (${stores.length}/${declared}).`,
      });
    }
  }

  return issues;
}

/** Confere se o card resumo aponta exatamente o topo do ranking equivalente. */
export function auditCardAgainstRanking(
  card: AuditCard,
  ranking: AuditRanking,
): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const top = ranking.cheapest;
  const cardPrice = num(card.price);
  const topPrice = num(top?.price);

  if (topPrice == null) return issues;

  if (cardPrice == null || Math.abs(cardPrice - topPrice) > EPS) {
    issues.push({
      code: "card-ranking-divergence",
      severity: "critical",
      product: ranking.label,
      message: `Card mostra ${cardPrice == null ? "—" : brl(cardPrice)} e o ranking mostra ${brl(topPrice)}.`,
    });
  }

  const cardStore = (card.storeName ?? "").trim().toLowerCase();
  const topStore = (top.store_name ?? "").trim().toLowerCase();
  if (cardStore && topStore && cardStore !== topStore) {
    issues.push({
      code: "card-ranking-divergence",
      severity: "critical",
      product: ranking.label,
      message: `Card aponta "${card.storeName}" e o ranking aponta "${top.store_name}".`,
    });
  }

  for (let i = 1; i < ranking.stores.length; i += 1) {
    if (Number(ranking.stores[i].price) - Number(ranking.stores[i - 1].price) < -EPS) {
      issues.push({
        code: "ranking-unsorted",
        severity: "warn",
        product: ranking.label,
        message: "Ranking fora de ordem crescente de preço.",
      });
      break;
    }
  }

  return issues;
}

export type AuditReport = {
  issues: AuditIssue[];
  criticalCount: number;
  warnCount: number;
};

/**
 * Auditoria completa executada a cada pesquisa.
 * `maxRows` limita o custo em buscas amplas (as linhas vêm ordenadas por
 * relevância, então as primeiras são as que o usuário realmente lê).
 */
export function auditPriceConsistency(input: {
  rows: AuditRow[];
  ranking?: AuditRanking | null;
  card?: AuditCard | null;
  maxRows?: number;
}): AuditReport {
  const { rows, ranking, card, maxRows = 30 } = input;
  const issues: AuditIssue[] = [];

  for (const row of rows.slice(0, maxRows)) issues.push(...auditRow(row));
  if (ranking && card) issues.push(...auditCardAgainstRanking(card, ranking));

  return {
    issues,
    criticalCount: issues.filter((i) => i.severity === "critical").length,
    warnCount: issues.filter((i) => i.severity === "warn").length,
  };
}
