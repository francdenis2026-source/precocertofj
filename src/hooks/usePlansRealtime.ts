import { useEffect, useRef } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to changes on `public.license_plans` and invalidate all
 * plan-related React Query caches so every surface (admin, /planos,
 * checkout, /assinar, /admin/gestao) reflects updates in real time.
 */
export function usePlansRealtime(opts: { queryClient: QueryClient; enabled?: boolean; throttleMs?: number }) {
  const { queryClient: qc, enabled = true, throttleMs = 500 } = opts;
  const qcRef = useRef(qc);
  qcRef.current = qc;




  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let timer: number | null = null;
    const invalidateAll = () => {
      const client = qcRef.current;
      if (!client) return;
      client.invalidateQueries({ queryKey: ["public-plans"] });
      client.invalidateQueries({ queryKey: ["plans-active"] });
      client.invalidateQueries({ queryKey: ["license-plans"] });
      client.invalidateQueries({ queryKey: ["admin", "plans"] });
      client.invalidateQueries({ queryKey: ["admin", "plans", "health"] });
      client.invalidateQueries({ queryKey: ["active-plan"] });
    };

    const schedule = () => {
      if (timer !== null) return;
      timer = window.setTimeout(() => {
        timer = null;
        invalidateAll();
      }, throttleMs);
    };

    const channel = supabase
      .channel(`plans-realtime-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "license_plans" },
        schedule,
      )
      .subscribe();

    return () => {
      if (timer !== null) window.clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [enabled, throttleMs]);
}
