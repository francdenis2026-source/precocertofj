import { scoreProductName } from "@/lib/search-scoring";
import { buildTokenMatcher, normalize, tokenizeQuery } from "@/lib/search-tokens";
import {
  buildSynonymIndex,
  nameHasExcludedToken,
  nameStartsWithPrimarySynonym,
  resolveSynonymGroup,
} from "@/lib/search-synonyms";

export type ComparisonSearchStore = {
  product_name: string;
};

export type ComparisonSearchRow = {
  display_name: string;
  product_key: string;
  min_price: number;
  category?: string | null;
  stores?: ComparisonSearchStore[] | null;
};

function rowSearchText(row: ComparisonSearchRow): string {
  const storeProductNames = Array.isArray(row.stores)
    ? row.stores.map((store) => store.product_name).join(" ")
    : "";
  return `${row.display_name} ${row.product_key} ${storeProductNames}`;
}

function rowStartsWithPrimarySynonym(
  row: ComparisonSearchRow,
  group: NonNullable<ReturnType<typeof resolveSynonymGroup>>,
): boolean {
  if (nameStartsWithPrimarySynonym(row.display_name, group)) return true;
  return (
    Array.isArray(row.stores) &&
    row.stores.some((store) => nameStartsWithPrimarySynonym(store.product_name, group))
  );
}

function rowHasExcludedToken(
  row: ComparisonSearchRow,
  group: NonNullable<ReturnType<typeof resolveSynonymGroup>>,
): boolean {
  if (nameHasExcludedToken(row.display_name, group)) return true;
  return (
    Array.isArray(row.stores) &&
    row.stores.some((store) => nameHasExcludedToken(store.product_name, group))
  );
}

export function filterAndSortComparisonRows<T extends ComparisonSearchRow>(
  rows: T[],
  query: string,
  category: string,
): T[] {
  const tokens = tokenizeQuery(query);
  const tokenMatchers = tokens.map((token) => buildTokenMatcher(token, "strict"));
  const synonymGroup = resolveSynonymGroup(tokens, buildSynonymIndex(), query);
  let filtered = rows;

  if (category) {
    filtered = filtered.filter((row) => (row.category ?? "outros") === category);
  }

  if (tokenMatchers.length > 0) {
    filtered = filtered.filter((row) => {
      const haystack = normalize(rowSearchText(row));
      if (!tokenMatchers.every((matcher) => matcher.test(haystack))) return false;
      if (!synonymGroup) return true;
      return rowStartsWithPrimarySynonym(row, synonymGroup) && !rowHasExcludedToken(row, synonymGroup);
    });
  }

  return [...filtered].sort((a, b) => {
    if (tokens.length > 0) {
      const aScore = scoreProductName(a.display_name, tokens, null, query).score;
      const bScore = scoreProductName(b.display_name, tokens, null, query).score;
      if (bScore !== aScore) return bScore - aScore;
    }
    return Number(a.min_price) - Number(b.min_price);
  });
}