import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

export type ProductSuggestion = {
  slug: string;
  name: string;
  price: number | null;
  marketName: string | null;
};

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Public — sugere até 5 produtos que casam com o termo digitado.
 * Busca acento-insensível sobre `scans` (produtos salvos).
 */
export const getProductSuggestions = createServerFn({ method: "GET" })
  .inputValidator((input?: { q?: string; limit?: number }) => {
    const q = (input?.q ?? "").trim().slice(0, 60);
    const limit = Math.min(Math.max(input?.limit ?? 5, 1), 8);
    return { q, limit };
  })
  .handler(async ({ data }): Promise<ProductSuggestion[]> => {
    const term = data.q;
    if (term.length < 2) return [];

    try {
      setResponseHeader(
        "cache-control",
        "public, max-age=30, s-maxage=120, stale-while-revalidate=600",
      );
    } catch {
      /* ignore */
    }

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: rows, error } = await supabaseAdmin
        .from("scans")
        .select("product_name, price_captured, market_name, created_at")
        .eq("status", "salvo")
        .not("product_name", "is", null)
        .not("price_captured", "is", null)
        .order("created_at", { ascending: false })
        .limit(300);

      if (error || !rows) return [];

      const key = normalize(term);
      const seen = new Map<string, ProductSuggestion>();

      for (const r of rows) {
        const name = (r.product_name ?? "").trim();
        if (!name) continue;
        const norm = normalize(name);
        if (!norm.includes(key)) continue;
        if (seen.has(norm)) continue;
        seen.set(norm, {
          slug: norm.replace(/\s+/g, "-"),
          name,
          price: Number(r.price_captured) || null,
          marketName: (r.market_name ?? "").trim() || null,
        });
        if (seen.size >= data.limit) break;
      }

      return Array.from(seen.values());
    } catch {
      return [];
    }
  });
