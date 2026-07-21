import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";

export type StorageCleanupReport = {
  bucket: string;
  scanned: number;
  referenced: number;
  deleted: number;
  freedBytes: number;
  errors: string[];
};

type ObjectRow = { name: string; metadata: { size?: number } | null };

/**
 * Purga fisicamente arquivos do bucket `scans` que não estão mais referenciados
 * em `scans.image_url` nem `receipts.image_url`. Preserva metadados dos scans
 * (o registro na tabela continua existindo, apenas os binários pesados são apagados).
 */
export const purgeUnreferencedScanFiles = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async (): Promise<StorageCleanupReport> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bucket = "scans";
    const errors: string[] = [];

    // 1. Carrega o conjunto de paths ainda referenciados.
    const referenced = new Set<string>();
    const collect = (url: string | null | undefined) => {
      if (!url) return;
      // extrai o path após /scans/ tanto em URLs públicas quanto assinadas
      const m = url.match(/\/scans\/(?:sign\/|public\/|authenticated\/)?([^?#]+)/);
      if (m?.[1]) referenced.add(decodeURIComponent(m[1]));
    };

    const scansT = supabaseAdmin.from("scans" as never) as unknown as {
      select: (s: string) => Promise<{ data: Array<{ image_url: string | null }> | null }>;
    };
    const { data: scanRows } = await scansT.select("image_url");
    for (const r of scanRows ?? []) collect(r.image_url);

    const receiptsT = supabaseAdmin.from("receipts" as never) as unknown as {
      select: (s: string) => Promise<{
        data: Array<{ image_url: string | null; evidence_url?: string | null }> | null;
      }>;
    };
    const { data: recRows } = await receiptsT.select("image_url, evidence_url");
    for (const r of recRows ?? []) {
      collect(r.image_url);
      collect(r.evidence_url ?? null);
    }

    // 2. Lista arquivos do bucket (paginação até 1000/pg).
    const allObjects: Array<{ path: string; size: number }> = [];
    const walk = async (prefix: string) => {
      let offset = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await supabaseAdmin.storage
          .from(bucket)
          .list(prefix, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
        if (error) {
          errors.push(`list ${prefix}: ${error.message}`);
          return;
        }
        if (!data || data.length === 0) break;
        for (const entry of data as ObjectRow[]) {
          if (!entry.name) continue;
          const full = prefix ? `${prefix}/${entry.name}` : entry.name;
          if (entry.metadata === null) {
            // pasta — descer
            await walk(full);
          } else {
            allObjects.push({ path: full, size: entry.metadata.size ?? 0 });
          }
        }
        if (data.length < 1000) break;
        offset += 1000;
      }
    };
    await walk("");

    // 3. Filtra os não referenciados e deleta em batches de 100.
    const toDelete = allObjects.filter((o) => !referenced.has(o.path));
    let deleted = 0;
    let freedBytes = 0;
    for (let i = 0; i < toDelete.length; i += 100) {
      const batch = toDelete.slice(i, i + 100);
      const { error } = await supabaseAdmin.storage
        .from(bucket)
        .remove(batch.map((b) => b.path));
      if (error) {
        errors.push(`remove batch: ${error.message}`);
        continue;
      }
      deleted += batch.length;
      freedBytes += batch.reduce((acc, b) => acc + b.size, 0);
    }

    return {
      bucket,
      scanned: allObjects.length,
      referenced: referenced.size,
      deleted,
      freedBytes,
      errors,
    };
  });
