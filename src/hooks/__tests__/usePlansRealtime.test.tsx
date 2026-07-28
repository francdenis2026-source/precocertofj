import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

type Handler = (payload: unknown) => void;
const handlers: Handler[] = [];

vi.mock("@/integrations/supabase/client", () => {
  const channel = {
    on: (_event: string, _filter: unknown, cb: Handler) => {
      handlers.push(cb);
      return channel;
    },
    subscribe: () => channel,
  };
  return {
    supabase: {
      channel: () => channel,
      removeChannel: vi.fn(),
    },
  };
});

import { usePlansRealtime } from "../usePlansRealtime";

function wrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe("usePlansRealtime — integração com license_plans", () => {
  beforeEach(() => {
    handlers.length = 0;
  });

  it("invalida todos os caches de planos ao receber evento realtime", async () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, "invalidateQueries");

    renderHook(() => usePlansRealtime({ throttleMs: 0 }), { wrapper: wrapper(qc) });

    // Simula UPDATE em license_plans (admin altera preço/dias)
    act(() => handlers.forEach((h) => h({ eventType: "UPDATE" })));

    await new Promise((r) => setTimeout(r, 20));

    const keys = spy.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
    // Cobertura: /planos, homepage (via listPublicPlans), admin, checkout
    expect(keys).toContain('["public-plans"]');
    expect(keys).toContain('["plans-active"]');
    expect(keys).toContain('["license-plans"]');
    expect(keys).toContain('["admin","plans"]');
    expect(keys).toContain('["active-plan"]');
  });
});
