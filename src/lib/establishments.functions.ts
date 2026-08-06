import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";

export type EstablishmentKind =
  | "mercado"
  | "atacado"
  | "hortifruti"
  | "farmacia"
  | "conveniencia"
  | "outro";

export type Establishment = {
  id: string;
  name: string;
  cnpj: string | null;
  ie: string | null;
  kind: EstablishmentKind;
  address: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
  zip: string | null;
  phone: string | null;
  logoUrl: string | null;
  brandColor: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type EstablishmentInput = {
  id?: string;
  name: string;
  cnpj?: string | null;
  ie?: string | null;
  kind: EstablishmentKind;
  address?: string | null;
  neighborhood?: string | null;
  city: string;
  state: string;
  zip?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
  brandColor?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
  active?: boolean;
};

type Row = {
  id: string;
  name: string;
  cnpj: string | null;
  ie: string | null;
  kind: EstablishmentKind;
  address: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
  zip: string | null;
  phone: string | null;
  logo_url: string | null;
  brand_color: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

function toDto(r: Row): Establishment {
  return {
    id: r.id,
    name: r.name,
    cnpj: r.cnpj,
    ie: r.ie,
    kind: r.kind,
    address: r.address,
    neighborhood: r.neighborhood,
    city: r.city,
    state: r.state,
    zip: r.zip,
    phone: r.phone,
    logoUrl: r.logo_url,
    brandColor: r.brand_color,
    latitude: r.latitude != null ? Number(r.latitude) : null,
    longitude: r.longitude != null ? Number(r.longitude) : null,
    notes: r.notes,
    active: r.active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function validate(input: EstablishmentInput): EstablishmentInput {
  if (!input.name?.trim()) throw new Error("Nome é obrigatório");
  if (!input.city?.trim()) throw new Error("Cidade é obrigatória");
  if (!input.state?.trim() || input.state.trim().length !== 2)
    throw new Error("UF deve ter 2 letras");
  const kinds: EstablishmentKind[] = [
    "mercado",
    "atacado",
    "hortifruti",
    "farmacia",
    "conveniencia",
    "outro",
  ];
  if (!kinds.includes(input.kind)) throw new Error("Tipo inválido");
  return input;
}

export const listEstablishments = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<Establishment[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("establishments" as never)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Row[]).map(toDto);
  });

export const saveEstablishment = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: EstablishmentInput) => validate(input))
  .handler(async ({ data, context }): Promise<Establishment> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      name: data.name.trim(),
      cnpj: data.cnpj?.trim() || null,
      ie: data.ie?.trim() || null,
      kind: data.kind,
      address: data.address?.trim() || null,
      neighborhood: data.neighborhood?.trim() || null,
      city: data.city.trim(),
      state: data.state.trim().toUpperCase(),
      zip: data.zip?.trim() || null,
      phone: data.phone?.trim() || null,
      logo_url: data.logoUrl?.trim() || null,
      brand_color:
        data.brandColor && /^#[0-9A-Fa-f]{6}$/.test(data.brandColor.trim())
          ? data.brandColor.trim().toLowerCase()
          : null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      notes: data.notes?.trim() || null,
      active: data.active ?? true,
    };

    const table = supabaseAdmin.from("establishments" as never) as unknown as {
      update: (v: Record<string, unknown>) => {
        eq: (c: string, v: string) => {
          select: (s: string) => {
            single: () => Promise<{ data: Row | null; error: { message: string } | null }>;
          };
        };
      };
      insert: (v: Record<string, unknown>) => {
        select: (s: string) => {
          single: () => Promise<{ data: Row | null; error: { message: string } | null }>;
        };
      };
    };

    if (data.id) {
      const { data: row, error } = await table.update(payload).eq("id", data.id).select("*").single();
      if (error) throw new Error(error.message);
      return toDto(row as Row);
    }
    const { data: row, error } = await table
      .insert({ ...payload, created_by: context.userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return toDto(row as Row);
  });

export const deleteEstablishment = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: { id: string }) => {
    if (!input.id) throw new Error("id obrigatório");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("establishments" as never)
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleEstablishmentActive = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: { id: string; active: boolean }) => input)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const table = supabaseAdmin.from("establishments" as never) as unknown as {
      update: (v: Record<string, unknown>) => {
        eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
      };
    };
    const { error } = await table.update({ active: data.active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
