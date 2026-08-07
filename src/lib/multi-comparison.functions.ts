import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ComparisonItem = {
  name: string;
  prices: Record<string, number>;
  unit: string;
};

export type MultiComparisonResult = {
  stores: { id: string; name: string }[];
  items: ComparisonItem[];
  commonCount: number;
  totals: Record<string, number>;
  // Improved totals considering missing items
  adjustedTotals: Record<string, number>;
  savingsPotential: Record<string, number>;
};

export const getMultiStoreComparison = createServerFn({ method: "GET" })
  .validator(z.object({
    storeIds: z.array(z.string()),
    productIds: z.array(z.string()).optional(),
  }))
  .handler(async ({ data }): Promise<MultiComparisonResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { storeIds } = data;

    if (!storeIds || storeIds.length === 0) {
      return { 
        stores: [], 
        items: [], 
        commonCount: 0, 
        totals: {}, 
        adjustedTotals: {}, 
        savingsPotential: {} 
      };
    }

    // 1. Fetch store names
    const { data: storesData } = await supabaseAdmin
      .from("establishments")
      .select("id, name")
      .in("id", storeIds);

    const storeMap = new Map((storesData || []).map(s => [s.id, s.name]));

    // 2. Fetch latest scans for these stores
    const { data: scans, error } = await supabaseAdmin
      .from("scans")
      .select("product_name, price_captured, unit, establishment_id")
      .in("establishment_id", storeIds)
      .eq("status", "salvo")
      .not("price_captured", "is", null);

    if (error) throw new Error(error.message);

    const normalize = (s: string) => s.toLowerCase().trim();

    // 3. Group scans by normalized product name
    const productGroups = new Map<string, ComparisonItem>();

    (scans || []).forEach(scan => {
      if (!scan.product_name) return;
      const key = normalize(scan.product_name);
      if (!productGroups.has(key)) {
        productGroups.set(key, {
          name: scan.product_name,
          prices: {},
          unit: scan.unit || ""
        });
      }
      const group = productGroups.get(key)!;
      group.prices[scan.establishment_id] = Number(scan.price_captured);
    });

    // 4. Find items that exist in ALL selected stores for the "Clean" total comparison
    const commonItemKeys = Array.from(productGroups.keys()).filter(key => {
      const group = productGroups.get(key)!;
      return storeIds.every(sId => group.prices[sId] !== undefined);
    });

    const totals: Record<string, number> = {};
    const adjustedTotals: Record<string, number> = {};
    
    // Simple sum of all found items for each store
    storeIds.forEach(sId => {
      totals[sId] = Array.from(productGroups.values())
        .reduce((acc, item) => acc + (item.prices[sId] || 0), 0);
    });

    // "Clean" total: Only products that exist in EVERY store
    storeIds.forEach(sId => {
      adjustedTotals[sId] = commonItemKeys.reduce((acc, key) => acc + (productGroups.get(key)!.prices[sId] || 0), 0);
    });

    // Savings potential: For each store, how much would you save compared to the most expensive store on common items?
    const savingsPotential: Record<string, number> = {};
    if (commonItemKeys.length > 0) {
      const allTotals = Object.values(adjustedTotals);
      const maxTotal = Math.max(...allTotals);
      storeIds.forEach(sId => {
        savingsPotential[sId] = maxTotal - adjustedTotals[sId];
      });
    }

    return {
      stores: storeIds.map(id => ({
        id,
        name: storeMap.get(id) || "Mercado Desconhecido"
      })),
      items: Array.from(productGroups.values()).slice(0, 200),
      commonCount: commonItemKeys.length,
      totals,
      adjustedTotals,
      savingsPotential
    };
  });