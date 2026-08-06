import { createServerFn } from "@tanstack/react-start";

export function slugifyEstablishment(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " e ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type EstablishmentBySlug = {
  id: string;
  name: string;
  slug: string;
};

export const resolveEstablishmentBySlug = createServerFn({ method: "GET" })
  .validator((input: { slug: string }) => {
    if (!input.slug?.trim()) throw new Error("slug obrigatório");
    return { slug: input.slug.trim().toLowerCase() };
  })
  .handler(async ({ data }): Promise<EstablishmentBySlug | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const client = supabaseAdmin as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (c: string, v: unknown) => Promise<{
            data: Array<{ id: string; name: string }> | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
    const { data: rows, error } = await client
      .from("establishments")
      .select("id, name")
      .eq("active", true);
    if (error) throw new Error(error.message);
    const match = (rows ?? []).find((r) => slugifyEstablishment(r.name) === data.slug);
    if (!match) return null;
    return { id: match.id, name: match.name, slug: data.slug };
  });
