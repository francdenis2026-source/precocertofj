import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Guard client-side para rotas /admin*. Verifica sessão antes de renderizar,
 * impedindo qualquer flash de conteúdo protegido. Rotas admin usam ssr:false
 * porque a sessão do Supabase vive em localStorage.
 */
export async function adminBeforeLoad({ location }: { location: { href: string } }) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    throw redirect({
      to: "/admin-login",
      replace: true,
      search: { redirect: location.href },
    });
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
