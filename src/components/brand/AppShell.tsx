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
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-h-screen bg-background">
        <AppHeader />
        <main
          className={`flex-1 pb-[calc(var(--mobile-nav-height)+1rem)] md:pb-0 ${
            resolvedScope === "admin" ? "admin-scope" : ""
          }`}
        >
          {children}
        </main>
      </SidebarInset>
      <MobileNav />
    </SidebarProvider>
  );
}
