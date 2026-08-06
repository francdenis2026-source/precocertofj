import { createServerFn } from "@tanstack/react-start";

export type StoreContactInfo = {
  id: string;
  name: string;
  address: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
  phone: string | null;
  /** Texto livre cadastrado (usado para horário de funcionamento / observações). */
  notes: string | null;
};

/**
 * Dados de contato/atendimento de um estabelecimento (endereço, telefone e
 * observações como horário de funcionamento). Leitura pública somente.
 */
export const getStoreContactInfo = createServerFn({ method: "GET" })
  .validator((input: { id: string }) => {
    const id = String(input?.id ?? "").trim();
    if (!id) throw new Error("id obrigatório");
    return { id };
  })
  .handler(async ({ data }): Promise<StoreContactInfo | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const table = supabaseAdmin.from("establishments" as never) as unknown as {
      select: (s: string) => {
        eq: (
          c: string,
          v: string,
        ) => {
          maybeSingle: () => Promise<{
            data: {
              id: string;
              name: string;
              address: string | null;
              neighborhood: string | null;
              city: string;
              state: string;
              phone: string | null;
              notes: string | null;
            } | null;
            error: { message: string } | null;
          }>;
        };
      };
    };

    const { data: row, error } = await table
      .select("id, name, address, neighborhood, city, state, phone, notes")
      .eq("id", data.id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!row) return null;
    return row;
  });
