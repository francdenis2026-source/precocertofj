/**
 * Hook global (cache 5min) que carrega todos os overrides de ícone de categoria
 * cadastrados pelo admin. Retorna um Map slug → override.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CategoryIconOverride } from "@/lib/category-icons.functions";

export function useCategoryIconOverrides() {
  return useQuery({
    queryKey: ["category-icon-overrides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_icon_overrides")
        .select("slug, kind, value, updated_at");
      if (error) throw error;
      const map = new Map<string, CategoryIconOverride>();
      for (const row of (data ?? []) as CategoryIconOverride[]) {
        map.set(row.slug, row);
      }
      return map;
    },
    staleTime: 5 * 60_000,
  });
}
