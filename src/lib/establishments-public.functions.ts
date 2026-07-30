import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { CATEGORY_LABELS } from "@/lib/product-category";

export type EstablishmentStat = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  logoUrl: string | null;
  brandColor: string | null;
  kind: string | null;
  productsCount: number;
  topCategories: Array<{ category: string; count: number }>;
  lastUpdate: string | null;
  maxSavings: number;
  minPrice: number | null;
};

export type EstablishmentsOverview = {
  totalEstablishments: number;
  totalProducts: number;
  totalCategories: number;
  totalMaxSavings: number;
  topGlobalCategories: Array<{ category: string; count: number }>;
  items: EstablishmentStat[];
};

export const humanizeCategory = (c: string): string => CATEGORY_LABELS[c] ?? c;

const EMPTY: EstablishmentsOverview = {
  totalEstablishments: 0,
  totalProducts: 0,
  totalCategories: 0,
  totalMaxSavings: 0,
  topGlobalCategories: [],
  items: [],
};

/**
 * Dados públicos (RLS como `anon`): toda a agregação roda em uma única query
 * no banco (`establishments_overview`) em vez de baixar ~3k linhas de `scans`
 * e agregar em JS a cada requisição.
 */
export const listPublicEstablishments = createServerFn({ method: "GET" }).handler(
  async (): Promise<EstablishmentsOverview> => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return EMPTY;

    const supabase = createClient(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.rpc("establishments_overview");
    if (error) throw new Error(error.message);

    const raw = (data ?? {}) as Partial<EstablishmentsOverview>;
    return {
      totalEstablishments: raw.totalEstablishments ?? 0,
      totalProducts: raw.totalProducts ?? 0,
      totalCategories: raw.totalCategories ?? 0,
      totalMaxSavings: raw.totalMaxSavings ?? 0,
      topGlobalCategories: raw.topGlobalCategories ?? [],
      items: (raw.items ?? []).map((i) => ({
        ...i,
        productsCount: Number(i.productsCount ?? 0),
        maxSavings: Number(i.maxSavings ?? 0),
        minPrice: i.minPrice === null || i.minPrice === undefined ? null : Number(i.minPrice),
      })),
    };
  },
);
