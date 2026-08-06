import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getMyProfileStats, type ProfileStats } from "./profile-stats.functions";
import { listFavoriteItems, type FavoriteItem } from "./favorites.functions";
import { listMyScans, type MyScan } from "./scans-history.functions";
import { listPriceAlerts, type PriceAlert } from "./notifications.functions";

export type AppDashboardData = {
  stats: ProfileStats;
  recentScans: MyScan[];
  trackedItems: FavoriteItem[];
  recentAlerts: PriceAlert[];
};

export const getAppDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AppDashboardData> => {
    // We aggregate data from multiple existing functions for the dashboard view.
    // In a production environment, we'd optimize this into a single query if performance is an issue,
    // but for now, reusing existing functions ensures consistency.
    
    const [stats, scans, favorites, alerts] = await Promise.all([
      getMyProfileStats(),
      listMyScans(),
      listFavoriteItems(),
      listPriceAlerts(),
    ]);

    return {
      stats,
      recentScans: scans.slice(0, 5),
      trackedItems: favorites.slice(0, 5),
      recentAlerts: alerts.slice(0, 5),
    };
  });
