import { createServerFn } from "@tanstack/react-start";
import { findCatalogImageForProduct, signStorageImageUrl } from "@/lib/product-image-utils";

type ScansTable = {
  select: (cols: string) => {
    order: (col: string, opts: { ascending: boolean }) => {
      limit: (n: number) => Promise<{ data: unknown; error: { message: string } | null }>;
    };
  };
};

export type RecentScan = {
  id: string;
  productName: string | null;
  priceCaptured: number | null;
  verdict: "barato" | "justo" | "caro" | "unknown";
  diffPct: number | null;
  marketName: string | null;
  imageUrl: string | null;
  createdAt: string;
};

/**
 * Returns the average captured price for a given barcode across all scans.
 * Used to compute a fresh verdict when a user captures a new scan.
 */
export const getAveragePriceForBarcode = createServerFn({ method: "POST" })
  .inputValidator((input: { barcode: string }) => {
    if (!input.barcode) throw new Error("barcode obrigatório");
    return input;
  })
  .handler(async ({ data }): Promise<{ average: number | null; samples: number }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("scans" as never)
      .select("price_captured")
      .eq("barcode", data.barcode)
      .not("price_captured", "is", null);
    if (error) throw new Error(error.message);
    const values = ((rows ?? []) as Array<{ price_captured: number | null }>)
      .map((r) => Number(r.price_captured))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (values.length === 0) return { average: null, samples: 0 };
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return { average: Number(avg.toFixed(2)), samples: values.length };
  });

/** Public feed: last 10 anonymized scans (own + public). */
export const listRecentScans = createServerFn({ method: "GET" })
  .handler(async (): Promise<RecentScan[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const table = supabaseAdmin.from("scans" as never) as unknown as ScansTable;
    const { data, error } = await table
      .select("id, product_name, price_captured, verdict, diff_pct, market_name, image_url, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Array<{
      id: string;
      product_name: string | null;
      price_captured: number | null;
      verdict: "barato" | "justo" | "caro" | "unknown";
      diff_pct: number | null;
      market_name: string | null;
      image_url: string | null;
      created_at: string;
    }>;
    const { data: catalog } = await supabaseAdmin
      .from("product_catalog")
      .select("display_name, normalized_name, image_url")
      .not("image_url", "is", null)
      .limit(500);
    const candidates = (catalog ?? []).map((candidate) => ({
      displayName: candidate.display_name,
      normalizedName: candidate.normalized_name,
      imageUrl: candidate.image_url,
    }));

    return Promise.all(rows.map(async (r) => ({
      id: r.id,
      productName: r.product_name,
      priceCaptured: r.price_captured !== null ? Number(r.price_captured) : null,
      verdict: r.verdict,
      diffPct: r.diff_pct !== null ? Number(r.diff_pct) : null,
      marketName: r.market_name,
      imageUrl: await signStorageImageUrl(
        r.image_url ?? findCatalogImageForProduct(r.product_name ?? "", candidates),
        supabaseAdmin,
      ),
      createdAt: r.created_at,
    })));
  });
