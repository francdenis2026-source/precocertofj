/**
 * Proteção dos endpoints de IA: limite de chamadas por usuário e auditoria
 * completa em `public.ai_usage`. Server-only (nunca importar de componentes).
 */

type UsageInput = {
  userId: string;
  functionName: string;
  model?: string | null;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  success: boolean;
  errorMessage?: string | null;
  /** Tempo total da chamada, em milissegundos (observabilidade). */
  durationMs?: number | null;
};

/** Custo aproximado por 1k tokens (centavos) — usado só para relatórios. */
const CENTS_PER_1K_TOKENS = 0.03;

export async function assertAiRateLimit(
  userId: string,
  functionName: string,
  maxCalls = 30,
  windowMinutes = 60,
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("check_ai_rate_limit", {
    _user_id: userId,
    _function_name: functionName,
    _max_calls: maxCalls,
    _window_minutes: windowMinutes,
  });
  if (error) return; // limite não pode derrubar o recurso; segue com auditoria
  const result = data as { allowed?: boolean; used?: number; limit?: number } | null;
  if (result && result.allowed === false) {
    throw new Error(
      `Limite de uso de IA atingido (${result.used}/${result.limit} por hora). Tente novamente mais tarde.`,
    );
  }
}

export async function logAiUsage(input: UsageInput): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const total =
      input.totalTokens ?? (input.promptTokens ?? 0) + (input.completionTokens ?? 0);
    await supabaseAdmin.from("ai_usage").insert({
      user_id: input.userId,
      function_name: input.functionName,
      model: input.model ?? null,
      prompt_tokens: input.promptTokens ?? 0,
      completion_tokens: input.completionTokens ?? 0,
      total_tokens: total,
      credits_cents: Number(((total / 1000) * CENTS_PER_1K_TOKENS).toFixed(4)),
      success: input.success,
      error_message: input.errorMessage ? input.errorMessage.slice(0, 500) : null,
    });
  } catch {
    // Auditoria nunca pode quebrar a resposta ao usuário.
  }
}

export type GatewayUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};
