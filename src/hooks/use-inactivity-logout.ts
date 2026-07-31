import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "./useSession";
import { useMyRoles } from "./useMyRoles";

/**
 * Detecta inatividade do usuário e desloga automaticamente.
 *
 * - Admin: 10 min de inatividade -> logout, com aviso 60s antes.
 * - Cliente logado: 30 min de inatividade -> logout, com aviso 60s antes.
 * - Sincroniza atividade entre abas via BroadcastChannel.
 * - Ignorado quando não há sessão.
 */
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "wheel"] as const;
const WARN_BEFORE_MS = 60_000; // aviso 60s antes
const CHANNEL_NAME = "pc-user-activity";

export function useInactivityLogout() {
  const { session } = useSession();
  const { isAdmin } = useMyRoles();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isAdminArea = pathname.startsWith("/admin");
  // Timeout mais estrito quando o usuário é admin ou está navegando na área admin.
  const timeoutMs = isAdmin || isAdminArea ? 10 * 60_000 : 30 * 60_000;

  const [warning, setWarning] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const warnTimerRef = useRef<number | null>(null);
  const logoutTimerRef = useRef<number | null>(null);
  const bcRef = useRef<BroadcastChannel | null>(null);
  const toastIdRef = useRef<string | number | null>(null);

  const clearTimers = useCallback(() => {
    if (warnTimerRef.current !== null) window.clearTimeout(warnTimerRef.current);
    if (logoutTimerRef.current !== null) window.clearTimeout(logoutTimerRef.current);
    warnTimerRef.current = null;
    logoutTimerRef.current = null;
  }, []);

  const doLogout = useCallback(async () => {
    clearTimers();
    if (toastIdRef.current !== null) toast.dismiss(toastIdRef.current);
    toastIdRef.current = null;
    try {
      await qc.cancelQueries();
      qc.clear();
      await supabase.auth.signOut();
    } catch (err) {
      console.error("[inactivity-logout]", err);
    }
    navigate({ to: "/", replace: true });
    toast.warning("Sessão encerrada por inatividade.", {
      description: isAdmin || isAdminArea
        ? "Áreas administrativas exigem presença ativa."
        : "Faça login novamente para continuar.",
    });
  }, [qc, navigate, isAdmin, isAdminArea, clearTimers]);

  const scheduleTimers = useCallback(() => {
    clearTimers();
    setWarning(false);
    if (toastIdRef.current !== null) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
    warnTimerRef.current = window.setTimeout(() => {
      setWarning(true);
      toastIdRef.current = toast.warning("Você ainda está aí?", {
        description: "Sua sessão será encerrada em 1 minuto por inatividade.",
        duration: WARN_BEFORE_MS,
        action: {
          label: "Continuar",
          onClick: () => {
            lastActivityRef.current = Date.now();
            bcRef.current?.postMessage({ t: Date.now() });
            scheduleTimers();
          },
        },
      });
    }, Math.max(0, timeoutMs - WARN_BEFORE_MS));
    logoutTimerRef.current = window.setTimeout(() => {
      void doLogout();
    }, timeoutMs);
  }, [timeoutMs, doLogout, clearTimers]);

  /**
   * Throttle de atividade.
   *
   * `mousemove`, `scroll` e `wheel` disparam dezenas de vezes por segundo.
   * Sem throttle, cada evento reagendava dois timers, publicava no
   * BroadcastChannel e chamava `setWarning(false)` — um setState que
   * re-renderizava o AppShell inteiro (sidebar + conteúdo). Era essa
   * tempestade de renders que travava a navegação do painel.
   *
   * Agora só reagendamos a cada 20s de atividade contínua (ou imediatamente
   * quando o aviso de expiração está na tela).
   */
  const ACTIVITY_THROTTLE_MS = 20_000;

  const markActive = useCallback(
    (broadcast = true) => {
      const now = Date.now();
      if (!warningRef.current && now - lastActivityRef.current < ACTIVITY_THROTTLE_MS) return;
      lastActivityRef.current = now;
      scheduleTimers();
      if (broadcast) bcRef.current?.postMessage({ t: lastActivityRef.current });
    },
    [scheduleTimers],
  );


  useEffect(() => {
    if (!session) {
      clearTimers();
      setWarning(false);
      return;
    }

    // Broadcast entre abas: qualquer atividade em uma aba reseta as outras.
    if (typeof BroadcastChannel !== "undefined") {
      bcRef.current = new BroadcastChannel(CHANNEL_NAME);
      bcRef.current.onmessage = (evt) => {
        const t = Number(evt.data?.t ?? 0);
        if (t > lastActivityRef.current) {
          lastActivityRef.current = t;
          scheduleTimers();
        }
      };
    }

    const handler = () => markActive(true);
    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, handler, { passive: true });
    }
    const visHandler = () => {
      if (document.visibilityState === "visible") markActive(true);
    };
    document.addEventListener("visibilitychange", visHandler);

    scheduleTimers();

    return () => {
      for (const evt of ACTIVITY_EVENTS) window.removeEventListener(evt, handler);
      document.removeEventListener("visibilitychange", visHandler);
      clearTimers();
      bcRef.current?.close();
      bcRef.current = null;
      if (toastIdRef.current !== null) toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, timeoutMs]);

  return { warning, timeoutMs };
}
