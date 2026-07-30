import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Escuta em tempo real a tabela agregada `search_trends` e invalida a query
 * das "Buscas em alta" sempre que um termo é buscado por qualquer cliente.
 */
export function useSearchTrendsRealtime(queryKey: unknown[] = ["home-trending-searches"]) {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("search-trends-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "search_trends" },
        () => {
          qc.invalidateQueries({ queryKey });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qc, JSON.stringify(queryKey)]);
}
