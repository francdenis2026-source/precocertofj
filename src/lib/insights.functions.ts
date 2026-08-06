import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPersonalEconomy, getRegionalEconomy } from "./economy.functions";

export type PurchaseRoute = {
  id: string;
  storeName: string;
  items: Array<{
    name: string;
    price: number;
    saving: number;
  }>;
  totalSaving: number;
  totalPrice: number;
};

export type InsightsData = {
  savingsSummary: {
    totalSaved: number;
    potentialNextMonth: number;
    savedPercentage: number;
  };
  suggestedRoutes: PurchaseRoute[];
  alertsCount: number;
};

export const getInsightsData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<InsightsData> => {
    // Calling internal handler logic by passing context directly
    // Using as any to bypass the fetcher options type which is meant for client calls
    const personal = await (getPersonalEconomy as any)._serverFn({ context, data: undefined });
    const regional = await (getRegionalEconomy as any)._serverFn({ context, data: undefined });

    // Suggest a route based on regional best prices
    const stores = new Map<string, PurchaseRoute>();
    
    (regional.items || []).slice(0, 10).forEach((item: any, idx: number) => {
      const storeName = item.cheapestStore || "Mercado Local";
      if (!stores.has(storeName)) {
        stores.set(storeName, {
          id: `route-${idx}`,
          storeName,
          items: [],
          totalSaving: 0,
          totalPrice: 0,
        });
      }
      const route = stores.get(storeName)!;
      route.items.push({
        name: item.displayName,
        price: item.minPrice,
        saving: item.savings,
      });
      route.totalSaving += item.savings;
      route.totalPrice += item.minPrice;
    });

    return {
      savingsSummary: {
        totalSaved: personal.totalSavings,
        potentialNextMonth: personal.totalPotential,
        savedPercentage: personal.itemsAnalyzed > 0 ? (personal.totalSavings / (personal.totalSavings + personal.totalPotential || 1)) * 100 : 0,
      },
      suggestedRoutes: Array.from(stores.values()).sort((a, b) => b.totalSaving - a.totalSaving).slice(0, 3),
      alertsCount: personal.itemsAnalyzed,
    };
  });
