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

  const signOut = async () => {
    if (loading) return;
    setLoading(true);
    // Redireciona imediatamente para a homepage — não faz o usuário
    // esperar a chamada de rede terminar.
    navigate({ to: "/", replace: true });
    try {
      await qc.cancelQueries();
      qc.clear();
      await supabase.auth.signOut();
      notify.success("Sessão encerrada", {
        id: "auth-session",
        description: "Sua sessão foi encerrada neste dispositivo. Listas, favoritos e alertas seguem salvos na sua conta.",
      });
    } catch (err) {
      console.error("[signOut]", err);
      notify.error("Falha ao encerrar a sessão", {
        id: "auth-session",
        description: "Sua sessão local foi limpa, mas o servidor não confirmou a saída. Tente sair novamente neste dispositivo.",
      });
    } finally {
      setLoading(false);
    }
  };

  return { signOut, loading };
}
