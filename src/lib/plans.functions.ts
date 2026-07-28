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

/**
 * All plan reads/writes are now unified against `license_plans`.
 * The legacy `plans` table was removed in migration
 * "unify_plans_into_license_plans".
 */

async function assertAdmin(context: { supabase: any; userId: string }): Promise<void> {
  const { data, error } = await context.supabase
    .rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Response("Acesso negado", { status: 403 });
}

function inferCycle(days: number): BillingCycle {
  if (!Number.isFinite(days) || days <= 0) return "trial";
  if (days <= 45) return "monthly";
  if (days <= 200) return "semester";
  return "yearly";
}

function normalizeRow(r: any): PlanRow {
  const rawFeatures = r.features;
  const features = Array.isArray(rawFeatures)
    ? rawFeatures.filter((f: unknown): f is string => typeof f === "string")
    : [];
  const priceCents = Number(r.price_cents ?? 0);
  const originalCents = r.original_price_cents == null ? null : Number(r.original_price_cents);
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    cycle: (r.cycle as BillingCycle) ?? inferCycle(Number(r.days)),
    days: Number(r.days ?? 0),
    price: priceCents / 100,
    original_price: originalCents == null ? null : originalCents / 100,
    description: (r.description ?? "") as string,
    features,
    active: !!r.active,
    highlight: !!r.highlight,
  };
}

/** Público: apenas planos ativos, ordenados por preço asc. */
export const listActivePlans = createServerFn({ method: "GET" })
  .handler(async (): Promise<PlanRow[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("license_plans")
      .select("*")
      .eq("active", true)
      .order("price_cents", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(normalizeRow);
  });

/** Público: busca um plano ativo por id (para tela de checkout). */
export const getActivePlanById = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => ({ id: String(data?.id ?? "") }))
  .handler(async ({ data }): Promise<PlanRow | null> => {
    if (!data.id) return null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await (supabaseAdmin as any)
      .from("license_plans")
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
    const { data, error } = await (supabaseAdmin as any)
      .from("license_plans")
      .select("*")
      .order("price_cents", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(normalizeRow);
  });

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "plano";
}

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
    const admin = supabaseAdmin as any;

    const name = data.name.trim();
    const days = Math.max(0, Math.floor(data.days));
    const priceCents = Math.max(0, Math.round(Number(data.price) * 100));
    const originalCents =
      data.original_price == null || Number.isNaN(Number(data.original_price))
        ? null
        : Math.max(0, Math.round(Number(data.original_price) * 100));
    const description = (data.description ?? "").trim();
    const features = (data.features ?? []).map((f) => String(f).trim()).filter(Boolean);
    const active = data.active ?? true;
    const highlight = data.highlight ?? false;

    if (data.id) {
      const { error } = await admin
        .from("license_plans")
        .update({
          name,
          cycle: data.cycle,
          days,
          price_cents: priceCents,
          original_price_cents: originalCents,
          description,
          features,
          active,
          highlight,
        })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }

    // Create new — generate a unique slug from the name.
    let baseSlug = slugify(name);
    let slug = baseSlug;
    let attempt = 0;
    while (attempt < 5) {
      const { data: exists } = await admin
        .from("license_plans")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!exists) break;
      attempt += 1;
      slug = `${baseSlug}-${attempt + 1}`;
    }

    const { data: ins, error } = await admin
      .from("license_plans")
      .insert({
        name,
        slug,
        cycle: data.cycle,
        days,
        price_cents: priceCents,
        original_price_cents: originalCents,
        description,
        features,
        active,
        highlight,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: ins.id as string };
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
    const { error } = await (supabaseAdmin as any)
      .from("license_plans")
      .update({ active: data.active })
      .eq("id", data.id);
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
    const { error } = await (supabaseAdmin as any)
      .from("license_plans")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
