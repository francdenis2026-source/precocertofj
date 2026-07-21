import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type BillingCycle = "trial" | "monthly" | "semester" | "yearly";

export type PlanRow = {
  id: string;
  name: string;
  cycle: BillingCycle;
  days: number;
  price: number;
  original_price: number | null;
  description: string;
  features: string[];
  active: boolean;
  highlight: boolean;
};

async function assertAdmin(context: { supabase: any; userId: string }): Promise<void> {
  const { data, error } = await context.supabase
    .rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Response("Acesso negado", { status: 403 });
}

function normalizeRow(r: any): PlanRow {
  return {
    id: r.id,
    name: r.name,
    cycle: r.cycle as BillingCycle,
    days: Number(r.days),
    price: Number(r.price),
    original_price: r.original_price == null ? null : Number(r.original_price),
    description: r.description ?? "",
    features: Array.isArray(r.features) ? r.features.filter((f: unknown): f is string => typeof f === "string") : [],
    active: !!r.active,
    highlight: !!r.highlight,
  };
}

/** Lista pública: apenas planos ativos, ordenados por preço asc. */
export const listActivePlans = createServerFn({ method: "GET" })
  .handler(async (): Promise<PlanRow[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("plans")
      .select("*")
      .eq("active", true)
      .order("price", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(normalizeRow);
  });

/** Público: busca um plano ativo por id (para tela de checkout). */
export const getActivePlanById = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => ({ id: String(data?.id ?? "") }))
  .handler(async ({ data }): Promise<PlanRow | null> => {
    if (!data.id) return null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("plans")
      .select("*")
      .eq("id", data.id)
      .eq("active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row ? normalizeRow(row) : null;
  });

/** Admin: lista todos (ativos e inativos). */
export const listAllPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PlanRow[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("plans")
      .select("*")
      .order("price", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(normalizeRow);
  });

export const upsertPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    id?: string;
    name: string;
    cycle: BillingCycle;
    days: number;
    price: number;
    original_price?: number | null;
    description?: string;
    features?: string[];
    active?: boolean;
    highlight?: boolean;
  }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (!data.name?.trim()) throw new Error("Nome obrigatório");
    if (!["trial", "monthly", "semester", "yearly"].includes(data.cycle)) {
      throw new Error("Ciclo inválido");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row = {
      id: data.id?.trim() || `${data.cycle}-${data.days}-${Date.now().toString(36)}`,
      name: data.name.trim(),
      cycle: data.cycle,
      days: Math.max(0, Math.floor(data.days)),
      price: Math.max(0, Number(data.price)),
      original_price: data.original_price == null ? null : Number(data.original_price),
      description: (data.description ?? "").trim(),
      features: (data.features ?? []).map((f) => String(f).trim()).filter(Boolean),
      active: data.active ?? true,
      highlight: data.highlight ?? false,
    };
    const { error } = await supabaseAdmin.from("plans").upsert(row, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const togglePlanActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; active: boolean }) => ({
    id: String(data?.id ?? ""),
    active: !!data?.active,
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (!data.id) throw new Error("id obrigatório");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("plans").update({ active: data.active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => ({ id: String(data?.id ?? "") }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (!data.id) throw new Error("id obrigatório");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("plans").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
