/**
 * Server-only helpers para as novas funcionalidades do fluxo de foto:
 *  - `suggestWebImages(id, count)` — pede à IA `count` URLs candidatas
 *    de imagem para o produto, SEM aplicar nada.
 *  - `applyWebImageUrl(id, url, actor)` — baixa a URL escolhida, valida,
 *    sobe no bucket `logos` e persiste `image_url` + audit.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logAudit } from "./catalog-audit.server";
import { UploadError, type UploadErrorCode } from "./upload-errors";

export type WebImageCandidate = {
  imageUrl: string;
  sourcePage: string | null;
  title: string | null;
  confidence: "high" | "medium" | "low" | null;
};

type ProductRow = {
  id: string;
  display_name: string;
  brand: string | null;
  barcode: string | null;
  image_url: string | null;
};

async function loadProduct(id: string): Promise<ProductRow> {
  const table = supabaseAdmin.from("product_catalog" as never) as unknown as {
    select: (s: string) => {
      eq: (c: string, v: string) => {
        single: () => Promise<{
          data: ProductRow | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
  const { data, error } = await table
    .select("id, display_name, brand, barcode, image_url")
    .eq("id", id)
    .single();
  if (error || !data) throw new Error(error?.message ?? "Produto não encontrado");
  return data;
}

async function loadPreferredDomains(): Promise<string[]> {
  try {
    const cfg = supabaseAdmin.from("integrations" as never) as unknown as {
      select: (s: string) => {
        eq: (c: string, v: string) => {
          maybeSingle: () => Promise<{
            data: { config: { preferredDomains?: string[] } | null } | null;
          }>;
        };
      };
    };
    const { data } = await cfg.select("config").eq("id", "image_search").maybeSingle();
    const list = data?.config?.preferredDomains;
    if (Array.isArray(list) && list.length > 0) return list;
  } catch {
    /* usa defaults */
  }
  return ["amazon.com.br", "mercadolivre.com.br", "carrefour.com.br", "paodeacucar.com"];
}

/**
 * Pede `count` URLs candidatas ao gateway (Gemini). Retorna array (pode ter menos
 * do que `count`). Não aplica nada.
 */
export async function suggestWebImages(
  catalogId: string,
  count = 6,
): Promise<WebImageCandidate[]> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new UploadError("STORAGE_FAIL", "LOVABLE_API_KEY ausente");
  const product = await loadProduct(catalogId);
  const preferred = await loadPreferredDomains();
  const domainsHint = preferred.join(", ");
  const n = Math.max(2, Math.min(count, 8));

  const prompt =
    `Sugira ${n} URLs de foto oficial (embalagem em fundo neutro, sem overlays) do produto abaixo. ` +
    `PRIORIZE domínios brasileiros de varejo (nesta ordem): ${domainsHint}. ` +
    `Cada URL deve apontar DIRETAMENTE ao arquivo de imagem (.jpg, .jpeg, .png ou .webp). ` +
    `Prefira imagens quadradas em alta resolução.\n\n` +
    `Produto: ${product.display_name}\nMarca: ${product.brand ?? "(não informada)"}\n` +
    `Código de barras: ${product.barcode ?? "(não informado)"}\n\n` +
    `Responda APENAS em JSON no formato: ` +
    `{"candidates":[{"image_url":"...","source_page":"...","title":"...","confidence":"high|medium|low"}]}`;

  const chatRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: "Você retorna somente JSON válido, sem cercas de código nem comentários.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (chatRes.status === 429) throw new UploadError("RATE_LIMITED");
  if (chatRes.status === 402) throw new UploadError("NO_CREDITS");
  if (!chatRes.ok) {
    const txt = await chatRes.text().catch(() => "");
    if (/not enough credits|payment_required/i.test(txt)) throw new UploadError("NO_CREDITS");
    throw new UploadError("STORAGE_FAIL", `Gateway ${chatRes.status}: ${txt.slice(0, 200)}`);
  }
  const chatJson = (await chatRes.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = chatJson.choices?.[0]?.message?.content ?? "{}";
  let parsed: { candidates?: Array<Record<string, unknown>> } = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }
  const list = Array.isArray(parsed.candidates) ? parsed.candidates : [];
  const seen = new Set<string>();
  const out: WebImageCandidate[] = [];
  for (const c of list) {
    const url = typeof c.image_url === "string" ? c.image_url : "";
    if (!url || !/^https?:\/\//i.test(url) || seen.has(url)) continue;
    seen.add(url);
    out.push({
      imageUrl: url,
      sourcePage: typeof c.source_page === "string" ? c.source_page : null,
      title: typeof c.title === "string" ? c.title : null,
      confidence:
        c.confidence === "high" || c.confidence === "medium" || c.confidence === "low"
          ? c.confidence
          : null,
    });
    if (out.length >= n) break;
  }
  return out;
}

/**
 * Baixa a URL candidata, valida MIME/tamanho, sobe no storage e atualiza a linha.
 * Retorna a URL pública final.
 */
export async function applyWebImageUrl(
  catalogId: string,
  candidateUrl: string,
  actorUserId: string | null,
): Promise<string> {
  if (!/^https?:\/\//i.test(candidateUrl)) throw new UploadError("INVALID_URL");
  const product = await loadProduct(catalogId);

  let imgRes: Response;
  try {
    imgRes = await fetch(candidateUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; PrecoCertoBot/1.0; +https://precocerto.app)",
        Accept: "image/*,*/*;q=0.8",
      },
      redirect: "follow",
    });
  } catch (err) {
    console.error("[applyWebImageUrl] fetch falhou:", err);
    await logFailure(catalogId, actorUserId, candidateUrl, "REMOTE_FETCH_FAIL");
    throw new UploadError("REMOTE_FETCH_FAIL");
  }
  if (!imgRes.ok) {
    await logFailure(catalogId, actorUserId, candidateUrl, "REMOTE_FETCH_FAIL");
    throw new UploadError("REMOTE_FETCH_FAIL", `HTTP ${imgRes.status}`);
  }
  const contentType = imgRes.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    await logFailure(catalogId, actorUserId, candidateUrl, "BAD_MIME");
    throw new UploadError("BAD_MIME", `content-type=${contentType || "?"}`);
  }
  const buf = new Uint8Array(await imgRes.arrayBuffer());
  if (buf.byteLength < 2048) {
    await logFailure(catalogId, actorUserId, candidateUrl, "TOO_SMALL");
    throw new UploadError("TOO_SMALL");
  }
  if (buf.byteLength > 5 * 1024 * 1024) {
    await logFailure(catalogId, actorUserId, candidateUrl, "FILE_TOO_BIG");
    throw new UploadError("FILE_TOO_BIG");
  }
  const ext = contentType.includes("png")
    ? "png"
    : contentType.includes("webp")
      ? "webp"
      : contentType.includes("gif")
        ? "gif"
        : "jpg";
  const path = `products/${catalogId}-web-${Date.now()}.${ext}`;
  const { error: upErr } = await supabaseAdmin.storage
    .from("logos")
    .upload(path, buf, { contentType, upsert: true });
  if (upErr) {
    await logFailure(catalogId, actorUserId, candidateUrl, "STORAGE_FAIL");
    throw new UploadError("STORAGE_FAIL", upErr.message);
  }
  const { data: pub } = supabaseAdmin.storage.from("logos").getPublicUrl(path);
  const imageUrl = pub.publicUrl;

  const table = supabaseAdmin.from("product_catalog" as never) as unknown as {
    update: (p: Record<string, unknown>) => {
      eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
    };
  };
  const { error: updErr } = await table
    .update({
      image_url: imageUrl,
      image_source: "web",
      image_search_attempted_at: new Date().toISOString(),
      image_search_found: true,
    })
    .eq("id", catalogId);
  if (updErr) {
    await logFailure(catalogId, actorUserId, candidateUrl, "STORAGE_FAIL");
    throw new UploadError("STORAGE_FAIL", updErr.message);
  }

  await logAudit({
    catalogId,
    actorUserId,
    action: "image_web",
    field: "image_url",
    oldValue: product.image_url,
    newValue: imageUrl,
    metadata: { source: "web-picker", candidate: candidateUrl },
    result: "success",
  });
  return imageUrl;
}

async function logFailure(
  catalogId: string,
  actorUserId: string | null,
  candidateUrl: string,
  code: UploadErrorCode,
): Promise<void> {
  await logAudit({
    catalogId,
    actorUserId,
    action: "image_web_failed",
    field: "image_url",
    oldValue: null,
    newValue: null,
    metadata: { candidate: candidateUrl },
    result: "error",
    errorCode: code,
  });
}
