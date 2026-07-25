import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AiSettings = {
  defaultQuota: number;
  requireActivePlan: boolean;
  allowTrial: boolean;
  assistantEnabled: boolean;
  warnThresholds: number[];
  updatedAt: string | null;
};

export type AiPlanQuota = {
  id: string;
  name: string;
  slug: string;
  days: number;
  priceCents: number;
  active: boolean;
  aiMonthlyQuota: number;
};

function mapSettings(r: Record<string, unknown> | null): AiSettings {
  return {
    defaultQuota: Number(r?.default_quota ?? 20),
    requireActivePlan: Boolean(r?.require_active_plan ?? true),
    allowTrial: Boolean(r?.allow_trial ?? false),
    assistantEnabled: Boolean(r?.assistant_enabled ?? true),
    warnThresholds: (r?.warn_thresholds as number[]) ?? [75, 95],
    updatedAt: (r?.updated_at as string) ?? null,
  };
}

/** Configurações de IA + cota de cada plano (somente administradores). */
export const getAiAdminConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ settings: AiSettings; plans: AiPlanQuota[] }> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Response("Forbidden", { status: 403 });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: s }, { data: plans }] = await Promise.all([
      supabaseAdmin.from("ai_settings").select("*").maybeSingle(),
      supabaseAdmin
        .from("license_plans")
        .select("id, name, slug, days, price_cents, active, ai_monthly_quota")
        .order("price_cents", { ascending: true }),
    ]);

    return {
      settings: mapSettings((s as Record<string, unknown>) ?? null),
      plans: (plans ?? []).map((p) => ({
        id: p.id as string,
        name: p.name as string,
        slug: p.slug as string,
        days: p.days ?? 0,
        priceCents: p.price_cents ?? 0,
        active: Boolean(p.active),
        aiMonthlyQuota: (p as { ai_monthly_quota?: number }).ai_monthly_quota ?? 20,
      })),
    };
  });

/** Atualiza as regras globais de IA (cota padrão, acesso, avisos). */
export const updateAiSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    defaultQuota?: number;
    requireActivePlan?: boolean;
    allowTrial?: boolean;
    assistantEnabled?: boolean;
    warnThresholds?: number[];
  }) => data ?? {})
  .handler(async ({ data, context }): Promise<AiSettings> => {
    const thresholds = data.warnThresholds
      ? [...new Set(data.warnThresholds.filter((n) => Number.isFinite(n) && n > 0 && n <= 100))]
          .map((n) => Math.round(n))
          .sort((a, b) => a - b)
      : undefined;

    const { data: row, error } = await context.supabase.rpc("admin_update_ai_settings", {
      _default_quota: data.defaultQuota,
      _require_active_plan: data.requireActivePlan,
      _allow_trial: data.allowTrial,
      _assistant_enabled: data.assistantEnabled,
      _warn_thresholds: thresholds,
    });
    if (error) throw new Error(error.message);
    return mapSettings((Array.isArray(row) ? row[0] : row) as Record<string, unknown>);
  });

/** Define a cota mensal de perguntas à IA de um plano. */
export const setPlanAiQuota = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { planId: string; quota: number }) => {
    if (!data?.planId) throw new Error("planId obrigatório");
    return { planId: data.planId, quota: Math.max(0, Math.round(Number(data.quota) || 0)) };
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase.rpc("admin_set_plan_ai_quota", {
      _plan_id: data.planId,
      _quota: data.quota,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Sobrescreve a cota do mês de um usuário específico. */
export const setUserAiQuota = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; quota: number }) => {
    if (!data?.userId) throw new Error("userId obrigatório");
    return { userId: data.userId, quota: Math.max(0, Math.round(Number(data.quota) || 0)) };
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase.rpc("admin_set_user_ai_quota", {
      _user_id: data.userId,
      _quota: data.quota,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
