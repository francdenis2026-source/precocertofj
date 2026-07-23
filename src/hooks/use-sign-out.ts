import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
      toast.success("Você saiu da sua conta.");
    } catch (err) {
      console.error("[signOut]", err);
      toast.error("Não foi possível encerrar a sessão totalmente.");
    } finally {
      setLoading(false);
    }
  };

  return { signOut, loading };
}
