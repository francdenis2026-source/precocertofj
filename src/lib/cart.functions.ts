import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeProductName, signStorageImageUrl } from "@/lib/product-image-utils";

/* ============================== TIPOS ============================== */

export type CartItem = {
  id: string;
  catalogId: string | null;
  quantity: number;
  displayName: string;
  brand: string | null;
  defaultUnit: string | null;
  imageUrl: string | null;
  /** Preço mínimo atual deste produto no mercado (calculado durante o fetch). */
  minPrice: number | null;
  /** Preço médio atual para cálculo de economia. */
  avgPrice: number | null;
  /** Indica se há uma oferta imbatível disponível. */
  isLowestPrice: boolean;
};


export type Cart = {
  listId: string;
  items: CartItem[];
};

const CART_NAME = "Cesta";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ============================ HELPERS ============================== */

async function getOrCreateCartId(
  supabase: {
    from: (t: string) => {
      select: (s: string) => {
        eq: (
          c: string,
          v: string,
        ) => {
          eq: (
            c: string,
            v: string,
          ) => {
            maybeSingle: () => Promise<{
              data: { id: string } | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
      insert: (row: { user_id: string; name: string }) => {
        select: (s: string) => {
          single: () => Promise<{
            data: { id: string } | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  },
  userId: string,
): Promise<string> {
  const found = await supabase
    .from("shopping_lists")
    .select("id")
    .eq("user_id", userId)
    .eq("name", CART_NAME)
    .maybeSingle();
  if (found.error) throw new Error(found.error.message);
  if (found.data?.id) return found.data.id;

  const created = await supabase
    .from("shopping_lists")
    .insert({ user_id: userId, name: CART_NAME })
    .select("id")
    .single();
  if (created.error || !created.data)
    throw new Error(created.error?.message ?? "Falha ao criar cesta");
  return created.data.id;
}

/* ============================ RESOLVER ============================= */

/** Resolve um slug (uuid ou nome de produto) para um catalog_id existente. */
export const resolveCatalogId = createServerFn({ method: "POST" })
  .validator((input: { slug: string }) => {
    const slug = (input?.slug ?? "").trim();
    if (!slug) throw new Error("slug obrigatório");
    return { slug: slug.slice(0, 160) };
  })
  .handler(async ({ data }): Promise<{ catalogId: string | null; displayName: string | null }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (UUID_RE.test(data.slug)) {
      const { data: row } = await supabaseAdmin
        .from("product_catalog")
        .select("id, display_name")
        .eq("id", data.slug)
        .maybeSingle();
      return { catalogId: row?.id ?? null, displayName: row?.display_name ?? null };
    }
    const norm = normalizeProductName(data.slug).replace(/[%_,]/g, " ");
    const safe = data.slug.replace(/[%_,]/g, " ");
    const { data: row } = await supabaseAdmin
      .from("product_catalog")
      .select("id, display_name")
      .or(`display_name.ilike.%${safe}%,normalized_name.ilike.%${norm}%`)
      .limit(1)
      .maybeSingle();
    return { catalogId: row?.id ?? null, displayName: row?.display_name ?? null };
  });

/* ============================== GET ================================ */

export const getCart = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Cart> => {
    const { supabase, userId } = context;
    const listId = await getOrCreateCartId(supabase as never, userId);

    const { data: items, error } = await supabase
      .from("shopping_list_items")
      .select("id, catalog_id, quantity, created_at")
      .eq("list_id", listId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const catIds = Array.from(new Set((items ?? []).map((i) => i.catalog_id).filter((x): x is string => !!x)));
    
    type CatRow = {
      id: string;
      display_name: string;
      brand: string | null;
      default_unit: string | null;
      image_url: string | null;
      normalized_name: string | null;
    };
    
    const catMap = new Map<string, CatRow>();
    const priceContextMap = new Map<string, { min: number; avg: number; isLowest: boolean }>();

    if (catIds.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { searchProductPrice } = await import("./price-search.functions");

      const { data: cats } = await supabaseAdmin
        .from("product_catalog")
        .select("id, display_name, brand, default_unit, image_url, normalized_name")
        .in("id", catIds);

      const signed = await Promise.all(
        (cats ?? []).map(async (c) => ({
          ...c,
          image_url: await signStorageImageUrl(c.image_url, supabaseAdmin),
        })),
      );

      for (const c of signed) {
        catMap.set(c.id, c);
        // Busca inteligência de preços para cada item na cesta
        try {
          const searchResult = await searchProductPrice({ 
            query: c.display_name, 
            mode: "strict" 
          });
          if (searchResult.min !== null) {
            priceContextMap.set(c.id, {
              min: searchResult.min,
              avg: searchResult.avg ?? searchResult.min,
              isLowest: true // Na cesta, destacamos se há preço monitorado
            });
          }
        } catch (e) {
          console.error("Erro ao buscar contexto de preço para item da cesta:", e);
        }
      }
    }


    return {
      listId,
      items: (items ?? []).map((it) => {
        const c = it.catalog_id ? catMap.get(it.catalog_id) : undefined;
        const p = it.catalog_id ? priceContextMap.get(it.catalog_id) : undefined;
        return {
          id: it.id,
          catalogId: it.catalog_id,
          quantity: Number(it.quantity),
          displayName: c?.display_name ?? "(produto removido)",
          brand: c?.brand ?? null,
          defaultUnit: c?.default_unit ?? null,
          imageUrl: c?.image_url ?? null,
          minPrice: p?.min ?? null,
          avgPrice: p?.avg ?? null,
          isLowestPrice: p?.isLowest ?? false,
        };
      }),

    };
  });

/* ============================== ADD ================================ */

export const addToCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { catalogId?: string; slug?: string; quantity?: number }) => {
    const catalogId = (input?.catalogId ?? "").trim();
    const slug = (input?.slug ?? "").trim();
    if (!catalogId && !slug) throw new Error("Produto não informado");
    const q = Number(input?.quantity ?? 1);
    return {
      catalogId: catalogId || null,
      slug: slug || null,
      quantity: Number.isFinite(q) && q > 0 ? q : 1,
    };
  })
  .handler(
    async ({ data, context }): Promise<{ ok: true; listId: string; itemId: string }> => {
      const { supabase, userId } = context;

      // Resolve catalogId
      let catalogId = data.catalogId;
      if (!catalogId && data.slug) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        if (UUID_RE.test(data.slug)) {
          const { data: row } = await supabaseAdmin
            .from("product_catalog")
            .select("id")
            .eq("id", data.slug)
            .maybeSingle();
          catalogId = row?.id ?? null;
        } else {
          const norm = normalizeProductName(data.slug).replace(/[%_,]/g, " ");
          const safe = data.slug.replace(/[%_,]/g, " ");
          const { data: row } = await supabaseAdmin
            .from("product_catalog")
            .select("id")
            .or(`display_name.ilike.%${safe}%,normalized_name.ilike.%${norm}%`)
            .limit(1)
            .maybeSingle();
          catalogId = row?.id ?? null;
        }
      }
      if (!catalogId) throw new Error("Produto não encontrado no catálogo");

      const listId = await getOrCreateCartId(supabase as never, userId);

      const { data: existing } = await supabase
        .from("shopping_list_items")
        .select("id, quantity")
        .eq("list_id", listId)
        .eq("catalog_id", catalogId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("shopping_list_items")
          .update({ quantity: Number(existing.quantity) + data.quantity })
          .eq("id", existing.id);
        if (error) throw new Error(error.message);
        return { ok: true, listId, itemId: existing.id };
      }

      const { data: row, error } = await supabase
        .from("shopping_list_items")
        .insert({ list_id: listId, catalog_id: catalogId, quantity: data.quantity })
        .select("id")
        .single();
      if (error || !row) throw new Error(error?.message ?? "Falha ao adicionar");
      return { ok: true, listId, itemId: row.id };
    },
  );

/* ============================ REMOVE =============================== */

export const removeFromCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { itemId: string }) => {
    if (!input?.itemId) throw new Error("itemId obrigatório");
    return { itemId: input.itemId };
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    // Confirma que o item pertence a uma lista do usuário
    const { data: item } = await supabase
      .from("shopping_list_items")
      .select("id, list_id")
      .eq("id", data.itemId)
      .maybeSingle();
    if (!item) return { ok: true };
    const { data: list } = await supabase
      .from("shopping_lists")
      .select("id")
      .eq("id", item.list_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!list) throw new Error("Item não pertence ao usuário");

    const { error } = await supabase
      .from("shopping_list_items")
      .delete()
      .eq("id", data.itemId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ========================== UPDATE QTY ============================= */

export const updateCartQuantity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { itemId: string; quantity: number }) => {
    if (!input?.itemId) throw new Error("itemId obrigatório");
    const q = Number(input.quantity);
    if (!Number.isFinite(q) || q <= 0) throw new Error("quantidade inválida");
    return { itemId: input.itemId, quantity: q };
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase } = context;
    const { error } = await supabase
      .from("shopping_list_items")
      .update({ quantity: data.quantity })
      .eq("id", data.itemId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
