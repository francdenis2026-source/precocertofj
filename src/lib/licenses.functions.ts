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

/** Admin: reativa código revogado (volta para 'paid') e opcionalmente estende validade. */
export const reactivateLicenseCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; addDays?: number }) => ({
    id: String(data?.id ?? ""),
    addDays: Math.max(0, Math.min(730, Math.floor(Number(data?.addDays) || 0))),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cur, error: gErr } = await supabaseAdmin
      .from("license_codes").select("id, status, expires_at").eq("id", data.id).maybeSingle();
    if (gErr || !cur) throw new Error("Código não encontrado");
    if (cur.status === "redeemed") throw new Error("Código já resgatado — não pode ser reativado");
    const baseMs = cur.expires_at && Date.parse(cur.expires_at) > Date.now()
      ? Date.parse(cur.expires_at) : Date.now();
    const nextExp = data.addDays > 0
      ? new Date(baseMs + data.addDays * 86400_000).toISOString()
      : (cur.expires_at ?? new Date(Date.now() + 180 * 86400_000).toISOString());
    const { error } = await supabaseAdmin.from("license_codes")
      .update({ status: "paid", expires_at: nextExp }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: context.userId, action: "reactivate_license",
      target_type: "license_code", target_id: data.id,
      before: { status: cur.status, expires_at: cur.expires_at } as any,
      after: { status: "paid", expires_at: nextExp } as any,
    });
    return { ok: true, expiresAt: nextExp };
  });

/** Admin: deleta permanentemente código que ainda não foi resgatado. */
export const deleteLicenseCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => ({ id: String(data?.id ?? "") }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cur } = await supabaseAdmin
      .from("license_codes").select("id, status, code").eq("id", data.id).maybeSingle();
    if (!cur) throw new Error("Código não encontrado");
    if (cur.status === "redeemed") throw new Error("Não é possível excluir um código já resgatado. Use revogar.");
    const { error } = await supabaseAdmin.from("license_codes")
      .delete().eq("id", data.id).neq("status", "redeemed");
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: context.userId, action: "delete_license",
      target_type: "license_code", target_id: data.id,
      before: { status: cur.status, code: cur.code } as any,
    });
    return { ok: true };
  });

/** Admin: altera data de expiração de um código. */
export const updateLicenseCodeExpiry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; expiresAt: string }) => ({
    id: String(data?.id ?? ""),
    expiresAt: String(data?.expiresAt ?? ""),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const iso = new Date(data.expiresAt);
    if (Number.isNaN(iso.getTime())) throw new Error("Data inválida");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cur } = await supabaseAdmin
      .from("license_codes").select("id, status, expires_at").eq("id", data.id).maybeSingle();
    if (!cur) throw new Error("Código não encontrado");
    const patch: { expires_at: string; status?: string } = { expires_at: iso.toISOString() };
    // Se estava expirado e nova data é no futuro, volta para 'paid'
    if (cur.status === "expired" && iso.getTime() > Date.now()) patch.status = "paid";
    const { error } = await supabaseAdmin.from("license_codes").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: context.userId, action: "update_license_expiry",
      target_type: "license_code", target_id: data.id,
      before: { expires_at: cur.expires_at, status: cur.status } as any,
      after: patch as any,
    });
    return { ok: true, expiresAt: iso.toISOString() };
  });

/** Admin: reemite código — revoga o antigo (se não resgatado) e cria um novo com mesmo plano. Notifica o comprador. */
export const reissueLicenseCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; expiresInDays?: number; notifyBuyer?: boolean }) => ({
    id: String(data?.id ?? ""),
    expiresInDays: Math.max(1, Math.min(730, Math.floor(Number(data?.expiresInDays) || 180))),
    notifyBuyer: data?.notifyBuyer !== false,
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: old, error: gErr } = await supabaseAdmin
      .from("license_codes")
      .select("id, code, plan_id, price_cents, status, buyer_user_id, redeemed_by, notes")
      .eq("id", data.id).maybeSingle();
    if (gErr || !old) throw new Error("Código não encontrado");
    if (old.status === "redeemed") {
      throw new Error("Este código já foi resgatado — a assinatura correspondente já está aplicada.");
    }
    const expiresAt = new Date(Date.now() + data.expiresInDays * 86400_000).toISOString();
    const newCodeStr = newCode();
    const { data: ins, error: iErr } = await supabaseAdmin.from("license_codes")
      .insert({
        code: newCodeStr, plan_id: old.plan_id, price_cents: old.price_cents,
        status: "paid", expires_at: expiresAt,
        buyer_user_id: old.buyer_user_id, created_by: context.userId,
        notes: `Reemitido de ${old.code}`,
      }).select("id, code, expires_at").single();
    if (iErr) throw new Error(iErr.message);

    // Revoga o antigo para evitar dois códigos válidos ao mesmo tempo
    await supabaseAdmin.from("license_codes")
      .update({ status: "revoked", notes: `Substituído por ${newCodeStr}` })
      .eq("id", old.id);

    // Notifica o comprador (in-app) se possível
    const target = old.buyer_user_id ?? old.redeemed_by;
    if (data.notifyBuyer && target) {
      await supabaseAdmin.from("user_notifications").insert({
        user_id: target,
        kind: "license_reissued",
        title: "Novo código de licença enviado 🎟️",
        body: `Seu código foi reemitido. Novo código: ${newCodeStr}. Acesse "Minhas licenças" para copiar e ativar.`,
        link: "/minhas-licencas",
        metadata: { old_code: old.code, new_code: newCodeStr, license_id: ins!.id } as any,
      });
    }

    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: context.userId, action: "reissue_license",
      target_type: "license_code", target_id: old.id,
      before: { code: old.code, status: old.status } as any,
      after: { new_code: newCodeStr, new_id: ins!.id, expires_at: expiresAt } as any,
    });

    return { ok: true, newCode: newCodeStr, newId: ins!.id, expiresAt };
  });

/** Usuário: lista as próprias licenças (compradas ou resgatadas). */
export type MyLicense = {
  id: string; code: string; status: string; price_cents: number;
  expires_at: string; redeemed_at: string | null; created_at: string;
  plan_name: string | null; plan_days: number | null;
  is_mine_redeemed: boolean; is_mine_buyer: boolean;
};

export const listMyLicenses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyLicense[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("license_codes")
      .select("id, code, status, price_cents, expires_at, redeemed_at, redeemed_by, buyer_user_id, created_at, license_plans!inner(name, days)")
      .or(`buyer_user_id.eq.${context.userId},redeemed_by.eq.${context.userId}`)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      id: r.id, code: r.code, status: r.status, price_cents: r.price_cents,
      expires_at: r.expires_at, redeemed_at: r.redeemed_at, created_at: r.created_at,
      plan_name: r.license_plans?.name ?? null, plan_days: r.license_plans?.days ?? null,
      is_mine_redeemed: r.redeemed_by === context.userId,
      is_mine_buyer: r.buyer_user_id === context.userId,
    }));
  });

/** Usuário: solicita reenvio do próprio código (cria notificação in-app e alerta admin). */
export const requestMyLicenseResend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { licenseId: string }) => ({ licenseId: String(data?.licenseId ?? "") }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: lic, error } = await supabaseAdmin
      .from("license_codes")
      .select("id, code, status, buyer_user_id, redeemed_by")
      .eq("id", data.licenseId).maybeSingle();
    if (error || !lic) throw new Error("Licença não encontrada");
    if (lic.buyer_user_id !== context.userId && lic.redeemed_by !== context.userId) {
      throw new Response("Acesso negado", { status: 403 });
    }
    await supabaseAdmin.from("user_notifications").insert({
      user_id: context.userId,
      kind: "license_resend",
      title: "Seu código de licença 🎟️",
      body: `Aqui está o código solicitado: ${lic.code}`,
      link: "/minhas-licencas",
      metadata: { license_id: lic.id, code: lic.code } as any,
    });
    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: context.userId, action: "user_resend_request",
      target_type: "license_code", target_id: lic.id,
      notes: "Cliente solicitou reenvio do próprio código",
    });
    return { ok: true, code: lic.code };
  });

/** Cliente: pré-visualiza detalhes do código antes de resgatar (validade, status, reembolsável). */
export type LicensePreview = {
  found: boolean;
  status: string | null;
  statusLabel: string;
  expiresAt: string | null;
  isExpired: boolean;
  daysUntilExpiry: number | null;
  planName: string | null;
  planDays: number | null;
  priceCents: number | null;
  refundable: boolean;
  refundDeadline: string | null;
  message: string;
  redeemable: boolean;
};

const REFUND_WINDOW_DAYS = 7;

export const previewLicenseCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string }) => ({ code: String(data?.code ?? "").toUpperCase().trim() }))
  .handler(async ({ data }): Promise<LicensePreview> => {
    const empty: LicensePreview = {
      found: false, status: null, statusLabel: "—",
      expiresAt: null, isExpired: false, daysUntilExpiry: null,
      planName: null, planDays: null, priceCents: null,
      refundable: false, refundDeadline: null,
      message: "Código não encontrado. Verifique se digitou corretamente.",
      redeemable: false,
    };
    if (data.code.length < 6) return empty;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: lic } = await supabaseAdmin
      .from("license_codes")
      .select("id, code, status, price_cents, expires_at, created_at, license_plans!inner(name, days)")
      .eq("code", data.code).maybeSingle();
    if (!lic) return empty;
    const now = Date.now();
    const expMs = lic.expires_at ? Date.parse(lic.expires_at) : null;
    const isExpired = expMs != null && expMs < now;
    const daysUntilExpiry = expMs != null ? Math.ceil((expMs - now) / 86400_000) : null;
    const createdMs = lic.created_at ? Date.parse(lic.created_at) : now;
    const refundDeadlineMs = createdMs + REFUND_WINDOW_DAYS * 86400_000;
    const withinRefundWindow = now <= refundDeadlineMs;
    const notRedeemed = lic.status !== "redeemed";
    const refundable = notRedeemed && withinRefundWindow && lic.status !== "revoked";
    const plan: any = lic.license_plans;
    const effectiveStatus = isExpired && lic.status === "paid" ? "expired" : lic.status;
    const statusLabel =
      effectiveStatus === "paid" ? "Pronto para ativar"
      : effectiveStatus === "redeemed" ? "Já resgatado"
      : effectiveStatus === "revoked" ? "Revogado"
      : effectiveStatus === "expired" ? "Expirado"
      : effectiveStatus === "pending" ? "Aguardando pagamento"
      : String(effectiveStatus ?? "—");
    const redeemable = effectiveStatus === "paid";
    const message =
      effectiveStatus === "paid" ? "Código válido — clique em Ativar para vincular à sua conta."
      : effectiveStatus === "redeemed" ? "Este código já foi utilizado."
      : effectiveStatus === "revoked" ? "Código revogado pelo administrador."
      : effectiveStatus === "expired" ? "Código expirou. Solicite reemissão à equipe."
      : effectiveStatus === "pending" ? "Pagamento ainda não confirmado."
      : "Status desconhecido.";
    return {
      found: true, status: effectiveStatus, statusLabel,
      expiresAt: lic.expires_at ?? null, isExpired, daysUntilExpiry,
      planName: plan?.name ?? null, planDays: plan?.days ?? null,
      priceCents: lic.price_cents ?? null,
      refundable, refundDeadline: new Date(refundDeadlineMs).toISOString(),
      message, redeemable,
    };
  });
/**
 * Verificação PÚBLICA em tempo real (sem login) para o campo de resgate.
 * Retorna apenas o estado mínimo: se existe, se é resgatável, motivo curto.
 * Nunca revela dados sensíveis (dono, e-mail, plano, valor).
 */
export type PublicLicenseCheck = {
  valid: boolean;           // formato/comprimento OK
  found: boolean;           // existe no banco
  redeemable: boolean;      // pago e não expirado / não usado
  status: string | null;    // 'paid' | 'redeemed' | 'revoked' | 'expired' | 'pending' | null
  reason: string;           // mensagem curta para UI
};

export const checkLicenseCodePublic = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string }) => ({
    code: String(data?.code ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").trim(),
  }))
  .handler(async ({ data }): Promise<PublicLicenseCheck> => {
    const code = data.code;
    if (code.length < 8) {
      return { valid: false, found: false, redeemable: false, status: null, reason: "Código incompleto." };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: lic, error } = await supabaseAdmin
      .from("license_codes")
      .select("status, expires_at")
      .eq("code", code)
      .maybeSingle();
    if (error) {
      return { valid: true, found: false, redeemable: false, status: null, reason: "Não foi possível verificar agora. Tente novamente." };
    }
    if (!lic) {
      return { valid: true, found: false, redeemable: false, status: null, reason: "Código não reconhecido." };
    }
    const expMs = lic.expires_at ? Date.parse(lic.expires_at) : null;
    const isExpired = expMs != null && expMs < Date.now();
    const effective = isExpired && lic.status === "paid" ? "expired" : (lic.status as string);
    const reason =
      effective === "paid" ? "Código válido — pronto para ativar."
      : effective === "redeemed" ? "Este código já foi utilizado."
      : effective === "revoked" ? "Código revogado pelo administrador."
      : effective === "expired" ? "Código expirado."
      : effective === "pending" ? "Pagamento ainda não confirmado."
      : "Status desconhecido.";
    return {
      valid: true,
      found: true,
      redeemable: effective === "paid",
      status: effective,
      reason,
    };
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
