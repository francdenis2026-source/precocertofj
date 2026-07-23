import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";

/**
 * Detecção automática de embalagem/peso a partir da imagem de um produto.
 * Usa Gemini Flash via Lovable AI Gateway (visão).
 *
 * Retorna quantidade + unidade normalizadas (ex.: 1000 g, 500 ml, 12 un)
 * para permitir cálculo de "preço por unidade" (R$/kg, R$/L, R$/un).
 */

export type PackageDetection = {
  size_value: number | null;
  size_unit: "g" | "ml" | "un" | null;
  brand: string | null;
  packaging: string | null; // ex: "pote", "saco", "garrafa"
  confidence: "low" | "medium" | "high";
  price_per_unit: number | null; // preenchido quando price é fornecido
  unit_label: string | null;     // "R$/kg", "R$/L", "R$/un"
  raw: string;
};

const SYSTEM = `Você identifica embalagem e peso/volume de um produto de supermercado a partir de uma imagem.
Responda EXCLUSIVAMENTE em JSON válido:
{
  "size_value": number|null,     // ex.: 1000 para "1 kg", 500 para "500 ml", 12 para "12 un"
  "size_unit":  "g"|"ml"|"un"|null,
  "brand": string|null,
  "packaging": string|null,      // "saco","pote","garrafa","lata","caixa","bandeja"
  "confidence": "low"|"medium"|"high"
}

Regras:
- Converta kg→g e L→ml. 1 kg = 1000 g; 1 L = 1000 ml.
- Se ver apenas "unidade/pacote com N itens", use size_value=N e size_unit="un".
- Se o rótulo não estiver legível, retorne null.
- Não invente marca ou peso.`;

function normalizeUnitLabel(unit: string | null): string | null {
  if (unit === "g") return "R$/kg";
  if (unit === "ml") return "R$/L";
  if (unit === "un") return "R$/un";
  return null;
}
function pricePerBaseUnit(price: number, value: number, unit: string): number | null {
  if (!Number.isFinite(price) || !Number.isFinite(value) || value <= 0) return null;
  if (unit === "g") return price / (value / 1000); // R$/kg
  if (unit === "ml") return price / (value / 1000); // R$/L
  if (unit === "un") return price / value;
  return null;
}

const inputSchema = z.object({
  image: z.string().min(4),
  price: z.number().positive().max(1_000_000).optional().nullable(),
});

export const detectPackageFromImage = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<PackageDetection> => {
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
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: "Extraia embalagem e peso/volume deste produto." },
              { type: "image_url", image_url: { url: data.image } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("Limite de IA atingido. Tente em 1 min.");
      if (res.status === 402) throw new Error("Créditos de IA esgotados.");
      throw new Error(`IA falhou [${res.status}]: ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }

    const num = (v: unknown): number | null => {
      const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
      return Number.isFinite(n) && n > 0 ? n : null;
    };
    const str = (v: unknown): string | null => {
      if (typeof v !== "string") return null;
      const t = v.trim();
      return t.length > 0 ? t : null;
    };

    const unitRaw = str(parsed.size_unit)?.toLowerCase() ?? null;
    const size_unit: PackageDetection["size_unit"] =
      unitRaw === "g" || unitRaw === "ml" || unitRaw === "un" ? unitRaw : null;

    const size_value = num(parsed.size_value);
    const confRaw = str(parsed.confidence);
    const confidence: PackageDetection["confidence"] =
      confRaw === "high" || confRaw === "medium" ? confRaw : "low";

    let price_per_unit: number | null = null;
    let unit_label: string | null = null;
    if (data.price != null && size_value != null && size_unit) {
      price_per_unit = pricePerBaseUnit(Number(data.price), size_value, size_unit);
      unit_label = normalizeUnitLabel(size_unit);
    }

    return {
      size_value,
      size_unit,
      brand: str(parsed.brand),
      packaging: str(parsed.packaging),
      confidence,
      price_per_unit,
      unit_label,
      raw,
    };
  });
