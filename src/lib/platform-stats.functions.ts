import { createServerFn } from "@tanstack/react-start";

export type PlatformItemStats = {
  productCount: number;
  scanCount: number;
  establishmentCount: number;
};

/**
 * Contagem pública de itens cadastrados na plataforma.
 * Usada no badge do admin/catálogo e como métrica social em páginas públicas.
 */
export const getPlatformItemStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<PlatformItemStats> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [productsRes, scansRes, estRes] = await Promise.all([
      supabaseAdmin.from("product_catalog").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("scans")
        .select("id", { count: "exact", head: true })
        .eq("status", "salvo"),
      supabaseAdmin
        .from("establishments")
        .select("id", { count: "exact", head: true })
        .eq("active", true),
    ]);

    return {
      productCount: productsRes.count ?? 0,
      scanCount: scansRes.count ?? 0,
      establishmentCount: estRes.count ?? 0,
    };
  },
);
