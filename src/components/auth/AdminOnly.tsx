import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useMyRoles } from "@/hooks/useMyRoles";

/**
 * Client-side gate for admin-only pages.
 * Backend server functions must ALSO enforce admin via `requireAdmin`.
 * This component only prevents non-admin UI from being displayed.
 */
export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useMyRoles();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/admin-login", replace: true });
      return;
    }
    if (!isAdmin) {
      navigate({
        to: "/app",
        replace: true,
      });
    }
  }, [loading, user, isAdmin, navigate, pathname]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return <>{children}</>;
}
