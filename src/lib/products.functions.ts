import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ProductDraft = {
  name: string;
  ean: string | null;
  price: number;
  unit: string | null;
  category: string | null;
};

export type ProductRegistrationResult = {
  insertedCount: number;
  ids: string[];
};

/**
 * Register N products in the authenticated user's catalog.
 * Anonymous callers are rejected by requireSupabaseAuth (401).
 */
export const registerProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { products: ProductDraft[] }) => {
    if (!input || !Array.isArray(input.products) || input.products.length === 0) {
      throw new Error("Nenhum produto para cadastrar");
    }
    const clean: ProductDraft[] = [];
    for (const p of input.products) {
      const name = (p?.name ?? "").trim();
      const price = Number(p?.price);
      if (!name || !Number.isFinite(price) || price <= 0) continue;
      clean.push({
        name,
        ean: p.ean?.trim() || null,
        price,
        unit: p.unit?.trim() || null,
        category: p.category?.trim() || null,
      });
    }
    if (clean.length === 0) throw new Error("Preencha nome e preço em ao menos um item");
    return { products: clean };
  })
  .handler(async ({ data, context }): Promise<ProductRegistrationResult> => {
    const { supabase, userId } = context;

    // Fallback EAN when the AI could not read a barcode; must be unique enough.
    const buildEan = (fallback: string) =>
      fallback || `AI-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const rows = data.products.map((p) => ({
      owner_id: userId,
      name: p.name,
      ean: buildEan(p.ean ?? ""),
      current_price: p.price,
      unit: p.unit ?? "un",
      category: p.category ?? "geral",
    }));

    const { data: inserted, error } = await supabase
      .from("products")
      .insert(rows)
      .select("id");

    if (error) throw new Error(error.message);

    return {
      insertedCount: inserted?.length ?? 0,
      ids: (inserted ?? []).map((r) => r.id as string),
    };
  });
