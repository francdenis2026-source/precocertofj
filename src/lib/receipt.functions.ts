import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";

export type ReceiptItem = {
  productName: string;
  price: number;
  quantity: number | null;
  unit: string | null;
  barcode: string | null;
  totalPrice: number | null;
};

export type ReceiptExtract = {
  marketName: string | null;
  cnpj: string | null;
  ie: string | null;
  address: string | null;
  couponNumber: string | null;
  accessKey: string | null;
  issuedAt: string | null;
  total: number | null;
  amountPaid: number | null;
  items: ReceiptItem[];
  raw: string;
};

const SYSTEM = `Você é um analisador de cupons/notas fiscais brasileiras (NFC-e, cupom fiscal, SAT).
Retorne EXCLUSIVAMENTE um JSON válido no formato:
{
  "marketName": string|null,
  "cnpj": string|null,
  "ie": string|null,
  "address": string|null,
  "couponNumber": string|null,
  "accessKey": string|null,
  "issuedAt": string|null,
  "total": number|null,
  "amountPaid": number|null,
  "items": [
    {
      "productName": string,
      "price": number,
      "quantity": number|null,
      "unit": string|null,
      "barcode": string|null,
      "totalPrice": number|null
    }
  ]
}

Regras:
- cnpj no formato "XX.XXX.XXX/XXXX-XX".
- accessKey são exatamente 44 dígitos numéricos da NFC-e (chave de acesso). Retorne só os dígitos, sem espaços.
- couponNumber é o número do cupom/COO/nº NFC-e.
- issuedAt em ISO 8601 (ex.: "2026-07-09T14:30:00-05:00"). Use fuso do estado se souber; senão, deixe null.
- total é o valor total da nota. amountPaid é o valor pago (pode ser igual ao total).
- Em cada item: price = VALOR UNITÁRIO em reais (ex.: 14.99). totalPrice = valor total daquela linha (qtd × unit).
- quantity: número em kg/UN conforme unit ("1", "0.154", "3.3642").
- unit: "UN", "KG", "L", "PC" etc.
- barcode: apenas se aparecer EAN/UPC legível — não use o código interno de PDV.
- Ignore desconto, subtotal, taxa, troco, itens cancelados. Somente produtos vendidos.
- Campo desconhecido = null. NUNCA invente.`;

export const extractReceiptItems = createServerFn({ method: "POST" })
  .inputValidator((input: { image: string }) => {
    if (!input.image) throw new Error("image obrigatória");
    return input;
  })
  .handler(async ({ data }): Promise<ReceiptExtract> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: "Extraia TODOS os dados fiscais e itens deste cupom." },
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
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = json.choices?.[0]?.message?.content ?? "{}";

    type ParsedReceipt = {
      marketName?: unknown;
      cnpj?: unknown;
      ie?: unknown;
      address?: unknown;
      couponNumber?: unknown;
      accessKey?: unknown;
      issuedAt?: unknown;
      total?: unknown;
      amountPaid?: unknown;
      items?: unknown;
    };
    let parsed: ParsedReceipt = {};
    try {
      parsed = JSON.parse(raw) as ParsedReceipt;
    } catch {
      /* ignore */
    }

    const toNum = (v: unknown): number | null => {
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (typeof v === "string") {
        const n = Number(v.replace(/\./g, "").replace(",", "."));
        if (Number.isFinite(n) && n > 0) return n;
        const n2 = Number(v.replace(",", ".").replace(/[^0-9.]/g, ""));
        return Number.isFinite(n2) && n2 > 0 ? n2 : null;
      }
      return null;
    };
    const toStr = (v: unknown): string | null => {
      if (typeof v !== "string") return null;
      const t = v.trim();
      return t.length > 0 ? t : null;
    };
    const toAccessKey = (v: unknown): string | null => {
      const s = toStr(v);
      if (!s) return null;
      const digits = s.replace(/\D/g, "");
      return digits.length === 44 ? digits : null;
    };

    const items: ReceiptItem[] = Array.isArray(parsed.items)
      ? (parsed.items as unknown[])
          .map((it) => {
            const item = (it ?? {}) as Record<string, unknown>;
            const name = toStr(item.productName);
            const price = toNum(item.price);
            if (!name || !price) return null;
            return {
              productName: name,
              price,
              quantity: toNum(item.quantity),
              unit: toStr(item.unit),
              barcode: toStr(item.barcode),
              totalPrice: toNum(item.totalPrice),
            } satisfies ReceiptItem;
          })
          .filter((x): x is ReceiptItem => x !== null)
      : [];

    return {
      marketName: toStr(parsed.marketName),
      cnpj: toStr(parsed.cnpj),
      ie: toStr(parsed.ie),
      address: toStr(parsed.address),
      couponNumber: toStr(parsed.couponNumber),
      accessKey: toAccessKey(parsed.accessKey),
      issuedAt: toStr(parsed.issuedAt),
      total: toNum(parsed.total),
      amountPaid: toNum(parsed.amountPaid),
      items,
      raw,
    };
  });

export type SaveReceiptInput = {
  establishmentId: string;
  couponNumber: string | null;
  accessKey: string | null;
  issuedAt: string | null;
  total: number | null;
  amountPaid: number | null;
  imageUrl: string | null;
  items: ReceiptItem[];
  marketName: string | null;
};

export type SaveReceiptResult = {
  receiptId: string;
  itemsSaved: number;
};

export const saveReceipt = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: SaveReceiptInput) => {
    if (!input.establishmentId) throw new Error("Estabelecimento obrigatório");
    if (!Array.isArray(input.items) || input.items.length === 0)
      throw new Error("Nenhum item para salvar");
    return input;
  })
  .handler(async ({ data, context }): Promise<SaveReceiptResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const receiptsTable = supabaseAdmin.from("receipts" as never) as unknown as {
      insert: (v: Record<string, unknown>) => {
        select: (s: string) => {
          single: () => Promise<{
            data: { id: string } | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
    const { data: rec, error: recErr } = await receiptsTable
      .insert({
        establishment_id: data.establishmentId,
        coupon_number: data.couponNumber,
        access_key: data.accessKey,
        issued_at: data.issuedAt,
        total: data.total,
        amount_paid: data.amountPaid,
        image_url: data.imageUrl,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (recErr || !rec) throw new Error(recErr?.message ?? "Falha ao criar cupom");

    const scansRows = data.items.map((it) => ({
      market_name: data.marketName,
      establishment_id: data.establishmentId,
      receipt_id: rec.id,
      product_name: it.productName,
      price_captured: it.price,
      total_price: it.totalPrice,
      quantity: it.quantity,
      unit: it.unit,
      barcode: it.barcode,
      verdict: "unknown",
      status: "salvo",
      created_at: data.issuedAt ?? new Date().toISOString(),
    }));

    const scansTable = supabaseAdmin.from("scans" as never) as unknown as {
      insert: (v: Record<string, unknown>[]) => Promise<{ error: { message: string } | null }>;
    };
    const { error: scErr } = await scansTable.insert(scansRows);
    if (scErr) throw new Error(scErr.message);

    // Auto-cadastro no catálogo (consolida por barcode + normalized_name)
    try {
      const { ensureCatalogEntries } = await import("@/lib/catalog-sync.server");
      await ensureCatalogEntries(
        data.items.map((it) => ({
          productName: it.productName,
          barcode: it.barcode,
          unit: it.unit,
        })),
      );
    } catch (err) {
      console.error("[receipt] auto-cadastro catalog falhou:", err);
    }

    return { receiptId: rec.id, itemsSaved: scansRows.length };
  });
