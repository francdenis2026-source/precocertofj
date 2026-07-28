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

export type CoverageError = {
  kind: "forbidden" | "no_auth" | "rpc_missing" | "rpc_error" | "unknown";
  message: string;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
  rpc?: string;
};

function toCoverageError(err: unknown, rpc: string): CoverageError {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = err as any;
  const message = String(e?.message ?? err ?? "erro desconhecido");
  const code = e?.code ?? null;
  const details = e?.details ?? null;
  const hint = e?.hint ?? null;
  let kind: CoverageError["kind"] = "unknown";
  if (message === "forbidden" || code === "42501" || /forbidden|permission denied/i.test(message)) kind = "forbidden";
  else if (message === "no_auth" || /jwt|auth\.uid|not authenticated/i.test(message)) kind = "no_auth";
  else if (code === "42883" || code === "PGRST202" || /does not exist|could not find (the )?function/i.test(message)) kind = "rpc_missing";
  else kind = "rpc_error";
  return { kind, message, code, details, hint, rpc };
}

async function assertAdmin(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
) {
  if (!userId) throw Object.assign(new Error("no_auth"), { code: "NO_AUTH" });
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw error;
  if (!data) throw Object.assign(new Error("forbidden"), { code: "42501" });
}

export const getCoverageOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      await assertAdmin(context.supabase, context.userId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (context.supabase.rpc as any)("get_coverage_overview");
      if (error) throw error;
      return { ok: true as const, rows: (data ?? []) as EstablishmentCoverage[] };
    } catch (err) {
      return { ok: false as const, error: toCoverageError(err, "get_coverage_overview") };
    }
  });

export const getMissingProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { establishmentId: string; search?: string; category?: string; limit?: number }) => input)
  .handler(async ({ data, context }) => {
    try {
      await assertAdmin(context.supabase, context.userId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rows, error } = await (context.supabase.rpc as any)("get_missing_products_for_establishment", {
        _establishment_id: data.establishmentId,
        _search: data.search ?? null,
        _category: data.category ?? null,
        _limit: data.limit ?? 500,
      });
      if (error) throw error;
      return { ok: true as const, rows: (rows ?? []) as MissingProduct[] };
    } catch (err) {
      return { ok: false as const, error: toCoverageError(err, "get_missing_products_for_establishment") };
    }
  });

export const getPresentProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { establishmentId: string; search?: string; category?: string; limit?: number }) => input)
  .handler(async ({ data, context }) => {
    try {
      await assertAdmin(context.supabase, context.userId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rows, error } = await (context.supabase.rpc as any)("get_present_products_for_establishment", {
        _establishment_id: data.establishmentId,
        _search: data.search ?? null,
        _category: data.category ?? null,
        _limit: data.limit ?? 500,
      });
      if (error) throw error;
      return {
        ok: true as const,
        rows: (rows ?? []) as (MissingProduct & { local_price: number | null; last_seen_at: string | null })[],
      };
    } catch (err) {
      return { ok: false as const, error: toCoverageError(err, "get_present_products_for_establishment") };
    }
  });

export type CoverageDiagnostics = {
  authUid: string | null;
  claims: Record<string, unknown> | null;
  roles: string[];
  isAdmin: boolean | null;
  hasRoleError: CoverageError | null;
  rpcs: Array<{ name: string; ok: boolean; error: CoverageError | null; sampleCount?: number }>;
  checkedAt: string;
};

export const getCoverageDiagnostics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;
    const authUid = context.userId ?? null;
    const claims = (context.claims ?? null) as Record<string, unknown> | null;

    // fetch roles from user_roles (readable by authenticated per grants)
    let roles: string[] = [];
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from("user_roles").select("role").eq("user_id", authUid);
      roles = ((data ?? []) as Array<{ role: string }>).map((r) => r.role);
    } catch {
      // ignore
    }

    let isAdmin: boolean | null = null;
    let hasRoleError: CoverageError | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("has_role", { _user_id: authUid, _role: "admin" });
      if (error) throw error;
      isAdmin = Boolean(data);
    } catch (err) {
      hasRoleError = toCoverageError(err, "has_role");
    }

    const probes: Array<{
      name: string;
      call: () => Promise<{ data: unknown; error: unknown }>;
      sample: (d: unknown) => number | undefined;
    }> = [
      {
        name: "get_coverage_overview",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        call: () => (supabase as any).rpc("get_coverage_overview"),
        sample: (d) => (Array.isArray(d) ? d.length : undefined),
      },
      {
        name: "get_missing_products_for_establishment",
        call: () =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any).rpc("get_missing_products_for_establishment", {
            _establishment_id: "00000000-0000-0000-0000-000000000000",
            _search: null,
            _category: null,
            _limit: 1,
          }),
        sample: (d) => (Array.isArray(d) ? d.length : undefined),
      },
      {
        name: "get_present_products_for_establishment",
        call: () =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any).rpc("get_present_products_for_establishment", {
            _establishment_id: "00000000-0000-0000-0000-000000000000",
            _search: null,
            _category: null,
            _limit: 1,
          }),
        sample: (d) => (Array.isArray(d) ? d.length : undefined),
      },
    ];

    const rpcs: CoverageDiagnostics["rpcs"] = [];
    for (const p of probes) {
      try {
        const { data, error } = await p.call();
        if (error) {
          rpcs.push({ name: p.name, ok: false, error: toCoverageError(error, p.name) });
        } else {
          rpcs.push({ name: p.name, ok: true, error: null, sampleCount: p.sample(data) });
        }
      } catch (err) {
        rpcs.push({ name: p.name, ok: false, error: toCoverageError(err, p.name) });
      }
    }

    return {
      authUid,
      claims,
      roles,
      isAdmin,
      hasRoleError,
      rpcs,
      checkedAt: new Date().toISOString(),
    } satisfies CoverageDiagnostics;
  });
