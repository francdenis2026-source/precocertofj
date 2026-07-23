import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Guard client-side para rotas /admin*. Verifica sessão E papel admin antes
 * de renderizar, impedindo flash de conteúdo protegido e bloqueando acesso
 * de clientes autenticados via URL direta. Rotas admin usam ssr:false porque
 * a sessão do Supabase vive em localStorage.
 *
 * A autorização real (RLS + `requireAdmin` nas server functions) permanece
 * como fonte da verdade; este guard é apenas o bloqueio de navegação.
 */
export async function adminBeforeLoad({ location }: { location: { href: string } }) {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw redirect({
      to: "/admin-login",
      replace: true,
      search: { redirect: location.href },
    });
  }

  // Revalida com o Auth server (getUser) e checa papel admin via RPC.
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    throw redirect({
      to: "/admin-login",
      replace: true,
      search: { redirect: location.href },
    });
  }

  const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", {
    _user_id: userData.user.id,
    _role: "admin",
  });

  if (roleErr || !isAdmin) {
    // Cliente logado sem papel admin → volta para a home do app.
    throw redirect({ to: "/app", replace: true });
  }
}

/**
 * Guard genérico de sessão para rotas de usuário logado (ex.: /loja/$id).
 * Redireciona para /cadastro quando o visitante não tem conta,
 * preservando o path de retorno.
 */
export async function requireAccountBeforeLoad({ location }: { location: { href: string } }) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    throw redirect({
      to: "/cadastro",
      replace: true,
      search: { redirect: location.href },
    });
  }
}
