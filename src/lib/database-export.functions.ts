import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const downloadFullDatabase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // Check if user is admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', context.userId)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      throw new Error("Acesso negado: Apenas administradores podem baixar o banco de dados.");
    }

    // Fetch core tables
    const [establishments, products, scans, categories] = await Promise.all([
      supabaseAdmin.from("establishments").select("*"),
      supabaseAdmin.from("product_catalog").select("*"),
      supabaseAdmin.from("scans").select("*"),
      supabaseAdmin.from("category_hub").select("*"),
    ]);

    const dataDump = {
      timestamp: new Date().toISOString(),
      establishments: establishments.data || [],
      product_catalog: products.data || [],
      scans: scans.data || [],
      categories: categories.data || [],
      exported_by: context.userId
    };

    const json = JSON.stringify(dataDump, null, 2);
    
    return { 
      content: json, 
      filename: `backup-full-${new Date().toISOString().split('T')[0]}.json`,
      mimeType: "application/json"
    };
  });
