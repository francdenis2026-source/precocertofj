import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMyRoles } from "@/hooks/useMyRoles";
import { signOut } from "@/hooks/useSession";

/**
 * Faz logout automático após período de inatividade do usuário.
 * - Usuário comum: 30 min
 * - Administrador: 15 min (mais restritivo por segurança)
 *
 * Considera "atividade": mouse, teclado, toque, scroll, foco de aba.
 * Persiste o último timestamp de atividade em `localStorage` para
 * detectar inatividade mesmo com a aba em segundo plano.
 */

const STORAGE_KEY = "pc:last-activity";
const USER_TIMEOUT_MS = 30 * 60 * 1000;
const ADMIN_TIMEOUT_MS = 15 * 60 * 1000;
const CHECK_INTERVAL_MS = 30_000;
const WARN_BEFORE_MS = 60_000; // avisa 1 min antes

export function IdleLogoutMonitor() {
  const { user, isAdmin } = useMyRoles();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const warnedRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    if (typeof window === "undefined") return;

    const timeoutMs = isAdmin ? ADMIN_TIMEOUT_MS : USER_TIMEOUT_MS;

    const markActive = () => {
      try {
        window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
      warnedRef.current = false;
    };

    // Marca atividade inicial
    markActive();

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "focus",
    ];

    let lastMark = 0;
    const throttledMark = () => {
      const now = Date.now();
      // throttle: 1x a cada 5s é suficiente
      if (now - lastMark < 5000) return;
      lastMark = now;
      markActive();
    };

    events.forEach((ev) => window.addEventListener(ev, throttledMark, { passive: true }));

    const doLogout = async (reason: string) => {
      try {
        await qc.cancelQueries();
        qc.clear();
        await signOut();
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
        toast.info(reason);
        navigate({ to: "/auth", replace: true });
      } catch (err) {
        console.error("Idle logout failed", err);
      }
    };

    const check = async () => {
      let last = 0;
      try {
        last = Number(window.localStorage.getItem(STORAGE_KEY) ?? 0);
      } catch {
        /* ignore */
      }
      if (!last) return;
      const idle = Date.now() - last;

      if (idle >= timeoutMs) {
        // Confirma no servidor que ainda há sessão antes de mostrar toast
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          await doLogout(
            isAdmin
              ? "Sessão administrativa encerrada por inatividade."
              : "Você foi desconectado por inatividade.",
          );
        }
        return;
      }
      if (
        !warnedRef.current
        && idle >= timeoutMs - WARN_BEFORE_MS
        && idle < timeoutMs
      ) {
        warnedRef.current = true;
        toast.warning("Sua sessão vai expirar em breve por inatividade. Mexa o mouse para continuar conectado.");
      }
    };

    const interval = window.setInterval(check, CHECK_INTERVAL_MS);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, throttledMark));
      window.clearInterval(interval);
    };
  }, [user, isAdmin, navigate, qc]);

  return null;
}
