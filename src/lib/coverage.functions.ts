import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type EstablishmentCoverage = {
  establishment_id: string;
  name: string;
  produtos: number;
  faltando: number;
  cobertura_pct: number;
};

export type MissingProduct = {
  product_key: string;
  display_name: string;
  category: string | null;
  stores_count: number;
  min_price: number | null;
  avg_price: number | null;
  max_price: number | null;
};

async function assertAdmin(supabase: ReturnType<typeof Object>, userId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;
  const { data, error } = await client.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("forbidden");
}

export const getCoverageOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin.rpc as any)("get_coverage_overview");
    if (error) throw new Error(error.message);
    return (data ?? []) as EstablishmentCoverage[];
  });

export const getMissingProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { establishmentId: string; search?: string; category?: string; limit?: number }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows, error } = await (supabaseAdmin.rpc as any)("get_missing_products_for_establishment", {
      _establishment_id: data.establishmentId,
      _search: data.search ?? null,
      _category: data.category ?? null,
      _limit: data.limit ?? 500,
    });
    if (error) throw new Error(error.message);
    return (rows ?? []) as MissingProduct[];
  });

export const getPresentProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { establishmentId: string; search?: string; category?: string; limit?: number }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows, error } = await (supabaseAdmin.rpc as any)("get_present_products_for_establishment", {
      _establishment_id: data.establishmentId,
      _search: data.search ?? null,
      _category: data.category ?? null,
      _limit: data.limit ?? 500,
    });
    if (error) throw new Error(error.message);
    return (rows ?? []) as (MissingProduct & { local_price: number | null; last_seen_at: string | null })[];
  });
