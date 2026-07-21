import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* =============== TIPOS =============== */

export type FinanceKind = "fixed" | "variable" | "utility" | "fuel" | "gas" | "market" | "other";
export type PaymentMethod = "cash" | "debit" | "credit" | "pix" | "transfer" | "voucher" | "other";
export type FinanceMeta = { [k: string]: string | number | boolean | null };

export type FinanceCategory = {
  id: string;
  name: string;
  slug: string;
  kind: FinanceKind;
  color: string | null;
  icon: string | null;
  monthlyBudget: number | null;
  alertThreshold: number | null;
  sortOrder: number;
  isDefault: boolean;
};

export type FinanceTransaction = {
  id: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  occurredOn: string;
  amount: number;
  description: string | null;
  establishmentId: string | null;
  establishmentName: string | null;
  paymentMethod: PaymentMethod | null;
  isRecurring: boolean;
  metadata: FinanceMeta;
  createdAt: string;
};

export type MonthlySummary = {
  month: string;
  total: number;
  entries: number;
  byCategory: Array<{
    categoryId: string | null;
    categoryName: string;
    categorySlug: string | null;
    color: string | null;
    total: number;
    entries: number;
  }>;
  byDay: Array<{ day: string; total: number }>;
};

/* =============== HELPERS =============== */

type CatRow = {
  id: string;
  name: string;
  slug: string;
  kind: FinanceKind;
  color: string | null;
  icon: string | null;
  monthly_budget: number | string | null;
  alert_threshold: number | string | null;
  sort_order: number;
  is_default: boolean;
};

function toCat(r: CatRow): FinanceCategory {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    kind: r.kind,
    color: r.color,
    icon: r.icon,
    monthlyBudget: r.monthly_budget != null ? Number(r.monthly_budget) : null,
    alertThreshold: r.alert_threshold != null ? Number(r.alert_threshold) : null,
    sortOrder: r.sort_order,
    isDefault: r.is_default,
  };
}

function firstDayOfMonth(input?: string): string {
  const d = input ? new Date(input + "T00:00:00") : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function addMonths(iso: string, delta: number): string {
  const [y, m] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(y, (m - 1) + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

/* =============== CATEGORIAS =============== */

export const listCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FinanceCategory[]> => {
    const { supabase, userId } = context;
    let { data, error } = await supabase
      .from("finance_categories")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      const { error: seedErr } = await supabase.rpc("finance_seed_default_categories");
      if (seedErr) throw new Error(seedErr.message);
    }
    // Garante que utilitários e subcategorias de alimentação sempre existam
    await supabase.rpc("ensure_finance_utility_categories" as never).then(() => undefined, () => undefined);
    await supabase.rpc("ensure_finance_food_categories" as never).then(() => undefined, () => undefined);
    const { data: fresh, error: e2 } = await supabase
      .from("finance_categories")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true });
    if (e2) throw new Error(e2.message);
    return ((fresh ?? []) as CatRow[]).map(toCat);
  });


export const upsertCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    id?: string;
    name: string;
    slug?: string;
    kind: FinanceKind;
    color?: string | null;
    icon?: string | null;
    monthlyBudget?: number | null;
    alertThreshold?: number | null;
  }) => {
    if (!input.name?.trim()) throw new Error("Nome obrigatório");
    return input;
  })
  .handler(async ({ data, context }): Promise<FinanceCategory> => {
    const { supabase, userId } = context;
    const slug = (data.slug || data.name).toLowerCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "cat";
    const payload = {
      user_id: userId,
      name: data.name.trim(),
      slug,
      kind: data.kind,
      color: data.color ?? null,
      icon: data.icon ?? null,
      monthly_budget: data.monthlyBudget ?? null,
      alert_threshold: data.alertThreshold ?? null,
    };
    if (data.id) {
      const { data: row, error } = await supabase
        .from("finance_categories")
        .update(payload)
        .eq("id", data.id)
        .eq("user_id", userId)
        .select("*").single();
      if (error) throw new Error(error.message);
      return toCat(row as CatRow);
    }
    const { data: row, error } = await supabase
      .from("finance_categories")
      .insert(payload)
      .select("*").single();
    if (error) throw new Error(error.message);
    return toCat(row as CatRow);
  });

export const updateCategoryBudget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; monthlyBudget: number | null; alertThreshold?: number | null }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("finance_categories")
      .update({
        monthly_budget: data.monthlyBudget,
        alert_threshold: data.alertThreshold ?? 0.8,
      })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("finance_categories")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* =============== LANÇAMENTOS =============== */

type TxRow = {
  id: string;
  category_id: string | null;
  occurred_on: string;
  amount: number | string;
  description: string | null;
  establishment_id: string | null;
  payment_method: PaymentMethod | null;
  is_recurring: boolean;
  metadata: FinanceMeta | null;
  created_at: string;
  finance_categories?: { name: string | null; color: string | null } | null;
  establishments?: { name: string | null } | null;
};

function toTx(r: TxRow): FinanceTransaction {
  return {
    id: r.id,
    categoryId: r.category_id,
    categoryName: r.finance_categories?.name ?? null,
    categoryColor: r.finance_categories?.color ?? null,
    occurredOn: r.occurred_on,
    amount: Number(r.amount),
    description: r.description,
    establishmentId: r.establishment_id,
    establishmentName: r.establishments?.name ?? null,
    paymentMethod: r.payment_method,
    isRecurring: r.is_recurring,
    metadata: r.metadata ?? {},
    createdAt: r.created_at,
  };
}

export const listTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { month?: string; categoryId?: string; limit?: number } = {}) => input)
  .handler(async ({ data, context }): Promise<FinanceTransaction[]> => {
    const { supabase, userId } = context;
    const start = firstDayOfMonth(data.month);
    const end = addMonths(start, 1);
    let q = supabase
      .from("finance_transactions")
      .select("*, finance_categories(name,color), establishments(name)")
      .eq("user_id", userId)
      .gte("occurred_on", start)
      .lt("occurred_on", end)
      .order("occurred_on", { ascending: false })
      .limit(data.limit ?? 500);
    if (data.categoryId) q = q.eq("category_id", data.categoryId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows as unknown as TxRow[]).map(toTx);
  });

export const upsertTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    id?: string;
    categoryId: string | null;
    occurredOn: string;
    amount: number;
    description?: string | null;
    establishmentId?: string | null;
    paymentMethod?: PaymentMethod | null;
    isRecurring?: boolean;
    metadata?: FinanceMeta;
  }) => {
    if (!(input.amount >= 0)) throw new Error("Valor inválido");
    if (!input.occurredOn) throw new Error("Data obrigatória");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      user_id: userId,
      category_id: data.categoryId,
      occurred_on: data.occurredOn,
      amount: data.amount,
      description: data.description ?? null,
      establishment_id: data.establishmentId ?? null,
      payment_method: data.paymentMethod ?? null,
      is_recurring: data.isRecurring ?? false,
      metadata: data.metadata ?? {},
    };
    if (data.id) {
      const { error } = await supabase
        .from("finance_transactions")
        .update(payload)
        .eq("id", data.id)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await supabase
      .from("finance_transactions")
      .insert(payload)
      .select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: (row as { id: string }).id };
  });

export const deleteTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("finance_transactions")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* =============== RESUMO MENSAL =============== */

export const monthlySummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { month?: string } = {}) => input)
  .handler(async ({ data, context }): Promise<MonthlySummary> => {
    const { supabase, userId } = context;
    const start = firstDayOfMonth(data.month);
    const end = addMonths(start, 1);

    const { data: rows, error } = await supabase
      .from("finance_transactions")
      .select("occurred_on, amount, category_id, finance_categories(name,slug,color)")
      .eq("user_id", userId)
      .gte("occurred_on", start)
      .lt("occurred_on", end);
    if (error) throw new Error(error.message);

    type Row = {
      occurred_on: string;
      amount: number | string;
      category_id: string | null;
      finance_categories: { name: string | null; slug: string | null; color: string | null } | null;
    };
    const list = (rows ?? []) as unknown as Row[];

    const byCatMap = new Map<string, { name: string; slug: string | null; color: string | null; total: number; entries: number; id: string | null }>();
    const byDayMap = new Map<string, number>();
    let total = 0;

    for (const r of list) {
      const amt = Number(r.amount);
      total += amt;
      const key = r.category_id ?? "__none__";
      const cur = byCatMap.get(key);
      if (cur) {
        cur.total += amt;
        cur.entries += 1;
      } else {
        byCatMap.set(key, {
          id: r.category_id,
          name: r.finance_categories?.name ?? "Sem categoria",
          slug: r.finance_categories?.slug ?? null,
          color: r.finance_categories?.color ?? null,
          total: amt,
          entries: 1,
        });
      }
      byDayMap.set(r.occurred_on, (byDayMap.get(r.occurred_on) ?? 0) + amt);
    }

    return {
      month: start,
      total,
      entries: list.length,
      byCategory: Array.from(byCatMap.values())
        .map((v) => ({ categoryId: v.id, categoryName: v.name, categorySlug: v.slug, color: v.color, total: v.total, entries: v.entries }))
        .sort((a, b) => b.total - a.total),
      byDay: Array.from(byDayMap.entries())
        .map(([day, t]) => ({ day, total: t }))
        .sort((a, b) => (a.day < b.day ? -1 : 1)),
    };
  });
