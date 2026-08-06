import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  normalizePreferences,
  type UserPreferences,
  type PreferencesInput,
} from "./preferences.shared";

export const getMyPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UserPreferences> => {
    const { data, error } = await context.supabase
      .from("user_preferences" as never)
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return normalizePreferences(data as Record<string, unknown> | null);
  });

export const updateMyPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: PreferencesInput) => normalizePreferences(input as unknown as Record<string, unknown>))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const row = {
      user_id: context.userId,
      favorite_categories: data.favoriteCategories,
      preferred_store_ids: data.preferredStoreIds,
      search_radius_km: data.searchRadiusKm,
      monthly_budget: data.monthlyBudget,
      notify_price_drop: data.notifyPriceDrop,
      notify_weekly_digest: data.notifyWeeklyDigest,
      notify_news: data.notifyNews,
      contact_channel: data.contactChannel,
    };
    const table = context.supabase.from("user_preferences" as never) as unknown as {
      upsert: (v: typeof row, o: { onConflict: string }) => Promise<{ error: { message: string } | null }>;
    };
    const { error } = await table.upsert(row, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
