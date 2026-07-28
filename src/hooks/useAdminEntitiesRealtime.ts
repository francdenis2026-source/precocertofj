import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

type AdminTable = "establishments" | "product_catalog" | "profiles";

type ChangePayload = {
  table: AdminTable;
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
};

/**
 * Assina em tempo real as tabelas administrativas e chama `onChange` de
 * forma agrupada (throttle) quando qualquer uma delas mudar. Também
 * pode invocar `onEvent` por evento (sem throttle) para exibir toasts.
 */
export function useAdminEntitiesRealtime(
  onChange: () => void,
  opts?: {
    enabled?: boolean;
    throttleMs?: number;
    tables?: Array<AdminTable>;
    onEvent?: (payload: ChangePayload) => void;
    channelKey?: string;
  },
) {
  const enabled = opts?.enabled ?? true;
  const throttleMs = opts?.throttleMs ?? 1500;
  const tables = opts?.tables ?? ["establishments", "product_catalog", "profiles"];
  const cbRef = useRef(onChange);
  const evtRef = useRef(opts?.onEvent);
  cbRef.current = onChange;
  evtRef.current = opts?.onEvent;

  const channelKey = opts?.channelKey ?? tables.join("-");

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let timer: number | null = null;
    const schedule = () => {
      if (timer !== null) return;
      timer = window.setTimeout(() => {
        timer = null;
        cbRef.current();
      }, throttleMs);
    };

    let ch = supabase.channel(`admin-entities-${channelKey}-${Math.random().toString(36).slice(2, 8)}`);
    for (const t of tables) {
      ch = ch.on(
        "postgres_changes",
        { event: "*", schema: "public", table: t },
        (payload) => {
          if (evtRef.current) {
            evtRef.current({
              table: t,
              eventType: payload.eventType as ChangePayload["eventType"],
              new: (payload.new as Record<string, unknown>) ?? null,
              old: (payload.old as Record<string, unknown>) ?? null,
            });
          }
          schedule();
        },
      );
    }
    ch.subscribe();

    return () => {
      if (timer !== null) window.clearTimeout(timer);
      supabase.removeChannel(ch);
    };
  }, [enabled, throttleMs, channelKey, tables.join(",")]);
}

/**
 * Helper: converte um payload de mudança em uma mensagem legível para toast.
 */
export function describeRealtimeChange(payload: ChangePayload): { title: string; description: string } {
  const tableLabels: Record<AdminTable, string> = {
    establishments: "Estabelecimento",
    product_catalog: "Produto do catálogo",
    profiles: "Cliente",
  };
  const evtLabels = { INSERT: "adicionado", UPDATE: "atualizado", DELETE: "removido" } as const;
  const label = tableLabels[payload.table];
  const evt = evtLabels[payload.eventType];

  const row = payload.new ?? payload.old ?? {};
  const name =
    (row as { display_name?: string; name?: string; full_name?: string }).display_name ??
    (row as { name?: string }).name ??
    (row as { full_name?: string }).full_name ??
    (row as { id?: string }).id ??
    "sem identificação";

  return {
    title: `${label} ${evt}`,
    description: String(name),
  };
}
