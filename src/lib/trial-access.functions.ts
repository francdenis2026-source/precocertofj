import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function seg(n = 4): string {
  return Array.from({ length: n }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
}
function newCode(): string {
  return `PC-${seg()}-${seg()}-${seg()}`;
}

async function assertAdmin(context: { supabase: any; userId: string }): Promise<void> {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Response("Acesso negado", { status: 403 });
}

export type TrialCodeRow = {
  id: string; code: string; status: string;
  duration_minutes: number | null;
  access_expires_at: string | null;
  redeemed_by: string | null; redeemed_at: string | null;
  expires_at: string; created_at: string; notes: string | null;
};

/** Lista códigos de acesso temporário. */
export const listTrialCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { status?: string; search?: string; limit?: number }) => ({
    status: data?.status ?? null,
    search: data?.search ? String(data.search).trim() : null,
    limit: Math.min(500, Math.max(10, Math.floor(Number(data?.limit) || 200))),
  }))
  .handler(async ({ data, context }): Promise<TrialCodeRow[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("license_codes")
      .select("id, code, status, duration_minutes, access_expires_at, redeemed_by, redeemed_at, expires_at, created_at, notes")
      .eq("is_trial_access", true)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    if (data.search) q = q.ilike("code", `%${data.search.toUpperCase()}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as TrialCodeRow[];
  });

/** Cria N códigos de acesso temporário (duração em minutos). */
export const createTrialCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { quantity: number; durationMinutes: number; reservationDays?: number; notes?: string }) => ({
    quantity: Math.max(1, Math.min(500, Math.floor(Number(data?.quantity) || 1))),
    durationMinutes: Math.max(5, Math.min(60 * 24 * 365, Math.floor(Number(data?.durationMinutes) || 1440))),
    reservationDays: Math.max(1, Math.min(730, Math.floor(Number(data?.reservationDays) || 180))),
    notes: data?.notes ? String(data.notes).slice(0, 200) : null,
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: plan, error: pErr } = await supabaseAdmin
      .from("license_plans").select("id").eq("slug", "acesso-temporario").maybeSingle();
    if (pErr || !plan) throw new Error("Plano 'acesso-temporario' não encontrado");
    const expiresAt = new Date(Date.now() + data.reservationDays * 86400_000).toISOString();
    const rows = Array.from({ length: data.quantity }).map(() => ({
      code: newCode(), plan_id: plan.id, price_cents: 0,
      status: "paid" as const, expires_at: expiresAt,
      duration_minutes: data.durationMinutes, is_trial_access: true,
      created_by: context.userId, notes: data.notes,
    }));
    const { data: ins, error } = await supabaseAdmin.from("license_codes")
      .insert(rows).select("id, code, duration_minutes, expires_at");
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: context.userId, action: "create_trial_codes",
      target_type: "license_codes", target_id: null,
      after: { count: rows.length, durationMinutes: data.durationMinutes } as any,
    });
    return { ok: true, codes: ins ?? [] };
  });

/** Atualiza duração/validade/notas de código não resgatado. */
export const updateTrialCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; durationMinutes?: number; expiresAt?: string; notes?: string | null }) => ({
    id: String(data?.id ?? ""),
    durationMinutes: data?.durationMinutes != null
      ? Math.max(5, Math.min(60 * 24 * 365, Math.floor(Number(data.durationMinutes)))) : undefined,
    expiresAt: data?.expiresAt ? String(data.expiresAt) : undefined,
    notes: data?.notes === null ? null : (data?.notes ? String(data.notes).slice(0, 200) : undefined),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cur } = await supabaseAdmin.from("license_codes")
      .select("id, status, duration_minutes, expires_at, notes")
      .eq("id", data.id).maybeSingle();
    if (!cur) throw new Error("Código não encontrado");
    if (cur.status === "redeemed") throw new Error("Código já resgatado — não pode ser editado.");
    const patch: Record<string, unknown> = {};
    if (data.durationMinutes !== undefined) patch.duration_minutes = data.durationMinutes;
    if (data.expiresAt) {
      const iso = new Date(data.expiresAt);
      if (Number.isNaN(iso.getTime())) throw new Error("Data inválida");
      patch.expires_at = iso.toISOString();
    }
    if (data.notes !== undefined) patch.notes = data.notes;
    if (!Object.keys(patch).length) return { ok: true };
    const { error } = await supabaseAdmin.from("license_codes").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: context.userId, action: "update_trial_code",
      target_type: "license_code", target_id: data.id,
      before: cur as any, after: patch as any,
    });
    return { ok: true };
  });

/** Exclui código não resgatado. */
export const deleteTrialCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => ({ id: String(data?.id ?? "") }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cur } = await supabaseAdmin.from("license_codes")
      .select("id, code, status").eq("id", data.id).maybeSingle();
    if (!cur) throw new Error("Código não encontrado");
    if (cur.status === "redeemed") throw new Error("Código já resgatado — use revogar.");
    const { error } = await supabaseAdmin.from("license_codes")
      .delete().eq("id", data.id).neq("status", "redeemed");
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: context.userId, action: "delete_trial_code",
      target_type: "license_code", target_id: data.id,
      before: { code: cur.code, status: cur.status } as any,
    });
    return { ok: true };
  });

/** Revoga (mesmo se já resgatado ainda-vigente: encerra o acesso agora). */
export const revokeTrialCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; endAccessNow?: boolean }) => ({
    id: String(data?.id ?? ""),
    endAccessNow: data?.endAccessNow !== false,
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cur } = await supabaseAdmin.from("license_codes")
      .select("id, status, redeemed_by, access_expires_at").eq("id", data.id).maybeSingle();
    if (!cur) throw new Error("Código não encontrado");

    if (cur.status === "redeemed" && data.endAccessNow) {
      // Encerra o acesso: seta access_expires_at=now() e ajusta profiles.paid_until se estiver ligado a este código
      const now = new Date().toISOString();
      await supabaseAdmin.from("license_codes")
        .update({ access_expires_at: now, notes: "Acesso encerrado pelo admin" })
        .eq("id", data.id);
      if (cur.redeemed_by) {
        await supabaseAdmin.from("profiles").update({ paid_until: now }).eq("id", cur.redeemed_by);
      }
    } else {
      await supabaseAdmin.from("license_codes")
        .update({ status: "revoked" }).eq("id", data.id).neq("status", "redeemed");
    }
    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: context.userId, action: "revoke_trial_code",
      target_type: "license_code", target_id: data.id,
      before: cur as any,
    });
    return { ok: true };
  });

/** Auditoria: usuários com acesso temporário. */
export type TrialUser = {
  license_id: string; code: string; user_id: string | null;
  full_name: string | null; email: string | null;
  redeemed_at: string | null; access_expires_at: string | null;
  duration_minutes: number | null; minutes_remaining: number;
  is_active: boolean; notes: string | null;
};

export const listTrialAccessUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { includeEnded?: boolean }) => ({ includeEnded: !!data?.includeEnded }))
  .handler(async ({ data, context }): Promise<TrialUser[]> => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .rpc("list_trial_access_users", { _include_ended: data.includeEnded });
    if (error) throw new Error(error.message);
    return (rows ?? []) as TrialUser[];
  });
