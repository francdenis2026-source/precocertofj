import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import {
  findCatalogImageForProduct,
  signStorageImageUrl,
  type CatalogImageCandidate,
} from "@/lib/product-image-utils";

// Cache em memória (por isolate). TTL curto para vitrine dinâmica.
const CACHE_TTL_MS = 60_000;
let cached: { at: number; data: HomeShowcase } | null = null;

export type ShowcaseEstablishment = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  logoUrl: string | null;
  createdAt: string;
};

export type ShowcaseProduct = {
  id: string;
  displayName: string;
  brand: string | null;
  imageUrl: string | null;
  createdAt: string;
};

export type ShowcaseCheapest = {
  productName: string;
  price: number;
  marketName: string | null;
  imageUrl: string | null;
  createdAt: string;
};

export type HomeShowcase = {
  establishments: ShowcaseEstablishment[];
  products: ShowcaseProduct[];
  cheapest: ShowcaseCheapest[];
};

/**
 * Endpoint público (sem auth) que retorna vitrines para a home:
 * últimos comércios ativos, produtos recém-cadastrados e menores preços.
 * Projeta apenas campos não-sensíveis.
 */
export const getHomeShowcase = createServerFn({ method: "GET" }).handler(
  async (): Promise<HomeShowcase> => {
    // Cache-Control: SWR de 60s no CDN/edge, revalidação em background por até 5min.
    try {
      setResponseHeader(
        "cache-control",
        "public, max-age=30, s-maxage=60, stale-while-revalidate=300",
      );
    } catch {
      /* fora de contexto HTTP (ex.: chamada direta) — ignora */
    }

    const now = Date.now();
    if (cached && now - cached.at < CACHE_TTL_MS) {
      return cached.data;
    }

    const { createClient } = await import("@supabase/supabase-js");
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const est = supabaseAdmin.from("establishments" as never) as unknown as {
      select: (s: string) => {
        eq: (
          c: string,
          v: boolean,
        ) => {
          order: (
            c: string,
            o: { ascending: boolean },
          ) => {
            limit: (
              n: number,
            ) => Promise<{
              data:
                | Array<{
                    id: string;
                    name: string;
                    city: string | null;
                    state: string | null;
                    logo_url: string | null;
                    created_at: string;
                  }>
                | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    };
    const { data: estRows } = await est
      .select("id, name, city, state, logo_url, created_at")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(8);

    type ProdRow = {
      id: string;
      normalized_name: string;
      display_name: string;
      brand: string | null;
      image_url: string | null;
      created_at: string;
    };
    const cat = supabaseAdmin.from("product_catalog" as never) as unknown as {
      select: (s: string) => {
        order: (
          c: string,
          o: { ascending: boolean },
        ) => {
          limit: (
            n: number,
          ) => Promise<{
            data: ProdRow[] | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
    const { data: prodRows } = await cat
      .select("id, normalized_name, display_name, brand, image_url, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    // Menores preços por produto (últimas leituras)
    const scans = supabaseAdmin.from("scans" as never) as unknown as {
      select: (s: string) => {
        not: (
          c: string,
          op: string,
          v: null,
        ) => {
          order: (
            c: string,
            o: { ascending: boolean },
          ) => {
            limit: (
              n: number,
            ) => Promise<{
              data:
                | Array<{
                    product_name: string | null;
                    price_captured: number | null;
                    market_name: string | null;
                    image_url: string | null;
                    created_at: string;
                  }>
                | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    };
    const { data: scanRows } = await scans
      .select("product_name, price_captured, market_name, image_url, created_at")
      .not("price_captured", "is", null)
      .order("price_captured", { ascending: true })
      .limit(50);

    // Deduplica: mantém o menor preço por product_name
    const bestByName = new Map<string, ShowcaseCheapest>();
    for (const r of scanRows ?? []) {
      if (!r.product_name || r.price_captured == null) continue;
      const key = r.product_name.trim().toUpperCase();
      const cur = bestByName.get(key);
      if (!cur || r.price_captured < cur.price) {
        bestByName.set(key, {
          productName: r.product_name,
          price: r.price_captured,
          marketName: r.market_name,
          imageUrl: r.image_url,
          createdAt: r.created_at,
        });
      }
    }

    // Enriquece com imagens do catálogo (scans raramente têm image_url).
    const catalog: CatalogImageCandidate[] = (prodRows ?? []).map((p) => ({
      displayName: p.display_name,
      normalizedName: p.normalized_name,
      imageUrl: p.image_url,
    }));
    if (bestByName.size > 0) {
      for (const [, v] of bestByName) {
        if (!v.imageUrl) {
          const hit = findCatalogImageForProduct(v.productName, catalog);
          if (hit) v.imageUrl = hit;
        }
      }
    }

    const cheapest = Array.from(bestByName.values()).slice(0, 8);


    // Sign private-bucket URLs so <img> tags can load them.
    const { supabaseAdmin: storageAdmin } = await import("@/integrations/supabase/client.server");
    const signLogo = (url: string | null) => signStorageImageUrl(url, storageAdmin);

    const [estSigned, prodSigned, cheapestSigned] = await Promise.all([
      Promise.all(
        (estRows ?? []).map(async (e) => ({
          id: e.id,
          name: e.name,
          city: e.city,
          state: e.state,
          logoUrl: await signLogo(e.logo_url),
          createdAt: e.created_at,
        })),
      ),
      Promise.all(
        (prodRows ?? []).slice(0, 24).map(async (p) => ({
          id: p.id,
          displayName: p.display_name,
          brand: p.brand,
          imageUrl: await signLogo(p.image_url),
          createdAt: p.created_at,
        })),
      ),
      Promise.all(
        cheapest.map(async (c) => ({
          ...c,
          imageUrl: await signLogo(c.imageUrl),
        })),
      ),
    ]);

    const result: HomeShowcase = {
      establishments: estSigned,
      products: prodSigned,
      cheapest: cheapestSigned,
    };
    cached = { at: now, data: result };
    return result;
  },
);
