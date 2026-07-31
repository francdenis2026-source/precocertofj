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
        description: "Você saiu da sua conta com segurança. Seus dados continuam salvos.",
      });
    } catch (err) {
      console.error("[signOut]", err);
      notify.error("Não conseguimos encerrar a sessão por completo", {
        id: "auth-session",
        description: "Feche o navegador ou tente sair novamente para garantir a saída.",
      });
    } finally {
      setLoading(false);
    }
  };

  return { signOut, loading };
}
