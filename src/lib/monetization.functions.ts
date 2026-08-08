import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Entitlements helper to centralize permission checks.
 */
export async function getEntitlements(context: { supabase: any; userId: string }) {
  // Check user roles
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });

  // Check subscription status
  const { data: profile } = await context.supabase
    .from("profiles")
    .select("paid_until, establishments(id, verified, plan_id, size)")
    .eq("id", context.userId)
    .single();

  const isPremium = profile?.paid_until ? new Date(profile.paid_until) > new Date() : false;
  
  // Check if user is a verified merchant
  const establishments = profile?.establishments || [];
  const isMerchant = establishments.some((e: any) => e.verified);
  
  return {
    isAdmin: !!isAdmin,
    isPremium,
    isMerchant,
    // Consumer capabilities
    canUseSmartBasket: isPremium || !!isAdmin,
    canUseAI: isPremium || !!isAdmin,
    canCreateAlerts: isPremium || !!isAdmin,
    canViewAdvancedHistory: isPremium || !!isAdmin,
    // Merchant capabilities (simplified for now)
    canManageCatalog: isMerchant || !!isAdmin,
    canViewAnalytics: isMerchant || !!isAdmin,
    canCreateCampaigns: isMerchant || !!isAdmin,
  };
}

export const getMyEntitlements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return getEntitlements(context);
  });
