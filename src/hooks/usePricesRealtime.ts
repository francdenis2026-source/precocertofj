import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Assina as mudanças de preço em tempo real (tabelas `scans` e
 * `product_comparison_cache`) e dispara um callback quando algo muda.
 *
 * - O callback é agrupado (throttle) para evitar rajadas quando uma importação
 *   insere dezenas de preços de uma vez.
 * - O canal é criado uma única vez e removido no unmount (evita vazamento de
 *   subscrições e reconexões em loop).
 */
export function usePricesRealtime(
  onChange: () => void,
  opts?: { enabled?: boolean; throttleMs?: number },
) {
  const enabled = opts?.enabled ?? true;
  const throttleMs = opts?.throttleMs ?? 2000;
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

    const channel = supabase
      .channel("precos-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "scans" }, schedule)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_comparison_cache" },
        schedule,
      )
      .subscribe();

    return () => {
      if (timer !== null) window.clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [enabled, throttleMs]);
}
