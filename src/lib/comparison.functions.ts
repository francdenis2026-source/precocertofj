import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getPriceComparison = createServerFn({ method: "GET" })
  .inputValidator(z.object({
    storeA: z.string(),
    storeB: z.string(),
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch latest scans for both stores
    const [scansA, scansB] = await Promise.all([
      supabaseAdmin.from("scans").select("product_name, price_captured").eq("establishment_id", data.storeA).eq("status", "salvo"),
      supabaseAdmin.from("scans").select("product_name, price_captured").eq("establishment_id", data.storeB).eq("status", "salvo"),
    ]);

    const productsA = scansA.data || [];
    const productsB = scansB.data || [];

    // Map by normalized name
    const mapB = new Map(productsB.map(p => [p.product_name?.toLowerCase().trim(), p.price_captured]));
    
    const comparison = productsA.map(p => {
      const name = p.product_name?.toLowerCase().trim();
      const priceB = name ? mapB.get(name) : null;
      if (priceB === undefined || priceB === null) return null;
      
      return {
        name: p.product_name,
        priceA: p.price_captured,
        priceB: priceB,
        cheaperIn: p.price_captured! < priceB ? 'A' : p.price_captured! > priceB ? 'B' : 'Equal'
      };
    }).filter(Boolean);

    return comparison;
  });
