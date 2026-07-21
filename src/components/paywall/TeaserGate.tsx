import { useSession } from "@/hooks/useSession";
import { isTeaserLocked } from "@/lib/teaser-rule";
import { LockOverlay } from "@/components/paywall/LockOverlay";
import type { AnalyticsEvent } from "@/lib/analytics-events";

/**
 * Retorna `{ locked }` para um item de lista pública.
 * - Usuário autenticado: sempre `false`.
 * - Visitante: aplica regra determinística por id + posição.
 */
export function useTeaserAccess(
  id: string | null | undefined,
  index: number,
): { locked: boolean; isVisitor: boolean; loading: boolean } {
  const { user, loading } = useSession();
  const isVisitor = !user;
  if (user) return { locked: false, isVisitor: false, loading };
  return { locked: isTeaserLocked(id, index), isVisitor, loading };
}

/**
 * Wrapper conveniente para cards de lista pública.
 * Aplica LockOverlay quando o item está bloqueado para o visitante.
 * Aceita `reason` (mensagem contextual) e `trackEventName` para telemetria
 * do clique de destravamento.
 */
export function TeaserCard({
  id,
  index,
  variant = "compact",
  children,
  reason,
  trackEventName,
  trackPayload,
}: {
  id: string | null | undefined;
  index: number;
  variant?: "compact" | "full";
  children: React.ReactNode;
  reason?: string;
  trackEventName?: AnalyticsEvent;
  trackPayload?: Record<string, string | number | boolean | undefined>;
}) {
  const { locked } = useTeaserAccess(id, index);
  return (
    <LockOverlay
      locked={locked}
      variant={variant}
      reason={reason}
      trackEventName={trackEventName}
      trackPayload={trackPayload}
    >
      {children}
    </LockOverlay>
  );
}
