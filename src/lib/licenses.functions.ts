import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randSeg(): string {
  return Array.from({ length: 4 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
}
function newCode(): string {
  return `PC-${randSeg()}-${randSeg()}-${randSeg()}`;
}

async function assertAdmin(context: { supabase: any; userId: string }): Promise<void> {
  const { data, error } = await context.supabase
    .rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Response("Acesso negado", { status: 403 });
}

export type LicensePlan = {
  id: string; name: string; slug: string; days: number;
  price_cents: number; active: boolean; sort_order: number; description: string | null;
};

export const listLicensePlans = createServerFn({ method: "GET" })
  .handler(async (): Promise<LicensePlan[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("license_plans").select("*").order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as LicensePlan[];
  });

export const upsertLicensePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    id?: string; name: string; slug: string; days: number;
    price_cents: number; active?: boolean; sort_order?: number; description?: string | null;
  }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { error } = await supabaseAdmin.from("license_plans")
        .update({
          name: data.name, slug: data.slug, days: data.days,
          price_cents: data.price_cents, active: data.active ?? true,
          sort_order: data.sort_order ?? 100, description: data.description ?? null,
        }).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: ins, error } = await supabaseAdmin.from("license_plans")
      .insert({
        name: data.name, slug: data.slug, days: data.days,
        price_cents: data.price_cents, active: data.active ?? true,
        sort_order: data.sort_order ?? 100, description: data.description ?? null,
      }).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: ins!.id };
  });

/** Admin gera N códigos em lote de um plano (marcados como 'paid' — prontos para resgate). */
export const generateLicenseCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { planId: string; quantity: number; expiresInDays?: number; notes?: string }) => ({
    planId: String(data?.planId ?? ""),
    quantity: Math.max(1, Math.min(500, Math.floor(Number(data?.quantity) || 1))),
    expiresInDays: Math.max(1, Math.min(730, Math.floor(Number(data?.expiresInDays) || 180))),
    notes: data?.notes ? String(data.notes).slice(0, 200) : null,
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: plan, error: pErr } = await supabaseAdmin
      .from("license_plans").select("id, price_cents").eq("id", data.planId).maybeSingle();
    if (pErr || !plan) throw new Error("Plano não encontrado");
    const expiresAt = new Date(Date.now() + data.expiresInDays * 86400_000).toISOString();
    const rows = Array.from({ length: data.quantity }).map(() => ({
      code: newCode(), plan_id: data.planId, price_cents: plan.price_cents,
      status: "paid", expires_at: expiresAt, created_by: context.userId, notes: data.notes,
    }));
    const { data: ins, error } = await supabaseAdmin.from("license_codes")
      .insert(rows).select("id, code, expires_at");
    if (error) throw new Error(error.message);
    return { ok: true, codes: ins ?? [] };
  });

export const listLicenseCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { status?: string; search?: string; limit?: number }) => ({
    status: data?.status ?? null,
    search: data?.search ? String(data.search).trim() : null,
    limit: Math.min(500, Math.max(10, Math.floor(Number(data?.limit) || 100))),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("license_codes")
      .select("id, code, status, price_cents, expires_at, redeemed_by, redeemed_at, created_at, plan_id, notes, mp_payment_id")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    if (data.search) q = q.ilike("code", `%${data.search.toUpperCase()}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const revokeLicenseCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => ({ id: String(data?.id ?? "") }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("license_codes")
      .update({ status: "revoked" }).eq("id", data.id).neq("status", "redeemed");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Cliente resgata código de licença. */
export const redeemMyLicenseCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string }) => ({ code: String(data?.code ?? "").toUpperCase().trim() }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: res, error } = await supabaseAdmin
      .rpc("redeem_license_code", { _user_id: context.userId, _code: data.code });
    if (error) throw new Error(error.message);
    const row = Array.isArray(res) ? res[0] : res;
    return {
      success: !!row?.success,
      message: row?.message ?? "Erro desconhecido",
      addedDays: row?.added_days ?? 0,
      newPaidUntil: row?.new_paid_until ?? null,
    };
  });

/** Listar contas cadastradas (admin). */
export const listAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { search?: string; limit?: number }) => ({
    search: data?.search ? String(data.search).trim() : null,
    limit: Math.min(500, Math.max(10, Math.floor(Number(data?.limit) || 100))),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("profiles")
      .select("id, name, email, cpf, phone, city, paid_until, last_seen_at, total_logins, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.search) {
      const s = data.search.replace(/[^0-9a-zA-Z@.]/g, "");
      q = q.or(`name.ilike.%${s}%,email.ilike.%${s}%,cpf.ilike.%${s}%,phone.ilike.%${s}%`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Reset de PIN — gera novo PIN de 6 dígitos e retorna ao admin (pode enviar ao cliente por outros meios). */
export const adminResetUserPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) => ({ userId: String(data?.userId ?? "") }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const newPin = String(Math.floor(100000 + Math.random() * 900000));
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password: newPin });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: context.userId, action: "reset_pin",
      target_type: "user", target_id: data.userId,
      notes: "PIN redefinido pelo admin",
    });
    return { ok: true, newPin };
  });

/** Ajuste manual de paid_until (extensão gratuita ou correção). */
export const adminExtendUserAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; addDays: number; reason?: string }) => ({
    userId: String(data?.userId ?? ""),
    addDays: Math.max(-3650, Math.min(3650, Math.floor(Number(data?.addDays) || 0))),
    reason: data?.reason ? String(data.reason).slice(0, 300) : null,
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.addDays === 0) return { ok: false, message: "Informe dias diferentes de zero." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin
      .from("profiles").select("paid_until").eq("id", data.userId).maybeSingle();
    const base = prof?.paid_until && Date.parse(prof.paid_until) > Date.now()
      ? Date.parse(prof.paid_until) : Date.now();
    const next = new Date(base + data.addDays * 86400_000).toISOString();
    const { error } = await supabaseAdmin.from("profiles")
      .update({ paid_until: next }).eq("id", data.userId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: context.userId, action: "extend_access",
      target_type: "user", target_id: data.userId,
      before: { paid_until: prof?.paid_until ?? null } as any,
      after: { paid_until: next } as any,
      notes: data.reason,
    });
    return { ok: true, newPaidUntil: next };
  });

/** Últimos eventos de login (auditoria). */
export const listLoginEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { limit?: number; onlyFailed?: boolean }) => ({
    limit: Math.min(500, Math.max(10, Math.floor(Number(data?.limit) || 100))),
    onlyFailed: !!data?.onlyFailed,
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("login_events")
      .select("id, user_id, email, cpf_masked, ip_address, user_agent, success, reason, created_at")
      .order("created_at", { ascending: false }).limit(data.limit);
    if (data.onlyFailed) q = q.eq("success", false);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Métricas do painel admin. */
export const getAdminMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nowIso = new Date().toISOString();
    const d30 = new Date(Date.now() - 30 * 86400_000).toISOString();
    const [accounts, active, codesTotal, codesRedeemed, aiLast30] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).gte("paid_until", nowIso),
      supabaseAdmin.from("license_codes").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("license_codes").select("id", { count: "exact", head: true }).eq("status", "redeemed"),
      supabaseAdmin.from("ai_usage").select("id", { count: "exact", head: true }).gte("created_at", d30),
    ]);
    return {
      accounts: accounts.count ?? 0,
      activeSubscribers: active.count ?? 0,
      codesTotal: codesTotal.count ?? 0,
      codesRedeemed: codesRedeemed.count ?? 0,
      aiCallsLast30: aiLast30.count ?? 0,
    };
  });

/**
 * Cria pedido de compra de licença: registra em `license_codes` (pending),
 * gera Preference no Mercado Pago e devolve a URL de checkout (init_point).
 * O webhook `/api/public/mercadopago/webhook` recebe `external_reference =
 * license:<id>` e chama `apply_paid_license` para estender `paid_until`.
 */
export const createLicensePurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { planId: string }) => ({ planId: String(data?.planId ?? "") }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getMpCredentials } = await import("@/lib/mp-credentials.server");

    const { data: plan, error: pErr } = await supabaseAdmin
      .from("license_plans").select("id, name, price_cents, days, description")
      .eq("id", data.planId).eq("active", true).maybeSingle();
    if (pErr || !plan) throw new Error("Plano indisponível");

    const creds = await getMpCredentials();
    if (!creds.accessToken) {
      throw new Error("Pagamentos indisponíveis: configure o token do Mercado Pago no painel admin.");
    }

    // Perfil do comprador (para preencher email/nome no checkout)
    const { data: prof } = await supabaseAdmin
      .from("profiles" as never)
      .select("full_name, phone")
      .eq("id", context.userId)
      .maybeSingle();
    const buyerName = (prof as { full_name?: string } | null)?.full_name ?? "Assinante";

    const expiresAt = new Date(Date.now() + 180 * 86400_000).toISOString();
    const rand = () => Math.random().toString(36).slice(2, 6).toUpperCase();
    const code = `PC-${rand()}-${rand()}-${rand()}`;

    const { data: license, error: cErr } = await supabaseAdmin.from("license_codes")
      .insert({
        code, plan_id: plan.id, price_cents: plan.price_cents,
        status: "pending", expires_at: expiresAt, buyer_user_id: context.userId,
        notes: `Checkout MP — ${plan.name}`,
      }).select("id, code").single();
    if (cErr) throw new Error(cErr.message);

    const externalReference = `license:${license!.id}`;
    const origin =
      (process.env.APP_PUBLIC_URL as string | undefined) ??
      "https://precocerto.app";

    const body: Record<string, unknown> = {
      items: [
        {
          id: `plan-${plan.id}`,
          title: `PreçoCerto — ${plan.name}`,
          description: plan.description ?? `Acesso premium por ${plan.days} dias`,
          quantity: 1,
          currency_id: "BRL",
          unit_price: Math.round(plan.price_cents) / 100,
        },
      ],
      external_reference: externalReference,
      metadata: { license_id: license!.id, plan_id: plan.id, user_id: context.userId },
      payer: { name: buyerName },
      back_urls: {
        success: `${origin}/comprar-licenca?status=success&lid=${license!.id}`,
        pending: `${origin}/comprar-licenca?status=pending&lid=${license!.id}`,
        failure: `${origin}/comprar-licenca?status=failure&lid=${license!.id}`,
      },
      auto_return: "approved",
      notification_url: `${origin}/api/public/mercadopago/webhook`,
      statement_descriptor: "PRECOCERTO",
    };

    if (creds.pixOnly) {
      body.payment_methods = {
        excluded_payment_types: [
          { id: "credit_card" }, { id: "debit_card" },
          { id: "ticket" }, { id: "atm" },
        ],
        default_payment_method_id: "pix",
        installments: 1,
      };
    } else if (creds.pixEnabled) {
      body.payment_methods = { default_payment_method_id: "pix" };
    }

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${creds.accessToken}`,
      },
      body: JSON.stringify(body),
    });
    const raw = await res.text();
    if (!res.ok) {
      console.error("[mp] license preference error", res.status, raw);
      // marca a licença como falha para não deixar lixo pendente
      await supabaseAdmin.from("license_codes")
        .update({ status: "revoked", notes: `Falha ao criar preference (${res.status})` })
        .eq("id", license!.id);
      throw new Error("Falha ao gerar checkout no Mercado Pago");
    }
    const mp = JSON.parse(raw) as { id: string; init_point?: string; sandbox_init_point?: string };
    const url =
      creds.environment === "sandbox"
        ? mp.sandbox_init_point ?? mp.init_point
        : mp.init_point ?? mp.sandbox_init_point;
    if (!url) throw new Error("Mercado Pago não retornou URL de checkout");

    return {
      ok: true,
      licenseId: license!.id,
      externalReference,
      priceCents: plan.price_cents,
      planName: plan.name,
      planDays: plan.days,
      checkoutUrl: url,
      preferenceId: mp.id,
    };
  });
