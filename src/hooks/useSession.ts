import { useSyncExternalStore } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Store de sessão compartilhado (singleton).
 *
 * Antes cada `useSession()` criava seu próprio `onAuthStateChange` + um
 * `getSession()` assíncrono. Como o painel monta vários componentes que
 * dependem da sessão (header, sidebar, gates, cards), cada navegação
 * disparava N chamadas e N cascatas de re-render — a principal causa do
 * travamento ao trocar de página.
 *
 * Agora existe UMA assinatura e UM snapshot em memória: o primeiro mount
 * resolve a sessão e todos os mounts seguintes leem o valor já em cache,
 * de forma síncrona.
 */
type SessionState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

let state: SessionState = { session: null, user: null, loading: true };
const listeners = new Set<() => void>();
let started = false;
let unsubscribe: (() => void) | null = null;

const serverState: SessionState = { session: null, user: null, loading: true };

function emit(next: SessionState) {
  // Evita re-render quando nada mudou de fato (mesmo token e mesmo estado).
  if (
    state.loading === next.loading &&
    state.session?.access_token === next.session?.access_token &&
    state.user?.id === next.user?.id
  ) {
    return;
  }
  state = next;
  for (const l of listeners) l();
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;

  // Listener PRIMEIRO para não perder eventos de login/refresh.
  const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
    emit({ session: s, user: s?.user ?? null, loading: false });
  });
  unsubscribe = () => sub.subscription.unsubscribe();

  void supabase.auth.getSession().then(({ data }) => {
    emit({ session: data.session, user: data.session?.user ?? null, loading: false });
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  start();
  return () => {
    listeners.delete(listener);
    // A assinatura do Supabase é mantida viva de propósito: recriá-la a cada
    // navegação reintroduziria o custo que este store existe para eliminar.
    if (listeners.size === 0 && unsubscribe && false) unsubscribe();
  };
}

export function useSession() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => serverState,
  );
}

export async function signOut() {
  await supabase.auth.signOut();
}
