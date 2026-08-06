import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getStoreComparisonStats = createServerFn({ method: "GET" })
  .validator(z.object({
    storeAId: z.string(),
    storeBId: z.string(),
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Get latest scans for both stores to find overlapping products
    const [scansARes, scansBRes] = await Promise.all([
      supabaseAdmin
        .from("scans")
        .select("product_name, price_captured, unit")
        .eq("establishment_id", data.storeAId)
        .eq("status", "salvo")
        .not("price_captured", "is", null),
      supabaseAdmin
        .from("scans")
        .select("product_name, price_captured, unit")
        .eq("establishment_id", data.storeBId)
        .eq("status", "salvo")
        .not("price_captured", "is", null),
    ]);

    const scansA = scansARes.data || [];
    const scansB = scansBRes.data || [];

    // Simple normalization for matching
    const normalize = (s: string) => s.toLowerCase().trim();
    
    const mapB = new Map();
    scansB.forEach(s => {
      if (s.product_name) mapB.set(normalize(s.product_name), s.price_captured);
    });

    const common = [];
    let cheaperA = 0;
    let cheaperB = 0;
    let equal = 0;

    for (const sA of scansA) {
      if (!sA.product_name) continue;
      const priceB = mapB.get(normalize(sA.product_name));
      if (priceB !== undefined) {
        const pA = Number(sA.price_captured);
        const pB = Number(priceB);
        common.push({
          name: sA.product_name,
          unit: sA.unit,
          priceA: pA,
          priceB: pB
        });
        if (pA < pB) cheaperA++;
        else if (pB < pA) cheaperB++;
        else equal++;
      }
    }

    return {
      totalCompared: common.length,
      cheaperA,
      cheaperB,
      equal,
      items: common.slice(0, 50) // Limit for UI performance
    };
  });
