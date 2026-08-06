import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Chave usada pelo Painel de Preços na homepage — precisa bater com
 * `getRecentProducts` (products-public.functions.ts) para marcar corretamente
 * quais itens já estão favoritados.
 */
export function panelKeyFromName(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * Retorna a lista de chaves normalizadas (formato do painel) dos produtos
 * que o usuário atual favoritou. Usada para pintar o botão ⭐ nos itens.
 */
export const listFavoritedPanelKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ keys: string[] }> => {
    const { supabase, userId } = context;
    const { data: favs, error } = await supabase
      .from("favorite_items")
      .select("catalog_id")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    const ids = (favs ?? [])
      .map((r) => r.catalog_id as string)
      .filter((v): v is string => !!v);
    if (ids.length === 0) return { keys: [] };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    type Row = { display_name: string | null; normalized_name: string | null };
    const table = supabaseAdmin.from("product_catalog" as never) as unknown as {
      select: (s: string) => {
        in: (
          c: string,
          v: string[],
        ) => Promise<{ data: Row[] | null; error: { message: string } | null }>;
      };
    };
    const { data: cats } = await table
      .select("display_name, normalized_name")
      .in("id", ids);

    const keys = new Set<string>();
    for (const c of cats ?? []) {
      const dn = c.display_name ?? c.normalized_name ?? "";
      const k = panelKeyFromName(dn);
      if (k) keys.add(k);
    }
    return { keys: Array.from(keys) };
  });

/**
 * Toggle de favorito a partir do nome do produto do painel. Resolve para uma
 * linha em `product_catalog` (cria uma leve se não existir) e reaproveita a
 * mesma tabela `favorite_items` usada nas listas do usuário.
 */
export const toggleFavoritePanelProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { productName: string }) => {
    const productName = (input?.productName ?? "").trim();
    if (!productName) throw new Error("productName obrigatório");
    if (productName.length > 200) throw new Error("productName muito longo");
    return { productName };
  })
  .handler(async ({ data, context }): Promise<{ favorited: boolean }> => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const normalized = data.productName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // 1) resolve o catálogo (case-insensitive por normalized_name)
    type CatRow = { id: string };
    const catTable = supabaseAdmin.from("product_catalog" as never) as unknown as {
      select: (s: string) => {
        ilike: (
          c: string,
          v: string,
        ) => {
          limit: (n: number) => {
            maybeSingle: () => Promise<{
              data: CatRow | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
      insert: (row: Record<string, unknown>) => {
        select: (s: string) => {
          single: () => Promise<{
            data: CatRow | null;
            error: { message: string } | null;
          }>;
        };
      };
    };

    let catalogId: string | null = null;
    const found = await catTable
      .select("id")
      .ilike("normalized_name", normalized)
      .limit(1)
      .maybeSingle();
    if (found.data?.id) {
      catalogId = found.data.id;
    } else {
      const ins = await catTable
        .insert({
          display_name: data.productName,
          normalized_name: normalized,
        })
        .select("id")
        .single();
      if (ins.error || !ins.data)
        throw new Error(ins.error?.message ?? "Falha ao criar catálogo");
      catalogId = ins.data.id;
    }

    // 2) toggle no favorite_items (RLS: escopo do próprio usuário)
    const { data: existing } = await supabase
      .from("favorite_items")
      .select("id")
      .eq("user_id", userId)
      .eq("catalog_id", catalogId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("favorite_items")
        .delete()
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { favorited: false };
    }

    const { data: maxRow } = await supabase
      .from("favorite_items")
      .select("sort_order")
      .eq("user_id", userId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = (maxRow?.sort_order ?? -1) + 1;

    const { error } = await supabase.from("favorite_items").insert({
      user_id: userId,
      catalog_id: catalogId,
      sort_order: nextOrder,
    });
    if (error) throw new Error(error.message);
    return { favorited: true };
  });
