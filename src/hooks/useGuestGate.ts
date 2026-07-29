import { useCallback, useState } from "react";
import { useSession } from "@/hooks/useSession";
import { consumeGuest, type GuestAction } from "@/lib/guest-quota";

/**
 * Hook utilitário para gatear ações de visitante com a cota gratuita.
 *
 * Uso:
 *   const gate = useGuestGate("favorite");
 *   // no handler:
 *   if (!gate.allow()) return; // abre o modal automaticamente
 *   // ...ação segue normalmente...
 *   // no JSX: <GuestGateDialog open={gate.open} onOpenChange={gate.setOpen} action="favorite" />
 *
 * Usuários autenticados sempre passam (allow() retorna true e não consome cota).
 */
export function useGuestGate(action: GuestAction) {
  const { user, loading } = useSession();
  const [open, setOpen] = useState(false);

  const allow = useCallback(
    (unique?: string): boolean => {
      // Enquanto a sessão carrega, não bloqueia — evita false-positive no primeiro clique.
      if (loading) return true;
      if (user) return true;
      const { blocked } = consumeGuest(action, unique);
      if (blocked) {
        setOpen(true);
        return false;
      }
      return true;
    },
    [action, loading, user],
  );

  return {
    /** true quando o usuário está autenticado (nenhum gate necessário). */
    authed: Boolean(user),
    loading,
    open,
    setOpen,
    /** Consome cota e retorna se a ação pode prosseguir. */
    allow,
  };
}
