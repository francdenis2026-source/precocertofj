import { createServerFn } from "@tanstack/react-start";
import { ESSENTIALS, type EssentialKey } from "@/lib/basket.functions";

/**
 * Retorna a série de preços dos últimos 7 dias para cada
 * combinação (estabelecimento, item essencial), usando as
 * observações já persistidas em `product_price_history`.
 */
export const getBasketSparklines = createServerFn({ method: "POST" })
  .inputValidator((input: { storeIds: string[] }) => {
    if (!input || !Array.isArray(input.storeIds)) {
      throw new Error("storeIds must be an array");
    }
    return {
      storeIds: input.storeIds.filter((s): s is string => typeof s === "string" && s.length > 0).slice(0, 30),
    };
  })
  .handler(async ({ data }) => {
    const empty: Record<string, Array<{ t: string; p: number }>> = {};
    if (data.storeIds.length === 0) return empty;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

    const client = supabaseAdmin as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          in: (c: string, v: string[]) => {
            gte: (c: string, v: string) => {
              order: (c: string, o: { ascending: boolean }) => {
                limit: (n: number) => Promise<{
                  data:
                    | Array<{
                        establishment_id: string;
                        product_name: string;
                        price: string | number;
                        captured_at: string;
                      }>
                    | null;
                  error: { message: string } | null;
                }>;
              };
            };
          };
        };
      };
    };

    const { data: rows, error } = await client
      .from("product_price_history")
      .select("establishment_id, product_name, price, captured_at")
      .in("establishment_id", data.storeIds)
      .gte("captured_at", since)
      .order("captured_at", { ascending: true })
      .limit(5000);
    if (error) throw new Error(error.message);

    // Mesma heurística do matchEssential em basket.functions.ts (patterns simples).
    const norm = (s: string) =>
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9 ]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const matchKey = (raw: string): EssentialKey | null => {
      const n = norm(raw);
      for (const e of ESSENTIALS) {
        if (e.exclude?.some((x) => n.includes(norm(x)))) continue;
        if (e.patterns.some((p) => n.includes(norm(p)))) return e.key;
      }
      return null;
    };

    const buckets: Record<string, Array<{ t: string; p: number }>> = {};
    for (const r of rows ?? []) {
      const key = matchKey(r.product_name);
      if (!key) continue;
      const price = Number(r.price);
      if (!Number.isFinite(price) || price <= 0) continue;
      const k = `${r.establishment_id}::${key}`;
      const list = buckets[k] ?? (buckets[k] = []);
      // Limita ~30 pontos por par para evitar payload grande.
      if (list.length >= 30) continue;
      list.push({ t: r.captured_at, p: price });
    }
    return buckets;
  });
