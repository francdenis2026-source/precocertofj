import { createServerFn } from "@tanstack/react-start";

export type VisionProduct = {
  productName: string | null;
  price: number | null;
  brand: string | null;
  unit: string | null;
  barcode: string | null;
  category: string | null;
};

export type VisionExtract = {
  /** All products the AI could identify in the photo. */
  products: VisionProduct[];
  /** Legacy single-product convenience — first product from `products`. */
  productName: string | null;
  price: number | null;
  brand: string | null;
  unit: string | null;
  barcode: string | null;
  confidence: "low" | "medium" | "high";
  raw: string;
};

const SYSTEM_PROMPT = `Você analisa fotos de qualquer produto (não apenas notas fiscais).
A foto pode conter UM produto ou VÁRIOS lado a lado (prateleira, sacola, cupom, etiqueta).
Extraia todos os produtos claramente visíveis com nome e preço em reais.
Nunca invente — se um campo não estiver legível, use null.

Responda EXCLUSIVAMENTE em JSON válido:
{
  "products": [
    {"productName": string|null, "brand": string|null, "unit": string|null, "price": number|null, "barcode": string|null}
  ],
  "confidence": "low"|"medium"|"high"
}

Regras:
- price em reais como número (ex.: 12.90). "R$ 12,90" vira 12.90.
- barcode apenas se o EAN/UPC estiver legível.
- unit: ex. "1L", "500g", "pacote 5kg".
- Se só houver 1 produto, retorne um array de 1 item.
- Se nada legível, retorne { "products": [], "confidence": "low" }.`;

export const analyzeProductImage = createServerFn({ method: "POST" })
  .inputValidator((input: { image: string }) => {
    if (!input.image) throw new Error("image obrigatória");
    return input;
  })
  .handler(async ({ data }): Promise<VisionExtract> => {
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
              {
                type: "text",
                text: "Extraia todos os produtos e preços visíveis desta foto.",
              },
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
    let parsed: {
      products?: unknown;
      confidence?: unknown;
      // legacy single-product shape from earlier prompts
      productName?: unknown;
      price?: unknown;
      barcode?: unknown;
      brand?: unknown;
      unit?: unknown;
    } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }

    const toNum = (v: unknown): number | null => {
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (typeof v === "string") {
        const n = Number(v.replace(",", ".").replace(/[^0-9.]/g, ""));
        return Number.isFinite(n) && n > 0 ? n : null;
      }
      return null;
    };
    const toStr = (v: unknown): string | null => {
      if (typeof v !== "string") return null;
      const t = v.trim();
      return t.length > 0 ? t : null;
    };
    const normalize = (p: Record<string, unknown>): VisionProduct => ({
      productName: toStr(p.productName),
      brand: toStr(p.brand),
      unit: toStr(p.unit),
      price: toNum(p.price),
      barcode: toStr(p.barcode),
    });

    let products: VisionProduct[] = [];
    if (Array.isArray(parsed.products)) {
      products = parsed.products
        .filter((p): p is Record<string, unknown> => p !== null && typeof p === "object")
        .map(normalize)
        .filter((p) => p.productName || p.price);
    } else if (parsed.productName || parsed.price) {
      // Fallback: model returned the legacy single-product shape.
      products = [
        normalize({
          productName: parsed.productName,
          price: parsed.price,
          brand: parsed.brand,
          unit: parsed.unit,
          barcode: parsed.barcode,
        }),
      ];
    }

    const first = products[0] ?? {
      productName: null,
      price: null,
      brand: null,
      unit: null,
      barcode: null,
    };

    return {
      products,
      productName: first.productName,
      brand: first.brand,
      unit: first.unit,
      price: first.price,
      barcode: first.barcode,
      confidence:
        parsed.confidence === "high" || parsed.confidence === "medium"
          ? parsed.confidence
          : "low",
      raw,
    };
  });

