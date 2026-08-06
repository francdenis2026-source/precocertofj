import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AiUsageTotals = {
  calls: number;
  failures: number;
  users: number;
  tokens: number;
  creditsCents: number;
  avgDurationMs: number;
  p95DurationMs: number;
};

export type AiUsageByFunction = {
  functionName: string;
  calls: number;
  failures: number;
  tokens: number;
  creditsCents: number;
  avgDurationMs: number;
};

export type AiUsageByUser = {
  userId: string | null;
  email: string | null;
  calls: number;
  failures: number;
  tokens: number;
  creditsCents: number;
};

export type AiUsagePoint = {
  bucket: string;
  calls: number;
  failures: number;
  creditsCents: number;
};

export type AiUsageFailure = {
  id: string;
  functionName: string;
  errorMessage: string | null;
  createdAt: string;
};

export type AiUsageOverview = {
  sinceHours: number;
  totals: AiUsageTotals;
  byFunction: AiUsageByFunction[];
  topUsers: AiUsageByUser[];
  series: AiUsagePoint[];
  recentFailures: AiUsageFailure[];
};

/**
 * Painel de observabilidade da IA (somente administradores).
 * A autorização é feita dentro da RPC `admin_ai_usage_overview`,
 * executada com a sessão do usuário (RLS + has_role).
 */
export const getAiUsageOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { hours?: number } | undefined) => ({
    hours: Math.min(Math.max(Math.round(Number(input?.hours) || 24), 1), 24 * 90),
  }))
  .handler(async ({ data, context }): Promise<AiUsageOverview> => {
    const { data: row, error } = await context.supabase.rpc("admin_ai_usage_overview", {
      _hours: data.hours,
    });
    if (error) throw new Error(error.message);
    return row as unknown as AiUsageOverview;
  });
