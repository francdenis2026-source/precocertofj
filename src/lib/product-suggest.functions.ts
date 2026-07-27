import { createServerFn } from "@tanstack/react-start";
import type { ProductSuggestion } from "@/lib/product-suggest.server";

export type { ProductSuggestion };

/**
 * Lightweight autocomplete for the product search input.
 * Uses the existing `search_catalog_suggestions` Postgres function which is
 * accent-insensitive (unaccent) and matches by name/brand/category tokens,
 * so "cafe" ↔ "café" and "aca" ↔ "açaí" both work. When no strict match is
 * found, it falls back to a trigram (pg_trgm) similarity search and marks
 * those rows with `isFuzzy = true` so the UI can render a "Você quis dizer …?"
 * confirmation hint. As respostas ficam em cache curto no servidor.
 */
export const suggestProducts = createServerFn({ method: "POST" })
  .inputValidator((input: { query: string }) => {
    const q = String(input?.query ?? "").trim().slice(0, 80);
    return { query: q };
  })
  .handler(async ({ data }): Promise<ProductSuggestion[]> => {
    const { performSuggest } = await import("@/lib/product-suggest.server");
    return performSuggest(data.query);
  });
