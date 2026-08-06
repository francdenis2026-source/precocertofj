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

export type CoverageErrorKind =
  | "forbidden"
  | "no_auth"
  | "rpc_missing"
  | "rpc_error"
  | "unknown";

export type CoverageError = {
  kind: CoverageErrorKind;
  message: string;
  code: string | null;
  details: string | null;
  hint: string | null;
  rpc: string;
};

function classify(err: unknown, rpc: string): CoverageError {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = err as any;
  const message = String(e?.message ?? err ?? "erro desconhecido");
  const code = e?.code != null ? String(e.code) : null;
  const details = e?.details != null ? String(e.details) : null;
  const hint = e?.hint != null ? String(e.hint) : null;
  let kind: CoverageErrorKind = "unknown";
  if (message === "forbidden" || code === "42501" || /forbidden|permission denied/i.test(message)) kind = "forbidden";
  else if (message === "no_auth" || /jwt|auth\.uid|not authenticated/i.test(message)) kind = "no_auth";
  else if (code === "42883" || code === "PGRST202" || /does not exist|could not find (the )?function/i.test(message))
    kind = "rpc_missing";
  else kind = "rpc_error";
  return { kind, message, code, details, hint, rpc };
}

/** Throws a JSON-serialized CoverageError string so the UI can parse and display details. */
function raise(err: unknown, rpc: string): never {
  throw new Error(JSON.stringify(classify(err, rpc)));
}

/** Parse a thrown Error back into a CoverageError; returns null if not a coverage error. */
export function parseCoverageError(err: unknown): CoverageError | null {
  if (!err) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const message = String((err as any)?.message ?? err);
  try {
    const parsed = JSON.parse(message);
    if (parsed && typeof parsed === "object" && "kind" in parsed && "rpc" in parsed) {
      return parsed as CoverageError;
    }
  } catch {
    // not JSON
  }
  return {
    kind: "unknown",
    message,
    code: null,
    details: null,
    hint: null,
    rpc: "unknown",
  };
}

async function assertAdmin(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
) {
  if (!userId) raise(new Error("no_auth"), "has_role");
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) raise(error, "has_role");
  if (!data) raise(new Error("forbidden"), "has_role");
}

export const getCoverageOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (context.supabase.rpc as any)("get_coverage_overview");
    if (error) raise(error, "get_coverage_overview");
    return (data ?? []) as EstablishmentCoverage[];
  });

export const getMissingProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { establishmentId: string; search?: string; category?: string; limit?: number }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows, error } = await (context.supabase.rpc as any)("get_missing_products_for_establishment", {
      _establishment_id: data.establishmentId,
      _search: data.search ?? null,
      _category: data.category ?? null,
      _limit: data.limit ?? 500,
    });
    if (error) raise(error, "get_missing_products_for_establishment");
    return (rows ?? []) as MissingProduct[];
  });

export const getPresentProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { establishmentId: string; search?: string; category?: string; limit?: number }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows, error } = await (context.supabase.rpc as any)("get_present_products_for_establishment", {
      _establishment_id: data.establishmentId,
      _search: data.search ?? null,
      _category: data.category ?? null,
      _limit: data.limit ?? 500,
    });
    if (error) raise(error, "get_present_products_for_establishment");
    return (rows ?? []) as (MissingProduct & { local_price: number | null; last_seen_at: string | null })[];
  });

export type CoverageDiagnostics = {
  authUid: string | null;
  claimsSummary: { sub: string | null; role: string | null; email: string | null; aud: string | null; exp: number | null } | null;
  roles: string[];
  isAdmin: boolean | null;
  hasRoleError: CoverageError | null;
  rpcs: Array<{ name: string; ok: boolean; error: CoverageError | null; sampleCount: number | null }>;
  checkedAt: string;
};

export const getCoverageDiagnostics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CoverageDiagnostics> => {
    const supabase = context.supabase;
    const authUid = context.userId ?? null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawClaims = (context.claims ?? null) as any;
    const claimsSummary = rawClaims
      ? {
          sub: rawClaims.sub != null ? String(rawClaims.sub) : null,
          role: rawClaims.role != null ? String(rawClaims.role) : null,
          email: rawClaims.email != null ? String(rawClaims.email) : null,
          aud: rawClaims.aud != null ? String(rawClaims.aud) : null,
          exp: typeof rawClaims.exp === "number" ? rawClaims.exp : null,
        }
      : null;

    let roles: string[] = [];
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from("user_roles").select("role").eq("user_id", authUid);
      roles = ((data ?? []) as Array<{ role: string }>).map((r) => r.role);
    } catch {
      // ignore — roles are best-effort
    }

    let isAdmin: boolean | null = null;
    let hasRoleError: CoverageError | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("has_role", { _user_id: authUid, _role: "admin" });
      if (error) throw error;
      isAdmin = Boolean(data);
    } catch (err) {
      hasRoleError = classify(err, "has_role");
    }

    const probes: Array<{ name: string; args: Record<string, unknown> | undefined }> = [
      { name: "get_coverage_overview", args: undefined },
      {
        name: "get_missing_products_for_establishment",
        args: { _establishment_id: "00000000-0000-0000-0000-000000000000", _search: null, _category: null, _limit: 1 },
      },
      {
        name: "get_present_products_for_establishment",
        args: { _establishment_id: "00000000-0000-0000-0000-000000000000", _search: null, _category: null, _limit: 1 },
      },
    ];

    const rpcs: CoverageDiagnostics["rpcs"] = [];
    for (const p of probes) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any).rpc(p.name, p.args);
        if (error) {
          rpcs.push({ name: p.name, ok: false, error: classify(error, p.name), sampleCount: null });
        } else {
          rpcs.push({
            name: p.name,
            ok: true,
            error: null,
            sampleCount: Array.isArray(data) ? data.length : null,
          });
        }
      } catch (err) {
        rpcs.push({ name: p.name, ok: false, error: classify(err, p.name), sampleCount: null });
      }
    }

    return {
      authUid,
      claimsSummary,
      roles,
      isAdmin,
      hasRoleError,
      rpcs,
      checkedAt: new Date().toISOString(),
    };
  });
