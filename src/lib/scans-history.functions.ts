import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { findCatalogImageForProduct, signStorageImageUrl } from "@/lib/product-image-utils";

export type ScanStatus = "capturado" | "revisado" | "salvo";

export type MyScan = {
  id: string;
  productName: string | null;
  priceCaptured: number | null;
  averagePrice: number | null;
  diffPct: number | null;
  verdict: string;
  status: ScanStatus;
  imageUrl: string | null;
  marketName: string | null;
  barcode: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
};

export const listMyScans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyScan[]> => {
    const { data, error } = await context.supabase
      .from("scans")
      .select(
        "id, product_name, price_captured, average_price, diff_pct, verdict, status, image_url, market_name, barcode, latitude, longitude, created_at",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const scans = (data ?? []).map((r) => ({
      id: r.id,
      productName: r.product_name,
      priceCaptured: r.price_captured !== null ? Number(r.price_captured) : null,
      averagePrice: r.average_price !== null ? Number(r.average_price) : null,
      diffPct: r.diff_pct !== null ? Number(r.diff_pct) : null,
      verdict: r.verdict,
      status: ((r as { status?: string }).status as ScanStatus) ?? "salvo",
      imageUrl: r.image_url,
      marketName: r.market_name,
      barcode: r.barcode,
      latitude: r.latitude !== null ? Number(r.latitude) : null,
      longitude: r.longitude !== null ? Number(r.longitude) : null,
      createdAt: r.created_at,
    }));
    if (scans.length === 0) return scans;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: catalog } = await supabaseAdmin
      .from("product_catalog")
      .select("display_name, normalized_name, image_url")
      .not("image_url", "is", null)
      .limit(500);
    const candidates = (catalog ?? []).map((row) => ({
      displayName: row.display_name,
      normalizedName: row.normalized_name,
      imageUrl: row.image_url,
    }));

    return Promise.all(
      scans.map(async (scan) => {
        const matched =
          scan.imageUrl ?? findCatalogImageForProduct(scan.productName ?? "", candidates);
        return {
          ...scan,
          imageUrl: await signStorageImageUrl(matched, supabaseAdmin),
        };
      }),
    );
  });

export const getMyScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input.id) throw new Error("id obrigatório");
    return input;
  })
  .handler(async ({ data, context }): Promise<MyScan | null> => {
    const { data: row, error } = await context.supabase
      .from("scans")
      .select(
        "id, product_name, price_captured, average_price, diff_pct, verdict, status, image_url, market_name, barcode, latitude, longitude, created_at, user_id",
      )
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    let imageUrl = row.image_url;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!imageUrl && row.product_name) {
      const { data: catalog } = await supabaseAdmin
        .from("product_catalog")
        .select("display_name, normalized_name, image_url")
        .not("image_url", "is", null)
        .limit(500);
      imageUrl = findCatalogImageForProduct(
        row.product_name,
        (catalog ?? []).map((candidate) => ({
          displayName: candidate.display_name,
          normalizedName: candidate.normalized_name,
          imageUrl: candidate.image_url,
        })),
      );
    }

    return {
      id: row.id,
      productName: row.product_name,
      priceCaptured: row.price_captured !== null ? Number(row.price_captured) : null,
      averagePrice: row.average_price !== null ? Number(row.average_price) : null,
      diffPct: row.diff_pct !== null ? Number(row.diff_pct) : null,
      verdict: row.verdict,
      status: ((row as { status?: string }).status as ScanStatus) ?? "salvo",
      imageUrl: await signStorageImageUrl(imageUrl, supabaseAdmin),
      marketName: row.market_name,
      barcode: row.barcode,
      latitude: row.latitude !== null ? Number(row.latitude) : null,
      longitude: row.longitude !== null ? Number(row.longitude) : null,
      createdAt: row.created_at,
    };
  });

export type MarketAggregate = {
  marketName: string;
  latitude: number;
  longitude: number;
  samples: number;
  avgPrice: number;
  cheapestProduct: string | null;
};

/** Public: aggregated by market_name for scans with coordinates. */
export const listNearbyMarkets = createServerFn({ method: "GET" }).handler(
  async (): Promise<MarketAggregate[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("scans")
      .select("market_name, latitude, longitude, price_captured, product_name, verdict")
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .not("market_name", "is", null)
      .not("price_captured", "is", null)
      .limit(500);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Array<{
      market_name: string;
      latitude: number;
      longitude: number;
      price_captured: number;
      product_name: string | null;
      verdict: string | null;
    }>;
    const grouped = new Map<string, MarketAggregate>();
    for (const r of rows) {
      const key = r.market_name.trim().toLowerCase();
      const g = grouped.get(key);
      if (!g) {
        grouped.set(key, {
          marketName: r.market_name.trim(),
          latitude: Number(r.latitude),
          longitude: Number(r.longitude),
          samples: 1,
          avgPrice: Number(r.price_captured),
          cheapestProduct: r.verdict === "barato" ? r.product_name : null,
        });
      } else {
        g.avgPrice = (g.avgPrice * g.samples + Number(r.price_captured)) / (g.samples + 1);
        g.samples += 1;
        if (r.verdict === "barato" && !g.cheapestProduct) g.cheapestProduct = r.product_name;
      }
    }
    return Array.from(grouped.values()).map((g) => ({
      ...g,
      avgPrice: Number(g.avgPrice.toFixed(2)),
    }));
  },
);

export type NeighborhoodEstablishment = {
  id: string;
  name: string;
  logoUrl: string | null;
  brandColor: string | null;
  address: string | null;
  productsCount: number;
};

export type NeighborhoodGroup = {
  neighborhood: string;
  city: string | null;
  establishments: NeighborhoodEstablishment[];
};

/** Público: lista estabelecimentos ativos agrupados por bairro. */
export const listEstablishmentsByNeighborhood = createServerFn({ method: "GET" }).handler(
  async (): Promise<NeighborhoodGroup[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: estRows, error: estErr } = await supabaseAdmin
      .from("establishments")
      .select("id, name, logo_url, brand_color, neighborhood, city, address")
      .eq("active", true)
      .order("name", { ascending: true });
    if (estErr) throw new Error(estErr.message);

    const ids = (estRows ?? []).map((r) => r.id as string);
    const counts = new Map<string, number>();
    if (ids.length > 0) {
      const { data: scanRows } = await supabaseAdmin
        .from("scans")
        .select("establishment_id")
        .in("establishment_id", ids)
        .eq("status", "salvo")
        .is("user_id", null)
        .not("product_name", "is", null);
      for (const row of (scanRows ?? []) as Array<{ establishment_id: string | null }>) {
        if (!row.establishment_id) continue;
        counts.set(row.establishment_id, (counts.get(row.establishment_id) ?? 0) + 1);
      }
    }

    const normalizeName = (s: string | null | undefined): string => {
      if (!s) return "Não informado";
      const trimmed = s.trim();
      if (!trimmed) return "Não informado";
      // Title-case per word, respecting Portuguese
      return trimmed
        .toLocaleLowerCase("pt-BR")
        .split(/\s+/)
        .map((w) => w.charAt(0).toLocaleUpperCase("pt-BR") + w.slice(1))
        .join(" ");
    };

    const grouped = new Map<string, NeighborhoodGroup>();
    for (const r of (estRows ?? []) as Array<{
      id: string;
      name: string;
      logo_url: string | null;
      brand_color: string | null;
      neighborhood: string | null;
      city: string | null;
      address: string | null;
    }>) {
      const key = normalizeName(r.neighborhood);
      const cityNorm = r.city ? normalizeName(r.city) : null;
      const g = grouped.get(key) ?? { neighborhood: key, city: cityNorm, establishments: [] };
      g.establishments.push({
        id: r.id,
        name: r.name,
        logoUrl: r.logo_url,
        brandColor: r.brand_color,
        address: r.address,
        productsCount: counts.get(r.id) ?? 0,
      });
      grouped.set(key, g);
    }

    return Array.from(grouped.values())
      .map((g) => ({
        ...g,
        establishments: g.establishments.sort((a, b) => b.productsCount - a.productsCount),
      }))
      .sort((a, b) => b.establishments.length - a.establishments.length);
  },
);

