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
      scopeNeighborhood?: string | null;
      scopeCity?: string | null;
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

    const norm = (v: string | null | undefined) => {
      const s = (v ?? "").trim();
      return s.length ? s : null;
    };

    const payload = {
      user_id: context.userId,
      product_key: key,
      display_name: data.displayName ?? data.productName ?? null,
      establishment_id: data.establishmentId ?? null,
      scope_neighborhood: norm(data.scopeNeighborhood),
      scope_city: norm(data.scopeCity),
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

/**
 * Ativa, de uma vez, alertas de MENOR PREÇO para todos os produtos favoritados
 * do usuário, restritos à região do perfil (bairro/cidade) — ou seja, só avisa
 * quando o produto ficar mais barato em um estabelecimento próximo.
 *
 * Idempotente: produtos que já possuem assinatura ativa são ignorados.
 */
export const enableNearbyDropAlertsForFavorites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input?: { thresholdPct?: number; scope?: "neighborhood" | "city" | "any" }) => {
      const pct = input?.thresholdPct ?? 5;
      if (!Number.isFinite(pct) || pct < 0 || pct > 90) {
        throw new Error("thresholdPct inválido");
      }
      return { thresholdPct: pct, scope: input?.scope ?? "neighborhood" };
    },
  )
  .handler(
    async ({
      data,
      context,
    }): Promise<{ created: number; skipped: number; scope: string | null }> => {
      const { supabase, userId } = context;

      // 1) Região do perfil (usada como "estabelecimento próximo").
      const { data: profile } = await supabase
        .from("profiles")
        .select("neighborhood, city, address_district, address_city")
        .eq("id", userId)
        .maybeSingle();

      const trim = (v: unknown) =>
        typeof v === "string" && v.trim() ? v.trim() : null;
      const neighborhood =
        trim(profile?.neighborhood) ?? trim(profile?.address_district);
      const city = trim(profile?.city) ?? trim(profile?.address_city);

      const scopeNeighborhood = data.scope === "neighborhood" ? neighborhood : null;
      const scopeCity = data.scope === "any" ? null : city;

      // 2) Favoritos + chave normalizada do catálogo.
      const { data: favs, error: favErr } = await supabase
        .from("favorite_items")
        .select("catalog_id, target_price")
        .eq("user_id", userId);
      if (favErr) throw new Error(favErr.message);
      const favorites = favs ?? [];
      if (favorites.length === 0) return { created: 0, skipped: 0, scope: null };

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: cats } = await supabaseAdmin
        .from("product_catalog")
        .select("id, product_key, display_name")
        .in(
          "id",
          favorites.map((f) => f.catalog_id),
        );
      const catById = new Map(
        (cats ?? []).map((c) => [
          c.id as string,
          { key: (c.product_key as string | null) ?? "", name: c.display_name as string },
        ]),
      );

      // 3) Assinaturas já existentes (evita duplicar).
      const { data: existing } = await supabase
        .from("price_alert_subscriptions")
        .select("product_key")
        .eq("user_id", userId)
        .eq("active", true);
      const already = new Set((existing ?? []).map((r) => r.product_key as string));

      const payload: Record<string, unknown>[] = [];
      let skipped = 0;
      for (const fav of favorites) {
        const cat = catById.get(fav.catalog_id as string);
        if (!cat?.key) {
          skipped += 1;
          continue;
        }
        if (already.has(cat.key)) {
          skipped += 1;
          continue;
        }
        already.add(cat.key);
        payload.push({
          user_id: userId,
          product_key: cat.key,
          display_name: cat.name,
          establishment_id: null,
          scope_neighborhood: scopeNeighborhood,
          scope_city: scopeCity,
          direction: "drop" as const,
          threshold_pct: data.thresholdPct,
          target_price: fav.target_price ?? null,
          active: true,
        });
      }

      if (payload.length > 0) {
        const { error } = await supabase
          .from("price_alert_subscriptions")
          .insert(payload as never);
        if (error) throw new Error(error.message);
      }

      return {
        created: payload.length,
        skipped,
        scope: scopeNeighborhood ?? scopeCity ?? null,
      };
    },
  );
