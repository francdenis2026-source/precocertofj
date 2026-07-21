/**
 * Gate para rotas do painel do cliente.
 * - sem sessão            → /login
 * - sem profile (raro)    → /login  (não deveria acontecer após signUpWithCpf)
 * - status "expired"      → /assinar
 * - status "trial|active" → renderiza children
 */
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMyAccount, type AccountView } from "@/lib/account.functions";
import { Loader2 } from "lucide-react";

export function ProtectedGate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const fetchAccount = useServerFn(getMyAccount);

  const sessionQuery = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session ?? null;
    },
    staleTime: 30_000,
  });

  const hasSession = !!sessionQuery.data;

  const accountQuery = useQuery<AccountView | null>({
    queryKey: ["my-account"],
    queryFn: () => fetchAccount(),
    enabled: hasSession,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (sessionQuery.isPending) return;
    if (!hasSession) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (accountQuery.isPending) return;
    const acc = accountQuery.data;
    // Erro ao carregar a conta (rede, RLS, etc.): não redireciona; deixa o
    // usuário tentar novamente sem entrar em loop com o /login.
    if (accountQuery.isError) return;
    if (!acc) {
      // Sessão existe mas o perfil sumiu: encerra a sessão órfã antes de
      // redirecionar para evitar loop com o auto-redirect do /login.
      void supabase.auth.signOut().finally(() => {
        navigate({ to: "/login", replace: true });
      });
      return;
    }
    if (acc.status === "expired") {
      navigate({ to: "/assinar", replace: true });
    }
  }, [
    sessionQuery.isPending,
    hasSession,
    accountQuery.isPending,
    accountQuery.isError,
    accountQuery.data,
    navigate,
  ]);

  if (
    sessionQuery.isPending ||
    (hasSession &&
      !accountQuery.isError &&
      (accountQuery.isPending || !accountQuery.data)) ||
    accountQuery.data?.status === "expired"
  ) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background px-6">
        <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-primary p-8 text-primary-foreground">
          <div
            className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-accent"
            aria-hidden
          />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] backdrop-blur">
              <span className="live-dot" aria-hidden />
              PreçoCerto
            </span>
            <p className="mt-5 font-display text-3xl font-extrabold leading-tight">
              Abrindo seu<br />painel...
            </p>
            <div className="mt-6 flex items-center gap-2 text-sm text-primary-foreground/85">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando favoritos e melhores preços
            </div>
          </div>
        </div>
      </div>
    );

  }

  if (hasSession && accountQuery.isError) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 text-center">
          <p className="font-display text-xl text-foreground">
            Não foi possível carregar sua conta
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Verifique sua conexão e tente novamente.
          </p>
          <button
            onClick={() => accountQuery.refetch()}
            className="mt-6 inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
          >
            Tentar novamente
          </button>
          <button
            onClick={() =>
              supabase.auth.signOut().then(() =>
                navigate({ to: "/login", replace: true }),
              )
            }
            className="mt-2 block w-full text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            Sair e entrar novamente
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
