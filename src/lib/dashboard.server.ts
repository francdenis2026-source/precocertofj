// src/lib/dashboard.server.ts
import { getMyProfileStats } from "./profile-stats.functions";
import { listMyScans } from "./scans-history.functions";
import { listFavoriteItems } from "./favorites.functions";
import { listPriceAlerts } from "./notifications.functions";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function fetchDashboardData(supabase: SupabaseClient, userId: string) {
  const context = { supabase, userId };
  
  // Directly calling the handler logic or the function itself in a way that bypasses middleware
  // Since we are already on the server and have context.
  
  const [stats, scans, favorites, alerts] = await Promise.all([
    // Passing the context that the middleware would have provided
    (getMyProfileStats as any).handler({ context, data: undefined }),
    (listMyScans as any).handler({ context, data: undefined }),
    (listFavoriteItems as any).handler({ context, data: undefined }),
    (listPriceAlerts as any).handler({ context, data: undefined }),
  ]);

  return {
    stats,
    recentScans: scans.slice(0, 5),
    trackedItems: favorites.slice(0, 5),
    recentAlerts: alerts.slice(0, 5),
  };
}
