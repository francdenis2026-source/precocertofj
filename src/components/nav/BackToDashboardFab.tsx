import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";

/**
 * Botão flutuante "Voltar ao meu painel". Só aparece quando:
 *  - existe sessão ativa
 *  - o usuário está na homepage ("/") — evita duplicar CTA em outras páginas
 */
export function BackToDashboardFab({ className }: { className?: string }) {
  const { session, loading } = useSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (loading || !session) return null;
  if (pathname !== "/") return null;

  return (
    <Link
      to="/app"
      aria-label="Voltar ao meu painel"
      className={cn(
        // Fica acima da MobileNav no mobile; canto inferior-direito no desktop.
        "fixed right-4 z-[70] bottom-[calc(var(--mobile-nav-height,4.5rem)+1rem)] md:bottom-6",
        "inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground",
        "shadow-[0_12px_28px_-8px_oklch(0.36_0.11_155_/_0.55)] ring-1 ring-primary/40",
        "transition-transform hover:scale-[1.03] active:scale-95",
        className,
      )}
    >
      <LayoutDashboard className="h-4 w-4" strokeWidth={2.4} />
      <span>Meu painel</span>
    </Link>
  );
}
