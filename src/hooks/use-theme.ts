import { useEffect, useState, useCallback, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  getMyThemePreference,
  updateMyThemePreference,
  type ThemePreference,
} from "@/lib/theme.functions";

export type Theme = ThemePreference; // "light" | "dark" | "system"
const STORAGE_KEY = "pc-theme";

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveIsDark(mode: Theme): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return systemPrefersDark();
}

function apply(mode: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", resolveIsDark(mode));
}

function readStored(): Theme {
  if (typeof window === "undefined") return "light";
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === "dark" || raw === "system" ? raw : "light";
}

/**
 * Hook único de tema.
 * - Padrão: modo claro.
 * - Modos: 'light' | 'dark' | 'system'.
 * - Persistência local: `localStorage["pc-theme"]`.
 * - Persistência remota: `profiles.theme_preference` quando o usuário está
 *   logado, sincronizada nas duas direções via server functions.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  const fetchRemote = useServerFn(getMyThemePreference);
  const pushRemote = useServerFn(updateMyThemePreference);
  const hasHydratedFromRemoteRef = useRef(false);

  // Boot local: aplica preferência salva no navegador e escuta mudanças do sistema.
  useEffect(() => {
    const initial = readStored();
    setThemeState(initial);
    apply(initial);
    setMounted(true);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      const current = readStored();
      if (current === "system") apply("system");
    };
    mq.addEventListener("change", onSystemChange);
    return () => mq.removeEventListener("change", onSystemChange);
  }, []);

  // Boot remoto: quando o usuário estiver logado, puxa preferência do perfil.
  // A preferência do servidor vence sobre a local (segue o usuário entre dispositivos).
  useEffect(() => {
    let cancelled = false;
    async function pull() {
      try {
        const { data: sessionRes } = await supabase.auth.getSession();
        if (!sessionRes.session) return;
        const res = await fetchRemote();
        if (cancelled) return;
        const remote = res?.theme ?? "light";
        hasHydratedFromRemoteRef.current = true;
        if (remote !== readStored()) {
          window.localStorage.setItem(STORAGE_KEY, remote);
        }
        setThemeState(remote);
        apply(remote);
      } catch {
        /* usuário deslogado ou sem perfil — ignora silenciosamente */
      }
    }
    void pull();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED") void pull();
      if (event === "SIGNED_OUT") hasHydratedFromRemoteRef.current = false;
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [fetchRemote]);

  const setTheme = useCallback(
    (t: Theme) => {
      try {
        localStorage.setItem(STORAGE_KEY, t);
      } catch {
        /* ignore */
      }
      setThemeState(t);
      apply(t);
      // Persiste no backend (silencioso). Só tenta se houver sessão.
      void (async () => {
        try {
          const { data } = await supabase.auth.getSession();
          if (!data.session) return;
          await pushRemote({ data: { theme: t } });
        } catch {
          /* silencioso — preferência local já foi salva */
        }
      })();
    },
    [pushRemote],
  );

  const toggle = useCallback(() => {
    // Alterna binário respeitando resolução do sistema.
    const isDark = resolveIsDark(theme);
    setTheme(isDark ? "light" : "dark");
  }, [theme, setTheme]);

  const isDark = mounted && resolveIsDark(theme);
  return { theme, setTheme, toggle, mounted, isDark };
}
