/**
 * Telemetria de performance percebida.
 *
 * Mede o tempo entre a exibição do skeleton e a primeira renderização de
 * conteúdo (lista/ranking/matriz) nas rotas de comparação, para validar as
 * melhorias de UX percebida.
 *
 * Regras:
 *  - Executa apenas no cliente (SSR-safe).
 *  - Emite um evento por transição loading→ready (dedupe por sessão + route).
 *  - Latência = performance.now() no primeiro isReady=true após isLoading=true.
 *  - Falha silenciosa: nunca impacta a UX.
 */

import { useEffect, useRef } from "react";
import { trackEvent, type AnalyticsEvent } from "@/lib/analytics-events";

type Args = {
  /** Identificador da rota/painel — usado como `route` do evento. */
  route: string;
  /** true enquanto o skeleton está sendo exibido. */
  isLoading: boolean;
  /** true quando a primeira lista/ranking já pode ser renderizada. */
  isReady: boolean;
  /** Bytes/linhas úteis renderizados (opcional — vira meta.count). */
  count?: number | null;
};

/**
 * Hook: registra `perf_skeleton_shown` no primeiro loading e
 * `perf_first_content` quando o conteúdo aparece pela primeira vez.
 */
export function usePerceivedPerfTelemetry({ route, isLoading, isReady, count }: Args): void {
  const shownAtRef = useRef<number | null>(null);
  const emittedShownRef = useRef(false);
  const emittedReadyRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const now =
      typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now()
        : Date.now();

    // 1) Skeleton apareceu — marca t0 e emite o evento uma vez.
    if (isLoading && shownAtRef.current == null) {
      shownAtRef.current = now;
      if (!emittedShownRef.current) {
        emittedShownRef.current = true;
        trackEvent("perf_skeleton_shown" as AnalyticsEvent, { route });
      }
      return;
    }

    // 2) Conteúdo pronto pela primeira vez → mede latência.
    if (isReady && !emittedReadyRef.current) {
      emittedReadyRef.current = true;
      const t0 = shownAtRef.current;
      const dt = t0 == null ? null : Math.max(0, Math.round(now - t0));
      trackEvent("perf_first_content" as AnalyticsEvent, {
        route,
        ms: dt ?? -1,
        had_skeleton: t0 != null,
        count: count ?? null,
      });
    }
  }, [route, isLoading, isReady, count]);
}
