import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminMetrics = {
  establishments: Array<{
    id: string;
    name: string;
    productCount: number;
    scansCount: number;
  }>;
  categories: Array<{
    name: string;
    count: number;
  }>;
  totalProducts: number;
};

export const getAdminMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminMetrics> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [estabsRes, catsRes, totalRes] = await Promise.all([
      supabaseAdmin.from("establishments").select("id, name"),
      supabaseAdmin.rpc("get_category_stats" as any), // Precisaremos criar ou simular
      supabaseAdmin.from("product_catalog").select("id", { count: "exact", head: true })
    ]);

    // Fallback se o RPC não existir (simulando via query comum)
    let categoryStats = catsRes.data;
    if (!categoryStats) {
      const { data } = await supabaseAdmin.from("product_catalog").select("category");
      const counts: Record<string, number> = {};
      (data || []).forEach(r => {
        const cat = r.category || "Sem Categoria";
        counts[cat] = (counts[cat] || 0) + 1;
      });
      categoryStats = Object.entries(counts).map(([name, count]) => ({ name, count }));
    }

    const establishments = await Promise.all((estabsRes.data || []).map(async (e: any) => {
      const { count: prodCount } = await supabaseAdmin
        .from("product_catalog")
        .select("id", { count: "exact", head: true })
        .eq("establishment_id", e.id); // Ajustar se a relação for diferente
      
      const { count: scanCount } = await supabaseAdmin
        .from("scans")
        .select("id", { count: "exact", head: true })
        .eq("market_name", e.name);

      return {
        id: e.id,
        name: e.name,
        productCount: prodCount || 0,
        scansCount: scanCount || 0
      };
    }));

    return {
      establishments,
      categories: categoryStats || [],
      totalProducts: totalRes.count || 0
    };
  });
