import { useEffect, useRef } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to changes on `public.license_plans` and invalidate all
 * plan-related React Query caches so every surface (admin, /planos,
 * checkout, /assinar, /admin/gestao) reflects updates in real time.
 */
export function usePlansRealtime(opts?: { enabled?: boolean; throttleMs?: number; queryClient?: QueryClient }) {
  const enabled = opts?.enabled ?? true;
  const throttleMs = opts?.throttleMs ?? 500;
  // Fall back to context only when no explicit client is provided.
  // This lets callers use the hook OUTSIDE a QueryClientProvider by
  // passing the client directly (e.g. from route context during SSR).
  const ctxQc = opts?.queryClient ? null : useQueryClient();
  const qc = opts?.queryClient ?? (ctxQc as QueryClient);
  const qcRef = useRef(qc);
  qcRef.current = qc;


  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let timer: number | null = null;
    const invalidateAll = () => {
      const client = qcRef.current;
      // Cover every known plan cache key in the codebase.
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
