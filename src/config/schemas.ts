import { z } from "zod";

/**
 * Common Zod schemas used across the application to ensure consistency
 * in validation and types.
 */

export const PaginationSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(10),
  offset: z.number().int().min(0).optional().default(0),
});

export const SearchQuerySchema = z.object({
  q: z.string().trim().min(1, "O termo de busca não pode estar vazio"),
});

export const StoreIdSchema = z.object({
  storeId: z.string().uuid("ID de estabelecimento inválido"),
});

export const ProductIdSchema = z.object({
  productId: z.string().uuid("ID de produto inválido"),
});
