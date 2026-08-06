import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeBarcode } from "@/lib/barcode";

export type VisionProduct = {
  productName: string | null;
  price: number | null;
  brand: string | null;
  unit: string | null;
  barcode: string | null;
  category: string | null;
  /** Produto já existente no catálogo com o mesmo código de barras. */
  catalogMatch?: { id: string; displayName: string } | null;

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
    {"productName": string|null, "brand": string|null, "unit": string|null, "price": number|null, "barcode": string|null, "category": string|null}
  ],
  "confidence": "low"|"medium"|"high"
}

Regras:
- price em reais como número (ex.: 12.90). "R$ 12,90" vira 12.90.
- barcode: leia o EAN/UPC **impresso na etiqueta de gôndola ou na embalagem**, abaixo das barras.
  * Copie apenas os dígitos, na ordem, sem espaços, pontos ou hífens.
  * Formatos válidos: 8 dígitos (EAN-8/UPC-E), 12 (UPC-A), 13 (EAN-13) ou 14 (GTIN-14).
  * A maioria dos produtos brasileiros começa com 789 ou 790.
  * Se qualquer dígito estiver borrado, cortado ou você precisar adivinhar, use null.
    É melhor null do que um código errado.
  * Nunca use o preço, o código interno da loja (PLU) ou a data de validade como barcode.
- unit: ex. "1L", "500g", "pacote 5kg".
- category: uma destas quando possível — "laticinios", "carnes", "padaria", "biscoitos", "snacks", "doces", "bebidas", "bebidas_em_po", "prontos", "condimentos", "hortifruti", "mercearia", "congelados", "limpeza", "papel_descartaveis", "higiene", "bucal", "cabelo", "cuidados_pele", "perfumaria", "medicamentos", "suplementos", "infantil", "pet", "bazar", "papelaria", "outros". Se não souber, use null.
- brand: marca visível (ex.: "Nestlé", "Ypê"). Sem marca visível → null.
- Se só houver 1 produto, retorne um array de 1 item.
- Se nada legível, retorne { "products": [], "confidence": "low" }.`;

export const analyzeProductImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { image: string }) => {
    if (!input.image) throw new Error("image obrigatória");
    if (typeof input.image !== "string" || input.image.length > 12_000_000) {
      throw new Error("Imagem inválida ou muito grande");
    }
    return input;
  })
  .handler(async ({ data, context }): Promise<VisionExtract> => {
    const { assertAiRateLimit, logAiUsage } = await import("@/lib/ai-guard.server");
    const userId = context.userId;
    await assertAiRateLimit(userId, "analyzeProductImage", 60, 60);
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
      const msg =
        res.status === 429
          ? "Limite de IA atingido. Tente em 1 min."
          : res.status === 402
            ? "Créditos de IA esgotados."
            : `IA falhou [${res.status}]: ${body.slice(0, 200)}`;
      await logAiUsage({
        userId,
        functionName: "analyzeProductImage",
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
      functionName: "analyzeProductImage",
      model: "google/gemini-2.5-flash",
      promptTokens: json.usage?.prompt_tokens,
      completionTokens: json.usage?.completion_tokens,
      totalTokens: json.usage?.total_tokens,
      success: true,
      durationMs: Date.now() - startedAt,
    });
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
      // Descarta códigos que não passam no dígito verificador: um EAN errado
      // vincularia produtos diferentes entre si.
      barcode: normalizeBarcode(toStr(p.barcode)),
      category: toStr(p.category),
      catalogMatch: null,
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

    // Vincula automaticamente ao catálogo já existente pelos códigos válidos.
    const codes = Array.from(
      new Set(products.map((p) => p.barcode).filter((b): b is string => Boolean(b))),
    );
    if (codes.length > 0) {
      try {
        const { data: rows } = await context.supabase
          .from("product_catalog")
          .select("id, display_name, barcode")
          .in("barcode", codes);
        const byCode = new Map<string, { id: string; displayName: string }>(
          (rows ?? [])
            .filter((r): r is { id: string; display_name: string; barcode: string } =>
              typeof r.barcode === "string" && r.barcode.length > 0,
            )
            .map((r) => [r.barcode, { id: r.id, displayName: r.display_name }]),
        );
        products = products.map((p) => ({
          ...p,
          catalogMatch: p.barcode ? (byCode.get(p.barcode) ?? null) : null,
        }));
      } catch {
        // Vínculo é um extra: falha aqui não pode derrubar a extração.
      }
    }



    const first = products[0] ?? {
      productName: null,
      price: null,
      brand: null,
      unit: null,
      barcode: null,
      category: null,
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

