import { scoreProductName } from "@/lib/search-scoring";
import { buildSearchLookupQuery, tokenizeQuery } from "@/lib/search-tokens";
import {
  buildSynonymIndex,
  nameHasExcludedToken,
  nameStartsWithPrimarySynonym,
  resolveSynonymGroup,
} from "@/lib/search-synonyms";
import { getSignedUrlCached } from "@/lib/signed-url-cache.server";

export type ProductSuggestion = {
  id: string;
  displayName: string;
  brand: string | null;
  category: string | null;
  imageUrl: string | null;
  isFuzzy: boolean;
  similarity: number;
};

/** Cache curto do autocomplete — deixa a digitação praticamente instantânea. */
const suggestCache = new Map<string, { at: number; value: ProductSuggestion[] }>();
const TTL_MS = 60_000;
const MAX_ENTRIES = 200;

export async function performSuggest(query: string): Promise<ProductSuggestion[]> {
  if (query.length < 2) return [];
  const key = query.toLowerCase();
  const hit = suggestCache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const lookupQuery = buildSearchLookupQuery(query);
  const { data: rows, error } = await supabaseAdmin.rpc(
    "search_catalog_suggestions" as never,
    { _q: lookupQuery, _limit: 20 } as never,
  );
  if (error) throw new Error(error.message);

  type Row = {
    id: string;
    display_name: string;
    brand: string | null;
    category: string | null;
    image_url: string | null;
    is_fuzzy: boolean | null;
    similarity: number | null;
  };
  const tokens = tokenizeQuery(query);
  const synonymGroup = resolveSynonymGroup(tokens, buildSynonymIndex(), query);
  const mapped = ((rows ?? []) as Row[]).map((r) => ({
    id: r.id,
    displayName: r.display_name,
    brand: r.brand,
    category: r.category,
    imageUrl: r.image_url,
    isFuzzy: Boolean(r.is_fuzzy),
    similarity: typeof r.similarity === "number" ? r.similarity : 0,
    _score: scoreProductName(r.display_name, tokens, r.brand, query).score,
  }));
  const filtered = synonymGroup
    ? mapped.filter(
        (r) =>
          nameStartsWithPrimarySynonym(r.displayName, synonymGroup) &&
          !nameHasExcludedToken(r.displayName, synonymGroup),
      )
    : mapped;
  const result: ProductSuggestion[] = filtered
    .sort(
      (a, b) =>
        b._score - a._score ||
        Number(a.isFuzzy) - Number(b.isFuzzy) ||
        b.similarity - a.similarity ||
        a.displayName.localeCompare(b.displayName, "pt-BR"),
    )
    .slice(0, 8)
    .map(({ _score: _score, ...row }) => row);

  // Assina URLs do bucket privado `logos` (com cache) para exibir capas.
  await Promise.all(
    result.map(async (s) => {
      const signed = await getSignedUrlCached(supabaseAdmin, s.imageUrl);
      if (signed) s.imageUrl = signed;
    }),
  );

  if (suggestCache.size >= MAX_ENTRIES) {
    const oldest = suggestCache.keys().next().value;
    if (oldest) suggestCache.delete(oldest);
  }
  suggestCache.set(key, { at: Date.now(), value: result });
  return result;
}
