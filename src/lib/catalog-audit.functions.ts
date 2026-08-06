import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";

export type AuditLogEntry = {
  id: string;
  catalogId: string | null;
  actorUserId: string | null;
  actorEmail: string | null;
  action: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  metadata: string;
  createdAt: string;
  catalogDisplayName: string | null;
};

type Row = {
  id: string;
  catalog_id: string | null;
  actor_user_id: string | null;
  action: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export const listCatalogAudit = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((input: { catalogId?: string; limit?: number } | undefined) => input ?? {})
  .handler(async ({ data }): Promise<AuditLogEntry[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const limit = Math.min(Math.max(data.limit ?? 100, 1), 500);

    type Query = {
      select: (s: string) => Query;
      eq: (c: string, v: string) => Query;
      order: (c: string, o: { ascending: boolean }) => Query;
      limit: (n: number) => Promise<{ data: Row[] | null; error: { message: string } | null }>;
    };
    let q = supabaseAdmin.from("product_catalog_audit" as never) as unknown as Query;
    q = q.select(
      "id, catalog_id, actor_user_id, action, field, old_value, new_value, metadata, created_at",
    );
    if (data.catalogId) q = q.eq("catalog_id", data.catalogId);
    const { data: rows, error } = await q.order("created_at", { ascending: false }).limit(limit);
    if (error) throw new Error(error.message);

    // Resolve nomes de catálogo e emails de usuários
    const catIds = Array.from(new Set((rows ?? []).map((r) => r.catalog_id).filter((v): v is string => !!v)));
    const userIds = Array.from(
      new Set((rows ?? []).map((r) => r.actor_user_id).filter((v): v is string => !!v)),
    );

    const catNameById = new Map<string, string>();
    if (catIds.length > 0) {
      const catTable = supabaseAdmin.from("product_catalog" as never) as unknown as {
        select: (s: string) => {
          in: (
            c: string,
            v: string[],
          ) => Promise<{
            data: Array<{ id: string; display_name: string }> | null;
            error: { message: string } | null;
          }>;
        };
      };
      const { data: cats } = await catTable.select("id, display_name").in("id", catIds);
      for (const c of cats ?? []) catNameById.set(c.id, c.display_name);
    }

    const emailById = new Map<string, string>();
    for (const uid of userIds) {
      try {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
        if (u?.user?.email) emailById.set(uid, u.user.email);
      } catch {
        /* ignora */
      }
    }

    return (rows ?? []).map((r) => ({
      id: r.id,
      catalogId: r.catalog_id,
      actorUserId: r.actor_user_id,
      actorEmail: r.actor_user_id ? emailById.get(r.actor_user_id) ?? null : null,
      action: r.action,
      field: r.field,
      oldValue: r.old_value,
      newValue: r.new_value,
      metadata: JSON.stringify(r.metadata ?? {}),
      createdAt: r.created_at,
      catalogDisplayName: r.catalog_id ? catNameById.get(r.catalog_id) ?? null : null,
    }));
  });
