import { createServerFn } from "@tanstack/react-start";
import type { MatchReason, SearchMode } from "@/lib/search-tokens";
import { performPriceSearch } from "@/lib/price-search.server";

export type PriceSearchMarket = {
  marketName: string;
  marketKind: string | null;
  marketLogoUrl: string | null;
  marketBrandColor: string | null;
  establishmentId: string | null;
  priceAvg: number;
  priceMin: number;
  samples: number;
  lastSeen: string;
};

export type PriceSuggestion = {
  id: string;
  displayName: string;
  brand: string | null;
  category: string | null;
  imageUrl: string | null;
  matchReasons: MatchReason[];
};

export type ProductPricePoint = {
  marketName: string;
  marketKind: string | null;
  marketLogoUrl: string | null;
  marketBrandColor: string | null;
  establishmentId: string | null;
  price: number;
  when: string;
};

export type ProductGroup = {
  catalogId: string | null;
  productName: string;
  samples: number;
  min: number;
  avg: number;
  max: number;
  lastSeen: string;
  prices: ProductPricePoint[];
  matchReasons: MatchReason[];
};

export type PriceSearchResult = {
  query: string;
  mode: SearchMode;
  tokens: string[];
  samples: number;
  avg: number | null;
  min: number | null;
  max: number | null;
  cheapest: {
    marketName: string;
    marketLogoUrl: string | null;
    marketBrandColor: string | null;
    price: number;
    when: string;
    productName: string | null;
  } | null;
  markets: PriceSearchMarket[];
  groups: ProductGroup[];
  recent: Array<{
    productName: string;
    price: number;
    marketName: string | null;
    when: string;
  }>;
  suggestions: PriceSuggestion[];
  didYouMean: string | null;
  canonicalGroup: string | null;
  excludedByPureFilter: number;
};

export const searchProductPrice = createServerFn({ method: "POST" })
  .inputValidator((input: { query: string; mode?: SearchMode; pureOnly?: boolean }) => {
    const q = (input?.query ?? "").trim();
    if (q.length < 2) throw new Error("Digite ao menos 2 caracteres");
    if (q.length > 80) throw new Error("Busca muito longa");
    const mode: SearchMode = input?.mode === "loose" ? "loose" : "strict";
    const pureOnly = Boolean(input?.pureOnly);
    return { query: q, mode, pureOnly };
  })
  .handler(async ({ data }): Promise<PriceSearchResult> => performPriceSearch(data));