import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "./useSession";

export type AppRole = "admin" | "moderator" | "user";

export function useMyRoles() {
  const { user, loading: sessionLoading } = useSession();

  const query = useQuery({
    queryKey: ["my-roles", user?.id],
    enabled: !sessionLoading && !!user?.id,
    queryFn: async (): Promise<boolean> => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user || userData.user.id !== user!.id) return false;

      const { data, error } = await supabase.rpc("has_role", {
        _user_id: userData.user.id,
        _role: "admin",
      });
      if (error) throw error;
      return data === true;
    },
    retry: false,
    staleTime: 10_000,
  });

  const isAdmin = !!user && query.data === true;

  return {
    roles: isAdmin ? (["admin"] as AppRole[]) : [],
    loading: sessionLoading || (!!user?.id && query.isLoading),
    isAdmin,
    user,
  };
}
