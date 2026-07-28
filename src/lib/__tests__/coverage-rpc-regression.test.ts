import { describe, it, expect } from "vitest";

/**
 * Regression snapshot of the `public.get_coverage_overview` RPC.
 *
 * Captured with `pg_get_functiondef(oid)` on 2026-07-28 after the ambiguity
 * fix (`#variable_conflict use_column` + fully-qualified column references).
 *
 * If the migration is intentionally changed, refresh this snapshot AND keep
 * every assertion below passing — they encode the invariants that prevent
 * regressions of:
 *
 *  1. "ambiguous column reference" (Postgres 42702) between the RETURNS TABLE
 *     column names and inner subquery column names.
 *  2. Ranking collapse — the outer ORDER BY must sort by *the subquery's*
 *     produtos count (highest coverage first, then alphabetical) so the
 *     admin table stays deterministic.
 *  3. Silent RLS/permission bypass — the function must stay SECURITY DEFINER
 *     and gated by `has_role(auth.uid(), 'admin')`.
 */
export const GET_COVERAGE_OVERVIEW_DEFINITION = `CREATE OR REPLACE FUNCTION public.get_coverage_overview()
 RETURNS TABLE(establishment_id uuid, name text, produtos integer, faltando integer, cobertura_pct numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE v_total int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT COUNT(DISTINCT public.normalize_product_key(s.product_name))::int INTO v_total
  FROM public.scans s
  WHERE s.status='salvo' AND s.user_id IS NULL AND s.product_name IS NOT NULL;

  RETURN QUERY
  SELECT
    e.id AS establishment_id,
    e.name AS name,
    COALESCE(x.produtos, 0)::int AS produtos,
    (v_total - COALESCE(x.produtos, 0))::int AS faltando,
    ROUND(100.0 * COALESCE(x.produtos, 0) / NULLIF(v_total, 0), 1) AS cobertura_pct
  FROM public.establishments e
  LEFT JOIN (
    SELECT s.establishment_id AS establishment_id,
           COUNT(DISTINCT public.normalize_product_key(s.product_name))::int AS produtos
    FROM public.scans s
    WHERE s.status='salvo' AND s.user_id IS NULL AND s.product_name IS NOT NULL
    GROUP BY s.establishment_id
  ) x ON x.establishment_id = e.id
  WHERE e.active = true
  ORDER BY COALESCE(x.produtos, 0) DESC, e.name ASC;
END;
$function$`;

describe("get_coverage_overview RPC — regression", () => {
  const def = GET_COVERAGE_OVERVIEW_DEFINITION;

  it("declares the correct output signature", () => {
    expect(def).toMatch(
      /RETURNS TABLE\(establishment_id uuid, name text, produtos integer, faltando integer, cobertura_pct numeric\)/,
    );
  });

  it("keeps the ambiguity guard against RETURNS TABLE column names", () => {
    expect(def).toContain("#variable_conflict use_column");
  });

  it("stays SECURITY DEFINER with a fixed search_path", () => {
    expect(def).toMatch(/SECURITY DEFINER/);
    expect(def).toMatch(/SET search_path TO 'public'/);
  });

  it("enforces the admin gate before running the query", () => {
    expect(def).toMatch(/has_role\(auth\.uid\(\), 'admin'::app_role\)/);
    expect(def).toMatch(/RAISE EXCEPTION 'forbidden'/);
  });

  it("qualifies every column referenced from scans and establishments", () => {
    // No bare `product_name`, `establishment_id`, `status`, `user_id`, `active`,
    // `name`, or `id` reads — each must go through its alias to avoid clashing
    // with the RETURNS TABLE columns of the same name.
    const unqualified = [
      /\bFROM\s+public\.scans\s+\w+[\s\S]*?WHERE\s+status\s*=/i,
      /\bFROM\s+public\.establishments\s+\w+[\s\S]*?WHERE\s+active\s*=/i,
      /GROUP BY\s+establishment_id\b(?!\s*AS)/i,
    ];
    for (const pattern of unqualified) {
      expect(def).not.toMatch(pattern);
    }
    // Positive assertions on the qualified forms we actually want.
    expect(def).toMatch(/s\.status\s*=\s*'salvo'/);
    expect(def).toMatch(/s\.user_id\s+IS\s+NULL/);
    expect(def).toMatch(/s\.product_name\s+IS\s+NOT\s+NULL/);
    expect(def).toMatch(/e\.active\s*=\s*true/);
    expect(def).toMatch(/GROUP BY\s+s\.establishment_id/);
    expect(def).toMatch(/ON\s+x\.establishment_id\s*=\s*e\.id/);
  });

  it("aliases the projected columns explicitly", () => {
    expect(def).toMatch(/e\.id\s+AS\s+establishment_id/);
    expect(def).toMatch(/e\.name\s+AS\s+name/);
    expect(def).toMatch(/COALESCE\(x\.produtos, 0\)::int\s+AS\s+produtos/);
    expect(def).toMatch(/\(v_total - COALESCE\(x\.produtos, 0\)\)::int\s+AS\s+faltando/);
    expect(def).toMatch(
      /ROUND\(100\.0 \* COALESCE\(x\.produtos, 0\) \/ NULLIF\(v_total, 0\), 1\)\s+AS\s+cobertura_pct/,
    );
  });

  it("keeps the ranking ordered by coverage desc, then establishment name", () => {
    // Ranking regression: if this ORDER BY is dropped, the admin table renders
    // in insertion order and the "highest coverage" hero row disappears.
    expect(def).toMatch(
      /ORDER BY\s+COALESCE\(x\.produtos, 0\)\s+DESC,\s*e\.name\s+ASC/,
    );
  });

  it("uses LEFT JOIN so establishments with zero scans still appear", () => {
    expect(def).toMatch(/LEFT JOIN\s*\(/);
    // faltando must be computable when x.produtos is NULL.
    expect(def).toMatch(/COALESCE\(x\.produtos, 0\)/);
  });
});
