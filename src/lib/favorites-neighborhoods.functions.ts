import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type FavoriteNeighborhood = {
  id: string;
  key: string;
  name: string;
  city: string | null;
};

/** Lista os bairros favoritos do usuário logado. */
export const listFavoriteNeighborhoods = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FavoriteNeighborhood[]> => {
    const { data, error } = await context.supabase
      .from("favorite_neighborhoods")
      .select("id, neighborhood_key, neighborhood_name, city")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id as string,
      key: r.neighborhood_key as string,
      name: r.neighborhood_name as string,
      city: (r.city as string | null) ?? null,
    }));
  });

const toggleSchema = z.object({
  key: z.string().min(1).max(120),
  name: z.string().min(1).max(120),
  city: z.string().max(120).nullable().optional(),
});

/** Adiciona/remove um bairro favorito. Retorna o novo estado. */
export const toggleFavoriteNeighborhood = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => toggleSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ favored: boolean }> => {
    const { supabase, userId } = context;

    const { data: existing } = await supabase
      .from("favorite_neighborhoods")
      .select("id")
      .eq("user_id", userId)
      .eq("neighborhood_key", data.key)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("favorite_neighborhoods")
        .delete()
        .eq("id", existing.id as string);
      if (error) throw new Error(error.message);
      return { favored: false };
    }

    const { error } = await supabase.from("favorite_neighborhoods").insert({
      user_id: userId,
      neighborhood_key: data.key,
      neighborhood_name: data.name,
      city: data.city ?? null,
    });
    if (error) throw new Error(error.message);
    return { favored: true };
  });
