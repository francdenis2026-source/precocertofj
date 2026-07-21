import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Preferências leves de UI persistidas em profiles.ui_prefs (jsonb).
 * Servem para sincronizar toggles do usuário entre dispositivos —
 * complementam (não substituem) o localStorage.
 */
export type UiPrefs = {
  homeOnlyRegistered?: boolean;
};

export const getMyUiPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UiPrefs> => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("ui_prefs")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const raw = (data?.ui_prefs ?? {}) as Record<string, unknown>;
    return {
      homeOnlyRegistered:
        typeof raw.homeOnlyRegistered === "boolean"
          ? raw.homeOnlyRegistered
          : undefined,
    };
  });

export const updateMyUiPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Partial<UiPrefs>) => {
    const out: Partial<UiPrefs> = {};
    if (typeof input?.homeOnlyRegistered === "boolean") {
      out.homeOnlyRegistered = input.homeOnlyRegistered;
    }
    return out;
  })
  .handler(async ({ data, context }): Promise<UiPrefs> => {
    const { data: current, error: readErr } = await context.supabase
      .from("profiles")
      .select("ui_prefs")
      .eq("id", context.userId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    const merged = {
      ...((current?.ui_prefs as Record<string, unknown> | null) ?? {}),
      ...data,
    };
    const { error } = await context.supabase
      .from("profiles")
      .update({ ui_prefs: merged })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return merged as UiPrefs;
  });
