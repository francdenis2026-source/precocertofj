import { createServerFn } from "@tanstack/react-start";
import { scoreProductName } from "@/lib/search-scoring";
import { buildSearchLookupQuery, tokenizeQuery } from "@/lib/search-tokens";
import {
  buildSynonymIndex,
  nameHasExcludedToken,
  nameStartsWithPrimarySynonym,
  resolveSynonymGroup,
} from "@/lib/search-synonyms";

export type ProductSuggestion = {
  id: string;
  displayName: string;
  brand: string | null;
  category: string | null;
  imageUrl: string | null;
  isFuzzy: boolean;
  similarity: number;
};

/**
 * Lightweight autocomplete for the product search input.
 * Uses the existing `search_catalog_suggestions` Postgres function which is
 * accent-insensitive (unaccent) and matches by name/brand/category tokens,
 * so "cafe" ↔ "café" and "aca" ↔ "açaí" both work. When no strict match is
 * found, it falls back to a trigram (pg_trgm) similarity search and marks
 * those rows with `isFuzzy = true` so the UI can render a "Você quis dizer …?"
 * confirmation hint.
 */
export const suggestProducts = createServerFn({ method: "POST" })
  .inputValidator((input: { query: string }) => {
    const q = String(input?.query ?? "").trim().slice(0, 80);
    return { query: q };
  })
  .handler(async ({ data }): Promise<ProductSuggestion[]> => {
    if (data.query.length < 2) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const lookupQuery = buildSearchLookupQuery(data.query);
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
    const tokens = tokenizeQuery(data.query);
    const synonymGroup = resolveSynonymGroup(tokens, buildSynonymIndex(), data.query);
    const mapped = ((rows ?? []) as Row[]).map((r) => ({
      id: r.id,
      displayName: r.display_name,
      brand: r.brand,
      category: r.category,
      imageUrl: r.image_url,
      isFuzzy: Boolean(r.is_fuzzy),
      similarity: typeof r.similarity === "number" ? r.similarity : 0,
      _score: scoreProductName(r.display_name, tokens, r.brand, data.query).score,
    }));
    const filtered = synonymGroup
      ? mapped.filter(
          (r) =>
            nameStartsWithPrimarySynonym(r.displayName, synonymGroup) &&
            !nameHasExcludedToken(r.displayName, synonymGroup),
        )
      : mapped;
    const result = filtered
      .sort((a, b) =>
        b._score - a._score ||
        Number(a.isFuzzy) - Number(b.isFuzzy) ||
        b.similarity - a.similarity ||
        a.displayName.localeCompare(b.displayName, "pt-BR"),
      )
      .slice(0, 8)
      .map(({ _score: _score, ...row }) => row);
    // Assina URLs do bucket privado `logos` para exibir capas no cliente.
    await Promise.all(
      result.map(async (s) => {
        if (!s.imageUrl) return;
        const m = s.imageUrl.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/?#]+)\/([^?#]+)/);
        if (!m) return;
        const bucket = decodeURIComponent(m[1]);
        const path = decodeURIComponent(m[2]);
        if (bucket !== "logos" && bucket !== "scans") return;
        const { data: signed } = await supabaseAdmin.storage
          .from(bucket)
          .createSignedUrl(path, 60 * 60 * 24 * 7);
        if (signed?.signedUrl) s.imageUrl = signed.signedUrl;
      }),
    );
    return result;
  });

