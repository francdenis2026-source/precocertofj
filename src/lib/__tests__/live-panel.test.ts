import { describe, expect, it } from "vitest";
import {
  LIVE_PANEL_ERROR_MESSAGE,
  LIVE_PANEL_PLACEHOLDER,
  buildLivePanel,
} from "../live-panel";

const OK_STATS = {
  establishments: 9,
  products: 1520,
  totalItems: 1520,
  priceRecords: 4300,
  ok: true,
  error: null,
};

describe("Painel ao vivo — integração dados → UI", () => {
  it("renderiza mercados, preços e economia com dados válidos", () => {
    const s = buildLivePanel({ stats: OK_STATS, economy: { avgSavingsPct: 18 } });
    expect(s.failed).toBe(false);
    expect(s.errorMessage).toBeNull();
    expect(s.metrics.map((m) => m.value)).toEqual(["9", "1.520", "18%"]);
    expect(s.metrics.map((m) => m.kind)).toEqual(["markets", "products", "savings"]);
  });

  it("sempre expõe as três métricas, mesmo sem dados", () => {
    const s = buildLivePanel({ stats: null, economy: null });
    expect(s.metrics).toHaveLength(3);
    for (const m of s.metrics) expect(m.value).toBe(LIVE_PANEL_PLACEHOLDER);
  });

  it("mostra placeholder + mensagem de erro quando a consulta falha", () => {
    const s = buildLivePanel({ stats: OK_STATS, economy: null, statsError: true });
    expect(s.failed).toBe(true);
    expect(s.errorMessage).toBe(LIVE_PANEL_ERROR_MESSAGE);
    expect(s.metrics.every((m) => m.value === LIVE_PANEL_PLACEHOLDER)).toBe(true);
  });

  it("trata ok:false do servidor como falha (não exibe zeros como verdade)", () => {
    const s = buildLivePanel({
      stats: { establishments: 0, products: 0, totalItems: 0, ok: false, error: "rpc down" },
      economy: { avgSavingsPct: 12 },
    });
    expect(s.failed).toBe(true);
    expect(s.metrics.map((m) => m.value)).toEqual(["—", "—", "—"]);
    // nunca vaza texto cru do banco
    expect(s.errorMessage).not.toContain("rpc");
  });

  it("durante o carregamento não marca erro", () => {
    const s = buildLivePanel({ stats: null, economy: null, statsLoading: true });
    expect(s.loading).toBe(true);
    expect(s.failed).toBe(false);
    expect(s.errorMessage).toBeNull();
  });

  it("economia isolada falha sem derrubar as demais métricas", () => {
    const s = buildLivePanel({ stats: OK_STATS, economy: null, economyError: true });
    expect(s.failed).toBe(false);
    expect(s.metrics[0].value).toBe("9");
    expect(s.metrics[2].value).toBe(LIVE_PANEL_PLACEHOLDER);
  });

  it("usa priceRecords quando não há contagem de produtos", () => {
    const s = buildLivePanel({
      stats: { establishments: 3, products: 0, totalItems: 0, priceRecords: 4300, ok: true },
      economy: { avgSavingsPct: 9.4 },
    });
    expect(s.metrics[1].value).toBe("4.300");
    expect(s.metrics[2].value).toBe("9%");
  });
});
