import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";

export type SynonymGroupRow = {
  id: string;
  canonical: string;
  synonyms: string[];
  excludeTokens: string[];
  active: boolean;
  updatedAt: string;
};

type DbRow = {
  id: string;
  canonical: string;
  synonyms: string[] | null;
  exclude_tokens: string[] | null;
  active: boolean;
  updated_at: string;
};

function map(r: DbRow): SynonymGroupRow {
  return {
    id: r.id,
    canonical: r.canonical,
    synonyms: r.synonyms ?? [],
    excludeTokens: r.exclude_tokens ?? [],
    active: r.active,
    updatedAt: r.updated_at,
  };
}

/** Public — used by the search engine (respects active flag). */
export const listActiveSynonymGroups = createServerFn({ method: "GET" })
  .handler(async (): Promise<SynonymGroupRow[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("search_synonym_groups" as never)
      .select("id, canonical, synonyms, exclude_tokens, active, updated_at")
      .eq("active", true);
    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown as DbRow[]).map(map);
  });

/** Admin — full list including inactive. */
export const listAllSynonymGroups = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<SynonymGroupRow[]> => {
    const { data, error } = await context.supabase
      .from("search_synonym_groups" as never)
      .select("id, canonical, synonyms, exclude_tokens, active, updated_at")
      .order("canonical", { ascending: true });
    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown as DbRow[]).map(map);
  });

export const upsertSynonymGroup = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: {
    id?: string;
    canonical: string;
    synonyms: string[];
    excludeTokens: string[];
    active?: boolean;
  }) => {
    const canonical = (input.canonical ?? "").trim().toLowerCase();
    if (!canonical) throw new Error("Informe o termo canônico");
    if (canonical.length > 80) throw new Error("Canônico muito longo");
    const clean = (arr: string[]) =>
      Array.from(new Set((arr ?? []).map((s) => (s ?? "").trim()).filter((s) => s.length > 0 && s.length <= 80)));
    return {
      id: input.id,
      canonical,
      synonyms: clean(input.synonyms),
      excludeTokens: clean(input.excludeTokens),
      active: input.active ?? true,
    };
  })
  .handler(async ({ data, context }): Promise<SynonymGroupRow> => {
    const payload = {
      canonical: data.canonical,
      synonyms: data.synonyms,
      exclude_tokens: data.excludeTokens,
      active: data.active,
    };
    const query = data.id
      ? context.supabase
          .from("search_synonym_groups" as never)
          .update(payload as never)
          .eq("id", data.id)
          .select("id, canonical, synonyms, exclude_tokens, active, updated_at")
          .single()
      : context.supabase
          .from("search_synonym_groups" as never)
          .upsert(payload as never, { onConflict: "canonical" })
          .select("id, canonical, synonyms, exclude_tokens, active, updated_at")
          .single();
    const { data: row, error } = await query;
    if (error) throw new Error(error.message);
    return map(row as unknown as DbRow);
  });

export const deleteSynonymGroup = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("ID obrigatório");
    return { id: input.id };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("search_synonym_groups" as never)
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
