/**
 * usePersistentSidebar — persiste o estado (expandido/colapsado) do menu
 * lateral **por usuário** e **por dispositivo**.
 *
 * - Por dispositivo: o valor vive em `localStorage`, então cada navegador/
 *   aparelho mantém sua própria preferência.
 * - Por usuário: a chave inclui o id da sessão atual (ou `guest`), evitando
 *   que a preferência de uma conta vaze para outra no mesmo aparelho.
 * - Escopo separado para o console admin e a área do cliente.
 *
 * A leitura acontece em `useEffect` (nunca durante o render) para não
 * causar divergência de hidratação no SSR.
 */

import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/hooks/useSession";

const PREFIX = "pc.sidebar.open";

function storageKey(scope: string, userId: string) {
  return `${PREFIX}.${scope}.${userId}`;
}

export function usePersistentSidebar(scope: "admin" | "app", defaultOpen: boolean) {
  const { session, loading } = useSession();
  const userId = session?.user?.id ?? "guest";
  const key = storageKey(scope, userId);

  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (typeof window === "undefined" || loading) return;
    try {
      const raw = window.localStorage.getItem(key);
      setOpen(raw === null ? defaultOpen : raw === "1");
    } catch {
      setOpen(defaultOpen);
    }
  }, [key, defaultOpen, loading]);

  const onOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (typeof window === "undefined") return;
      try {
        window.localStorage.setItem(key, next ? "1" : "0");
      } catch {
        /* storage indisponível (modo privado) — estado segue apenas em memória */
      }
    },
    [key],
  );

  return { open, onOpenChange };
}
