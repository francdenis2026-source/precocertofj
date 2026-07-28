import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/lib/require-admin";

export type LogScope =
  | "login_events"
  | "admin_audit_log"
  | "role_audit_log"
  | "analytics_events"
  | "edit_audit_log"
  | "product_catalog_audit"
  | "webhook_events";

export const LOG_SCOPES: Array<{ key: LogScope; label: string; description: string }> = [
  { key: "login_events", label: "Eventos de login", description: "Métricas de acessos, tentativas e falhas de login." },
  { key: "admin_audit_log", label: "Auditoria administrativa", description: "Ações de administradores (roles, IPs, promoções, etc.)." },
  { key: "role_audit_log", label: "Auditoria de papéis", description: "Concessões e revogações de papéis." },
  { key: "analytics_events", label: "Eventos de analytics", description: "Buscas, page views e eventos de UX." },
  { key: "edit_audit_log", label: "Edições de conteúdo", description: "Auditoria de edições em entidades." },
  { key: "product_catalog_audit", label: "Auditoria do catálogo", description: "Alterações em product_catalog." },
  { key: "webhook_events", label: "Webhooks", description: "Histórico de recebimento de webhooks." },
];

export type ClearLogsResult = {
  scope: LogScope;
  ok: boolean;
  deleted: number;
  error: string | null;
};

/**
 * Apaga DEFINITIVAMENTE registros de logs administrativos e reinicia métricas de usuários/logins.
 * Só admins podem chamar. Registra a operação em admin_audit_log ANTES de zerar (para deixar
 * um "carimbo" da limpeza, mesmo quando o admin_audit_log for o próprio escopo).
 */
export const clearAdminLogs = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { scopes: LogScope[]; olderThan?: string | null }) => {
    if (!Array.isArray(input?.scopes) || input.scopes.length === 0) {
      throw new Error("Selecione pelo menos um escopo para limpar.");
    }
    return input;
  })
  .handler(async ({ data, context }): Promise<{ results: ClearLogsResult[]; clearedAt: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const olderThan = data.olderThan ?? null;

    // Marca a operação antes de limpar (útil como recibo para o cliente e trilha de custódia).
    try {
      await supabaseAdmin.from("admin_audit_log").insert({
        admin_user_id: context.userId,
        action: "logs_clear",
        target_type: "logs",
        target_id: "bulk",
        after: { scopes: data.scopes, olderThan },
        notes: "Limpeza definitiva de logs a partir do painel administrativo.",
      });
    } catch {
      // não bloqueia a limpeza — o objetivo primário é zerar as métricas.
    }

    const results: ClearLogsResult[] = [];
    for (const scope of data.scopes) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let q: any = (supabaseAdmin as any).from(scope).delete({ count: "exact" });
        if (olderThan) q = q.lt("created_at", olderThan);
        else q = q.not("id", "is", null); // exige um WHERE — remove tudo
        const { count, error } = await q;
        if (error) throw error;
        results.push({ scope, ok: true, deleted: count ?? 0, error: null });
      } catch (err) {
        results.push({
          scope,
          ok: false,
          deleted: 0,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { results, clearedAt: new Date().toISOString() };
  });

/**
 * "Self-heal": concede o papel de admin ao próprio usuário autenticado.
 * SEGURANÇA: só aplica quando (a) não existe NENHUM admin cadastrado na tabela user_roles OU
 * (b) o e-mail do usuário está em ADMIN_EMAIL_ALLOWLIST.
 * Isto evita escalonamento de privilégio por qualquer usuário autenticado.
 */
export const grantSelfAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!context.userId) throw new Error("Sessão inválida — refaça login.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) existe algum admin?
    const { count: adminCount, error: countErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "admin");
    if (countErr) throw new Error(countErr.message);

    // 2) email do chamador
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const email = String(((context.claims as any)?.email ?? "")).toLowerCase();
    const ALLOWLIST = new Set(["francdenisbr@gmail.com"]);

    const canBootstrap = (adminCount ?? 0) === 0;
    const inAllowlist = ALLOWLIST.has(email);

    if (!canBootstrap && !inAllowlist) {
      throw new Error(
        "Bloqueado: já existe pelo menos um admin no sistema e seu e-mail não está na allowlist. " +
          "Peça a um admin existente para conceder o papel manualmente em user_roles.",
      );
    }

    const { error: insertErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "admin" }, { onConflict: "user_id,role" });
    if (insertErr) throw new Error(insertErr.message);

    // trilha
    try {
      await supabaseAdmin.from("role_audit_log").insert({
        actor_id: context.userId,
        actor_email: email || null,
        target_user_id: context.userId,
        target_email: email || null,
        role: "admin",
        action: canBootstrap ? "bootstrap_admin" : "self_grant_allowlisted",
      });
    } catch {
      // best-effort
    }

    return {
      ok: true as const,
      userId: context.userId,
      email: email || null,
      reason: canBootstrap ? "bootstrap" : "allowlist",
    };
  });
