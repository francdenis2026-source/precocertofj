/**
 * Métricas reais da conta do cliente:
 *  - favoritesCount: itens salvos em favoritos
 *  - contributionsCount: scans + denúncias/validações de preço enviadas
 *  - totalSavings: economia real (soma dos casos em que o cliente pagou
 *    igual/abaixo do mínimo regional) nos últimos 90 dias
 *  - potentialSavings: quanto poderia ter economizado escolhendo o menor preço
 *  - memberSince: ano de criação do perfil
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ProfileStats = {
  favoritesCount: number;
  contributionsCount: number;
  totalSavings: number;
  potentialSavings: number;
  memberSinceYear: number | null;
};

export const getMyProfileStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProfileStats> => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const client = supabase as unknown as {
      from: (t: string) => any;
    };

    const [favRes, scanCountRes, reportCountRes, scansRes, profRes] = await Promise.all([
      client.from("favorite_items").select("id", { count: "exact", head: true }).eq("user_id", userId),
      client.from("scans").select("id", { count: "exact", head: true }).eq("user_id", userId),
      client.from("price_reports").select("id", { count: "exact", head: true }).eq("user_id", userId),
      client
        .from("scans")
        .select("product_name, price_captured, created_at")
        .eq("user_id", userId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500),
      client.from("profiles").select("created_at").eq("id", userId).maybeSingle(),
    ]);

    const favoritesCount = favRes.count ?? 0;
    const scansCount = scanCountRes.count ?? 0;
    const reportsCount = reportCountRes.count ?? 0;
    const contributionsCount = scansCount + reportsCount;

    let totalSavings = 0;
    let potentialSavings = 0;

    const scans = (scansRes.data ?? []) as Array<{
      product_name: string;
      price_captured: number;
      created_at: string;
    }>;

    if (scans.length > 0) {
      const normalize = (s: string) =>
        s
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, " ")
          .replace(/\s+/g, " ")
          .trim();

      const keys = Array.from(new Set(scans.map((s) => normalize(s.product_name))));
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: stats } = await (supabaseAdmin as any)
        .from("product_price_stats")
        .select("product_key, min_price, avg_price")
        .in("product_key", keys);

      const byKey = new Map<string, { min: number; avg: number }>();
      for (const s of stats ?? []) {
        byKey.set(s.product_key, { min: Number(s.min_price), avg: Number(s.avg_price) });
      }

      for (const s of scans) {
        const stat = byKey.get(normalize(s.product_name));
        if (!stat) continue;
        const paid = Number(s.price_captured);
        // Economia real: pagou <= mínimo (economizou vs média)
        if (paid <= stat.min + 0.01) {
          totalSavings += Math.max(0, stat.avg - paid);
        } else {
          potentialSavings += paid - stat.min;
        }
      }
    }

    const memberSinceYear = profRes.data?.created_at
      ? new Date(profRes.data.created_at as string).getFullYear()
      : null;

    return {
      favoritesCount,
      contributionsCount,
      totalSavings: Math.round(totalSavings * 100) / 100,
      potentialSavings: Math.round(potentialSavings * 100) / 100,
      memberSinceYear,
    };
  });
