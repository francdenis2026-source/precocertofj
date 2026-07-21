/**
 * Server-only: resolve/gera imagens do catálogo, priorizando Gemini direto
 * quando GEMINI_API_KEY está configurada, e faz upload no bucket `logos`.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logAudit } from "./catalog-audit.server";

type CatalogRow = {
  id: string;
  display_name: string;
  brand: string | null;
  image_url: string | null;
};

function buildPrompt(displayName: string, brand: string | null): string {
  const brandPart = brand ? ` da marca ${brand}` : "";
  return (
    `Fotografia realista de produto de supermercado brasileiro: ${displayName}${brandPart}. ` +
    `Embalagem do produto centralizada, fundo branco liso, iluminação de estúdio uniforme, ` +
    `nítida, alta resolução, estilo catálogo e-commerce, sem texto adicional, sem logotipos inventados, ` +
    `enquadramento quadrado.`
  );
}

export type ImageProvider =
  | "gemini_direct"
  | "lovable_gateway"
  | "gemini_direct_search"
  | "lovable_gateway_search";

const GEMINI_DIRECT_IMAGE_MODELS = [
  "gemini-3.1-flash-lite-image",
  "gemini-3.1-flash-image",
  "gemini-2.5-flash-image",
] as const;

type GeminiImageModel = (typeof GEMINI_DIRECT_IMAGE_MODELS)[number];

type GeminiPart = {
  text?: string;
  inlineData?: { data?: string };
  inline_data?: { data?: string };
};

export class CatalogImageProviderError extends Error {
  provider: ImageProvider;
  status: number | null;
  retryable: boolean;
  creditIssue: boolean;

  constructor({
    message,
    provider,
    status,
    retryable,
    creditIssue,
  }: {
    message: string;
    provider: ImageProvider;
    status?: number | null;
    retryable?: boolean;
    creditIssue?: boolean;
  }) {
    super(message);
    this.name = "CatalogImageProviderError";
    this.provider = provider;
    this.status = status ?? null;
    this.retryable = retryable ?? false;
    this.creditIssue = creditIssue ?? false;
  }
}

export function getImageFailureProvider(
  error: unknown,
  fallback: ImageProvider,
): ImageProvider {
  return error instanceof CatalogImageProviderError ? error.provider : fallback;
}

function compactProviderError(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 700);
}

function isGeminiRetryable(status: number, body: string): boolean {
  return (
    status === 429 ||
    status >= 500 ||
    /RESOURCE_EXHAUSTED|quota exceeded|rate limit|retry/i.test(body)
  );
}

function isGatewayCreditIssue(status: number, body: string): boolean {
  return status === 402 || /payment_required|not enough credits|insufficient credits/i.test(body);
}

function retryDelayMs(body: string): number | null {
  const retryMatch = body.match(/retry(?:\s+in|Delay"?\s*:\s*"?)(?:\s*)?(\d+(?:\.\d+)?)s/i);
  if (!retryMatch) return null;
  const seconds = Number(retryMatch[1]);
  return Number.isFinite(seconds) ? Math.min(Math.ceil(seconds * 1000), 12_000) : null;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGeminiDirectImage(
  prompt: string,
  geminiKey: string,
): Promise<{ b64: string; provider: ImageProvider }> {
  const errors: string[] = [];

  for (const model of GEMINI_DIRECT_IMAGE_MODELS) {
    const result = await callGeminiImageModel(model, prompt, geminiKey);
    if (result.ok) return { b64: result.b64, provider: "gemini_direct" };

    errors.push(result.message);
    if (result.retryable && result.delayMs && result.delayMs > 0) {
      await wait(result.delayMs);
      const retry = await callGeminiImageModel(model, prompt, geminiKey);
      if (retry.ok) return { b64: retry.b64, provider: "gemini_direct" };
      errors.push(retry.message);
    }
  }

  throw new CatalogImageProviderError({
    provider: "gemini_direct",
    status: 429,
    retryable: true,
    message:
      "Gemini direto falhou com a GEMINI_API_KEY configurada. O Lovable Gateway não foi usado para evitar nova falha 402. Detalhes: " +
      errors.map(compactProviderError).join(" | "),
  });
}

async function callGeminiImageModel(
  model: GeminiImageModel,
  prompt: string,
  geminiKey: string,
): Promise<
  | { ok: true; b64: string }
  | { ok: false; message: string; retryable: boolean; delayMs: number | null }
> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return {
      ok: false,
      message: `Gemini ${model} ${res.status}: ${body}`,
      retryable: isGeminiRetryable(res.status, body),
      delayMs: retryDelayMs(body),
    };
  }

  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
  };
  const b64 = json.candidates?.[0]?.content?.parts?.find(
    (p) => p.inlineData?.data || p.inline_data?.data,
  );
  const data = b64?.inlineData?.data ?? b64?.inline_data?.data;
  if (!data) {
    return {
      ok: false,
      message: `Gemini ${model}: resposta sem imagem`,
      retryable: false,
      delayMs: null,
    };
  }
  return { ok: true, b64: data };
}

async function callLovableGatewayImage(
  prompt: string,
): Promise<{ b64: string; provider: ImageProvider }> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY ausente");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-image",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new CatalogImageProviderError({
      provider: "lovable_gateway",
      status: res.status,
      retryable: res.status === 429 || res.status >= 500,
      creditIssue: isGatewayCreditIssue(res.status, body),
      message: `Gateway ${res.status}: ${body}`,
    });
  }
  const json = (await res.json()) as { data?: Array<{ b64_json?: string }> };
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("Resposta sem imagem");
  return { b64, provider: "lovable_gateway" };
}

async function callGateway(prompt: string): Promise<{ b64: string; provider: ImageProvider }> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    return callGeminiDirectImage(prompt, geminiKey);
  }
  return callLovableGatewayImage(prompt);
}

/**
 * Procura uma entrada irmã (mesmo normalize_product_key) que já tenha
 * `image_url` resolvido, para reaproveitar sem novo custo de IA.
 */
async function findSiblingImage(
  catalogId: string,
  displayName: string,
): Promise<{ imageUrl: string; sourceId: string } | null> {
  const client = supabaseAdmin as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  };
  try {
    const { data } = await client.rpc("normalize_product_key", { name: displayName });
    const key = typeof data === "string" ? data.trim() : "";
    if (!key) return null;
    const q = supabaseAdmin.from("product_catalog" as never) as unknown as {
      select: (s: string) => {
        neq: (
          c: string,
          v: string,
        ) => {
          not: (
            c: string,
            op: string,
            v: unknown,
          ) => {
            limit: (n: number) => Promise<{
              data: Array<{ id: string; image_url: string | null; display_name: string }> | null;
            }>;
          };
        };
      };
    };
    const { data: rows } = await q
      .select("id, image_url, display_name")
      .neq("id", catalogId)
      .not("image_url", "is", null)
      .limit(50);
    if (!rows) return null;
    for (const r of rows) {
      const { data: rk } = await client.rpc("normalize_product_key", {
        name: r.display_name,
      });
      if (typeof rk === "string" && rk.trim() === key && r.image_url) {
        return { imageUrl: r.image_url, sourceId: r.id };
      }
    }
  } catch {
    /* best-effort */
  }
  return null;
}

export async function generateAndStoreImage(
  catalogId: string,
  actorUserId: string | null,
): Promise<{ imageUrl: string; provider: ImageProvider; cached?: boolean }> {
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
      eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
    };
  };

  const { data: row, error: selErr } = await table
    .select("id, display_name, brand, image_url")
    .eq("id", catalogId)
    .single();
  if (selErr || !row) throw new Error(selErr?.message ?? "Produto não encontrado");

  // Cache 1: já tem imagem — não regera.
  if (row.image_url) {
    return { imageUrl: row.image_url, provider: "gemini_direct", cached: true };
  }

  // Cache 2: reaproveita imagem de irmão com mesma chave normalizada.
  const sibling = await findSiblingImage(catalogId, row.display_name);
  if (sibling) {
    await table
      .update({ image_url: sibling.imageUrl, image_source: "reused" })
      .eq("id", catalogId);
    await logAudit({
      catalogId,
      actorUserId,
      action: "image_reused",
      field: "image_url",
      oldValue: null,
      newValue: sibling.imageUrl,
      metadata: { source: "sibling", siblingId: sibling.sourceId },
    });
    return { imageUrl: sibling.imageUrl, provider: "gemini_direct", cached: true };
  }

  const prompt = buildPrompt(row.display_name, row.brand);
  const { b64, provider } = await callGateway(prompt);

  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const path = `products/${catalogId}-ai-${Date.now()}.png`;
  const { error: upErr } = await supabaseAdmin.storage
    .from("logos")
    .upload(path, bytes, { contentType: "image/png", upsert: true });
  if (upErr) throw new Error(upErr.message);

  const { data: pub } = supabaseAdmin.storage.from("logos").getPublicUrl(path);
  const imageUrl = pub.publicUrl;

  const { error: updErr } = await table
    .update({
      image_url: imageUrl,
      image_source: "ai",
    })
    .eq("id", catalogId);
  if (updErr) throw new Error(updErr.message);

  await logAudit({
    catalogId,
    actorUserId,
    action: "image_generated",
    field: "image_url",
    oldValue: row.image_url,
    newValue: imageUrl,
    metadata: { prompt, source: "ai", provider },
  });

  return { imageUrl, provider };
}

/**
 * Fire-and-forget: dispara geração de imagens para entradas sem image_url.
 * Best-effort — falhas são apenas logadas.
 */
export async function generateMissingForIds(ids: string[]): Promise<void> {
  for (const id of ids) {
    try {
      await generateAndStoreImage(id, null);
    } catch (err) {
      console.error(`[catalog-image] falha em ${id}:`, err);
    }
  }
}

/**
 * Busca uma imagem real do produto na web via Lovable AI Gateway
 * (modelo retorna URL candidata em JSON). Baixamos, validamos e subimos
 * ao bucket `logos`, atualizando `image_url` + `image_source='web'`.
 */
export async function searchAndStoreWebImage(
  catalogId: string,
  actorUserId: string | null,
): Promise<{
  imageUrl: string | null;
  found: boolean;
  sourcePage: string | null;
  provider: ImageProvider;
  cached?: boolean;
}> {
  const table = supabaseAdmin.from("product_catalog" as never) as unknown as {
    select: (s: string) => {
      eq: (
        c: string,
        v: string,
      ) => {
        single: () => Promise<{
          data:
            | (CatalogRow & {
                barcode: string | null;
                image_search_attempted_at: string | null;
                image_search_found: boolean | null;
              })
            | null;
          error: { message: string } | null;
        }>;
      };
    };
    update: (p: Record<string, unknown>) => {
      eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
    };
  };

  const { data: row, error: selErr } = await table
    .select(
      "id, display_name, brand, image_url, barcode, image_search_attempted_at, image_search_found",
    )
    .eq("id", catalogId)
    .single();
  if (selErr || !row) throw new Error(selErr?.message ?? "Produto não encontrado");

  // Cache 1: já tem imagem — retorna imediatamente.
  if (row.image_url) {
    return {
      imageUrl: row.image_url,
      found: true,
      sourcePage: null,
      provider: "gemini_direct_search",
      cached: true,
    };
  }

  // Cache 2: busca falhou recentemente (< 7 dias) — não gasta cota de novo.
  if (row.image_search_attempted_at && row.image_search_found === false) {
    const ageMs = Date.now() - new Date(row.image_search_attempted_at).getTime();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    if (ageMs < SEVEN_DAYS) {
      return {
        imageUrl: null,
        found: false,
        sourcePage: null,
        provider: "gemini_direct_search",
        cached: true,
      };
    }
  }

  // Cache 3: reaproveita URL de irmão com mesma chave normalizada.
  const sibling = await findSiblingImage(catalogId, row.display_name);
  if (sibling) {
    await table
      .update({
        image_url: sibling.imageUrl,
        image_source: "reused",
        image_search_attempted_at: new Date().toISOString(),
        image_search_found: true,
      })
      .eq("id", catalogId);
    await logAudit({
      catalogId,
      actorUserId,
      action: "image_reused",
      field: "image_url",
      oldValue: null,
      newValue: sibling.imageUrl,
      metadata: { source: "sibling_web", siblingId: sibling.sourceId },
    });
    return {
      imageUrl: sibling.imageUrl,
      found: true,
      sourcePage: null,
      provider: "gemini_direct_search",
      cached: true,
    };
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const gatewayKey = process.env.LOVABLE_API_KEY;
  if (!geminiKey && !gatewayKey) throw new Error("GEMINI_API_KEY/LOVABLE_API_KEY ausentes");

  // Lê domínios preferidos configurados pelo admin
  let preferredDomains: string[] = [
    "amazon.com.br",
    "mercadolivre.com.br",
    "carrefour.com.br",
    "paodeacucar.com",
  ];
  try {
    const cfgTable = supabaseAdmin.from("integrations" as never) as unknown as {
      select: (s: string) => {
        eq: (
          c: string,
          v: string,
        ) => {
          maybeSingle: () => Promise<{
            data: { config: { preferredDomains?: string[] } | null } | null;
          }>;
        };
      };
    };
    const { data: cfg } = await cfgTable.select("config").eq("id", "image_search").maybeSingle();
    const list = cfg?.config?.preferredDomains;
    if (Array.isArray(list) && list.length > 0) preferredDomains = list;
  } catch {
    /* usa defaults */
  }
  const domainsHint = preferredDomains.join(", ");

  const prompt =
    `Encontre a URL de uma foto oficial (embalagem em fundo neutro) do produto abaixo. ` +
    `PRIORIZE OBRIGATORIAMENTE estes domínios (nesta ordem de preferência): ${domainsHint}. ` +
    `A URL deve apontar diretamente ao arquivo de imagem ` +
    `(.jpg, .jpeg, .png ou .webp), não à página HTML.\n\n` +
    `Produto: ${row.display_name}\nMarca: ${row.brand ?? "(não informada)"}\n` +
    `Código de barras: ${row.barcode ?? "(não informado)"}\n\n` +
    `Responda APENAS em JSON: {"image_url":"https://...","source_page":"https://...","confidence":"high|medium|low"}. ` +
    `Se não tiver certeza razoável, retorne {"image_url":null,"source_page":null,"confidence":"low"}.`;

  const systemPrompt =
    "Você é um assistente que localiza URLs de imagens oficiais de produtos brasileiros em e-commerces. Retorna somente JSON válido, sem cercas de código nem comentários.";

  let raw = "{}";
  let provider: ImageProvider = "lovable_gateway_search";

  const tryGemini = async (): Promise<string> => {
    if (!geminiKey) throw new Error("no gemini key");
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          tools: [{ google_search: {} }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new CatalogImageProviderError({
        provider: "gemini_direct_search",
        status: res.status,
        retryable: isGeminiRetryable(res.status, body),
        message: `Gemini busca ${res.status}: ${body}`,
      });
    }
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "{}";
  };

  const tryLovable = async (): Promise<string> => {
    if (!gatewayKey) throw new Error("no gateway key");
    const chatRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${gatewayKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!chatRes.ok) {
      const body = await chatRes.text().catch(() => "");
      throw new CatalogImageProviderError({
        provider: "lovable_gateway_search",
        status: chatRes.status,
        retryable: chatRes.status === 429 || chatRes.status >= 500,
        creditIssue: isGatewayCreditIssue(chatRes.status, body),
        message: `Gateway busca ${chatRes.status}: ${body}`,
      });
    }
    const chatJson = (await chatRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return chatJson.choices?.[0]?.message?.content ?? "{}";
  };

  if (geminiKey) {
    raw = await tryGemini();
    provider = "gemini_direct_search";
  } else {
    raw = await tryLovable();
    provider = "lovable_gateway_search";
  }



  let parsed: {
    image_url?: string | null;
    source_page?: string | null;
    confidence?: string;
  } = {};
  try {
    // Remove possíveis cercas de código do Gemini
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = {};
  }
  const candidateUrl = parsed.image_url ?? null;
  const sourcePage = parsed.source_page ?? null;

  const markMiss = async () => {
    await table
      .update({
        image_search_attempted_at: new Date().toISOString(),
        image_search_found: false,
      })
      .eq("id", catalogId);
    await logAudit({
      catalogId,
      actorUserId,
      action: "image_search_missed",
      field: "image_url",
      oldValue: row.image_url,
      newValue: null,
      metadata: {
        candidate: candidateUrl,
        sourcePage,
        confidence: parsed.confidence ?? null,
      },
    });
  };

  if (!candidateUrl || !/^https?:\/\//i.test(candidateUrl)) {
    await markMiss();
    return { imageUrl: null, found: false, sourcePage, provider };
  }

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
    console.error("[catalog-image] fetch falhou:", err);
    await markMiss();
    return { imageUrl: null, found: false, sourcePage, provider };
  }
  if (!imgRes.ok) {
    await markMiss();
    return { imageUrl: null, found: false, sourcePage, provider };
  }
  const contentType = imgRes.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    await markMiss();
    return { imageUrl: null, found: false, sourcePage, provider };
  }
  const buf = new Uint8Array(await imgRes.arrayBuffer());
  if (buf.byteLength < 2048) {
    await markMiss();
    return { imageUrl: null, found: false, sourcePage, provider };
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
  if (upErr) throw new Error(upErr.message);

  const { data: pub } = supabaseAdmin.storage.from("logos").getPublicUrl(path);
  const imageUrl = pub.publicUrl;

  const { error: updErr } = await table
    .update({
      image_url: imageUrl,
      image_source: "web",
      image_search_attempted_at: new Date().toISOString(),
      image_search_found: true,
    })
    .eq("id", catalogId);
  if (updErr) throw new Error(updErr.message);

  await logAudit({
    catalogId,
    actorUserId,
    action: "image_upload",
    field: "image_url",
    oldValue: row.image_url,
    newValue: imageUrl,
    metadata: {
      source: "web",
      candidate: candidateUrl,
      sourcePage,
      confidence: parsed.confidence ?? null,
    },
  });

  return { imageUrl, found: true, sourcePage, provider };
}
