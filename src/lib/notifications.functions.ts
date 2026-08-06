import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { slugifyText } from "@/lib/text-normalize";

export type NotificationPrefs = {
  inApp: boolean;
  email: boolean;
  push: boolean;
  priceDropPct: number;
  targetPriceOnly: boolean;
  marketSavingsMin: number;
};

const DEFAULT_PREFS: NotificationPrefs = {
  inApp: true,
  email: false,
  push: false,
  priceDropPct: 5,
  targetPriceOnly: false,
  marketSavingsMin: 3,
};

export const getNotificationPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<NotificationPrefs> => {
    const { data } = await context.supabase
      .from("notification_prefs")
      .select("in_app, email, push, price_drop_pct, target_price_only, market_savings_min")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!data) return DEFAULT_PREFS;
    return {
      inApp: data.in_app,
      email: data.email,
      push: data.push,
      priceDropPct: Number(data.price_drop_pct),
      targetPriceOnly: data.target_price_only,
      marketSavingsMin: Number(data.market_savings_min),
    };
  });

export const updateNotificationPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: Partial<NotificationPrefs>) => {
    const p = input ?? {};
    return {
      inApp: p.inApp ?? true,
      email: p.email ?? false,
      push: p.push ?? false,
      priceDropPct: Math.max(0, Math.min(100, Number(p.priceDropPct ?? 5))),
      targetPriceOnly: p.targetPriceOnly ?? false,
      marketSavingsMin: Math.max(0, Number(p.marketSavingsMin ?? 3)),
    };
  })
  .handler(async ({ data, context }): Promise<NotificationPrefs> => {
    const row = {
      user_id: context.userId,
      in_app: data.inApp,
      email: data.email,
      push: data.push,
      price_drop_pct: data.priceDropPct,
      target_price_only: data.targetPriceOnly,
      market_savings_min: data.marketSavingsMin,
    };
    const { error } = await context.supabase
      .from("notification_prefs")
      .upsert(row, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return data;
  });

export type PriceAlert = {
  id: string;
  kind: "item_price_drop" | "item_target_hit" | "market_price_drop";
  catalogId: string | null;
  productSlug: string | null;
  establishmentId: string | null;
  marketName: string | null;
  displayName: string | null;
  prevPrice: number | null;
  newPrice: number | null;
  diffPct: number | null;
  readAt: string | null;
  createdAt: string;
};

export const listPriceAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PriceAlert[]> => {
    const { data, error } = await context.supabase
      .from("price_alerts")
      .select(
        "id, kind, catalog_id, market_name, display_name, prev_price, new_price, diff_pct, read_at, created_at, establishment_id",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      id: r.id,
      kind: r.kind as PriceAlert["kind"],
      catalogId: r.catalog_id,
      productSlug: slugifyText(r.display_name || "produto"),
      establishmentId: r.establishment_id || null,
      marketName: r.market_name,
      displayName: r.display_name,
      prevPrice: r.prev_price !== null ? Number(r.prev_price) : null,
      newPrice: r.new_price !== null ? Number(r.new_price) : null,
      diffPct: r.diff_pct !== null ? Number(r.diff_pct) : null,
      readAt: r.read_at,
      createdAt: r.created_at,
    }));
  });

export const markAllAlertsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("price_alerts")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string }) => {
    if (!input?.id) throw new Error("id obrigatório");
    return { id: input.id };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("price_alerts")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleCartAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { catalogId: string; active: boolean }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.active) {
      const { error } = await supabase.from("price_drop_monitors" as any).insert({
        user_id: userId,
        catalog_id: data.catalogId,
      });
      if (error && error.code !== "23505") throw new Error(error.message);
    } else {
      const { error } = await supabase.from("price_drop_monitors" as any).delete().eq("user_id", userId).eq("catalog_id", data.catalogId);
      if (error) throw new Error(error.message);
    }
    return { success: true };
  });

export const getStoreAlertsStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { catalogIds: string[] }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: monitors } = await supabase
      .from("price_drop_monitors" as any)
      .select("catalog_id")
      .eq("user_id", userId)
      .in("catalog_id", data.catalogIds);
    return (monitors ?? []).map((m: any) => m.catalog_id as string);
  });
