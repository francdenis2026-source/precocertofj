import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StoreQuoteCartItem = {
  slug: string;
  productName: string;
  price: number;
  quantity: number;
};

export type StoreQuoteComparisonRow = {
  storeId: string;
  storeName: string;
  city?: string | null;
  state?: string | null;
  total: number;
  matchedCount: number;
  totalCount: number;
  isReference?: boolean;
};

export type StoreQuoteSummary = {
  id: string;
  storeId: string;
  storeName: string;
  total: number;
  itemCount: number;
  isPublic: boolean;
  createdAt: string;
};

export type StoreQuoteDetail = StoreQuoteSummary & {
  cart: StoreQuoteCartItem[];
  comparison: StoreQuoteComparisonRow[] | null;
};

function totalOf(cart: StoreQuoteCartItem[]): number {
  return cart.reduce((s, r) => s + r.price * r.quantity, 0);
}

/** Save a quote for the signed-in user. Returns the id + share link. */
export const saveStoreQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      storeId: string;
      storeName: string;
      cart: StoreQuoteCartItem[];
      comparison?: StoreQuoteComparisonRow[] | null;
      isPublic?: boolean;
    }) => {
      if (!input.storeId) throw new Error("storeId obrigatório");
      if (!input.storeName) throw new Error("storeName obrigatório");
      if (!Array.isArray(input.cart) || input.cart.length === 0)
        throw new Error("Cesta vazia");
      return input;
    },
  )
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { data: row, error } = await context.supabase
      .from("store_quotes" as never)
      .insert({
        user_id: context.userId,
        store_id: data.storeId,
        store_name: data.storeName,
        cart: data.cart as unknown as never,
        comparison: (data.comparison ?? null) as unknown as never,
        is_public: data.isPublic ?? true,
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (row as unknown as { id: string }).id };
  });

/** List my saved quotes. */
export const listMyStoreQuotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StoreQuoteSummary[]> => {
    const { data, error } = await context.supabase
      .from("store_quotes" as never)
      .select("id, store_id, store_name, cart, is_public, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    const rows =
      (data as unknown as Array<{
        id: string;
        store_id: string;
        store_name: string;
        cart: StoreQuoteCartItem[];
        is_public: boolean;
        created_at: string;
      }>) ?? [];
    return rows.map((r) => {
      const cart = Array.isArray(r.cart) ? r.cart : [];
      return {
        id: r.id,
        storeId: r.store_id,
        storeName: r.store_name,
        total: totalOf(cart),
        itemCount: cart.reduce((s, it) => s + (it.quantity ?? 0), 0),
        isPublic: r.is_public,
        createdAt: r.created_at,
      };
    });
  });

/** Delete a quote I own. */
export const deleteStoreQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string }) => {
    if (!input.id) throw new Error("id obrigatório");
    return input;
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase
      .from("store_quotes" as never)
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Public: read a shared quote by id (only when is_public). */
export const getPublicStoreQuote = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => {
    if (!input.id) throw new Error("id obrigatório");
    return input;
  })
  .handler(async ({ data }): Promise<StoreQuoteDetail | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("store_quotes")
      .select("id, store_id, store_name, cart, comparison, is_public, created_at")
      .eq("id", data.id)
      .eq("is_public", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const cart = (row.cart as StoreQuoteCartItem[] | null) ?? [];
    return {
      id: row.id,
      storeId: row.store_id,
      storeName: row.store_name,
      cart,
      comparison: (row.comparison as StoreQuoteComparisonRow[] | null) ?? null,
      total: totalOf(cart),
      itemCount: cart.reduce((s, it) => s + (it.quantity ?? 0), 0),
      isPublic: row.is_public,
      createdAt: row.created_at,
    };
  });
