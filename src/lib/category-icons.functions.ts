/**
 * Server functions para gerenciar overrides de ícones de categoria.
 * Todas as escritas exigem role 'admin' via requireAdmin middleware.
 * Leitura pública é feita direto no client via RLS.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";
import { z } from "zod";

export type CategoryIconOverride = {
  slug: string;
  kind: "lucide" | "url";
  value: string;
  updated_at: string;
};

const upsertSchema = z.object({
  slug: z.string().min(1).max(64),
  kind: z.enum(["lucide", "url"]),
  value: z.string().min(1).max(1024),
});

export const upsertCategoryIcon = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((raw: unknown) => upsertSchema.parse(raw))
  .handler(async ({ data, context }): Promise<CategoryIconOverride> => {
    const { supabase, userId } = context as {
      supabase: import("@supabase/supabase-js").SupabaseClient;
      userId: string;
    };
    const { data: row, error } = await supabase
      .from("category_icon_overrides")
      .upsert(
        {
          slug: data.slug,
          kind: data.kind,
          value: data.value,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "slug" },
      )
      .select("slug, kind, value, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return row as CategoryIconOverride;
  });

export const deleteCategoryIcon = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((raw: unknown) => z.object({ slug: z.string().min(1) }).parse(raw))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase } = context as { supabase: import("@supabase/supabase-js").SupabaseClient };
    const { error } = await supabase
      .from("category_icon_overrides")
      .delete()
      .eq("slug", data.slug);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
