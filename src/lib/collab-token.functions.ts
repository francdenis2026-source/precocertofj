import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Retorna (ou gera) o token único de colaborador do usuário autenticado.
 * Formato: PC-XXXX-XXXX (10 caracteres úteis, alfabeto sem ambiguidade).
 */
export const getMyCollabToken = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ token: string }> => {
    const { data, error } = await context.supabase.rpc(
      "get_or_create_collab_token" as never,
    );
    if (error) throw new Error(error.message);
    return { token: String(data ?? "") };
  });

export type CollabMonthProgress = {
  month_key: string;
  submissions_month: number;
  approved_month: number;
  days_awarded: number;
  days_remaining: number;
  monthly_cap: number;
};

/**
 * Progresso do mês corrente: quantos envios, aprovados, dias creditados e restantes.
 */
export const getMyCollabMonthProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CollabMonthProgress> => {
    const { data, error } = await context.supabase.rpc(
      "get_my_collab_month_progress" as never,
    );
    if (error) throw new Error(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    return (row ?? {
      month_key: new Date().toISOString().slice(0, 7),
      submissions_month: 0,
      approved_month: 0,
      days_awarded: 0,
      days_remaining: 30,
      monthly_cap: 30,
    }) as CollabMonthProgress;
  });

/**
 * Admin: encontra o dono de um envio pelo token do colaborador.
 * Usado no painel para vincular automaticamente e-mails recebidos com contas.
 */
export const findUserByCollabToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) =>
    z.object({ token: z.string().min(6).max(20) }).parse(raw),
  )
  .handler(
    async ({
      data,
      context,
    }): Promise<{ user_id: string; email: string; full_name: string | null } | null> => {
      const { data: rows, error } = await context.supabase.rpc(
        "find_user_by_collab_token" as never,
        { _token: data.token } as never,
      );
      if (error) throw new Error(error.message);
      const row = (Array.isArray(rows) ? rows[0] : rows) as
        | { user_id: string; email: string; full_name: string | null }
        | undefined
        | null;
      return row ?? null;
    },
  );
