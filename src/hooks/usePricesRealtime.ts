import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Assina mudanças de preço em tempo real (`scans` e `product_comparison_cache`)
 * e dispara um callback agrupado por lotes.
 *
 * Estratégia de coalescência:
 * - **leading**: o primeiro evento após um período de silêncio dispara imediato
 *   (UI reage rápido a uma mudança isolada).
 * - **debounce trailing**: eventos subsequentes reiniciam um timer curto para
 *   agrupar rajadas — só um flush no fim.
 * - **maxWait**: mesmo em rajadas contínuas (ex.: importação em massa), o
 *   callback dispara ao menos a cada `maxWaitMs`, evitando starvation.
 * - **batchCount**: número de eventos acumulados desde o último flush; útil
 *   para o consumidor decidir animações mais discretas em lotes grandes.
 *
 * O canal é criado uma vez por montagem; timers e subscrição são liberados
 * no unmount (sem vazamentos nem reconexões em loop).
 */
export function usePricesRealtime(
  onChange: (info: { batchCount: number; reason: "leading" | "trailing" | "maxwait" }) => void | (() => void),
  opts?: { enabled?: boolean; debounceMs?: number; maxWaitMs?: number },
) {
  const enabled = opts?.enabled ?? true;
  const debounceMs = opts?.debounceMs ?? 800;
  const maxWaitMs = opts?.maxWaitMs ?? 4000;

  // Ref evita recriar a subscrição a cada render quando o callback muda de
  // identidade (padrão comum ao usar closures no consumidor).
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let debounceTimer: number | null = null;
    let maxWaitTimer: number | null = null;
    let firstEventAt = 0;
    let pending = 0;
    let sawLeading = false;

    const flush = (reason: "leading" | "trailing" | "maxwait") => {
      const batchCount = pending;
      pending = 0;
      firstEventAt = 0;
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      if (maxWaitTimer !== null) {
        window.clearTimeout(maxWaitTimer);
        maxWaitTimer = null;
      }
      // batchCount é 0 apenas no leading imediato (que roda antes do incremento
      // trailing) — normalizamos para pelo menos 1 evento.
      cbRef.current({ batchCount: Math.max(1, batchCount), reason });
    };

    const schedule = () => {
      pending += 1;

      // Leading edge: primeira ocorrência após silêncio → resposta instantânea.
      if (!sawLeading) {
        sawLeading = true;
        firstEventAt = Date.now();
        // Reseta a "janela de leading" após uma pausa maior que maxWaitMs.
        window.setTimeout(() => {
          sawLeading = false;
        }, maxWaitMs);
        flush("leading");
        return;
      }

      if (firstEventAt === 0) firstEventAt = Date.now();

      // Debounce trailing: reagrupa até o silêncio de `debounceMs`.
      if (debounceTimer !== null) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => flush("trailing"), debounceMs);

      // MaxWait: garante um flush ao menos a cada `maxWaitMs` mesmo em rajada.
      if (maxWaitTimer === null) {
        const elapsed = Date.now() - firstEventAt;
        const remaining = Math.max(0, maxWaitMs - elapsed);
        maxWaitTimer = window.setTimeout(() => flush("maxwait"), remaining);
      }
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
      if (debounceTimer !== null) window.clearTimeout(debounceTimer);
      if (maxWaitTimer !== null) window.clearTimeout(maxWaitTimer);
      supabase.removeChannel(channel);
    };
  }, [enabled, debounceMs, maxWaitMs]);
}
