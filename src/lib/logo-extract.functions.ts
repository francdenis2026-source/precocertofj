import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type LogoExtract = {
  name: string | null;
  tagline: string | null;
  kind:
    | "mercado"
    | "atacado"
    | "hortifruti"
    | "farmacia"
    | "conveniencia"
    | "outro"
    | null;
  brandColor: string | null;
  notes: string | null;
  confidence: "low" | "medium" | "high";
  raw: string;
};

const SYSTEM_PROMPT = `Você analisa a logomarca de um estabelecimento comercial brasileiro.
Extraia SOMENTE o que estiver visualmente presente na imagem — não invente.

Responda EXCLUSIVAMENTE em JSON válido com este formato:
{
  "name": string|null,          // razão social ou nome fantasia principal
  "tagline": string|null,        // slogan/descrição secundária, se houver
  "kind": "mercado"|"atacado"|"hortifruti"|"farmacia"|"conveniencia"|"outro"|null,
  "brandColor": string|null,     // cor dominante da marca em HEX #RRGGBB
  "notes": string|null,          // segmento visível (ex.: "Açougue", "Padaria")
  "confidence": "low"|"medium"|"high"
}

Regras:
- name: apenas o nome principal legível, sem "LTDA" ou CNPJ.
- kind: escolha o mais próximo do segmento aparente. Açougues, padarias, pet shops → "outro" e coloque o segmento em "notes".
- brandColor: apenas HEX #RRGGBB (ex.: "#F59E0B"). Ignore preto/branco de fundo se possível.
- Se algo não estiver claro, use null.`;

export const extractLogoDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { image: string }) => {
    if (!input.image) throw new Error("image obrigatória");
    if (typeof input.image !== "string" || input.image.length > 12_000_000) {
      throw new Error("Imagem inválida ou muito grande");
    }
    return input;
  })
  .handler(async ({ data, context }): Promise<LogoExtract> => {
    const { assertAiRateLimit, logAiUsage } = await import("@/lib/ai-guard.server");
    const userId = context.userId;
    await assertAiRateLimit(userId, "extractLogoDetails", 20, 60);
    const startedAt = Date.now();


    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Analise esta logomarca e extraia os dados do estabelecimento." },
              { type: "image_url", image_url: { url: data.image } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      const msg =
        res.status === 429
          ? "Limite de IA atingido. Tente em 1 min."
          : res.status === 402
            ? "Créditos de IA esgotados."
            : `IA falhou [${res.status}]: ${body.slice(0, 200)}`;
      await logAiUsage({
        userId,
        functionName: "extractLogoDetails",
        model: "google/gemini-2.5-flash",
        success: false,
        errorMessage: msg,
        durationMs: Date.now() - startedAt,
      });
      throw new Error(msg);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    await logAiUsage({
      userId,
      functionName: "extractLogoDetails",
      model: "google/gemini-2.5-flash",
      promptTokens: json.usage?.prompt_tokens,
      completionTokens: json.usage?.completion_tokens,
      totalTokens: json.usage?.total_tokens,
      success: true,
      durationMs: Date.now() - startedAt,
    });
    const raw = json.choices?.[0]?.message?.content ?? "{}";


    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }

    const str = (v: unknown): string | null => {
      if (typeof v !== "string") return null;
      const t = v.trim();
      return t.length > 0 ? t : null;
    };

    const kinds = ["mercado", "atacado", "hortifruti", "farmacia", "conveniencia", "outro"] as const;
    const kindRaw = str(parsed.kind)?.toLowerCase() ?? null;
    const kind = kinds.includes(kindRaw as (typeof kinds)[number])
      ? (kindRaw as LogoExtract["kind"])
      : null;

    let brandColor = str(parsed.brandColor);
    if (brandColor && !/^#[0-9A-Fa-f]{6}$/.test(brandColor)) brandColor = null;

    const conf = str(parsed.confidence);
    const confidence =
      conf === "high" || conf === "medium" ? (conf as "high" | "medium") : "low";

    return {
      name: str(parsed.name),
      tagline: str(parsed.tagline),
      kind,
      brandColor,
      notes: str(parsed.notes),
      confidence,
      raw,
    };
  });
