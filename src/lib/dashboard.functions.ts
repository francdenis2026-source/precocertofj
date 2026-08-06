import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
    // Importación dinámica de helpers de servidor para evitar fugas al cliente
    const [{ getMyProfileStats }, { listMyScans }, { listFavoriteItems }, { listPriceAlerts }] = await Promise.all([
      import("./profile-stats.functions"),
      import("./scans-history.functions"),
      import("./favorites.functions"),
      import("./notifications.functions"),
    ]);

    const [stats, scans, favorites, alerts] = await Promise.all([
      getMyProfileStats({ data: undefined }),
      listMyScans({ data: undefined }),
      listFavoriteItems({ data: undefined }),
      listPriceAlerts({ data: undefined }),
    ]);

    return {
      stats,
      recentScans: scans.slice(0, 5),
      trackedItems: favorites.slice(0, 5),
      recentAlerts: alerts.slice(0, 5),
    };
  });
