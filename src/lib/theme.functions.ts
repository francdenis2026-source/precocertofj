/**
 * Preferência de tema (claro/escuro/sistema) sincronizada com o perfil.
 * Padrão: 'light'. Persiste em `profiles.theme_preference` para acompanhar
 * o usuário entre dispositivos/navegadores.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ThemePreference = "light" | "dark" | "system";

function normalize(value: unknown): ThemePreference {
  return value === "dark" || value === "system" ? value : "light";
}

export const getMyThemePreference = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("theme_preference")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { theme: normalize(data?.theme_preference) };
  });

export const updateMyThemePreference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { theme: ThemePreference }) => {
    const theme = normalize(input?.theme);
    return { theme };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ theme_preference: data.theme })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { theme: data.theme };
  });
