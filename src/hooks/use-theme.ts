import { useEffect, useState, useCallback, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  getMyThemePreference,
  updateMyThemePreference,
  type ThemePreference,
} from "@/lib/theme.functions";

export type Theme = ThemePreference; // "light" | "dark"
const STORAGE_KEY = "pc-theme";

function resolveIsDark(mode: Theme): boolean {
  if (mode === "dark") return true;
  return false;
}

function apply(mode: Theme) {
  if (typeof document === "undefined") return;
  const isDark = resolveIsDark(mode);
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.dataset.theme = isDark ? "dark" : "light";
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
}

function readStored(): Theme {
  if (typeof window === "undefined") return "light";
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === "dark" ? "dark" : "light";
}

function writeStored(theme: Theme) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, theme);
}

function notifyThemeChange(theme: Theme) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<Theme>("pc-theme-change", { detail: theme }));
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

  // Boot local: aplica preferência salva no navegador antes de qualquer sync remoto.
  useEffect(() => {
    const initial = readStored();
    setThemeState(initial);
    apply(initial);
    setMounted(true);

    const syncFromBrowser = (nextTheme?: Theme) => {
      const next = nextTheme ?? readStored();
      setThemeState(next);
      apply(next);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) syncFromBrowser();
    };
    const onCustomChange = (event: Event) => {
      const next = event instanceof CustomEvent ? event.detail : undefined;
      syncFromBrowser(next === "dark" ? "dark" : "light");
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("pc-theme-change", onCustomChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pc-theme-change", onCustomChange);
    };
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
        const remote: Theme = res?.theme === "dark" ? "dark" : "light";
        hasHydratedFromRemoteRef.current = true;
        if (remote !== readStored()) {
          writeStored(remote);
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
        writeStored(t);
      } catch {
        /* ignore */
      }
      setThemeState(t);
      apply(t);
      notifyThemeChange(t);
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
    // Alterna binário usando o estado aplicado no DOM para evitar closures antigas.
    const isDark = typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : resolveIsDark(theme);
    setTheme(isDark ? "light" : "dark");
  }, [theme, setTheme]);

  const isDark = mounted && resolveIsDark(theme);
  return { theme, setTheme, toggle, mounted, isDark };
}
