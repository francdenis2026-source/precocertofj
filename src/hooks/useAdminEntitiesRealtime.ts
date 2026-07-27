import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Assina em tempo real as tabelas administrativas (`establishments`,
 * `product_catalog` e `profiles`) e chama `onChange` de forma agrupada
 * (throttle) quando qualquer uma delas mudar. Um único canal por
 * componente — removido no unmount para evitar vazamento.
 */
export function useAdminEntitiesRealtime(
  onChange: () => void,
  opts?: {
    enabled?: boolean;
    throttleMs?: number;
    tables?: Array<"establishments" | "product_catalog" | "profiles">;
  },
) {
  const enabled = opts?.enabled ?? true;
  const throttleMs = opts?.throttleMs ?? 1500;
  const tables = opts?.tables ?? ["establishments", "product_catalog", "profiles"];
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let timer: number | null = null;
    const schedule = () => {
      if (timer !== null) return;
      timer = window.setTimeout(() => {
        timer = null;
        cbRef.current();
      }, throttleMs);
    };

    let ch = supabase.channel("admin-entities-realtime");
    for (const t of tables) {
      ch = ch.on(
        "postgres_changes",
        { event: "*", schema: "public", table: t },
        schedule,
      );
    }
    ch.subscribe();

    return () => {
      if (timer !== null) window.clearTimeout(timer);
      supabase.removeChannel(ch);
    };
  }, [enabled, throttleMs, tables.join(",")]);
}
