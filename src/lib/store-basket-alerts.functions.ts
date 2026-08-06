import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * CRUD para alertas de custo total da cesta em um mercado específico.
 * O usuário salva um alvo (R$) para uma mercado e, quando o custo total da cesta
 * naquela mercado cair abaixo do alvo, o alerta pode ser exibido no painel /alertas.
 */

export type StoreBasketAlert = {
  id: string;
  establishmentId: string;
  establishmentName: string;
  targetTotal: number;
  basketSnapshot: Record<string, number>;
  active: boolean;
  lastEvaluatedTotal: number | null;
  lastTriggeredAt: string | null;
  createdAt: string;
};

type Row = {
  id: string;
  establishment_id: string;
  establishment_name: string;
  target_total: number | string;
  basket_snapshot: Record<string, number> | null;
  active: boolean;
  last_evaluated_total: number | string | null;
  last_triggered_at: string | null;
  created_at: string;
};

const mapRow = (r: Row): StoreBasketAlert => ({
  id: r.id,
  establishmentId: r.establishment_id,
  establishmentName: r.establishment_name,
  targetTotal: Number(r.target_total),
  basketSnapshot: r.basket_snapshot ?? {},
  active: r.active,
  lastEvaluatedTotal:
    r.last_evaluated_total === null ? null : Number(r.last_evaluated_total),
  lastTriggeredAt: r.last_triggered_at,
  createdAt: r.created_at,
});

export const listStoreBasketAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StoreBasketAlert[]> => {
    const { data, error } = await context.supabase
      .from("store_basket_alerts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Row[]).map(mapRow);
  });

export const createStoreBasketAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      establishmentId: string;
      establishmentName: string;
      targetTotal: number;
      basketSnapshot?: Record<string, number>;
    }) => {
      if (!input.establishmentId) throw new Error("Mercado obrigatório");
      if (!(input.targetTotal > 0)) throw new Error("Valor-alvo inválido");
      const snap: Record<string, number> = {};
      for (const [k, v] of Object.entries(input.basketSnapshot ?? {})) {
        const n = Math.max(0, Math.min(20, Math.floor(Number(v) || 0)));
        if (n > 0) snap[k] = n;
      }
      return { ...input, basketSnapshot: snap };
    },
  )
  .handler(async ({ data, context }): Promise<StoreBasketAlert> => {
    const { data: row, error } = await context.supabase
      .from("store_basket_alerts")
      .insert({
        user_id: context.userId,
        establishment_id: data.establishmentId,
        establishment_name: data.establishmentName,
        target_total: data.targetTotal,
        basket_snapshot: data.basketSnapshot,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapRow(row as Row);
  });

export const deleteStoreBasketAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string }) => input)
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase
      .from("store_basket_alerts")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleStoreBasketAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string; active: boolean }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("store_basket_alerts")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
