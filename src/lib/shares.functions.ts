import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { signStorageImageUrl } from "@/lib/product-image-utils";

export type SharedItem = {
  productName: string;
  price: number;
  barcode?: string | null;
  average?: number | null;
  verdict?: string | null;
  diffPct?: number | null;
  cheaperElsewhere?: { marketName: string; price: number } | null;
  cheaperSameMarket?: { price: number; when: string } | null;
};

export type SharedComparison = {
  id: string;
  imageUrl: string | null;
  marketName: string | null;
  products: SharedItem[];
  expiresAt: string;
  createdAt: string;
};

/** Auth: create a public share link (30 days). */
export const createShareLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      imageUrl: string | null;
      marketName: string | null;
      products: SharedItem[];
    }) => {
      if (!input || !Array.isArray(input.products) || input.products.length === 0) {
        throw new Error("Nenhum produto para compartilhar");
      }
      return input;
    },
  )
  .handler(async ({ data, context }): Promise<{ id: string; expiresAt: string }> => {
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: row, error } = await context.supabase
      .from("shared_comparisons" as never)
      .insert({
        user_id: context.userId,
        image_url: data.imageUrl,
        market_name: data.marketName,
        products: data.products as unknown as never,
        expires_at: expires,
      } as never)
      .select("id, expires_at")
      .single();
    if (error) throw new Error(error.message);
    const r = row as unknown as { id: string; expires_at: string };
    return { id: r.id, expiresAt: r.expires_at };
  });

export type SharedComparisonResult =
  | { status: "ok"; share: SharedComparison }
  | { status: "expired"; expiresAt: string }
  | { status: "not_found" };

/** Public: read a share by id. RLS filters expired rows; admin client used to
 *  distinguish "expired" vs "not found" for a friendly UI message. No PII
 *  columns are ever returned (only safe fields projected below). */
export const getSharedComparison = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => {
    if (!input.id) throw new Error("id obrigatório");
    return input;
  })
  .handler(async ({ data }): Promise<SharedComparisonResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("shared_comparisons")
      .select("id, image_url, market_name, products, expires_at, created_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { status: "not_found" };
    if (new Date(row.expires_at).getTime() <= Date.now()) {
      return { status: "expired", expiresAt: row.expires_at };
    }
    return {
      status: "ok",
      share: {
        id: row.id,
        imageUrl: await signStorageImageUrl(row.image_url, supabaseAdmin),
        marketName: row.market_name,
        products: (row.products as SharedItem[]) ?? [],
        expiresAt: row.expires_at,
        createdAt: row.created_at,
      },
    };
  });
