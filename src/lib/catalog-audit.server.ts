/**
 * Helper server-only para inserir entradas no log de auditoria do catálogo.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type AuditAction =
  | "update"
  | "image_upload"
  | "image_generated"
  | "image_web"
  | "image_upload_failed"
  | "image_web_failed"
  | "image_generated_failed"
  | "image_search_matched"
  | "image_search_missed"
  | "image_reused"
  | "merge"
  | "delete"
  | "create";

export type AuditResult = "success" | "error";

export type AuditEntry = {
  catalogId: string | null;
  actorUserId: string | null;
  action: AuditAction;
  field?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: Record<string, unknown>;
  result?: AuditResult;
  errorCode?: string | null;
};

export async function logAudit(entries: AuditEntry | AuditEntry[]): Promise<void> {
  const arr = Array.isArray(entries) ? entries : [entries];
  if (arr.length === 0) return;
  const rows = arr.map((e) => ({
    catalog_id: e.catalogId,
    actor_user_id: e.actorUserId,
    action: e.action,
    field: e.field ?? null,
    old_value: e.oldValue ?? null,
    new_value: e.newValue ?? null,
    metadata: e.metadata ?? {},
    result: e.result ?? (e.action.endsWith("_failed") ? "error" : "success"),
    error_code: e.errorCode ?? null,
  }));
  const table = supabaseAdmin.from("product_catalog_audit" as never) as unknown as {
    insert: (v: Record<string, unknown>[]) => Promise<{ error: { message: string } | null }>;
  };
  const { error } = await table.insert(rows);
  if (error) console.error("[audit] falha ao registrar:", error.message);
}
