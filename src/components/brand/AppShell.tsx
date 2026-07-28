import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/AppSidebar";
import { AppHeader } from "@/components/app/AppHeader";
import { MobileNav } from "@/components/nav/MobileNav";
import { useRouterState } from "@tanstack/react-router";

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
  return (
    <SidebarProvider defaultOpen={isAdminScope}>
      <div className={`contents ${isAdminScope ? "admin-scope" : "app-scope"}`}>
        <AppSidebar />
        <SidebarInset
          className={
            isAdminScope
              ? "h-dvh min-h-0 min-w-0 overflow-hidden bg-background"
              : "min-h-screen bg-background"
          }
        >
          <AppHeader scope={resolvedScope} />
          <main
            data-admin-scroll={isAdminScope ? "main" : undefined}
            className={
              isAdminScope
                ? "min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-10"
                : "flex-1 pb-[calc(var(--mobile-nav-height)+1rem)] md:pb-0"
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
