import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Sessão atual do Supabase, compartilhada por toda a UI (mesma queryKey do
 * ProtectedGate). Use `hasSession` para habilitar queries que chamam server
 * functions protegidas — sem isso a chamada sai sem Authorization e o servidor
 * responde "Unauthorized: No authorization header provided".
 */
export function useSessionGate() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session ?? null;
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      qc.setQueryData(["auth-session"], session ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [qc]);

  return {
    session: query.data ?? null,
    hasSession: !!query.data,
    isPending: query.isPending,
  };
}
