import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const exportStoreCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    storeId: z.string(),
    format: z.enum(["csv", "pdf"]),
  }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // Fetch store info
    const { data: store } = await supabaseAdmin
      .from("establishments")
      .select("name")
      .eq("id", data.storeId)
      .single();

    // Fetch products (scans)
    const { data: scans } = await supabaseAdmin
      .from("scans")
      .select("product_name, price_captured, unit, created_at")
      .eq("establishment_id", data.storeId)
      .eq("status", "salvo")
      .not("price_captured", "is", null)
      .order("product_name");

    if (!scans) return { error: "Nenhum produto encontrado" };

    if (data.format === "csv") {
      let csv = "Produto,Preço,Unidade,Data\n";
      scans.forEach(s => {
        csv += `"${s.product_name}",${s.price_captured},"${s.unit || ""}","${s.created_at}"\n`;
      });
      return { content: csv, filename: `precos-${store?.name || 'mercado'}.csv` };
    }

    // PDF generation would usually happen via a specialized service or library
    // For now, we'll return a structured summary that the client can print or a stub
    return { error: "PDF generation is partially implemented via client-side print" };
  });
