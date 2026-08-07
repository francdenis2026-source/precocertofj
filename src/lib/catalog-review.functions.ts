import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getPendingClassification = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // Pegamos produtos sem categoria ou com categorias genéricas
    const { data } = await supabaseAdmin
      .from("product_catalog")
      .select("id, display_name, category")
      .or('category.is.null,category.eq.Outros')
      .limit(20);

    return data || [];
  });

export const updateProductClassification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    productId: z.string(),
    category: z.string()
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const { error } = await supabaseAdmin
      .from("product_catalog")
      .update({ category: data.category })
      .eq("id", data.productId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });
