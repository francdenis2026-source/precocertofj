import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";

export type MissingImageEntry = {
  id: string;
  displayName: string;
  brand: string | null;
  imageSearchAttemptedAt: string | null;
  imageSearchFound: boolean | null;
};

export type RecentImageChange = {
  auditId: string;
  catalogId: string;
  displayName: string;
  brand: string | null;
  action: string; // image_upload | image_generated | update (image_url)
  oldImageUrl: string | null;
  newImageUrl: string | null;
  imageSource: string | null;
  createdAt: string;
  actorEmail: string | null;
};

type MissingRow = {
  id: string;
  display_name: string;
  brand: string | null;
  image_search_attempted_at: string | null;
  image_search_found: boolean | null;
};

const missingSelect =
  "id, display_name, brand, image_search_attempted_at, image_search_found";

export const listMissingImages = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<MissingImageEntry[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const table = supabaseAdmin.from("product_catalog" as never) as unknown as {
      select: (s: string) => {
        is: (
          c: string,
          v: null,
        ) => {
          order: (
            c: string,
            o: { ascending: boolean },
          ) => Promise<{
            data: MissingRow[] | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
    const { data, error } = await table
      .select(missingSelect)
      .is("image_url", null)
      .order("display_name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id,
      displayName: r.display_name,
      brand: r.brand,
      imageSearchAttemptedAt: r.image_search_attempted_at,
      imageSearchFound: r.image_search_found,
    }));
  });

export const generateCatalogImage = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { id: string }) => {
    if (!input.id) throw new Error("id obrigatório");
    return input;
  })
  .handler(async ({ data, context }): Promise<{ imageUrl: string | null }> => {
    const { generateAndStoreImage } = await import("./catalog-image.server");
    const r = await generateAndStoreImage(data.id, context.userId);
    return { imageUrl: r.imageUrl };
  });

/**
 * Pesquisa uma imagem real na web (via Lovable AI) para um produto específico
 * e substitui o `image_url` se encontrar. Marca a tentativa de busca.
 */
export const searchWebImageForCatalog = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { id: string }) => {
    if (!input.id) throw new Error("id obrigatório");
    return input;
  })
  .handler(
    async ({
      data,
      context,
    }): Promise<{ imageUrl: string | null; found: boolean; sourcePage: string | null }> => {
      const { searchAndStoreWebImage } = await import("./catalog-image.server");
      return searchAndStoreWebImage(data.id, context.userId);
    },
  );

/**
 * Rotina automática: gera imagens APENAS para produtos que continuam sem
 * `image_url` e cuja busca por imagem real (na web/manual) já foi tentada
 * e não encontrou correspondência confiável
 * (`image_search_attempted_at IS NOT NULL AND image_search_found = FALSE`).
 *
 * Produtos recém-cadastrados sem tentativa de busca são deixados em paz
 * para que o admin decida se procura foto real primeiro.
 */
export const generateAllMissingImages = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(
    async ({
      context,
    }): Promise<{ generated: number; failed: number; skipped: number }> => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { generateAndStoreImage } = await import("./catalog-image.server");
      const table = supabaseAdmin.from("product_catalog" as never) as unknown as {
        select: (s: string) => {
          is: (
            c: string,
            v: null,
          ) => {
            not: (
              c: string,
              op: string,
              v: null,
            ) => {
              eq: (
                c: string,
                v: boolean,
              ) => Promise<{
                data: Array<{ id: string }> | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      };
      const { data: eligible, error } = await table
        .select("id")
        .is("image_url", null)
        .not("image_search_attempted_at", "is", null)
        .eq("image_search_found", false);
      if (error) throw new Error(error.message);

      // Também busca o total pendente (sem tentativa) para reportar "skipped"
      const table2 = supabaseAdmin.from("product_catalog" as never) as unknown as {
        select: (s: string) => {
          is: (
            c1: string,
            v1: null,
          ) => {
            is: (
              c2: string,
              v2: null,
            ) => Promise<{
              data: Array<{ id: string }> | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
      const { data: pending } = await table2
        .select("id")
        .is("image_url", null)
        .is("image_search_attempted_at", null);
      const skipped = (pending ?? []).length;

      let generated = 0;
      let failed = 0;
      for (const row of eligible ?? []) {
        try {
          await generateAndStoreImage(row.id, context.userId);
          generated++;
        } catch (err) {
          console.error("[generateAll] falha:", err);
          failed++;
        }
      }
      return { generated, failed, skipped };
    },
  );

/**
 * Marca (ou desmarca) a tentativa de busca por imagem real na web.
 * Quando `found=false`, o produto se torna elegível para geração automática por IA.
 */
export const markImageSearch = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { id: string; found: boolean }) => {
    if (!input.id) throw new Error("id obrigatório");
    return input;
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logAudit } = await import("./catalog-audit.server");
    const table = supabaseAdmin.from("product_catalog" as never) as unknown as {
      update: (
        p: Record<string, unknown>,
      ) => {
        eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
      };
    };
    const { error } = await table
      .update({
        image_search_attempted_at: new Date().toISOString(),
        image_search_found: data.found,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({
      catalogId: data.id,
      actorUserId: context.userId,
      action: data.found ? "image_search_matched" : "image_search_missed",
      field: "image_search_found",
      oldValue: null,
      newValue: data.found ? "true" : "false",
    });
    return { ok: true };
  });

/**
 * Marca em lote todos os produtos sem imagem e sem tentativa registrada
 * como "não encontrado na web" — habilitando-os para geração automática.
 */
export const markAllMissingAsUnmatched = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<{ marked: number }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logAudit } = await import("./catalog-audit.server");
    const table = supabaseAdmin.from("product_catalog" as never) as unknown as {
      select: (s: string) => {
        is: (
          c1: string,
          v1: null,
        ) => {
          is: (
            c2: string,
            v2: null,
          ) => Promise<{
            data: Array<{ id: string }> | null;
            error: { message: string } | null;
          }>;
        };
      };
      update: (
        p: Record<string, unknown>,
      ) => {
        is: (
          c1: string,
          v1: null,
        ) => {
          is: (c2: string, v2: null) => Promise<{ error: { message: string } | null }>;
        };
      };
    };
    const { data: ids, error: selErr } = await table
      .select("id")
      .is("image_url", null)
      .is("image_search_attempted_at", null);
    if (selErr) throw new Error(selErr.message);

    const { error } = await table
      .update({
        image_search_attempted_at: new Date().toISOString(),
        image_search_found: false,
      })
      .is("image_url", null)
      .is("image_search_attempted_at", null);
    if (error) throw new Error(error.message);

    await logAudit(
      (ids ?? []).map((r) => ({
        catalogId: r.id,
        actorUserId: context.userId,
        action: "image_search_missed" as const,
        field: "image_search_found",
        oldValue: null,
        newValue: "false",
      })),
    );
    return { marked: (ids ?? []).length };
  });

/**
 * Lista alterações recentes de imagem no catálogo (para a aba Revisão),
 * unindo dados de auditoria com o produto atual.
 */
export const listRecentImageChanges = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((input: { limit?: number } | undefined) => input ?? {})
  .handler(async ({ data }): Promise<RecentImageChange[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const limit = Math.min(Math.max(data.limit ?? 30, 1), 100);

    type AuditRow = {
      id: string;
      catalog_id: string | null;
      actor_user_id: string | null;
      action: string;
      old_value: string | null;
      new_value: string | null;
      created_at: string;
    };
    const auditTable = supabaseAdmin.from("product_catalog_audit" as never) as unknown as {
      select: (s: string) => {
        in: (
          c: string,
          v: string[],
        ) => {
          order: (
            c: string,
            o: { ascending: boolean },
          ) => {
            limit: (
              n: number,
            ) => Promise<{ data: AuditRow[] | null; error: { message: string } | null }>;
          };
        };
      };
    };
    const { data: audits, error } = await auditTable
      .select("id, catalog_id, actor_user_id, action, old_value, new_value, created_at")
      .in("action", ["image_upload", "image_generated"])
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);

    const catIds = Array.from(
      new Set((audits ?? []).map((a) => a.catalog_id).filter((v): v is string => !!v)),
    );
    const userIds = Array.from(
      new Set((audits ?? []).map((a) => a.actor_user_id).filter((v): v is string => !!v)),
    );

    const catInfoById = new Map<
      string,
      { display_name: string; brand: string | null; image_source: string | null }
    >();
    if (catIds.length > 0) {
      const catTable = supabaseAdmin.from("product_catalog" as never) as unknown as {
        select: (s: string) => {
          in: (
            c: string,
            v: string[],
          ) => Promise<{
            data: Array<{
              id: string;
              display_name: string;
              brand: string | null;
              image_source: string | null;
            }> | null;
            error: { message: string } | null;
          }>;
        };
      };
      const { data: cats } = await catTable
        .select("id, display_name, brand, image_source")
        .in("id", catIds);
      for (const c of cats ?? [])
        catInfoById.set(c.id, {
          display_name: c.display_name,
          brand: c.brand,
          image_source: c.image_source,
        });
    }

    const emailById = new Map<string, string>();
    for (const uid of userIds) {
      try {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
        if (u?.user?.email) emailById.set(uid, u.user.email);
      } catch {
        /* ignora */
      }
    }

    return (audits ?? [])
      .filter((a): a is AuditRow & { catalog_id: string } => !!a.catalog_id)
      .map((a) => {
        const info = catInfoById.get(a.catalog_id);
        return {
          auditId: a.id,
          catalogId: a.catalog_id,
          displayName: info?.display_name ?? "(produto removido)",
          brand: info?.brand ?? null,
          action: a.action,
          oldImageUrl: a.old_value,
          newImageUrl: a.new_value,
          imageSource: info?.image_source ?? null,
          createdAt: a.created_at,
          actorEmail: a.actor_user_id ? emailById.get(a.actor_user_id) ?? null : null,
        };
      });
  });

// ============================================================================
// Novas funções: web picker (galeria de sugestões), histórico e lote na web
// ============================================================================

export type WebImageCandidate = {
  imageUrl: string;
  sourcePage: string | null;
  title: string | null;
  confidence: "high" | "medium" | "low" | null;
};

export type CatalogImageHistoryEntry = {
  auditId: string;
  createdAt: string;
  action: string;
  result: "success" | "error";
  errorCode: string | null;
  actorEmail: string | null;
  oldImageUrl: string | null;
  newImageUrl: string | null;
  source: string | null;
  candidate: string | null;
};

/**
 * Sugere N URLs de imagem candidatas na web. NÃO aplica nada — o admin
 * escolhe qual usar via `applyCatalogImageUrl`.
 */
export const suggestWebImagesForCatalog = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { id: string; count?: number }) => {
    if (!input.id) throw new Error("id obrigatório");
    return { id: input.id, count: Math.max(2, Math.min(input.count ?? 6, 8)) };
  })
  .handler(async ({ data }): Promise<WebImageCandidate[]> => {
    const { suggestWebImages } = await import("./catalog-image-picker.server");
    return suggestWebImages(data.id, data.count);
  });

/**
 * Aplica uma URL de imagem escolhida pelo admin (do web picker).
 */
export const applyCatalogImageUrl = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { id: string; imageUrl: string }) => {
    if (!input.id) throw new Error("id obrigatório");
    if (!input.imageUrl) throw new Error("imageUrl obrigatório");
    return input;
  })
  .handler(async ({ data, context }): Promise<{ imageUrl: string }> => {
    const { applyWebImageUrl } = await import("./catalog-image-picker.server");
    const url = await applyWebImageUrl(data.id, data.imageUrl, context.userId);
    return { imageUrl: url };
  });

/**
 * Histórico de tentativas de upload/web/IA para um produto (sucessos + falhas).
 */
export const listCatalogImageHistory = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { catalogId: string; limit?: number }) => {
    if (!input.catalogId) throw new Error("catalogId obrigatório");
    return { catalogId: input.catalogId, limit: Math.min(Math.max(input.limit ?? 20, 1), 100) };
  })
  .handler(async ({ data }): Promise<CatalogImageHistoryEntry[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    type Row = {
      id: string;
      action: string;
      old_value: string | null;
      new_value: string | null;
      metadata: Record<string, unknown> | null;
      created_at: string;
      actor_user_id: string | null;
      result: string | null;
      error_code: string | null;
    };
    const auditTable = supabaseAdmin.from("product_catalog_audit" as never) as unknown as {
      select: (s: string) => {
        eq: (
          c: string,
          v: string,
        ) => {
          in: (
            c: string,
            v: string[],
          ) => {
            order: (
              c: string,
              o: { ascending: boolean },
            ) => {
              limit: (
                n: number,
              ) => Promise<{ data: Row[] | null; error: { message: string } | null }>;
            };
          };
        };
      };
    };
    const { data: rows, error } = await auditTable
      .select(
        "id, action, old_value, new_value, metadata, created_at, actor_user_id, result, error_code",
      )
      .eq("catalog_id", data.catalogId)
      .in("action", [
        "image_upload",
        "image_generated",
        "image_web",
        "image_upload_failed",
        "image_web_failed",
        "image_generated_failed",
      ])
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);

    const uids = Array.from(
      new Set((rows ?? []).map((r) => r.actor_user_id).filter((v): v is string => !!v)),
    );
    const emailById = new Map<string, string>();
    for (const uid of uids) {
      try {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
        if (u?.user?.email) emailById.set(uid, u.user.email);
      } catch {
        /* ignora */
      }
    }
    return (rows ?? []).map((r) => {
      const md = (r.metadata ?? {}) as { source?: string; candidate?: string };
      return {
        auditId: r.id,
        createdAt: r.created_at,
        action: r.action,
        result: r.result === "error" ? "error" : "success",
        errorCode: r.error_code,
        actorEmail: r.actor_user_id ? emailById.get(r.actor_user_id) ?? null : null,
        oldImageUrl: r.old_value,
        newImageUrl: r.new_value,
        source: md.source ?? null,
        candidate: md.candidate ?? null,
      } satisfies CatalogImageHistoryEntry;
    });
  });

/**
 * Enfileira atualização em lote de imagens buscando na web.
 * `scope`: 'missing' — só produtos sem foto; 'refresh' — força re-busca.
 * `method`: metadado do job para o worker distinguir 'web_only' de 'web_with_ai'.
 * `limit`: máx. de jobs criados nesta chamada (10..500).
 */
const BulkWebSchema = z.object({
  scope: z.enum(["missing", "refresh"]).default("missing"),
  method: z.enum(["web_only", "web_with_ai"]).default("web_with_ai"),
  limit: z.number().int().min(10).max(500).default(100),
  olderThanDays: z.number().int().min(0).max(365).default(30),
});

export const enqueueBulkWebImageUpdate = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: unknown) => BulkWebSchema.parse(input ?? {}))
  .handler(async ({ data, context }): Promise<{ enqueued: number }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const isForce = data.scope === "refresh";
    // RPC verifica auth.uid() internamente — precisa do cliente autenticado
    const { data: rows, error } = await context.supabase.rpc(
      "enqueue_catalog_image_refresh" as never,
      {
        _force: isForce,
        _older_than_days: isForce ? data.olderThanDays : 0,
      } as never,
    );
    if (error) throw new Error(error.message);
    const first = Array.isArray(rows) ? (rows[0] as { enqueued: number } | undefined) : null;
    const enqueued = first?.enqueued ?? 0;

    // Anota o método escolhido nos jobs pendentes recém-criados
    if (enqueued > 0) {
      const jobsTable = supabaseAdmin.from("catalog_image_jobs" as never) as unknown as {
        update: (p: Record<string, unknown>) => {
          eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
        };
      };
      // Melhor esforço — se falhar, o worker ainda processa com fallback default
      await jobsTable
        .update({ metadata: { method: data.method } as Record<string, unknown> })
        .eq("status", "pending");
    }
    return { enqueued: Math.min(enqueued, data.limit) };
  });

// ============================================================================
// Scraper direto (Bing Images) — sem IA, sem gateway
// ============================================================================

export type ScoredWebCandidate = WebImageCandidate & {
  matchScore: number;
  matchBreakdown: {
    nameOverlap: number;
    brandHit: number;
    barcodeHit: number;
    domainHit: number;
  };
};

export type ScrapeAllResult = {
  processed: number;
  filled: number;
  notFound: number;
  belowThreshold: number;
  failed: number;
  threshold: number;
};

async function loadMatchThreshold(fallback: number): Promise<number> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cfg = supabaseAdmin.from("integrations" as never) as unknown as {
      select: (s: string) => {
        eq: (c: string, v: string) => {
          maybeSingle: () => Promise<{
            data: { config: { matchThreshold?: number } | null } | null;
          }>;
        };
      };
    };
    const { data } = await cfg.select("config").eq("id", "image_search").maybeSingle();
    const t = data?.config?.matchThreshold;
    if (typeof t === "number" && t >= 0 && t <= 1) return t;
  } catch {
    /* usa fallback */
  }
  return fallback;
}

/**
 * Busca candidatas na web (Bing Images) para um produto SEM aplicar nada.
 * Retorna cada candidata com seu `matchScore` (0..1) para o admin auditar.
 */
export const scrapeWebImagesForCatalog = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { id: string }) => {
    if (!input.id) throw new Error("id obrigatório");
    return input;
  })
  .handler(async ({ data }): Promise<ScoredWebCandidate[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { scrapeImageCandidates } = await import("./catalog-image-scraper.server");
    const table = supabaseAdmin.from("product_catalog" as never) as unknown as {
      select: (s: string) => {
        eq: (c: string, v: string) => {
          single: () => Promise<{
            data: {
              display_name: string;
              brand: string | null;
              barcode: string | null;
            } | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
    const { data: row, error } = await table
      .select("display_name, brand, barcode")
      .eq("id", data.id)
      .single();
    if (error || !row) throw new Error(error?.message ?? "Produto não encontrado");
    const scored = await scrapeImageCandidates(row.display_name, row.brand, row.barcode);
    return scored.map((c) => ({
      imageUrl: c.imageUrl,
      sourcePage: c.sourcePage,
      title: c.title,
      confidence: c.confidence,
      matchScore: c.match.score,
      matchBreakdown: c.match.breakdown,
    }));
  });

/**
 * Retorna/persiste o limiar mínimo de confiança para anexar automaticamente
 * uma capa encontrada pelo scraper. Armazenado em `integrations.image_search`.
 */
export const getImageMatchThreshold = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<{ threshold: number }> => {
    const { DEFAULT_MATCH_THRESHOLD } = await import("./catalog-image-match");
    return { threshold: await loadMatchThreshold(DEFAULT_MATCH_THRESHOLD) };
  });

export const setImageMatchThreshold = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { threshold: number }) => {
    const t = Number(input?.threshold);
    if (!Number.isFinite(t) || t < 0 || t > 1) {
      throw new Error("threshold deve estar entre 0 e 1");
    }
    return { threshold: t };
  })
  .handler(async ({ data }): Promise<{ threshold: number }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cfg = supabaseAdmin.from("integrations" as never) as unknown as {
      select: (s: string) => {
        eq: (c: string, v: string) => {
          maybeSingle: () => Promise<{
            data: { config: Record<string, unknown> | null } | null;
          }>;
        };
      };
      upsert: (
        p: Record<string, unknown>,
      ) => Promise<{ error: { message: string } | null }>;
    };
    const { data: current } = await cfg
      .select("config")
      .eq("id", "image_search")
      .maybeSingle();
    const nextConfig = {
      ...((current?.config ?? {}) as Record<string, unknown>),
      matchThreshold: data.threshold,
    };
    const { error } = await cfg.upsert({ id: "image_search", config: nextConfig });
    if (error) throw new Error(error.message);
    return { threshold: data.threshold };
  });

/**
 * Percorre produtos sem `image_url`, busca no Bing Images e aplica a primeira
 * candidata que baixa com sucesso *E* passa do limiar mínimo de confiança
 * (name/brand/barcode/domain). Candidatas abaixo do limiar são ignoradas.
 */
export const scrapeAllMissingImages = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { limit?: number; threshold?: number } | undefined) => ({
    limit: Math.min(Math.max(input?.limit ?? 150, 1), 500),
    threshold:
      typeof input?.threshold === "number" && input.threshold >= 0 && input.threshold <= 1
        ? input.threshold
        : null,
  }))
  .handler(async ({ data, context }): Promise<ScrapeAllResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { scrapeImageCandidates } = await import("./catalog-image-scraper.server");
    const { applyWebImageUrl } = await import("./catalog-image-picker.server");
    const { DEFAULT_MATCH_THRESHOLD } = await import("./catalog-image-match");

    const threshold =
      data.threshold ?? (await loadMatchThreshold(DEFAULT_MATCH_THRESHOLD));

    const table = supabaseAdmin.from("product_catalog" as never) as unknown as {
      select: (s: string) => {
        is: (c: string, v: null) => {
          order: (
            c: string,
            o: { ascending: boolean },
          ) => {
            limit: (
              n: number,
            ) => Promise<{
              data: Array<{
                id: string;
                display_name: string;
                brand: string | null;
                barcode: string | null;
              }> | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
      update: (p: Record<string, unknown>) => {
        eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
      };
    };
    const { data: rows, error } = await table
      .select("id, display_name, brand, barcode")
      .is("image_url", null)
      .order("display_name", { ascending: true })
      .limit(data.limit);
    if (error) throw new Error(error.message);

    const result: ScrapeAllResult = {
      processed: 0,
      filled: 0,
      notFound: 0,
      belowThreshold: 0,
      failed: 0,
      threshold,
    };
    for (const row of rows ?? []) {
      result.processed++;
      let filled = false;
      let sawAnyCandidate = false;
      let sawAboveThreshold = false;
      try {
        const candidates = await scrapeImageCandidates(
          row.display_name,
          row.brand,
          row.barcode,
        );
        sawAnyCandidate = candidates.length > 0;
        for (const cand of candidates) {
          if (cand.match.score < threshold) continue;
          sawAboveThreshold = true;
          try {
            await applyWebImageUrl(row.id, cand.imageUrl, context.userId);
            filled = true;
            result.filled++;
            break;
          } catch (err) {
            console.warn("[scrapeAll] candidata falhou:", cand.imageUrl, err);
          }
        }
      } catch (err) {
        console.error("[scrapeAll] erro geral:", row.id, err);
      }
      if (!filled) {
        if (sawAnyCandidate && !sawAboveThreshold) result.belowThreshold++;
        try {
          await table
            .update({
              image_search_attempted_at: new Date().toISOString(),
              image_search_found: false,
            })
            .eq("id", row.id);
          if (!sawAnyCandidate || sawAboveThreshold) result.notFound++;
        } catch {
          result.failed++;
        }
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    return result;
  });

