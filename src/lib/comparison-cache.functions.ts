import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";

export type EstablishmentMetric = {
  establishment_id: string;
  name: string;
  active: boolean;
  scans_total: number;
  unique_products: number;
  size_variants: number;
  cache_rows: number;
  stale: boolean;
  last_scan_at: string | null;
};

export const rebuildComparisonCache = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const start = Date.now();
    const { data, error } = await context.supabase.rpc("rebuild_comparison_cache_all");
    if (error) throw new Error(error.message);
    const arr = data as unknown as { rebuilt: number }[] | null;
    const rebuilt = Array.isArray(arr) ? (arr[0]?.rebuilt ?? 0) : 0;
    const { count } = await context.supabase
      .from("product_comparison_cache")
      .select("*", { count: "exact", head: true });
    return {
      rebuilt,
      cache_rows: count ?? 0,
      duration_ms: Date.now() - start,
    };
  });

export const getEstablishmentMetrics = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rpc = context.supabase.rpc as any;
    const { data, error } = await rpc("establishment_metrics");
    if (error) throw new Error(error.message);
    return (data ?? []) as EstablishmentMetric[];
  });
