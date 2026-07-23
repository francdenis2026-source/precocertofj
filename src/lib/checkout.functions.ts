import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }): Promise<void> {
  const { data, error } = await context.supabase
    .rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Response("Acesso negado", { status: 403 });
}

export type PublicPlan = {
  id: string;
  name: string;
  slug: string;
  days: number;
  price_cents: number;
  description: string | null;
  sort_order: number;
};

export const listPublicPlans = createServerFn({ method: "GET" }).handler(async (): Promise<PublicPlan[]> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("license_plans")
    .select("id,name,slug,days,price_cents,description,sort_order")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PublicPlan[];
});

export const validatePromoCoupon = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string }) => ({ code: String(data?.code ?? "").trim() }))
  .handler(async ({ data }) => {
    if (!data.code) return { valid: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.rpc("validate_promo_coupon", { _code: data.code });
    if (error) throw new Error(error.message);
    const c = Array.isArray(row) ? row[0] : row;
    if (!c) return { valid: false as const };
    return { valid: true as const, id: c.id as string, code: c.code as string, percent_off: c.percent_off as number };
  });

export type CheckoutOrder = {
  id: string;
  user_id: string;
  plan_id: string;
  coupon_id: string | null;
  coupon_code: string | null;
  original_cents: number;
  discount_cents: number;
  final_cents: number;
  status: "pending" | "approved" | "failed" | "cancelled";
  provider: string;
  provider_ref: string | null;
  license_code_id: string | null;
  approved_at: string | null;
  created_at: string;
};

export const createCheckoutOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { planId: string; couponCode?: string | null }) => ({
    planId: String(data?.planId ?? ""),
    couponCode: data?.couponCode ? String(data.couponCode).trim() : null,
  }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: plan, error: pErr } = await supabaseAdmin
      .from("license_plans")
      .select("id, price_cents, active")
      .eq("id", data.planId)
      .maybeSingle();
    if (pErr || !plan || !plan.active) throw new Error("Plano indisponível");

    let couponId: string | null = null;
    let couponCode: string | null = null;
    let percentOff = 0;
    if (data.couponCode) {
      const { data: c, error: cErr } = await supabaseAdmin.rpc("validate_promo_coupon", { _code: data.couponCode });
      if (cErr) throw new Error(cErr.message);
      const row = Array.isArray(c) ? c[0] : c;
      if (row) {
        couponId = row.id;
        couponCode = row.code;
        percentOff = row.percent_off;
      }
    }
    const original = plan.price_cents;
    const discount = Math.round((original * percentOff) / 100);
    const final = Math.max(0, original - discount);

    const { data: order, error: oErr } = await supabaseAdmin
      .from("checkout_orders")
      .insert({
        user_id: context.userId,
        plan_id: plan.id,
        coupon_id: couponId,
        coupon_code: couponCode,
        original_cents: original,
        discount_cents: discount,
        final_cents: final,
        status: "pending",
        provider: "mercadopago",
      })
      .select("id")
      .single();
    if (oErr || !order) throw new Error(oErr?.message || "Falha ao criar pedido");
    return { orderId: order.id as string };
  });

/** Regex conservador para e-mail (RFC 5322 simplificado). */
const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export function normalizeDeliveryEmail(raw: unknown): string {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s.length < 5 || s.length > 254) throw new Error("E-mail inválido");
  if (!EMAIL_RE.test(s)) throw new Error("E-mail inválido");
  return s;
}

/**
 * Salva o e-mail de entrega do código no pedido. É obrigatório antes de
 * gerar a cobrança para garantir que o cliente vai receber a licença.
 */
export const setCheckoutEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; email: string }) => ({
    id: String(data?.id ?? ""),
    email: normalizeDeliveryEmail(data?.email),
  }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error: fErr } = await supabaseAdmin
      .from("checkout_orders")
      .select("id, user_id, status")
      .eq("id", data.id)
      .maybeSingle();
    if (fErr) throw new Error(fErr.message);
    if (!order) throw new Response("Pedido não encontrado", { status: 404 });
    if (order.user_id !== context.userId) {
      throw new Response("Acesso negado", { status: 403 });
    }
    if (order.status !== "pending") {
      throw new Error("Pedido já processado — e-mail não pode ser alterado.");
    }
    const { error } = await supabaseAdmin
      .from("checkout_orders")
      .update({ delivery_email: data.email })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, email: data.email };
  });

export const getCheckoutOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => ({ id: String(data?.id ?? "") }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { data: order, error } = await supabaseAdmin
      .from("checkout_orders")
      .select("*, license_codes:license_code_id(code), license_plans:plan_id(name,slug,days)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Response("Pedido não encontrado", { status: 404 });
    if (order.user_id !== context.userId && !isAdmin) {
      throw new Response("Acesso negado", { status: 403 });
    }
    return order as any;
  });

export const listMyCheckoutOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("checkout_orders")
      .select("id, plan_id, status, original_cents, discount_cents, final_cents, coupon_code, created_at, license_code_id, license_plans:plan_id(name)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as any[];
  });

/** Admin/manual approval — will be replaced by MP webhook later. */
export const approveCheckoutOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; providerRef?: string | null }) => ({
    id: String(data?.id ?? ""),
    providerRef: data?.providerRef ? String(data.providerRef) : null,
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("approve_checkout_order", {
      _order_id: data.id,
      _provider_ref: data.providerRef ?? undefined,
    });
    if (error) throw new Error(error.message);
    const row = Array.isArray(rows) ? rows[0] : rows;
    return { orderId: row?.order_id as string, licenseCode: row?.license_code as string };
  });

// ---- Coupons (admin) ----

export type PromoCoupon = {
  id: string;
  code: string;
  percent_off: number;
  active: boolean;
  description: string | null;
  redemptions: number;
  created_at: string;
  updated_at: string;
};

export const listPromoCoupons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PromoCoupon[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("promo_coupons")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as PromoCoupon[];
  });

export const upsertPromoCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    id?: string;
    code: string;
    percent_off: number;
    active?: boolean;
    description?: string | null;
  }) => ({
    id: data?.id,
    code: String(data?.code ?? "").trim().toUpperCase(),
    percent_off: Math.max(1, Math.min(100, Math.round(Number(data?.percent_off) || 0))),
    active: data?.active !== false,
    description: data?.description ? String(data.description).slice(0, 200) : null,
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (!data.code || data.percent_off < 1) throw new Error("Código e desconto válido são obrigatórios");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("promo_coupons")
        .update({
          code: data.code,
          percent_off: data.percent_off,
          active: data.active,
          description: data.description,
        })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: ins, error } = await supabaseAdmin
      .from("promo_coupons")
      .insert({
        code: data.code,
        percent_off: data.percent_off,
        active: data.active,
        description: data.description,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: ins!.id };
  });

export const deletePromoCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => ({ id: String(data?.id ?? "") }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("promo_coupons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Metrics ----

export type PlanMetric = {
  plan_id: string;
  plan_name: string;
  plan_slug: string;
  price_cents: number;
  orders_total: number;
  orders_approved: number;
  orders_pending: number;
  gross_cents: number;
  discount_cents: number;
  net_cents: number;
  conversion_pct: number;
};

export const getPlanConversionMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PlanMetric[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("plan_conversion_metrics");
    if (error) throw new Error(error.message);
    return (data ?? []) as PlanMetric[];
  });
