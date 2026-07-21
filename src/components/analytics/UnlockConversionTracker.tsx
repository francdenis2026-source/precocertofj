import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics-events";
import { consumePendingUnlock } from "@/lib/analytics-events";

/**
 * Escuta o evento SIGNED_IN do Supabase. Se houver uma intenção pendente de
 * "desbloquear" gravada em sessionStorage (pelo LockOverlay), registra um
 * evento `unlock_conversion` com a rota de origem e o session_id, permitindo
 * calcular taxa de conversão desde o clique até o login.
 */
export function UnlockConversionTracker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    let sub: { unsubscribe: () => void } | null = null;
    let cancelled = false;

    import("@/integrations/supabase/client").then(({ supabase }) => {
      if (cancelled) return;
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event !== "SIGNED_IN") return;
        const pending = consumePendingUnlock();
        if (!pending) return;
        const elapsed = Date.now() - pending.at;
        trackEvent("unlock_conversion", {
          route: pending.route,
          origin_event: pending.event,
          elapsed_ms: elapsed,
          user_id: session?.user?.id,
        });
      });
      sub = data.subscription;
    });

    return () => {
      cancelled = true;
      sub?.unsubscribe();
    };
  }, []);

  return null;
}
