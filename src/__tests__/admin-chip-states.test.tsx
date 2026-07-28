/**
 * Testes de UI para <AdminChip />: garante que cada tone renderiza
 * com data-attributes previsíveis, que estados loading/disabled
 * expõem ARIA correto, e que as classes de contraste são preservadas.
 *
 * Contraste em cor computada (rgb) é validado no CI visual/E2E; aqui
 * checamos que as classes que carregam os tokens `--pc-tone-*-ink`
 * seguem presentes — a tabela em tone-contrast.test.ts prova a
 * conformidade AA dos próprios tokens.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminChip } from "@/components/admin/AdminChip";

const TONES = [
  "neutral",
  "people",
  "catalog",
  "commerce",
  "system",
  "overview",
  "success",
  "warning",
  "danger",
] as const;

describe("AdminChip", () => {
  it("renderiza data-chip='admin' e data-tone correto para todos os tones", () => {
    for (const tone of TONES) {
      const { unmount } = render(<AdminChip tone={tone}>chip</AdminChip>);
      const el = screen.getByText("chip");
      expect(el.getAttribute("data-chip")).toBe("admin");
      expect(el.getAttribute("data-tone")).toBe(tone);
      unmount();
    }
  });

  it("estado loading expõe aria-busy e data-state", () => {
    render(
      <AdminChip tone="overview" loading>
        carregando
      </AdminChip>,
    );
    const el = screen.getByText("carregando");
    expect(el.getAttribute("aria-busy")).toBe("true");
    expect(el.getAttribute("data-state")).toBe("loading");
  });

  it("estado disabled expõe aria-disabled", () => {
    render(
      <AdminChip tone="system" disabled>
        bloqueado
      </AdminChip>,
    );
    const el = screen.getByText("bloqueado");
    expect(el.getAttribute("aria-disabled")).toBe("true");
  });

  it("mantém classes de token com contraste (ink) para tones coloridos", () => {
    const withInk: Array<(typeof TONES)[number]> = [
      "people",
      "catalog",
      "commerce",
      "system",
      "overview",
    ];
    for (const tone of withInk) {
      const { unmount } = render(<AdminChip tone={tone}>x</AdminChip>);
      const el = screen.getByText("x");
      // Foreground precisa apontar para o token *-ink (WCAG AA já validado
      // em tone-contrast.test.ts). Uma mudança para *-soft ou cor arbitrária
      // quebra este teste — que é o objetivo.
      expect(el.className).toMatch(new RegExp(`--pc-tone-${tone}-ink`));
      unmount();
    }
  });

  it("chip neutral usa tokens semânticos de secondary", () => {
    render(<AdminChip>neutro</AdminChip>);
    const el = screen.getByText("neutro");
    expect(el.className).toMatch(/bg-secondary/);
    expect(el.className).toMatch(/text-secondary-foreground/);
  });
});
