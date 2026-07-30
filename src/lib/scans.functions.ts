import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { findCatalogImageForProduct, signStorageImageUrl } from "@/lib/product-image-utils";

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
 * Cliente público (RLS como `anon`): estas leituras são de dados públicos,
 * então não usam service role. A policy "Anon reads public scans" garante
 * que registros privados de usuários nunca vazem por aqui.
 */
function publicClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase não configurado");
  return createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

/** Preço médio público de um código de barras (somente registros públicos salvos). */
export const getAveragePriceForBarcode = createServerFn({ method: "POST" })
  .inputValidator((input: { barcode: string }) => {
    if (!input.barcode || typeof input.barcode !== "string" || input.barcode.length > 32) {
      throw new Error("barcode inválido");
    }
    return { barcode: input.barcode.replace(/\D/g, "") };
  })
  .handler(async ({ data }): Promise<{ average: number | null; samples: number }> => {
    const supabase = publicClient();
    const { data: rows, error } = await supabase
      .from("scans")
      .select("price_captured")
      .eq("barcode", data.barcode)
      .eq("status", "salvo")
      .is("user_id", null)
      .not("price_captured", "is", null)
      .limit(500);
    if (error) throw new Error(error.message);
    const values = (rows ?? [])
      .map((r) => Number(r.price_captured))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (values.length === 0) return { average: null, samples: 0 };
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return { average: Number(avg.toFixed(2)), samples: values.length };
  });

/** Feed público: últimos 10 registros públicos de preço. */
export const listRecentScans = createServerFn({ method: "GET" }).handler(
  async (): Promise<RecentScan[]> => {
    const supabase = publicClient();
    const { data, error } = await supabase
      .from("scans")
      .select(
        "id, product_name, price_captured, verdict, diff_pct, market_name, image_url, created_at",
      )
      .eq("status", "salvo")
      .is("user_id", null)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);

    const rows = data ?? [];

    const { data: catalog } = await supabase
      .from("product_catalog")
      .select("display_name, normalized_name, image_url")
      .not("image_url", "is", null)
      .limit(500);
    const candidates = (catalog ?? []).map((candidate) => ({
      displayName: candidate.display_name,
      normalizedName: candidate.normalized_name,
      imageUrl: candidate.image_url,
    }));

    return Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        productName: r.product_name,
        priceCaptured: r.price_captured !== null ? Number(r.price_captured) : null,
        verdict: r.verdict as RecentScan["verdict"],
        diffPct: r.diff_pct !== null ? Number(r.diff_pct) : null,
        marketName: r.market_name,
        imageUrl: await signStorageImageUrl(
          r.image_url ?? findCatalogImageForProduct(r.product_name ?? "", candidates),
          supabase as never,
        ),
        createdAt: r.created_at,
      })),
    );
  },
);
