import { describe, it, expect } from "vitest";
import { computeNewPaidUntil } from "@/lib/subscription-billing";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("computeNewPaidUntil (Mercado Pago webhook)", () => {
  const NOW = new Date("2026-07-21T12:00:00.000Z");

  it("mensal: estende paid_until em 30 dias a partir de agora quando não há assinatura vigente", () => {
    const { newPaidUntilIso, planDays } = computeNewPaidUntil({
      currentPaidUntil: null,
      planDays: 30,
      now: NOW,
    });
    expect(planDays).toBe(30);
    expect(newPaidUntilIso).toBe(
      new Date(NOW.getTime() + 30 * DAY_MS).toISOString(),
    );
  });

  it("semestral: aplica 180 dias corretamente", () => {
    const { newPaidUntilIso, planDays } = computeNewPaidUntil({
      currentPaidUntil: null,
      planDays: 180,
      now: NOW,
    });
    expect(planDays).toBe(180);
    expect(newPaidUntilIso).toBe(
      new Date(NOW.getTime() + 180 * DAY_MS).toISOString(),
    );
  });

  it("anual: aplica 365 dias corretamente", () => {
    const { newPaidUntilIso, planDays } = computeNewPaidUntil({
      currentPaidUntil: null,
      planDays: 365,
      now: NOW,
    });
    expect(planDays).toBe(365);
    expect(newPaidUntilIso).toBe(
      new Date(NOW.getTime() + 365 * DAY_MS).toISOString(),
    );
  });

  it("empilha períodos: usuário com assinatura vigente estende a partir da data existente", () => {
    const existing = new Date(NOW.getTime() + 10 * DAY_MS).toISOString();
    const { newPaidUntilIso } = computeNewPaidUntil({
      currentPaidUntil: existing,
      planDays: 30,
      now: NOW,
    });
    // 10 dias restantes + 30 dias comprados = 40 dias a partir de agora
    expect(newPaidUntilIso).toBe(
      new Date(NOW.getTime() + 40 * DAY_MS).toISOString(),
    );
  });

  it("assinatura vencida: descarta paid_until passado e reinicia a partir de agora", () => {
    const expired = new Date(NOW.getTime() - 5 * DAY_MS).toISOString();
    const { newPaidUntilIso } = computeNewPaidUntil({
      currentPaidUntil: expired,
      planDays: 30,
      now: NOW,
    });
    expect(newPaidUntilIso).toBe(
      new Date(NOW.getTime() + 30 * DAY_MS).toISOString(),
    );
  });

  it("plan_days ausente/zero/inválido: fallback para 30 dias", () => {
    const cases: unknown[] = [undefined, null, 0, -10, "abc", NaN];
    for (const bad of cases) {
      const { planDays, newPaidUntilIso } = computeNewPaidUntil({
        currentPaidUntil: null,
        planDays: bad,
        now: NOW,
      });
      expect(planDays).toBe(30);
      expect(newPaidUntilIso).toBe(
        new Date(NOW.getTime() + 30 * DAY_MS).toISOString(),
      );
    }
  });

  it("plan_days como string numérica é aceito", () => {
    const { planDays } = computeNewPaidUntil({
      currentPaidUntil: null,
      planDays: "180",
      now: NOW,
    });
    expect(planDays).toBe(180);
  });
});
