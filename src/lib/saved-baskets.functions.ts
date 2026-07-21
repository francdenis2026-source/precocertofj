import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type JsonValue = string | number | boolean | null | { [k: string]: JsonValue } | JsonValue[];

export type SavedBasketSummary = {
  id: string;
  name: string;
  mode: "compare" | "budget";
  filters: JsonValue;
  shareToken: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SavedBasketDetail = SavedBasketSummary & {
  snapshot: JsonValue;
};

function randomToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(18)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const listSavedBaskets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SavedBasketSummary[]> => {
    const { data, error } = await context.supabase
      .from("saved_baskets")
      .select("id, name, mode, filters, share_token, created_at, updated_at")
      .neq("name", "__draft_manual__")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id as string,
      name: r.name as string,
      mode: r.mode as "compare" | "budget",
      filters: (r.filters ?? {}) as JsonValue,
      shareToken: (r.share_token as string | null) ?? null,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    }));
  });

export const getSavedBasket = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => ({ id: String(data.id) }))
  .handler(async ({ data, context }): Promise<SavedBasketDetail | null> => {
    const { data: row, error } = await context.supabase
      .from("saved_baskets")
      .select("id, name, mode, filters, snapshot, share_token, created_at, updated_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return {
      id: row.id as string,
      name: row.name as string,
      mode: (row.mode === "budget" ? "budget" : "compare") as "compare" | "budget",
      filters: (row.filters ?? {}) as JsonValue,
      snapshot: (row.snapshot ?? {}) as JsonValue,
      shareToken: (row.share_token as string | null) ?? null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  });

export const saveBasket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { name: string; mode: "compare" | "budget"; filters: unknown; snapshot: unknown; share?: boolean }) => {
    if (!data.name || typeof data.name !== "string" || data.name.trim().length < 2) {
      throw new Error("Nome inválido");
    }
    return {
      name: data.name.trim().slice(0, 80),
      mode: data.mode === "budget" ? ("budget" as const) : ("compare" as const),
      filters: (data.filters ?? {}) as JsonValue,
      snapshot: (data.snapshot ?? {}) as JsonValue,
      share: !!data.share,
    };
  })
  .handler(async ({ data, context }): Promise<SavedBasketSummary> => {
    const { data: row, error } = await context.supabase
      .from("saved_baskets")
      .insert({
        user_id: context.userId,
        name: data.name,
        mode: data.mode,
        filters: data.filters as JsonValue,
        snapshot: data.snapshot as JsonValue,
        share_token: data.share ? randomToken() : null,
      })
      .select("id, name, mode, filters, share_token, created_at, updated_at")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Falha ao salvar");
    return {
      id: row.id as string,
      name: row.name as string,
      mode: row.mode as "compare" | "budget",
      filters: (row.filters ?? {}) as JsonValue,
      shareToken: (row.share_token as string | null) ?? null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  });

export const deleteSavedBasket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => ({ id: String(data.id) }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("saved_baskets").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleBasketShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; enable: boolean }) => ({ id: String(data.id), enable: !!data.enable }))
  .handler(async ({ data, context }): Promise<{ shareToken: string | null }> => {
    const token = data.enable ? randomToken() : null;
    const { error } = await context.supabase
      .from("saved_baskets")
      .update({ share_token: token })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { shareToken: token };
  });

const DRAFT_MARKER = "__draft_manual__";

export const getDraftBasket = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ quantities: Record<string, number>; updatedAt: string } | null> => {
    const { data, error } = await context.supabase
      .from("saved_baskets")
      .select("snapshot, updated_at")
      .eq("user_id", context.userId)
      .eq("name", DRAFT_MARKER)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const snap = (data.snapshot ?? {}) as { quantities?: Record<string, number> };
    return {
      quantities: (snap.quantities ?? {}) as Record<string, number>,
      updatedAt: data.updated_at as string,
    };
  });

export const saveDraftBasket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { quantities: Record<string, number> }) => ({
    quantities: (data.quantities ?? {}) as Record<string, number>,
  }))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const snapshot = { variant: "manual-draft", quantities: data.quantities } as JsonValue;
    const { data: existing } = await context.supabase
      .from("saved_baskets")
      .select("id")
      .eq("user_id", context.userId)
      .eq("name", DRAFT_MARKER)
      .maybeSingle();
    if (existing?.id) {
      const { error } = await context.supabase
        .from("saved_baskets")
        .update({ snapshot, filters: { variant: "manual-draft" } as JsonValue })
        .eq("id", existing.id as string);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("saved_baskets").insert({
        user_id: context.userId,
        name: DRAFT_MARKER,
        mode: "budget",
        filters: { variant: "manual-draft" } as JsonValue,
        snapshot,
        share_token: null,
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const clearDraftBasket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("saved_baskets")
      .delete()
      .eq("user_id", context.userId)
      .eq("name", DRAFT_MARKER);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getSharedBasket = createServerFn({ method: "GET" })
  .inputValidator((data: { token: string }) => ({ token: String(data.token) }))
  .handler(async ({ data }): Promise<SavedBasketDetail | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const client = supabaseAdmin as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (c: string, v: string) => {
            maybeSingle: () => Promise<{
              data: {
                id: string;
                name: string;
                mode: string;
                filters: Record<string, unknown> | null;
                snapshot: unknown;
                share_token: string | null;
                created_at: string;
                updated_at: string;
              } | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    };
    const { data: row, error } = await client
      .from("saved_baskets")
      .select("id, name, mode, filters, snapshot, share_token, created_at, updated_at")
      .eq("share_token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      mode: (row.mode === "budget" ? "budget" : "compare") as "compare" | "budget",
      filters: (row.filters ?? {}) as JsonValue,
      snapshot: row.snapshot as JsonValue,
      shareToken: row.share_token,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
