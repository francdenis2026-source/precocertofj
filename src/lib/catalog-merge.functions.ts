import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";

export type BarcodeConflict = {
  barcode: string;
  entries: Array<{
    id: string;
    displayName: string;
    normalizedName: string;
    brand: string | null;
    imageUrl: string | null;
  }>;
};

export type LegacyDuplicate = {
  key: string; // primeiro token/prefix compartilhado
  entries: Array<{
    id: string;
    displayName: string;
    normalizedName: string;
    brand: string | null;
    imageUrl: string | null;
    barcode: string | null;
  }>;
};

type Row = {
  id: string;
  normalized_name: string;
  display_name: string;
  brand: string | null;
  image_url: string | null;
  barcode: string | null;
};

const normalize = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

async function loadAll(): Promise<Row[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const table = supabaseAdmin.from("product_catalog" as never) as unknown as {
    select: (s: string) => Promise<{ data: Row[] | null; error: { message: string } | null }>;
  };
  const { data, error } = await table.select(
    "id, normalized_name, display_name, brand, image_url, barcode",
  );
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Lista barcodes com mais de uma entrada e nomes divergentes. */
export const listBarcodeAlerts = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<BarcodeConflict[]> => {
    const rows = await loadAll();
    const byBarcode = new Map<string, Row[]>();
    for (const r of rows) {
      if (!r.barcode) continue;
      const list = byBarcode.get(r.barcode) ?? [];
      list.push(r);
      byBarcode.set(r.barcode, list);
    }
    const alerts: BarcodeConflict[] = [];
    for (const [barcode, list] of byBarcode) {
      if (list.length < 2) continue;
      const names = new Set(list.map((r) => r.normalized_name));
      if (names.size < 2) continue;
      alerts.push({
        barcode,
        entries: list.map((r) => ({
          id: r.id,
          displayName: r.display_name,
          normalizedName: r.normalized_name,
          brand: r.brand,
          imageUrl: r.image_url,
        })),
      });
    }
    return alerts;
  });

/** Lista possíveis duplicatas legadas (barcode NULL) agrupadas por prefixo comum. */
export const listLegacyDuplicates = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<LegacyDuplicate[]> => {
    const rows = await loadAll();
    const groups = new Map<string, Row[]>();
    for (const r of rows) {
      if (r.barcode) continue;
      const key = r.normalized_name.split(" ").slice(0, 2).join(" ");
      if (!key) continue;
      const list = groups.get(key) ?? [];
      list.push(r);
      groups.set(key, list);
    }
    const out: LegacyDuplicate[] = [];
    for (const [key, list] of groups) {
      if (list.length < 2) continue;
      out.push({
        key,
        entries: list.map((r) => ({
          id: r.id,
          displayName: r.display_name,
          normalizedName: r.normalized_name,
          brand: r.brand,
          imageUrl: r.image_url,
          barcode: r.barcode,
        })),
      });
    }
    return out;
  });

/**
 * Aplica um barcode como fonte da verdade: renomeia todas as entradas
 * do mesmo barcode para o display_name do mestre e apaga as duplicatas.
 */
export const consolidateBarcode = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { barcode: string; masterId: string }) => {
    if (!input.barcode || !input.masterId) throw new Error("barcode e masterId obrigatórios");
    return input;
  })
  .handler(async ({ data, context }): Promise<{ mergedCount: number }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logAudit } = await import("./catalog-audit.server");

    const table = supabaseAdmin.from("product_catalog" as never) as unknown as {
      select: (s: string) => {
        eq: (
          c: string,
          v: string,
        ) => Promise<{ data: Row[] | null; error: { message: string } | null }>;
      };
      delete: () => {
        eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
      };
    };
    const { data: rows, error } = await table
      .select("id, normalized_name, display_name, brand, image_url, barcode")
      .eq("barcode", data.barcode);
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    const master = list.find((r) => r.id === data.masterId);
    if (!master) throw new Error("Produto mestre não pertence ao barcode informado");
    const duplicates = list.filter((r) => r.id !== master.id);

    for (const dup of duplicates) {
      // reatribui scans do duplicate para o normalized_name/barcode do mestre não é
      // necessário — histórico é agrupado por barcode. Apenas removemos a entrada.
      const { error: delErr } = await (
        supabaseAdmin.from("product_catalog" as never) as unknown as {
          delete: () => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> };
        }
      )
        .delete()
        .eq("id", dup.id);
      if (delErr) throw new Error(delErr.message);
      await logAudit({
        catalogId: master.id,
        actorUserId: context.userId,
        action: "merge",
        oldValue: dup.display_name,
        newValue: master.display_name,
        metadata: { mergedFromId: dup.id, barcode: data.barcode, kind: "same_barcode" },
      });
    }

    return { mergedCount: duplicates.length };
  });

/**
 * Mescla entradas legadas (barcode NULL) em um produto mestre. Atualiza scans
 * cujos product_name correspondem aos normalized_names das duplicatas para
 * ficarem apontando ao normalized_name/barcode do mestre.
 */
export const mergeLegacyEntries = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { masterId: string; duplicateIds: string[] }) => {
    if (!input.masterId) throw new Error("masterId obrigatório");
    if (!Array.isArray(input.duplicateIds) || input.duplicateIds.length === 0)
      throw new Error("duplicateIds vazio");
    if (input.duplicateIds.includes(input.masterId))
      throw new Error("masterId não pode estar em duplicateIds");
    return input;
  })
  .handler(
    async (
      { data, context },
    ): Promise<{ mergedCount: number; scansReassigned: number }> => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { logAudit } = await import("./catalog-audit.server");

      // Carrega mestre + duplicatas
      const catTable = supabaseAdmin.from("product_catalog" as never) as unknown as {
        select: (s: string) => {
          in: (c: string, v: string[]) => Promise<{ data: Row[] | null; error: { message: string } | null }>;
        };
        delete: () => {
          eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
        };
      };
      const ids = [data.masterId, ...data.duplicateIds];
      const { data: rows, error } = await catTable
        .select("id, normalized_name, display_name, brand, image_url, barcode")
        .in("id", ids);
      if (error) throw new Error(error.message);
      const list = rows ?? [];
      const master = list.find((r) => r.id === data.masterId);
      if (!master) throw new Error("Produto mestre não encontrado");
      const duplicates = list.filter((r) => r.id !== master.id);
      if (duplicates.length === 0) throw new Error("Nenhuma duplicata encontrada");

      // Reatribui scans (barcode NULL) cujos product_name normalizados batem com os duplicates
      const scansTable = supabaseAdmin.from("scans" as never) as unknown as {
        select: (s: string) => {
          is: (
            c: string,
            v: null,
          ) => Promise<{
            data: Array<{ id: string; product_name: string }> | null;
            error: { message: string } | null;
          }>;
        };
        update: (p: Record<string, unknown>) => {
          in: (c: string, v: string[]) => Promise<{ error: { message: string } | null }>;
        };
      };
      const { data: scans, error: scErr } = await scansTable
        .select("id, product_name")
        .is("barcode", null);
      if (scErr) throw new Error(scErr.message);
      const dupNames = new Set(duplicates.map((d) => d.normalized_name));
      const matchIds = (scans ?? [])
        .filter((s) => dupNames.has(normalize(s.product_name ?? "")))
        .map((s) => s.id);

      let scansReassigned = 0;
      if (matchIds.length > 0) {
        const patch: Record<string, unknown> = {
          product_name: master.display_name,
        };
        if (master.barcode) patch.barcode = master.barcode;
        const { error: updErr } = await scansTable.update(patch).in("id", matchIds);
        if (updErr) throw new Error(updErr.message);
        scansReassigned = matchIds.length;
      }

      // Remove duplicatas e loga auditoria
      for (const dup of duplicates) {
        const { error: delErr } = await catTable.delete().eq("id", dup.id);
        if (delErr) throw new Error(delErr.message);
        await logAudit({
          catalogId: master.id,
          actorUserId: context.userId,
          action: "merge",
          oldValue: dup.display_name,
          newValue: master.display_name,
          metadata: {
            mergedFromId: dup.id,
            mergedFromNormalizedName: dup.normalized_name,
            kind: "legacy_null_barcode",
          },
        });
      }

      return { mergedCount: duplicates.length, scansReassigned };
    },
  );
