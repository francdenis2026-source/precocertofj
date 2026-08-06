import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

/**
 * Public price-history reader. Uses the publishable/anon key so the
 * response passes through PostgREST with the public SELECT policy on
 * product_price_history. Safe: shows only price movements, not PII.
 */

export type PublicPriceHistoryPoint = {
  id: string;
  price: number;
  previous_price: number | null;
  change_pct: number | null;
  source: string;
  captured_at: string;
  changed_by_email: string | null;
  size_value: number | null;
  size_unit: string | null;
};

function makeClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  return client;
}

export const getPublicPriceHistory = createServerFn({ method: "GET" })
  .validator(
    (input: { establishmentId: string; productName: string; limit?: number }) => {
      if (!input.establishmentId?.trim()) throw new Error("establishmentId obrigatório");
      if (!input.productName?.trim()) throw new Error("productName obrigatório");
      return {
        establishmentId: input.establishmentId,
        productName: input.productName,
        limit: Math.min(Math.max(Number(input.limit ?? 30), 1), 200),
      };
    },
  )
  .handler(async ({ data }): Promise<PublicPriceHistoryPoint[]> => {
    const sb = makeClient();
    const { data: keyData, error: keyErr } = await sb.rpc("normalize_product_key", {
      name: data.productName,
    });
    if (keyErr) throw new Error(keyErr.message);
    const key = `nm:${String(keyData ?? "")}`;
    if (key === "nm:") return [];

    const { data: rows, error } = await sb
      .from("product_price_history")
      .select(
        "id, price, previous_price, change_pct, source, captured_at, changed_by_email, size_value, size_unit",
      )
      .eq("establishment_id", data.establishmentId)
      .eq("product_key", key)
      .order("captured_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      price: Number(r.price),
      previous_price: r.previous_price == null ? null : Number(r.previous_price),
      change_pct: r.change_pct == null ? null : Number(r.change_pct),
      source: String(r.source ?? "scan"),
      captured_at: String(r.captured_at),
      changed_by_email: (r.changed_by_email as string | null) ?? null,
      size_value: r.size_value == null ? null : Number(r.size_value),
      size_unit: (r.size_unit as string | null) ?? null,
    }));
  });
