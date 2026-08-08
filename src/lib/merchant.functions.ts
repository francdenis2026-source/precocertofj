import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listMerchantPlans = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("license_plans")
      .select("*")
      .eq("active", true)
      .ilike("slug", "parceiro-%")
      .order("price_cents", { ascending: true });
    
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getEstablishmentInsights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: { establishmentId: string }) => z.object({ establishmentId: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // Check if user owns the establishment
    const { data: est, error: estErr } = await supabaseAdmin
      .from("establishments")
      .select("id, owner_id, verified")
      .eq("id", data.establishmentId)
      .single();
      
    if (estErr || est.owner_id !== context.userId) {
      throw new Error("Acesso negado");
    }

    // Mock/placeholder for actual DB metrics to be implemented
    // In a real scenario, these would be aggregations from analytics_events and scans
    return {
      searchesWeek: 2438,
      views: 184,
      basketsAdded: 92,
      lowestPriceCount: 63,
      aboveAverageCount: 27,
      topProducts: [
        { name: "Arroz 5kg", searches: 450 },
        { name: "Café 500g", searches: 320 },
        { name: "Leite Integral 1L", searches: 280 }
      ]
    };
  });
