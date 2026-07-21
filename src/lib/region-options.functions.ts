import { createServerFn } from "@tanstack/react-start";

export type RegionCity = {
  city: string;
  neighborhoods: string[];
  scanCount: number;
};

const CURATED_BASE: Record<string, string[]> = {
  Feijó: ["Centro", "Bairro Novo", "Rodoviário", "Bahia", "Cascata", "Triângulo"],
};

function norm(s: string | null | undefined): string {
  return (s ?? "").trim();
}

/**
 * Combines curated regions (Feijó/AC baseline) with cities/neighborhoods
 * derived from active establishments. Public-safe read.
 */
export const getRegionOptions = createServerFn({ method: "GET" }).handler(
  async (): Promise<RegionCity[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin.rpc("get_region_options");
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Array<{
      city: string | null;
      neighborhood: string | null;
      scan_count: number | null;
    }>;

    const cityMap = new Map<string, { neighborhoods: Set<string>; scans: number }>();

    // Seed curated base first — ensures Feijó bairros are always available.
    for (const [city, bairros] of Object.entries(CURATED_BASE)) {
      cityMap.set(city, { neighborhoods: new Set(bairros), scans: 0 });
    }

    // Merge live data on top.
    for (const r of rows) {
      const city = norm(r.city) || "Feijó";
      if (!cityMap.has(city)) cityMap.set(city, { neighborhoods: new Set(), scans: 0 });
      const bucket = cityMap.get(city)!;
      const b = norm(r.neighborhood);
      if (b) bucket.neighborhoods.add(b);
      bucket.scans += r.scan_count ?? 0;
    }

    return Array.from(cityMap.entries())
      .map(([city, v]) => ({
        city,
        neighborhoods: Array.from(v.neighborhoods).sort((a, b) => a.localeCompare(b, "pt-BR")),
        scanCount: v.scans,
      }))
      .sort((a, b) => a.city.localeCompare(b.city, "pt-BR"));
  },
);
