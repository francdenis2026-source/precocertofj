import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const saveComparisonCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    name: z.string().min(1).max(100),
    items: z.array(z.object({
      catalogId: z.string(),
      quantity: z.number().min(1)
    }))
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    
    // Create a new shopping list
    const { data: list, error: listError } = await supabase
      .from("shopping_lists")
      .insert({
        user_id: userId,
        name: data.name,
      })
      .select("id")
      .single();

    if (listError) throw new Error(listError.message);

    // Add items to the list
    const itemRows = data.items.map(it => ({
      list_id: list.id,
      catalog_id: it.catalogId,
      quantity: it.quantity
    }));

    const { error: itemsError } = await supabase
      .from("shopping_list_items")
      .insert(itemRows);

    if (itemsError) throw new Error(itemsError.message);

    return { success: true, listId: list.id };
  });

export const exportComparisonData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    format: z.enum(["csv", "pdf"]),
    items: z.array(z.object({
      name: z.string(),
      prices: z.record(z.string(), z.number())
    })),
    stores: z.array(z.string())
  }))
  .handler(async ({ data }) => {
    if (data.format === "csv") {
      let csv = "Produto," + data.stores.join(",") + "\n";
      data.items.forEach(item => {
        const row = [item.name];
        data.stores.forEach(store => {
          row.push(String(item.prices[store] || ""));
        });
        csv += row.map(v => `"${v}"`).join(",") + "\n";
      });
      return { content: csv, filename: `comparativo-${Date.now()}.csv` };
    }
    
    return { success: true, note: "PDF generation is handled client-side" };
  });
