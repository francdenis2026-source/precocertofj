import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listFavoriteEstablishments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("favorite_establishments")
      .select("establishment_id")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => r.establishment_id as string);
  });

export const toggleFavoriteEstablishment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { establishmentId: string }) => {
    if (!input || typeof input.establishmentId !== "string") {
      throw new Error("establishmentId is required");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: existing, error: selErr } = await context.supabase
      .from("favorite_establishments")
      .select("id")
      .eq("user_id", context.userId)
      .eq("establishment_id", data.establishmentId)
      .maybeSingle();
    if (selErr) throw new Error(selErr.message);

    if (existing) {
      const { error: delErr } = await context.supabase
        .from("favorite_establishments")
        .delete()
        .eq("id", existing.id);
      if (delErr) throw new Error(delErr.message);
      return { isFavorite: false };
    }

    const { error: insErr } = await context.supabase
      .from("favorite_establishments")
      .insert({
        user_id: context.userId,
        establishment_id: data.establishmentId,
      });
    if (insErr) throw new Error(insErr.message);
    return { isFavorite: true };
  });
