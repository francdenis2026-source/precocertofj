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

export type NeighborhoodTopProduct = {
  name: string;
  count: number;
  minPrice: number | null;
};

export type NeighborhoodGroup = {
  neighborhood: string;
  city: string | null;
  establishments: NeighborhoodEstablishment[];
  topCategories: Array<{ name: string; count: number }>;
  topProducts: NeighborhoodTopProduct[];
};

/** Público: lista estabelecimentos ativos agrupados por bairro, com insights. */
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

    type ScanRow = {
      establishment_id: string | null;
      product_name: string | null;
      price_captured: number | null;
    };
    let scanRows: ScanRow[] = [];
    if (ids.length > 0) {
      const pageSize = 1000;
      for (let from = 0; from < 200_000; from += pageSize) {
        const { data, error } = await supabaseAdmin
          .from("scans")
          .select("establishment_id, product_name, price_captured")
          .in("establishment_id", ids)
          .eq("status", "salvo")
          .is("user_id", null)
          .not("product_name", "is", null)
          .range(from, from + pageSize - 1);
        if (error) throw new Error(error.message);

        const batch = (data ?? []) as ScanRow[];
        scanRows.push(...batch);
        if (batch.length < pageSize) break;
      }
    }

    // Map produto → categoria (via product_catalog.normalized_name)
    const categoryByName = new Map<string, string>();
    if (scanRows.length > 0) {
      const uniqueNames = Array.from(
        new Set(
          scanRows
            .map((s) => (s.product_name ?? "").trim().toUpperCase())
            .filter((n) => n.length > 0),
        ),
      );
      // Buscar em lotes de 200 para não estourar limite
      for (let i = 0; i < uniqueNames.length; i += 200) {
        const chunk = uniqueNames.slice(i, i + 200);
        const { data: catRows } = await supabaseAdmin
          .from("product_catalog")
          .select("normalized_name, category")
          .in("normalized_name", chunk);
        for (const r of (catRows ?? []) as Array<{
          normalized_name: string;
          category: string | null;
        }>) {
          if (r.category) categoryByName.set(r.normalized_name, r.category);
        }
      }
    }

    const normalizeName = (s: string | null | undefined): string => {
      if (!s) return "Não informado";
      const trimmed = s.trim();
      if (!trimmed) return "Não informado";
      return trimmed
        .toLocaleLowerCase("pt-BR")
        .split(/\s+/)
        .map((w) => w.charAt(0).toLocaleUpperCase("pt-BR") + w.slice(1))
        .join(" ");
    };

    // Estabelecimento → bairro (chave normalizada)
    const estToNeighborhood = new Map<string, string>();
    const estCount = new Map<string, number>();

    type Bucket = {
      key: string;
      city: string | null;
      establishments: NeighborhoodEstablishment[];
      categoryCount: Map<string, number>;
      productAgg: Map<string, { count: number; minPrice: number | null }>;
    };
    const grouped = new Map<string, Bucket>();

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
      estToNeighborhood.set(r.id, key);

      const g =
        grouped.get(key) ??
        ({
          key,
          city: cityNorm,
          establishments: [],
          categoryCount: new Map(),
          productAgg: new Map(),
        } as Bucket);
      g.establishments.push({
        id: r.id,
        name: r.name,
        logoUrl: r.logo_url,
        brandColor: r.brand_color,
        address: r.address,
        productsCount: 0,
      });
      grouped.set(key, g);
    }

    // Agregar scans por bairro
    for (const s of scanRows) {
      if (!s.establishment_id) continue;
      const bairro = estToNeighborhood.get(s.establishment_id);
      if (!bairro) continue;
      const bucket = grouped.get(bairro);
      if (!bucket) continue;

      estCount.set(s.establishment_id, (estCount.get(s.establishment_id) ?? 0) + 1);

      const rawName = (s.product_name ?? "").trim();
      if (!rawName) continue;
      const upper = rawName.toUpperCase();

      const cat = categoryByName.get(upper);
      if (cat) {
        bucket.categoryCount.set(cat, (bucket.categoryCount.get(cat) ?? 0) + 1);
      }

      const prev = bucket.productAgg.get(upper);
      const price = s.price_captured != null ? Number(s.price_captured) : null;
      if (prev) {
        prev.count += 1;
        if (price != null && (prev.minPrice == null || price < prev.minPrice)) {
          prev.minPrice = price;
        }
      } else {
        bucket.productAgg.set(upper, { count: 1, minPrice: price });
      }
    }

    // Preencher productsCount nos estabelecimentos
    for (const bucket of grouped.values()) {
      for (const est of bucket.establishments) {
        est.productsCount = estCount.get(est.id) ?? 0;
      }
    }

    const toTitle = (s: string): string =>
      s
        .toLocaleLowerCase("pt-BR")
        .split(/\s+/)
        .map((w) => w.charAt(0).toLocaleUpperCase("pt-BR") + w.slice(1))
        .join(" ");

    return Array.from(grouped.values())
      .map((b) => {
        const topCategories = Array.from(b.categoryCount.entries())
          .sort((a, z) => z[1] - a[1])
          .slice(0, 3)
          .map(([name, count]) => ({ name, count }));

        const topProducts: NeighborhoodTopProduct[] = Array.from(b.productAgg.entries())
          .sort((a, z) => z[1].count - a[1].count)
          .slice(0, 3)
          .map(([name, agg]) => ({
            name: toTitle(name),
            count: agg.count,
            minPrice: agg.minPrice,
          }));

        return {
          neighborhood: b.key,
          city: b.city,
          establishments: b.establishments.sort((a, z) => z.productsCount - a.productsCount),
          topCategories,
          topProducts,
        };
      })
      .sort((a, z) => z.establishments.length - a.establishments.length);
  },
);



export type MyScansPage = {
  items: MyScan[];
  nextOffset: number | null;
  total: number | null;
};

export const listMyScansPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { offset?: number; limit?: number }) => ({
    offset: Math.max(0, Math.floor(input.offset ?? 0)),
    limit: Math.min(100, Math.max(1, Math.floor(input.limit ?? 30))),
  }))
  .handler(async ({ data, context }): Promise<MyScansPage> => {
    const from = data.offset;
    const to = data.offset + data.limit - 1;
    const { data: rows, error, count } = await context.supabase
      .from("scans")
      .select(
        "id, product_name, price_captured, average_price, diff_pct, verdict, status, image_url, market_name, barcode, latitude, longitude, created_at",
        { count: "exact" },
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw new Error(error.message);
    const items = (rows ?? []).map((r) => ({
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
    if (items.length > 0) {
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
      for (const scan of items) {
        const matched =
          scan.imageUrl ?? findCatalogImageForProduct(scan.productName ?? "", candidates);
        scan.imageUrl = await signStorageImageUrl(matched, supabaseAdmin);
      }
    }
    return {
      items,
      nextOffset: items.length === data.limit ? data.offset + data.limit : null,
      total: typeof count === "number" ? count : null,
    };
  });
