import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ProfileStats } from "./profile-stats.functions";
import type { FavoriteItem } from "./favorites.functions";
import type { MyScan } from "./scans-history.functions";
import type { PriceAlert } from "./notifications.functions";


export type AppDashboardData = {
  stats: {
    favoritesCount: number;
    contributionsCount: number;
    totalSavings: number;
    potentialSavings: number;
  };
  recentScans: any[];
  trackedItems: any[];
  recentAlerts: any[];
};

export const getAppDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AppDashboardData> => {
    // Importación dinámica del helper de servidor para evitar fugas al cliente
    const { fetchDashboardData } = await import("./dashboard.server");
    return fetchDashboardData(context.supabase as any, context.userId);
  });
