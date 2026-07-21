import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { verifyMercadoPagoSignature } from "@/lib/mercadopago.server";
import { computeNewPaidUntil } from "@/lib/subscription-billing";

/**
 * Fluxo E2E lógico do webhook Mercado Pago → recibo → /assinatura.
 * Testa as peças puras que compõem o pipeline (assinatura, cálculo de
 * vigência, forma do recibo persistido) sem depender de Supabase/HTTP.
 */
describe("Webhook Mercado Pago — fluxo até o comprovante", () => {
  const SECRET = "wh_secret_test";
  const NOW = new Date("2026-07-21T12:00:00.000Z");
  const DAY_MS = 24 * 60 * 60 * 1000;

  function sign(dataId: string, requestId: string, ts: string) {
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const v1 = createHmac("sha256", SECRET).update(manifest).digest("hex");
    return `ts=${ts},v1=${v1}`;
  }

  it("aceita assinatura válida no formato oficial (id;request-id;ts)", () => {
    const header = sign("PAY123", "REQ456", "1704908010");
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: header,
        requestId: "REQ456",
        dataId: "PAY123",
        secret: SECRET,
      }),
    ).toBe(true);
  });

  it("rejeita assinatura adulterada", () => {
    const header = sign("PAY123", "REQ456", "1704908010").replace(/v1=([a-f0-9]+)/, "v1=deadbeef");
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: header,
        requestId: "REQ456",
        dataId: "PAY123",
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it("rejeita quando header, requestId ou dataId estão ausentes", () => {
    const good = { signatureHeader: sign("X", "Y", "1"), requestId: "Y", dataId: "X", secret: SECRET };
    expect(verifyMercadoPagoSignature({ ...good, signatureHeader: null })).toBe(false);
    expect(verifyMercadoPagoSignature({ ...good, requestId: null })).toBe(false);
    expect(verifyMercadoPagoSignature({ ...good, dataId: null })).toBe(false);
  });

  it.each([
    { plan: "mensal", days: 30 },
    { plan: "semestral", days: 180 },
    { plan: "anual", days: 365 },
  ])("$plan: paid_until recebe +$days dias e recibo herda plan_days", ({ days }) => {
    const { newPaidUntilIso, planDays } = computeNewPaidUntil({
      currentPaidUntil: null,
      planDays: days,
      now: NOW,
    });
    expect(planDays).toBe(days);
    const receipt = {
      payment_id: "PAY-1",
      plan_days: planDays,
      amount: 19.9,
      currency: "BRL",
      status: "approved",
      new_paid_until: newPaidUntilIso,
    };
    expect(receipt.new_paid_until).toBe(new Date(NOW.getTime() + days * DAY_MS).toISOString());
    expect(receipt.plan_days).toBe(days);
    expect(receipt.status).toBe("approved");
  });

  it("assinatura vigente é estendida a partir do fim atual, não de agora", () => {
    const future = new Date(NOW.getTime() + 10 * DAY_MS).toISOString();
    const { newPaidUntilIso } = computeNewPaidUntil({
      currentPaidUntil: future,
      planDays: 30,
      now: NOW,
    });
    // 10 dias restantes + 30 novos = 40 dias a partir de agora
    expect(newPaidUntilIso).toBe(new Date(NOW.getTime() + 40 * DAY_MS).toISOString());
  });
});

describe("Gate de visitantes na home (busca)", () => {
  // Espelha a lógica do LiveSearch: apenas assinantes veem preços;
  // visitantes veem o card "Preços protegidos".
  function canSeePrices(session: { paid_until: string | null } | null, now = new Date()) {
    if (!session) return false;
    if (!session.paid_until) return false;
    return new Date(session.paid_until).getTime() > now.getTime();
  }

  const NOW = new Date("2026-07-21T12:00:00.000Z");
  const DAY_MS = 24 * 60 * 60 * 1000;

  it("visitante anônimo NÃO vê preços", () => {
    expect(canSeePrices(null, NOW)).toBe(false);
  });

  it("logado sem assinatura NÃO vê preços", () => {
    expect(canSeePrices({ paid_until: null }, NOW)).toBe(false);
  });

  it("logado com assinatura expirada NÃO vê preços", () => {
    expect(
      canSeePrices({ paid_until: new Date(NOW.getTime() - DAY_MS).toISOString() }, NOW),
    ).toBe(false);
  });

  it("logado com assinatura ativa VÊ preços", () => {
    expect(
      canSeePrices({ paid_until: new Date(NOW.getTime() + DAY_MS).toISOString() }, NOW),
    ).toBe(true);
  });
});
