import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * CRUD de assinaturas de alerta de variação de preço (por produto e opcionalmente
 * por mercado). A checagem/disparo real ocorre em `tg_check_price_alert_subscriptions`,
 * gravando eventos em `price_alerts` que o painel /alertas exibe.
 */

export type AlertDirection = "drop" | "rise" | "both";

export type PriceAlertSubscription = {
  id: string;
  productKey: string;
  displayName: string | null;
  establishmentId: string | null;
  scopeNeighborhood: string | null;
  scopeCity: string | null;
  direction: AlertDirection;
  thresholdPct: number;
  targetPrice: number | null;
  active: boolean;
  lastPrice: number | null;
  lastTriggeredAt: string | null;
  createdAt: string;
};

type Row = {
  id: string;
  product_key: string;
  display_name: string | null;
  establishment_id: string | null;
  scope_neighborhood: string | null;
  scope_city: string | null;
  direction: AlertDirection;
  threshold_pct: number;
  target_price: number | null;
  active: boolean;
  last_price: number | null;
  last_triggered_at: string | null;
  created_at: string;
};

const mapRow = (r: Row): PriceAlertSubscription => ({
  id: r.id,
  productKey: r.product_key,
  displayName: r.display_name,
  establishmentId: r.establishment_id,
  scopeNeighborhood: r.scope_neighborhood,
  scopeCity: r.scope_city,
  direction: r.direction,
  thresholdPct: Number(r.threshold_pct),
  targetPrice: r.target_price !== null ? Number(r.target_price) : null,
  active: r.active,
  lastPrice: r.last_price !== null ? Number(r.last_price) : null,
  lastTriggeredAt: r.last_triggered_at,
  createdAt: r.created_at,
});

export const listMyAlertSubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PriceAlertSubscription[]> => {
    const { data, error } = await context.supabase
      .from("price_alert_subscriptions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Row[]).map(mapRow);
  });

export const createAlertSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      productKey?: string;
      productName?: string;
      displayName?: string | null;
      establishmentId?: string | null;
      direction?: AlertDirection;
      thresholdPct?: number;
      targetPrice?: number | null;
    }) => {
      if (!input.productKey && !input.productName) {
        throw new Error("Informe productKey ou productName");
      }
      if (input.thresholdPct !== undefined && input.thresholdPct < 0) {
        throw new Error("thresholdPct inválido");
      }
      return input;
    },
  )
  .handler(async ({ data, context }): Promise<PriceAlertSubscription> => {
    let key = data.productKey ?? "";
    if (!key && data.productName) {
      const { data: nk } = await context.supabase.rpc(
        "normalize_product_key" as never,
        { name: data.productName } as never,
      );
      key = (typeof nk === "string" ? nk : "") || "";
    }
    if (!key) throw new Error("Não foi possível normalizar o produto");

    const payload = {
      user_id: context.userId,
      product_key: key,
      display_name: data.displayName ?? data.productName ?? null,
      establishment_id: data.establishmentId ?? null,
      direction: data.direction ?? "both",
      threshold_pct: data.thresholdPct ?? 5,
      target_price: data.targetPrice ?? null,
      active: true,
    };

    const { data: row, error } = await context.supabase
      .from("price_alert_subscriptions")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapRow(row as Row);
  });

export const updateAlertSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id: string;
      direction?: AlertDirection;
      thresholdPct?: number;
      targetPrice?: number | null;
      active?: boolean;
    }) => {
      if (!input.id) throw new Error("id obrigatório");
      return input;
    },
  )
  .handler(async ({ data, context }): Promise<PriceAlertSubscription> => {
    const patch: {
      direction?: AlertDirection;
      threshold_pct?: number;
      target_price?: number | null;
      active?: boolean;
    } = {};
    if (data.direction !== undefined) patch.direction = data.direction;
    if (data.thresholdPct !== undefined) patch.threshold_pct = data.thresholdPct;
    if (data.targetPrice !== undefined) patch.target_price = data.targetPrice;
    if (data.active !== undefined) patch.active = data.active;

    const { data: row, error } = await context.supabase
      .from("price_alert_subscriptions")
      .update(patch)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapRow(row as Row);
  });

export const deleteAlertSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input.id) throw new Error("id obrigatório");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("price_alert_subscriptions")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
