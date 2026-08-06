import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/AppSidebar";
import { AppHeader } from "@/components/app/AppHeader";
import { MobileNav } from "@/components/nav/MobileNav";
import { AutoAdminBreadcrumb } from "@/components/admin/AutoAdminBreadcrumb";
import { AppBreadcrumb } from "@/components/app/AppBreadcrumb";
import { useRouterState } from "@tanstack/react-router";
import { useInactivityLogout } from "@/hooks/use-inactivity-logout";
import { usePersistentSidebar } from "@/hooks/use-persistent-sidebar";

import painelLoadingBg from "@/assets/painel-loading-bg.jpg";


/**
 * AppShell — Midnight Executive Dashboard
 *
 * Desktop: sidebar colapsável (ícone) à esquerda + header sticky + conteúdo.
 * Mobile: sidebar vira sheet off-canvas via SidebarTrigger no header;
 *         mantém a bottom nav como navegação primária.
 *
 * A prop `scope` decide o escopo tipográfico do DS. Detecta /admin
 * automaticamente para aplicar `.admin-scope` (ver src/styles.css).
 */
export function AppShell({ children, scope }: { children: React.ReactNode; scope?: "admin" | "app" }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const resolvedScope = scope ?? (pathname.startsWith("/admin") ? "admin" : "app");
  const isAdminScope = resolvedScope === "admin";
  useInactivityLogout();

  const { open, onOpenChange } = usePersistentSidebar(resolvedScope, isAdminScope);
  return (
    <SidebarProvider open={open} onOpenChange={onOpenChange}>
      <div className={`contents ${isAdminScope ? "admin-scope" : "app-scope"}`}>
        <AppSidebar />
        <SidebarInset
          className={
            isAdminScope
              ? "h-dvh min-h-0 min-w-0 overflow-hidden bg-[var(--bg-base)]"
              : "h-dvh min-h-0 min-w-0 overflow-hidden bg-[var(--bg-base)]"
          }
        >
          {!isAdminScope && (
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background" aria-hidden />
          )}
          <AppHeader scope={resolvedScope} />
          {isAdminScope ? (
            <AutoAdminBreadcrumb className="border-b border-border/60 bg-card/40 px-4 py-2 backdrop-blur-sm" />
          ) : (
            <AppBreadcrumb className="shrink-0 border-b border-border/60 bg-card/40 px-3 py-1 backdrop-blur-sm md:px-6" />
          )}

          <main
            data-admin-scroll={isAdminScope ? "main" : undefined}
            className={
              isAdminScope
                ? "pc-scroll-main min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-10"
                : "pc-scroll-main relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-transparent pb-[calc(var(--mobile-nav-height)+0.5rem)] md:pb-2"
            }
          >
            {children}
          </main>
        </SidebarInset>
        {!isAdminScope && <MobileNav />}
      </div>
    </SidebarProvider>
  );
}
