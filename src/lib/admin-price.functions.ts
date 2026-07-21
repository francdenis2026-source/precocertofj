import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";

/* ----------------------------- Types ----------------------------- */

export type AuditAction =
  | "price_update"
  | "scan_delete"
  | "price_verify"
  | "price_unverify"
  | "cache_invalidate_global"
  | "cache_invalidate_product"
  | "cache_invalidate_store";

// Loose JSON — mirrors the jsonb columns; validated by the DB, not TS.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type JsonRecord = any;

export type AuditEntry = {
  id: string;
  admin_user_id: string;
  admin_email: string | null;
  action: AuditAction;
  target_type: string;
  target_id: string | null;
  before: JsonRecord;
  after: JsonRecord;
  notes: string | null;
  created_at: string;
};

/** Strip null/undefined keys so typed RPC args (all `?: T`) accept the call. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rpcArgs(args: Record<string, unknown>): any {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args)) if (v !== null && v !== undefined) out[k] = v;
  return out;
}

export type AdminScanRow = {
  id: string;
  product_name: string | null;
  price_captured: number | null;
  market_name: string | null;
  establishment_id: string | null;
  barcode: string | null;
  verified: boolean;
  verified_at: string | null;
  status: string;
  created_at: string;
};

/* --------------------------- Search --------------------------- */

const searchSchema = z.object({
  query: z.string().trim().max(200).optional().default(""),
  establishmentId: z.string().uuid().optional().nullable(),
  onlyVerified: z.boolean().optional().default(false),
  onlyUnverified: z.boolean().optional().default(false),
  limit: z.number().int().min(1).max(200).optional().default(50),
});

export const adminSearchScans = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: unknown) => searchSchema.parse(input))
  .handler(async ({ data, context }): Promise<AdminScanRow[]> => {
    let q = context.supabase
      .from("scans")
      .select(
        "id, product_name, price_captured, market_name, establishment_id, barcode, verified, verified_at, status, created_at",
      )
      .eq("status", "salvo")
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.query) q = q.ilike("product_name", `%${data.query}%`);
    if (data.establishmentId) q = q.eq("establishment_id", data.establishmentId);
    if (data.onlyVerified) q = q.eq("verified", true);
    if (data.onlyUnverified) q = q.eq("verified", false);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as AdminScanRow[];
  });

/* --------------------------- Update price --------------------------- */

const updateSchema = z.object({
  scanId: z.string().uuid(),
  newPrice: z.number().positive().max(1_000_000),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const updateScanPrice = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: unknown) => updateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: before, error: e1 } = await context.supabase
      .from("scans")
      .select("id, price_captured")
      .eq("id", data.scanId)
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!before) throw new Error("Registro não encontrado");

    const { error: e2 } = await context.supabase
      .from("scans")
      .update({ price_captured: data.newPrice })
      .eq("id", data.scanId);
    if (e2) throw new Error(e2.message);

    const beforeRow = before as { price_captured: number | null };
    const { error: eLog } = await context.supabase.rpc("admin_log_action", rpcArgs({
      _action: "price_update",
      _target_type: "scan",
      _target_id: data.scanId,
      _before: { price_captured: beforeRow.price_captured },
      _after: { price_captured: data.newPrice },
      _notes: data.notes ?? null,
    }));
    if (eLog) throw new Error(`Falha ao registrar auditoria: ${eLog.message}`);

    return { ok: true };
  });

/* --------------------------- Delete scan --------------------------- */

const deleteSchema = z.object({
  scanId: z.string().uuid(),
  reason: z.string().trim().min(3, "Informe o motivo").max(500),
});

export const deleteScanAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: unknown) => deleteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: before, error: e1 } = await context.supabase
      .from("scans")
      .select("*")
      .eq("id", data.scanId)
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!before) throw new Error("Registro não encontrado");

    const { error: eLog } = await context.supabase.rpc("admin_log_action", rpcArgs({
      _action: "scan_delete",
      _target_type: "scan",
      _target_id: data.scanId,
      _before: before as Record<string, unknown>,
      _after: null,
      _notes: data.reason,
    }));
    if (eLog) throw new Error(`Falha ao registrar auditoria: ${eLog.message}`);

    const { error: e2 } = await context.supabase.from("scans").delete().eq("id", data.scanId);
    if (e2) throw new Error(e2.message);

    return { ok: true };
  });

/* --------------------------- Verify / unverify --------------------------- */

const verifySchema = z.object({
  scanId: z.string().uuid(),
  verified: z.boolean(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const verifyScanAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: unknown) => verifySchema.parse(input))
  .handler(async ({ data, context }) => {
    const nowIso = new Date().toISOString();
    const { error } = await context.supabase
      .from("scans")
      .update({
        verified: data.verified,
        verified_at: data.verified ? nowIso : null,
        verified_by: data.verified ? context.userId : null,
      })
      .eq("id", data.scanId);
    if (error) throw new Error(error.message);

    const { error: eLog } = await context.supabase.rpc("admin_log_action", rpcArgs({
      _action: data.verified ? "price_verify" : "price_unverify",
      _target_type: "scan",
      _target_id: data.scanId,
      _before: null,
      _after: { verified: data.verified, verified_at: data.verified ? nowIso : null },
      _notes: data.notes ?? null,
    }));
    if (eLog) throw new Error(`Falha ao registrar auditoria: ${eLog.message}`);

    return { ok: true };
  });

/* --------------------------- Invalidate cache --------------------------- */

const invalidateSchema = z.discriminatedUnion("scope", [
  z.object({ scope: z.literal("global"), notes: z.string().max(500).optional().nullable() }),
  z.object({
    scope: z.literal("product"),
    productKey: z.string().trim().min(1).max(300),
    notes: z.string().max(500).optional().nullable(),
  }),
  z.object({
    scope: z.literal("store"),
    establishmentId: z.string().uuid(),
    notes: z.string().max(500).optional().nullable(),
  }),
]);

export const invalidateCacheAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: unknown) => invalidateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const start = Date.now();

    if (data.scope === "global") {
      const { error } = await context.supabase.rpc("rebuild_comparison_cache_all");
      if (error) throw new Error(error.message);
      await context.supabase.rpc("admin_log_action", rpcArgs({
        _action: "cache_invalidate_global",
        _target_type: "product_comparison_cache",
        _target_id: null,
        _before: null,
        _after: null,
        _notes: data.notes ?? null,
      }));
      return { ok: true, scope: data.scope, duration_ms: Date.now() - start, refreshed: null as number | null };
    }

    if (data.scope === "product") {
      const { error } = await context.supabase.rpc("refresh_comparison_cache_key", {
        _key: data.productKey,
      });
      if (error) throw new Error(error.message);
      await context.supabase.rpc("admin_log_action", rpcArgs({
        _action: "cache_invalidate_product",
        _target_type: "product_comparison_cache",
        _target_id: data.productKey,
        _before: null,
        _after: null,
        _notes: data.notes ?? null,
      }));
      return { ok: true, scope: data.scope, duration_ms: Date.now() - start, refreshed: 1 };
    }

    // scope === "store"
    const { data: rows, error: eScan } = await context.supabase
      .from("scans")
      .select("product_name")
      .eq("establishment_id", data.establishmentId)
      .eq("status", "salvo")
      .not("product_name", "is", null);
    if (eScan) throw new Error(eScan.message);

    const seen = new Set<string>();
    for (const r of rows ?? []) {
      const name = (r as { product_name: string | null }).product_name;
      if (name) seen.add(name);
    }
    let refreshed = 0;
    for (const name of seen) {
      const { data: key, error } = await context.supabase.rpc("normalize_product_key", { name });
      if (error || !key || typeof key !== "string") continue;
      const { error: eRef } = await context.supabase.rpc("refresh_comparison_cache_key", { _key: key });
      if (!eRef) refreshed += 1;
    }

    await context.supabase.rpc("admin_log_action", rpcArgs({
      _action: "cache_invalidate_store",
      _target_type: "establishment",
      _target_id: data.establishmentId,
      _before: null,
      _after: { refreshed_keys: refreshed },
      _notes: data.notes ?? null,
    }));

    return { ok: true, scope: data.scope, refreshed, duration_ms: Date.now() - start };
  });

/* --------------------------- Audit log listing --------------------------- */

const listAuditSchema = z.object({
  limit: z.number().int().min(1).max(500).optional().default(100),
  action: z.string().trim().max(50).optional().nullable(),
  adminUserId: z.string().uuid().optional().nullable(),
});

export const listAuditLog = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: unknown) => listAuditSchema.parse(input))
  .handler(async ({ data, context }): Promise<AuditEntry[]> => {
    let q = context.supabase
      .from("admin_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.action) q = q.eq("action", data.action);
    if (data.adminUserId) q = q.eq("admin_user_id", data.adminUserId);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const list = (rows ?? []) as unknown as Array<{
      id: string;
      admin_user_id: string;
      action: string;
      target_type: string;
      target_id: string | null;
      before: JsonRecord;
      after: JsonRecord;
      notes: string | null;
      created_at: string;
    }>;

    const adminIds = Array.from(new Set(list.map((r) => r.admin_user_id)));
    let nameMap = new Map<string, string>();
    if (adminIds.length) {
      const { data: profs } = await context.supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", adminIds);
      nameMap = new Map(
        ((profs ?? []) as unknown as Array<{ id: string; full_name: string | null }>).map((p) => [
          p.id,
          p.full_name || p.id.slice(0, 8),
        ]),
      );
    }

    return list.map((row) => ({
      id: row.id,
      admin_user_id: row.admin_user_id,
      admin_email: nameMap.get(row.admin_user_id) ?? null,
      action: row.action as AuditAction,
      target_type: row.target_type,
      target_id: row.target_id,
      before: row.before,
      after: row.after,
      notes: row.notes,
      created_at: row.created_at,
    }));
  });
