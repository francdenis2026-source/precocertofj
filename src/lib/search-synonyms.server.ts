import type { SynonymGroup } from "@/lib/search-synonyms";

/**
 * Cache curto por instância do servidor para grupos de sinônimos cadastrados.
 * Mantém a função de busca fina: o runtime/cache vive fora do arquivo
 * `*.functions.ts` e pode ser reaproveitado por outras buscas server-side.
 */
type CachedGroups = { at: number; groups: SynonymGroup[] };

const SYNONYM_TTL_MS = 10_000;
let synonymCache: CachedGroups | null = null;

export async function getSynonymGroupsCached(
  supabaseAdmin: { from: (t: string) => unknown },
): Promise<SynonymGroup[]> {
  const now = Date.now();
  if (synonymCache && now - synonymCache.at < SYNONYM_TTL_MS) {
    return synonymCache.groups;
  }

  const client = supabaseAdmin as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (c: string, v: boolean) => Promise<{
          data: Array<{
            canonical: string;
            synonyms: string[] | null;
            exclude_tokens: string[] | null;
          }> | null;
          error: { message: string } | null;
        }>;
      };
    };
  };

  const { data, error } = await client
    .from("search_synonym_groups")
    .select("canonical, synonyms, exclude_tokens")
    .eq("active", true);

  if (error) {
    return synonymCache?.groups ?? [];
  }

  const groups: SynonymGroup[] = (data ?? []).map((r) => ({
    canonical: r.canonical,
    synonyms: r.synonyms ?? [],
    excludeTokens: r.exclude_tokens ?? [],
  }));
  synonymCache = { at: now, groups };
  return groups;
}