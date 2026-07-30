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
  /** Ícone: null quando o admin salvou apenas um rótulo customizado. */
  kind: "lucide" | "url" | null;
  value: string | null;
  /** Rótulo customizado (null = usa o rótulo canônico do código). */
  label: string | null;
  updated_at: string;
};

/** Item de edição em lote (rótulo e/ou ícone). */
const batchItemSchema = z.object({
  slug: z.string().min(1).max(64),
  label: z
    .string()
    .trim()
    .min(2, "Rótulo muito curto")
    .max(40, "Rótulo muito longo (máx 40)")
    .nullable(),
  icon: z
    .object({
      kind: z.enum(["lucide", "url"]),
      value: z.string().trim().min(1).max(1024),
    })
    .nullable(),
});

const batchSchema = z.object({
  items: z.array(batchItemSchema).min(1).max(80),
});

export type CategoryAppearanceBatchItem = z.infer<typeof batchItemSchema>;

/**
 * Salva rótulos e ícones de várias categorias de uma vez.
 * Item sem rótulo e sem ícone remove o override (volta ao padrão).
 */
export const saveCategoryAppearanceBatch = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((raw: unknown) => batchSchema.parse(raw))
  .handler(async ({ data, context }): Promise<{ saved: number; removed: number }> => {
    const { supabase, userId } = context as {
      supabase: import("@supabase/supabase-js").SupabaseClient;
      userId: string;
    };

    // Validação extra de URL: só aceitamos http(s) ou caminho relativo do próprio app.
    for (const item of data.items) {
      if (item.icon?.kind === "url") {
        const v = item.icon.value;
        if (!/^(https?:\/\/|\/)/i.test(v)) {
          throw new Error(`URL inválida para "${item.slug}": use https:// ou caminho /…`);
        }
      }
    }

    const toRemove = data.items.filter((i) => !i.label && !i.icon).map((i) => i.slug);
    const toUpsert = data.items
      .filter((i) => i.label || i.icon)
      .map((i) => ({
        slug: i.slug,
        label: i.label,
        kind: i.icon?.kind ?? null,
        value: i.icon?.value ?? null,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      }));

    if (toRemove.length) {
      const { error } = await supabase
        .from("category_icon_overrides")
        .delete()
        .in("slug", toRemove);
      if (error) throw new Error(error.message);
    }
    if (toUpsert.length) {
      const { error } = await supabase
        .from("category_icon_overrides")
        .upsert(toUpsert, { onConflict: "slug" });
      if (error) throw new Error(error.message);
    }

    return { saved: toUpsert.length, removed: toRemove.length };
  });

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
      .select("slug, kind, value, label, updated_at")
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
