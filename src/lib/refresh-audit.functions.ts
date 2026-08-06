import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Registra um evento de refresh manual (botão "Atualizar") em `admin_audit_log`
 * via `admin_log_action`. Só grava quando algo interessante aconteceu:
 * duração > 250ms OU status != success. Isso evita poluir o log com refreshes
 * instantâneos de cache warm.
 */

const schema = z.object({
  scope: z.string().min(1).max(60),
  result: z.enum(["success", "error", "timeout"]),
  durationMs: z.number().int().nonnegative(),
  rpc: z.string().max(80).optional(),
  errorCode: z.string().max(80).optional(),
  errorMessage: z.string().max(300).optional(),
});

export type LogRefreshInput = z.infer<typeof schema>;

export const logRefreshEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => schema.parse(raw))
  .handler(async ({ data, context }): Promise<{ logged: boolean }> => {
    // Filtro para evitar spam: só registra se demorou ou falhou.
    if (data.result === "success" && data.durationMs <= 250) {
      return { logged: false };
    }
    const { error } = await context.supabase.rpc("admin_log_action", {
      _action: "refresh",
      _target_type: "panel",
      _target_id: data.scope,
      _before: null,
      _after: {
        scope: data.scope,
        result: data.result,
        duration_ms: data.durationMs,
        rpc: data.rpc ?? null,
        error_code: data.errorCode ?? null,
        error_message: data.errorMessage ?? null,
      },
      _notes: `refresh:${data.scope}:${data.result}`,
    });
    if (error) {
      // Não bloqueia UX se o log falhar — apenas retorna sinalização.
      return { logged: false };
    }
    return { logged: true };
  });
