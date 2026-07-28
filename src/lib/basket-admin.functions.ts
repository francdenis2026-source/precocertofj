/**
 * Basket Admin server functions — gestão versionada dos itens da Cesta Básica.
 *
 * Tabelas:
 *  - basket_item_sets (versões)
 *  - basket_items (itens ligados a uma versão)
 *
 * Regras:
 *  - Leitura pública (SELECT) via RLS; escrita apenas para admins.
 *  - `getActiveBasketConfig` é público (sem middleware) para o motor de
 *    comparação em basket.functions.ts.
 *  - Todas as mutações passam por requireAdmin + registro em admin_audit_log.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";
import { z } from "zod";

export type BasketAdminItem = {
  id: string;
  set_id: string;
  key: string;
  label: string;
  category: string;
  quantity: number;
  patterns: string[];
  exclude_tokens: string[];
  enabled: boolean;
  sort_order: number;
  updated_at: string;
};

export type BasketAdminSet = {
  id: string;
  version: number;
  label: string;
  active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  items_count: number;
  enabled_count: number;
};

// ---------------------------------------------------------------------------
// Público — usado por basket.functions.ts para aplicar overrides no cálculo
// ---------------------------------------------------------------------------

export type ActiveBasketConfig = {
  setId: string;
  version: number;
  label: string;
  items: BasketAdminItem[];
};

export const getActiveBasketConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<ActiveBasketConfig | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: set, error: setErr } = await (supabaseAdmin as any)
      .from("basket_item_sets")
      .select("id, version, label")
      .eq("active", true)
      .maybeSingle();
    if (setErr || !set) return null;
    const { data: items, error: itemsErr } = await (supabaseAdmin as any)
      .from("basket_items")
      .select(
        "id, set_id, key, label, category, quantity, patterns, exclude_tokens, enabled, sort_order, updated_at",
      )
      .eq("set_id", set.id)
      .order("sort_order", { ascending: true });
    if (itemsErr) return null;
    return {
      setId: set.id,
      version: set.version,
      label: set.label,
      items: (items ?? []) as BasketAdminItem[],
    };
  },
);

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

async function logAudit(opts: {
  supabase: any;
  userId: string;
  action: string;
  targetId?: string;
  before?: unknown;
  after?: unknown;
  notes?: string;
}) {
  try {
    await opts.supabase.from("admin_audit_log").insert({
      admin_user_id: opts.userId,
      action: opts.action,
      target_type: "basket_item_set",
      target_id: opts.targetId ?? null,
      before: opts.before ?? null,
      after: opts.after ?? null,
      notes: opts.notes ?? null,
    });
  } catch {
    // best-effort
  }
}

export const listBasketSets = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<BasketAdminSet[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sets, error } = await (supabaseAdmin as any)
      .from("basket_item_sets")
      .select("id, version, label, active, created_by, created_at, updated_at")
      .order("version", { ascending: false });
    if (error) throw new Error(error.message);
    const list = (sets ?? []) as Omit<BasketAdminSet, "items_count" | "enabled_count">[];
    if (list.length === 0) return [];
    const ids = list.map((s) => s.id);
    const { data: items } = await (supabaseAdmin as any)
      .from("basket_items")
      .select("set_id, enabled")
      .in("set_id", ids);
    const counts = new Map<string, { total: number; enabled: number }>();
    for (const row of (items ?? []) as { set_id: string; enabled: boolean }[]) {
      const c = counts.get(row.set_id) ?? { total: 0, enabled: 0 };
      c.total += 1;
      if (row.enabled) c.enabled += 1;
      counts.set(row.set_id, c);
    }
    return list.map((s) => ({
      ...s,
      items_count: counts.get(s.id)?.total ?? 0,
      enabled_count: counts.get(s.id)?.enabled ?? 0,
    }));
  });

export const listBasketItemsForSet = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((data: unknown) =>
    z.object({ setId: z.string().uuid() }).parse(data ?? {}),
  )
  .handler(async ({ data }): Promise<BasketAdminItem[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: items, error } = await (supabaseAdmin as any)
      .from("basket_items")
      .select(
        "id, set_id, key, label, category, quantity, patterns, exclude_tokens, enabled, sort_order, updated_at",
      )
      .eq("set_id", data.setId)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (items ?? []) as BasketAdminItem[];
  });

export const createBasketSet = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((data: unknown) =>
    z
      .object({
        label: z.string().trim().min(3).max(120),
        cloneFromSetId: z.string().uuid().optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: maxRow } = await (supabaseAdmin as any)
      .from("basket_item_sets")
      .select("version")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersion = ((maxRow?.version as number) ?? 0) + 1;

    const { data: created, error } = await (supabaseAdmin as any)
      .from("basket_item_sets")
      .insert({
        version: nextVersion,
        label: data.label,
        active: false,
        created_by: context.userId,
      })
      .select("id, version, label, active, created_by, created_at, updated_at")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Falha ao criar versão");

    // Clona itens de outra versão (ou da ativa, se não especificado)
    const sourceId =
      data.cloneFromSetId ??
      (
        await (supabaseAdmin as any)
          .from("basket_item_sets")
          .select("id")
          .eq("active", true)
          .maybeSingle()
      ).data?.id;

    if (sourceId && sourceId !== created.id) {
      const { data: srcItems } = await (supabaseAdmin as any)
        .from("basket_items")
        .select("key, label, category, quantity, patterns, exclude_tokens, enabled, sort_order")
        .eq("set_id", sourceId);
      if (srcItems && srcItems.length > 0) {
        await (supabaseAdmin as any)
          .from("basket_items")
          .insert(
            (srcItems as any[]).map((it) => ({
              set_id: created.id,
              key: it.key,
              label: it.label,
              category: it.category,
              quantity: it.quantity,
              patterns: it.patterns,
              exclude_tokens: it.exclude_tokens,
              enabled: it.enabled,
              sort_order: it.sort_order,
            })),
          );
      }
    }

    await logAudit({
      supabase: supabaseAdmin,
      userId: context.userId,
      action: "basket_set.create",
      targetId: created.id,
      after: { version: nextVersion, label: data.label, cloneFrom: sourceId ?? null },
    });

    return created as BasketAdminSet;
  });

export const updateBasketItem = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        quantity: z.number().positive().max(999).optional(),
        enabled: z.boolean().optional(),
        sortOrder: z.number().int().min(0).max(9999).optional(),
        label: z.string().trim().min(1).max(120).optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: before } = await (supabaseAdmin as any)
      .from("basket_items")
      .select("id, set_id, key, quantity, enabled, sort_order, label")
      .eq("id", data.id)
      .maybeSingle();
    if (!before) throw new Error("Item não encontrado");

    // Bloqueia edição direta da versão ATIVA (fluxo correto: crie versão nova).
    const { data: setRow } = await (supabaseAdmin as any)
      .from("basket_item_sets")
      .select("id, active")
      .eq("id", before.set_id)
      .maybeSingle();
    if (setRow?.active) {
      throw new Error(
        "A versão ativa é somente-leitura. Crie uma nova versão para editar e ative-a quando pronta.",
      );
    }

    const patch: Record<string, unknown> = {};
    if (data.quantity !== undefined) patch.quantity = data.quantity;
    if (data.enabled !== undefined) patch.enabled = data.enabled;
    if (data.sortOrder !== undefined) patch.sort_order = data.sortOrder;
    if (data.label !== undefined) patch.label = data.label;
    if (Object.keys(patch).length === 0) return before;

    const { data: after, error } = await (supabaseAdmin as any)
      .from("basket_items")
      .update(patch)
      .eq("id", data.id)
      .select(
        "id, set_id, key, label, category, quantity, patterns, exclude_tokens, enabled, sort_order, updated_at",
      )
      .single();
    if (error) throw new Error(error.message);

    await logAudit({
      supabase: supabaseAdmin,
      userId: context.userId,
      action: "basket_item.update",
      targetId: data.id,
      before: { key: before.key, quantity: before.quantity, enabled: before.enabled, sort_order: before.sort_order, label: before.label },
      after: patch,
    });

    return after as BasketAdminItem;
  });

export const activateBasketSet = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid() }).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // 1) tira ativação da atual (índice único parcial exige que só uma esteja ativa)
    const { data: currentActive } = await (supabaseAdmin as any)
      .from("basket_item_sets")
      .select("id, version, label")
      .eq("active", true)
      .maybeSingle();
    if (currentActive?.id === data.id) return { ok: true, unchanged: true };
    if (currentActive) {
      const { error: e1 } = await (supabaseAdmin as any)
        .from("basket_item_sets")
        .update({ active: false })
        .eq("id", currentActive.id);
      if (e1) throw new Error(e1.message);
    }
    // 2) ativa a nova
    const { data: activated, error: e2 } = await (supabaseAdmin as any)
      .from("basket_item_sets")
      .update({ active: true })
      .eq("id", data.id)
      .select("id, version, label")
      .single();
    if (e2 || !activated) throw new Error(e2?.message ?? "Falha ao ativar versão");

    await logAudit({
      supabase: supabaseAdmin,
      userId: context.userId,
      action: "basket_set.activate",
      targetId: data.id,
      before: currentActive ? { version: currentActive.version, label: currentActive.label } : null,
      after: { version: activated.version, label: activated.label },
    });

    return { ok: true, unchanged: false };
  });

export const deleteBasketSet = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid() }).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: set } = await (supabaseAdmin as any)
      .from("basket_item_sets")
      .select("id, version, label, active")
      .eq("id", data.id)
      .maybeSingle();
    if (!set) throw new Error("Versão não encontrada");
    if (set.active) throw new Error("Não é possível excluir a versão ativa.");
    const { error } = await (supabaseAdmin as any)
      .from("basket_item_sets")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({
      supabase: supabaseAdmin,
      userId: context.userId,
      action: "basket_set.delete",
      targetId: data.id,
      before: { version: set.version, label: set.label },
    });
    return { ok: true };
  });
