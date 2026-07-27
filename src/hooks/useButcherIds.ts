import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * IDs dos estabelecimentos classificados como açougue.
 * Compartilhado entre /comparador, /melhores-precos e outras listagens que
 * precisam aplicar a regra de "só cortes em açougue".
 */
export function useButcherIds(): ReadonlySet<string> {
  const q = useQuery({
    queryKey: ["butcher-establishment-ids"],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("establishments")
        .select("id")
        .eq("kind", "acougue")
        .eq("active", true);
      if (error) throw error;
      return (data ?? []).map((r) => r.id as string);
    },
    staleTime: 30 * 60_000,
  });
  return useMemo(() => new Set(q.data ?? []), [q.data]);
}
