import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type JsonValue = string | number | boolean | null | { [k: string]: JsonValue } | JsonValue[];

export type AuditEntry = {
  id: string;
  entityType: "shopping_item" | "finance_tx";
  entityId: string;
  action: "update" | "delete";
  before: JsonValue;
  after: JsonValue;
  createdAt: string;
};

export const listAuditForEntity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { entityType: "shopping_item" | "finance_tx"; entityId: string }) => ({
    entityType: data.entityType === "finance_tx" ? ("finance_tx" as const) : ("shopping_item" as const),
    entityId: String(data.entityId),
  }))
  .handler(async ({ data, context }): Promise<AuditEntry[]> => {
    const { data: rows, error } = await context.supabase
      .from("edit_audit_log")
      .select("id, entity_type, entity_id, action, before, after, created_at")
      .eq("entity_type", data.entityType)
      .eq("entity_id", data.entityId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      id: r.id as string,
      entityType: r.entity_type as AuditEntry["entityType"],
      entityId: r.entity_id as string,
      action: r.action as AuditEntry["action"],
      before: (r.before ?? null) as JsonValue,
      after: (r.after ?? null) as JsonValue,
      createdAt: r.created_at as string,
    }));
  });

export const listRecentAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data?: { entityType?: "shopping_item" | "finance_tx"; limit?: number }) => ({
    entityType:
      data?.entityType === "finance_tx"
        ? ("finance_tx" as const)
        : data?.entityType === "shopping_item"
          ? ("shopping_item" as const)
          : null,
    limit: Math.min(Math.max(data?.limit ?? 30, 1), 100),
  }))
  .handler(async ({ data, context }): Promise<AuditEntry[]> => {
    let q = context.supabase
      .from("edit_audit_log")
      .select("id, entity_type, entity_id, action, before, after, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.entityType) q = q.eq("entity_type", data.entityType);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      id: r.id as string,
      entityType: r.entity_type as AuditEntry["entityType"],
      entityId: r.entity_id as string,
      action: r.action as AuditEntry["action"],
      before: (r.before ?? null) as JsonValue,
      after: (r.after ?? null) as JsonValue,
      createdAt: r.created_at as string,
    }));
  });
