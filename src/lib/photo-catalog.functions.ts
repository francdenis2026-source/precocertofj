import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";
import { normalizeProductName } from "@/lib/catalog.functions";

export type PhotoCatalogInput = {
  displayName: string;
  brand?: string | null;
  category?: string | null;
  barcode?: string | null;
  defaultUnit?: string | null;
  imageUrl?: string | null;
};

export type PhotoCatalogResult = {
  id: string;
  created: boolean;
  displayName: string;
};

export const savePhotoToCatalog = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: PhotoCatalogInput) => {
    if (!input?.displayName || input.displayName.trim().length < 2) {
      throw new Error("Nome do produto obrigatório (mínimo 2 caracteres).");
    }
    return input;
  })
  .handler(async ({ data }): Promise<PhotoCatalogResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const display = data.displayName.trim();
    const normalized = normalizeProductName(display);
    const brand = data.brand?.trim() || null;
    const category = data.category?.trim() || null;
    const barcode = data.barcode?.trim().replace(/\D/g, "") || null;
    const defaultUnit = data.defaultUnit?.trim() || null;
    const imageUrl = data.imageUrl?.trim() || null;

    const table = supabaseAdmin.from("product_catalog" as never) as unknown as {
      select: (s: string) => {
        eq: (c: string, v: string) => {
          maybeSingle: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
        };
      };
      insert: (p: Record<string, unknown>) => {
        select: (s: string) => {
          single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
        };
      };
      update: (p: Record<string, unknown>) => {
        eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
      };
    };

    // Check duplicate by normalized_name
    const { data: existing, error: exErr } = await table
      .select("id")
      .eq("normalized_name", normalized)
      .maybeSingle();
    if (exErr) throw new Error(exErr.message);

    if (existing?.id) {
      // Merge non-empty fields into existing
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (brand) patch.brand = brand;
      if (category) patch.category = category;
      if (barcode) patch.barcode = barcode;
      if (defaultUnit) patch.default_unit = defaultUnit;
      if (imageUrl) {
        patch.image_url = imageUrl;
        patch.image_source = "upload";
      }
      const { error: upErr } = await table.update(patch).eq("id", existing.id);
      if (upErr) throw new Error(upErr.message);
      return { id: existing.id, created: false, displayName: display };
    }

    const { data: inserted, error: insErr } = await table
      .insert({
        display_name: display,
        normalized_name: normalized,
        brand,
        category,
        barcode,
        default_unit: defaultUnit,
        image_url: imageUrl,
        image_source: imageUrl ? "upload" : null,
      })
      .select("id")
      .single();
    if (insErr || !inserted) throw new Error(insErr?.message ?? "Falha ao inserir");
    return { id: inserted.id, created: true, displayName: display };
  });
