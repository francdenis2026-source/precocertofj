import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * System Settings
 */
export const getSystemSetting = createServerFn({ method: "GET" })
  .validator((data: { key: string }) => z.object({ key: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: setting, error } = await supabaseAdmin
      .from("system_settings")
      .select("value")
      .eq("key", data.key)
      .maybeSingle();
    
    if (error) return null;
    return setting?.value ?? null;
  });

/**
 * Credit Packages
 */
export const listCreditPackages = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("credit_packages")
      .select("*")
      .eq("active", true)
      .order("price_cents", { ascending: true });
    
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/**
 * User Wallet
 */
export const getMyWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_wallets")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    
    if (error) throw new Error(error.message);
    return data;
  });

export const getMyCreditTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("credit_transactions")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    
    if (error) throw new Error(error.message);
    return data ?? [];
  });
