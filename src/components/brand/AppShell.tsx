import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/AppSidebar";
import { AppHeader } from "@/components/app/AppHeader";
import { MobileNav } from "@/components/nav/MobileNav";

/**
 * AppShell — Midnight Executive Dashboard
 *
 * Desktop: sidebar colapsável (ícone) à esquerda + header sticky + conteúdo.
 * Mobile: sidebar vira sheet off-canvas via SidebarTrigger no header;
 *         mantém a bottom nav como navegação primária.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-h-screen bg-background">
        <AppHeader />
        <main className="flex-1 pb-[calc(var(--mobile-nav-height)+1rem)] md:pb-0">
          {children}
        </main>
      </SidebarInset>
      <MobileNav />
    </SidebarProvider>
  );
}
