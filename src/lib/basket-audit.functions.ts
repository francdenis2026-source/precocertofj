/**
 * Basket audit — leitura do admin_audit_log filtrada para ações da Cesta Básica.
 * Somente admins podem ler.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";

type JsonValue = string | number | boolean | null | { [k: string]: JsonValue } | JsonValue[];

export type BasketAuditEntry = {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  adminUserId: string;
  adminEmail: string | null;
  before: JsonValue;
  after: JsonValue;
  notes: string | null;
  createdAt: string;
};

export type BasketAuditFilters = {
  action: string | null;
  limit: number;
};

export const listBasketAudit = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: Partial<BasketAuditFilters>): BasketAuditFilters => ({
    action: input?.action ? String(input.action).slice(0, 60) : null,
    limit: Math.min(Math.max(Number(input?.limit ?? 100), 1), 500),
  }))
  .handler(async ({ data }): Promise<BasketAuditEntry[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = (supabaseAdmin as any)
      .from("admin_audit_log")
      .select("id, admin_user_id, action, target_type, target_id, before, after, notes, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);

    // filtra por prefixo basket_*
    if (data.action) q = q.eq("action", data.action);
    else q = q.or("action.like.basket_set.%,action.like.basket_item.%,target_type.eq.basket_item_set");

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const userIds = Array.from(
      new Set(((rows ?? []) as any[]).map((r) => r.admin_user_id).filter(Boolean)),
    );
    let emailById = new Map<string, string>();
    if (userIds.length > 0) {
      // admin.users lookup — usa Auth Admin API
      const { data: usersData } = await (supabaseAdmin as any).auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      const users = usersData?.users ?? [];
      emailById = new Map(users.filter((u: any) => userIds.includes(u.id)).map((u: any) => [u.id, u.email ?? null]));
    }

    return ((rows ?? []) as any[]).map((r) => ({
      id: r.id,
      action: r.action,
      targetType: r.target_type,
      targetId: r.target_id,
      adminUserId: r.admin_user_id,
      adminEmail: emailById.get(r.admin_user_id) ?? null,
      before: r.before,
      after: r.after,
      notes: r.notes,
      createdAt: r.created_at,
    }));
  });
