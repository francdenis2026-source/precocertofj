/**
 * Rótulos de categoria com overrides do admin.
 *
 * A fonte canônica continua sendo `CATEGORY_LABELS` (src/lib/product-category.ts).
 * Quando o admin salva um rótulo customizado em `category_icon_overrides.label`,
 * ele passa a ter prioridade na exibição.
 */
import { useCallback } from "react";
import { categoryLabel } from "@/lib/product-category";
import { useCategoryIconOverrides } from "./use-category-icon-overrides";

/**
 * Retorna uma função estável `labelFor(slug)` que resolve o rótulo final.
 * Enquanto os overrides carregam, devolve o rótulo canônico (sem flicker de vazio).
 */
export function useCategoryLabelResolver(): (slug: string) => string {
  const { data } = useCategoryIconOverrides();
  return useCallback(
    (slug: string) => {
      const custom = data?.get(slug)?.label;
      if (typeof custom === "string" && custom.trim()) return custom.trim();
      return categoryLabel(slug);
    },
    [data],
  );
}

/**
 * Variante para taxonomias que possuem rótulo local próprio (ex.: nichos da
 * home e de `/categoria/:slug`). O override do admin tem prioridade; sem
 * override, mantém o rótulo local informado (nunca o canônico de produto).
 */
export function useCategoryLabelWithFallback(): (
  slug: string,
  fallback: string,
) => string {
  const { data } = useCategoryIconOverrides();
  return useCallback(
    (slug: string, fallback: string) => {
      const custom = data?.get(slug)?.label;
      if (typeof custom === "string" && custom.trim()) return custom.trim();
      return fallback;
    },
    [data],
  );
}
