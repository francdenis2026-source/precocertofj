/**
 * Gate para rotas do painel do cliente.
 * - sem sessão            → /login
 * - sem profile (raro)    → /login  (não deveria acontecer após signUpWithCpf)
 * - status "expired"      → /assinar
 * - status "trial|active" → renderiza children
 */
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMyAccount, type AccountView } from "@/lib/account.functions";
import painelLoadingBg from "@/assets/painel-loading-bg.jpg";

export function ProtectedGate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const fetchAccount = useServerFn(getMyAccount);
  // Contas internas (admin) não têm perfil de cliente, mas podem visualizar
  // o painel do cliente normalmente.
  const [allowWithoutProfile, setAllowWithoutProfile] = useState(false);

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
      // Sessão válida sem perfil de cliente: contas internas (admin) podem
      // continuar no painel do cliente; sem sessão de cliente nem admin,
      // volta para o login. Nunca encerrar a sessão aqui.
      void (async () => {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const { data: isAdmin } = await supabase.rpc("has_role", {
            _user_id: userData.user.id,
            _role: "admin",
          });
          if (isAdmin) {
            setAllowWithoutProfile(true);
            return;
          }
        }
        navigate({ to: "/login", replace: true });
      })();
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
    !allowWithoutProfile &&
    (sessionQuery.isPending ||
      (hasSession &&
        !accountQuery.isError &&
        (accountQuery.isPending || !accountQuery.data)) ||
      accountQuery.data?.status === "expired")
  ) {
    return (
      <div className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-background px-6">
        <img
          src={painelLoadingBg}
          alt=""
          aria-hidden
          width={1600}
          height={1200}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--primary)_78%,black)_0%,color-mix(in_oklab,var(--primary)_62%,black)_55%,color-mix(in_oklab,black_86%,transparent)_100%)] opacity-[0.92]"
        />
        <div
          role="status"
          aria-live="polite"
          className="relative w-full max-w-md rounded-3xl border border-white/12 bg-black/28 p-8 shadow-[0_28px_70px_-30px_rgba(0,0,0,0.85)] backdrop-blur-xl"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
            <span className="live-dot" aria-hidden />
            PreçoCerto
          </span>
          <p className="mt-5 font-display text-[26px] font-extrabold leading-[1.15] text-white sm:text-[30px]">
            Verificando sua assinatura e preparando o painel
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-white/80">
            Estamos validando sua sessão com segurança e sincronizando as listas,
            favoritos e os preços mais recentes dos mercados de Feijó.
          </p>
          <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-white/15">
            <div className="h-full w-1/3 animate-[pc-gate-slide_1.4s_ease-in-out_infinite] rounded-full bg-white/85" />
          </div>
          <p className="mt-3 text-[11.5px] uppercase tracking-[0.16em] text-white/65">
            Conexão segura · leva poucos segundos
          </p>
        </div>
      </div>
    );



  }

  if (hasSession && accountQuery.isError) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-background px-6">
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
