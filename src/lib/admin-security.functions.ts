/**
 * Server functions administrativas de segurança:
 * - Bloqueio temporário de IPs (com TTL)
 * - Listagem de códigos promocionais de divulgação
 * - Gate de onboarding do primeiro acesso
 */
import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Bloqueio de IP (admin)
// ---------------------------------------------------------------------------
export const adminBlockIp = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((data: unknown) =>
    z
      .object({
        ip: z.string().trim().min(3).max(64),
        ttlMinutes: z.number().int().min(1).max(60 * 24 * 30).default(60),
        reason: z.string().trim().max(300).optional().default(""),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const blockedUntil = new Date(Date.now() + data.ttlMinutes * 60_000).toISOString();

    // Remove blocos ativos anteriores para o mesmo IP (upsert manual)
    await supabaseAdmin
      .from("blocked_ips")
      .delete()
      .eq("ip", data.ip)
      .gt("blocked_until", new Date().toISOString());

    const { data: row, error } = await supabaseAdmin
      .from("blocked_ips")
      .insert({
        ip: data.ip,
        blocked_until: blockedUntil,
        reason: data.reason || null,
        created_by: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: context.userId,
      action: "security.block_ip",
      target_type: "ip",
      target_id: data.ip,
      after: { ttl_minutes: data.ttlMinutes, blocked_until: blockedUntil, reason: data.reason },
    });

    return { ok: true, blockedUntil, id: row.id };
  });

export const adminUnblockIp = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((data: unknown) => z.object({ ip: z.string().trim().min(3) }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("blocked_ips")
      .update({ blocked_until: new Date().toISOString() })
      .eq("ip", data.ip)
      .gt("blocked_until", new Date().toISOString());
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: context.userId,
      action: "security.unblock_ip",
      target_type: "ip",
      target_id: data.ip,
    });
    return { ok: true };
  });

export const adminListBlockedIps = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("blocked_ips")
      .select("id, ip, blocked_until, reason, created_at")
      .gt("blocked_until", new Date().toISOString())
      .order("blocked_until", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ---------------------------------------------------------------------------
// Códigos promocionais de divulgação (30 dias)
// ---------------------------------------------------------------------------
export const adminListPromoCodes = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("license_codes")
      .select("id, code, status, expires_at, redeemed_at, redeemed_by, created_at")
      .eq("notes", "promo-lancamento")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const redeemedIds = Array.from(
      new Set((data ?? []).map((r) => r.redeemed_by).filter(Boolean)),
    ) as string[];

    let profilesMap: Record<string, { full_name: string | null; city: string | null; neighborhood: string | null }> = {};
    if (redeemedIds.length > 0) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, city, neighborhood")
        .in("id", redeemedIds);
      profilesMap = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));
    }

    return (data ?? []).map((r) => ({
      ...r,
      redeemed_profile: r.redeemed_by ? profilesMap[r.redeemed_by] ?? null : null,
    }));
  });

// ---------------------------------------------------------------------------
// Onboarding (primeiro acesso do cliente)
// ---------------------------------------------------------------------------
export const getMyOnboardingStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("full_name, phone, city, neighborhood, onboarding_completed_at")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const completed = !!data?.onboarding_completed_at;
    return {
      completed,
      profile: {
        fullName: data?.full_name ?? "",
        phone: data?.phone ?? "",
        city: data?.city ?? "",
        neighborhood: data?.neighborhood ?? "",
      },
    };
  });

export const completeMyOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        fullName: z.string().trim().min(3, "Informe seu nome completo").max(120),
        phone: z.string().trim().min(10, "Celular inválido").max(30),
        city: z.string().trim().min(2, "Informe a cidade").max(80),
        neighborhood: z.string().trim().min(2, "Informe o bairro").max(80),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch = {
      full_name: data.fullName,
      phone: data.phone.replace(/\D+/g, ""),
      city: data.city,
      neighborhood: data.neighborhood,
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { error } = await context.supabase
      .from("profiles")
      .update(patch)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
