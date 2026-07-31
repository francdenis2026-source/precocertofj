import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { notify } from "@/lib/notify";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fluxo canônico de sign-out. Usado em qualquer lugar da UI que
 * ofereça "Sair" para o usuário logado.
 */
export function useSignOut() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);

  const areaLabel = () => {
    if (typeof window === "undefined") return "área restrita";
    const p = window.location.pathname;
    if (p.startsWith("/admin")) return "painel administrativo";
    if (p.startsWith("/colaborador")) return "área do colaborador";
    if (p.startsWith("/app")) return "painel do cliente";
    return "área restrita";
  };

  const signOut = async () => {
    if (loading) return;
    const from = areaLabel();
    setLoading(true);
    // Redireciona imediatamente para a homepage — não faz o usuário
    // esperar a chamada de rede terminar.
    navigate({ to: "/", replace: true });
    try {
      await qc.cancelQueries();
      qc.clear();
      await supabase.auth.signOut();
      notify.success(`Você saiu do ${from}`, {
        id: "auth-session",
        description:
          "Sessão encerrada neste dispositivo e dados em cache limpos. Listas, favoritos e alertas continuam salvos na sua conta.",
      });
    } catch (err) {
      console.error("[signOut]", err);
      notify.error(`Saída do ${from} não foi confirmada`, {
        id: "auth-session",
        description:
          "Removemos a sessão deste dispositivo, mas o servidor não respondeu. Refaça o logout quando estiver on-line para encerrar a sessão em todos os aparelhos.",
      });
    } finally {
      setLoading(false);
    }
  };

  return { signOut, loading };
}
