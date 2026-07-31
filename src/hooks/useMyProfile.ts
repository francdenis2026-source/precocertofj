import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyAccount } from "@/lib/account.functions";
import { useSession } from "./useSession";

/**
 * Retorna dados básicos do perfil do usuário autenticado (nome, avatar).
 * Compartilhado por Nav, AppHeader e outros componentes que precisam
 * exibir a identidade do usuário logado.
 */
export function useMyProfile() {
  const { session, loading: sessionLoading } = useSession();
  const fetchAccount = useServerFn(getMyAccount);

  const query = useQuery({
    queryKey: ["my-account"],
    queryFn: () => fetchAccount(),
    enabled: !!session,
    staleTime: 5 * 60_000,
  });

  const fullName = query.data?.fullName ?? null;
  const firstName = fullName ? fullName.trim().split(/\s+/)[0] : null;
  const initials = fullName
    ? fullName
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? "")
        .join("")
    : null;

  return {
    session,
    loading: sessionLoading || (!!session && query.isLoading),
    fullName,
    firstName,
    initials,
    avatarUrl: query.data?.avatarUrl ?? null,
  };
}
