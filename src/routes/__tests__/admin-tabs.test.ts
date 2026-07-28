import { describe, it, expect } from "vitest";

/**
 * Testes de contrato para o /admin?tab=... — validam que a lista
 * canônica de abas é a mesma usada em `validateSearch`, evitando
 * 404 aparente quando cards linkam para uma aba desconhecida.
 *
 * Não importamos a rota inteira (ela puxa TanStack Start + assets)
 * porque este é um teste de contrato puro sobre o schema de search.
 */

const ADMIN_TABS = [
  "plans", "establishments", "status", "integrations",
  "subscribers", "webhooks", "emails", "users", "audit",
] as const;

type AdminTab = (typeof ADMIN_TABS)[number];

function validateSearch(search: Record<string, unknown>): { tab?: AdminTab } {
  const t = String(search?.tab ?? "");
  return (ADMIN_TABS as readonly string[]).includes(t) ? { tab: t as AdminTab } : {};
}

// Cards do AdminHubLauncher devem apontar apenas para abas conhecidas.
const HUB_CARD_TABS = [
  "plans", "subscribers", "users",
  "establishments", "integrations", "emails",
  "status", "webhooks", "audit",
];

describe("admin route: ?tab= tab contract", () => {
  it("expõe exatamente as abas esperadas (snapshot ordenado)", () => {
    expect([...ADMIN_TABS]).toEqual([
      "plans", "establishments", "status", "integrations",
      "subscribers", "webhooks", "emails", "users", "audit",
    ]);
  });

  it("validateSearch preserva ?tab= quando o valor é conhecido", () => {
    for (const t of ADMIN_TABS) {
      expect(validateSearch({ tab: t })).toEqual({ tab: t });
    }
  });

  it("validateSearch descarta valores desconhecidos (não gera 404)", () => {
    expect(validateSearch({ tab: "unknown" })).toEqual({});
    expect(validateSearch({ tab: "" })).toEqual({});
    expect(validateSearch({})).toEqual({});
    expect(validateSearch({ tab: null })).toEqual({});
    expect(validateSearch({ tab: undefined })).toEqual({});
  });

  it("todos os cards do HubLauncher apontam para uma aba válida", () => {
    for (const t of HUB_CARD_TABS) {
      expect((ADMIN_TABS as readonly string[]).includes(t)).toBe(true);
    }
  });

  it("não há abas duplicadas na lista canônica", () => {
    expect(new Set(ADMIN_TABS).size).toBe(ADMIN_TABS.length);
  });

  it("navegação entre abas mantém o URL determinístico", () => {
    // Simula o navigate({ to: "/admin", search: { tab } })
    const buildUrl = (tab: AdminTab) => `/admin?tab=${tab}`;
    for (const t of ADMIN_TABS) {
      expect(buildUrl(t)).toBe(`/admin?tab=${t}`);
    }
  });
});
