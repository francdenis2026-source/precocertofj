import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "./useSession";

export type AppRole = "admin" | "moderator" | "user";

export function useMyRoles() {
  const { user, loading: sessionLoading } = useSession();

  const query = useQuery({
    queryKey: ["my-roles", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<AppRole[]> => {
      const { data, error } = await supabase
        .from("user_roles" as never)
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      return ((data ?? []) as Array<{ role: AppRole }>).map((r) => r.role);
    },
    staleTime: 60_000,
  });

  return {
    roles: query.data ?? [],
    loading: sessionLoading || query.isLoading,
    isAdmin: (query.data ?? []).includes("admin"),
    user,
  };
}
