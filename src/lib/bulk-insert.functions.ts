import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";
import { z } from "zod";

export type SimilarMatch = {
  id: string;
  product_name: string;
  price_captured: number | null;
  similarity: number;
};

export type AnalyzedItem = {
  product_name: string;
  price: number;
  quantity: number | null;
  unit: string | null;
  brand: string | null;
  similar: SimilarMatch[];
  status: "new" | "similar" | "duplicate";
};

const ItemSchema = z.object({
  product_name: z.string().trim().min(2).max(300),
  price: z.number().positive().max(100000),
  quantity: z.number().positive().max(100000).nullable().optional(),
  unit: z.string().trim().max(10).nullable().optional(),
  brand: z.string().trim().max(80).nullable().optional(),
});

export const analyzeBulkItems = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { items: unknown; establishmentId: string }) => ({
    items: z.array(ItemSchema).min(1).max(500).parse(input.items),
    establishmentId: z.string().uuid().parse(input.establishmentId),
  }))
  .handler(async ({ data, context }) => {
    const out: AnalyzedItem[] = [];
    for (const item of data.items) {
      const { data: matches, error } = await context.supabase.rpc(
        "find_similar_scans",
        {
          p_name: item.product_name,
          p_establishment_id: data.establishmentId,
          p_threshold: 0.55,
        },
      );
      if (error) {
        console.error("find_similar_scans error:", error);
      }
      const similar: SimilarMatch[] = (matches ?? []) as SimilarMatch[];
      const top = similar[0]?.similarity ?? 0;
      const status: AnalyzedItem["status"] =
        top >= 0.8 ? "duplicate" : top >= 0.55 ? "similar" : "new";
      out.push({
        product_name: item.product_name,
        price: item.price,
        quantity: item.quantity ?? null,
        unit: item.unit ?? null,
        brand: item.brand ?? null,
        similar,
        status,
      });
    }
    return out;
  });

export const bulkInsertScans = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { items: unknown; establishmentId: string }) => ({
    items: z.array(ItemSchema).min(1).max(500).parse(input.items),
    establishmentId: z.string().uuid().parse(input.establishmentId),
  }))
  .handler(async ({ data, context }) => {
    // Fetch market name once for denormalization
    const { data: est } = await context.supabase
      .from("establishments")
      .select("name")
      .eq("id", data.establishmentId)
      .maybeSingle();
    const marketName = est?.name ?? null;

    const rows = data.items.map((it) => {
      const name = it.brand
        ? `${it.product_name} ${it.brand}`.replace(/\s+/g, " ").trim()
        : it.product_name;
      return {
        product_name: name,
        price_captured: it.price,
        establishment_id: data.establishmentId,
        market_name: marketName,
        quantity: it.quantity ?? null,
        unit: it.unit ?? null,
        status: "salvo" as const,
        verdict: "unknown" as const,
        user_id: null,
      };
    });

    // Insert in chunks of 50
    let inserted = 0;
    const errors: string[] = [];
    for (let i = 0; i < rows.length; i += 50) {
      const chunk = rows.slice(i, i + 50);
      const { error, count } = await context.supabase
        .from("scans")
        .insert(chunk, { count: "exact" });
      if (error) {
        errors.push(error.message);
      } else {
        inserted += count ?? chunk.length;
      }
    }

    // Auto rebuild do cache de comparação após inserção em lote
    let cacheRebuilt = 0;
    if (inserted > 0) {
      const { data: rb, error: rbErr } = await context.supabase.rpc("rebuild_comparison_cache_all");
      if (rbErr) {
        errors.push(`rebuild_cache: ${rbErr.message}`);
      } else {
        const arr = rb as unknown as { rebuilt: number }[] | null;
        cacheRebuilt = Array.isArray(arr) ? (arr[0]?.rebuilt ?? 0) : 0;
      }
    }

    return { inserted, errors, cacheRebuilt };
  });
