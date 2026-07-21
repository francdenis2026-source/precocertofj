import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";

export type CatalogEntry = {
  id: string;
  normalizedName: string;
  displayName: string;
  brand: string | null;
  defaultUnit: string | null;
  barcode: string | null;
  imageUrl: string | null;
  updatedAt: string;
};

type CatalogRow = {
  id: string;
  normalized_name: string;
  display_name: string;
  brand: string | null;
  default_unit: string | null;
  barcode: string | null;
  image_url: string | null;
  updated_at: string;
};

const toEntry = (r: CatalogRow): CatalogEntry => ({
  id: r.id,
  normalizedName: r.normalized_name,
  displayName: r.display_name,
  brand: r.brand,
  defaultUnit: r.default_unit,
  barcode: r.barcode,
  imageUrl: r.image_url,
  updatedAt: r.updated_at,
});

export const normalizeProductName = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

export const listCatalog = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<CatalogEntry[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const table = supabaseAdmin.from("product_catalog" as never) as unknown as {
      select: (s: string) => {
        order: (
          c: string,
          o: { ascending: boolean },
        ) => Promise<{ data: CatalogRow[] | null; error: { message: string } | null }>;
      };
    };
    const { data, error } = await table
      .select("id, normalized_name, display_name, brand, default_unit, barcode, image_url, updated_at")
      .order("display_name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toEntry);
  });

export const updateCatalogEntry = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator(
    (input: {
      id: string;
      displayName?: string;
      brand?: string | null;
      defaultUnit?: string | null;
      barcode?: string | null;
      imageUrl?: string | null;
    }) => {
      if (!input.id) throw new Error("id obrigatório");
      return input;
    },
  )
  .handler(async ({ data, context }): Promise<CatalogEntry> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logAudit } = await import("./catalog-audit.server");

    // carrega valor atual para diff de auditoria
    const currentTable = supabaseAdmin.from("product_catalog" as never) as unknown as {
      select: (s: string) => {
        eq: (
          c: string,
          v: string,
        ) => {
          single: () => Promise<{ data: CatalogRow | null; error: { message: string } | null }>;
        };
      };
    };
    const { data: current, error: curErr } = await currentTable
      .select("id, normalized_name, display_name, brand, default_unit, barcode, image_url, updated_at")
      .eq("id", data.id)
      .single();
    if (curErr || !current) throw new Error(curErr?.message ?? "Produto não encontrado");

    const patch: Record<string, unknown> = {};
    const auditFields: Array<{ field: string; oldValue: string | null; newValue: string | null }> = [];
    if (data.displayName !== undefined && data.displayName.trim() !== current.display_name) {
      patch.display_name = data.displayName.trim();
      auditFields.push({ field: "display_name", oldValue: current.display_name, newValue: data.displayName.trim() });
    }
    if (data.brand !== undefined) {
      const v = data.brand?.trim() || null;
      if (v !== current.brand) {
        patch.brand = v;
        auditFields.push({ field: "brand", oldValue: current.brand, newValue: v });
      }
    }
    if (data.defaultUnit !== undefined) {
      const v = data.defaultUnit?.trim() || null;
      if (v !== current.default_unit) {
        patch.default_unit = v;
        auditFields.push({ field: "default_unit", oldValue: current.default_unit, newValue: v });
      }
    }
    if (data.barcode !== undefined) {
      const v = data.barcode?.trim() || null;
      if (v !== current.barcode) {
        patch.barcode = v;
        auditFields.push({ field: "barcode", oldValue: current.barcode, newValue: v });
      }
    }
    if (data.imageUrl !== undefined) {
      const v = data.imageUrl?.trim() || null;
      if (v !== current.image_url) {
        patch.image_url = v;
        auditFields.push({ field: "image_url", oldValue: current.image_url, newValue: v });
      }
    }

    if (Object.keys(patch).length === 0) return toEntry(current);

    const table = supabaseAdmin.from("product_catalog" as never) as unknown as {
      update: (p: Record<string, unknown>) => {
        eq: (
          c: string,
          v: string,
        ) => {
          select: (s: string) => {
            single: () => Promise<{ data: CatalogRow | null; error: { message: string } | null }>;
          };
        };
      };
    };
    const { data: row, error } = await table
      .update(patch)
      .eq("id", data.id)
      .select("id, normalized_name, display_name, brand, default_unit, barcode, image_url, updated_at")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Falha ao atualizar catálogo");

    await logAudit(
      auditFields.map((f) => ({
        catalogId: row.id,
        actorUserId: context.userId,
        action: "update" as const,
        field: f.field,
        oldValue: f.oldValue,
        newValue: f.newValue,
      })),
    );

    return toEntry(row);
  });

/**
 * Faz upload de uma nova foto real do produto (data URL) para o bucket `logos`
 * em `products/{catalogId}.<ext>` e atualiza `image_url` do catálogo.
 */
export const uploadCatalogImage = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { id: string; dataUrl: string }) => {
    if (!input.id) throw new Error("id obrigatório");
    if (!input.dataUrl?.startsWith("data:")) throw new Error("dataUrl inválido");
    return input;
  })
  .handler(async ({ data, context }): Promise<CatalogEntry> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logAudit } = await import("./catalog-audit.server");
    const match = data.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error("Formato de imagem inválido");
    const mime = match[1];
    const ext =
      mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : mime.includes("gif") ? "gif" : "jpg";
    const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
    const path = `products/${data.id}-${Date.now()}.${ext}`;

    const { error: upErr } = await supabaseAdmin.storage
      .from("logos")
      .upload(path, bytes, { contentType: mime, upsert: true });
    if (upErr) throw new Error(upErr.message);

    const { data: pub } = supabaseAdmin.storage.from("logos").getPublicUrl(path);
    const imageUrl = pub.publicUrl;

    const table = supabaseAdmin.from("product_catalog" as never) as unknown as {
      select: (s: string) => {
        eq: (
          c: string,
          v: string,
        ) => {
          single: () => Promise<{ data: CatalogRow | null; error: { message: string } | null }>;
        };
      };
      update: (p: Record<string, unknown>) => {
        eq: (
          c: string,
          v: string,
        ) => {
          select: (s: string) => {
            single: () => Promise<{ data: CatalogRow | null; error: { message: string } | null }>;
          };
        };
      };
    };
    const { data: prev } = await table
      .select("id, normalized_name, display_name, brand, default_unit, barcode, image_url, updated_at")
      .eq("id", data.id)
      .single();
    const { data: row, error } = await table
      .update({
        image_url: imageUrl,
        image_source: "upload",
        image_search_attempted_at: new Date().toISOString(),
        image_search_found: true,
      })
      .eq("id", data.id)
      .select("id, normalized_name, display_name, brand, default_unit, barcode, image_url, updated_at")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Falha ao salvar imagem");

    await logAudit({
      catalogId: row.id,
      actorUserId: context.userId,
      action: "image_upload",
      field: "image_url",
      oldValue: prev?.image_url ?? null,
      newValue: imageUrl,
      metadata: { source: "upload" },
    });

    return toEntry(row);
  });
