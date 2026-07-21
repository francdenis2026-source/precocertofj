import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Search,
  ShoppingCart,
  Bell,
  User,
  ShoppingBag,
  Shield,
  BarChart3,
  History,
  Store,
  LogOut,
  Wallet,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/brand/Logo";
import { useSignOut } from "@/hooks/use-sign-out";

const primary = [
  { to: "/app", label: "Início", icon: Home, exact: true as boolean },
  { to: "/buscar", label: "Buscar", icon: Search, exact: false as boolean },
  { to: "/comparador", label: "Comparar", icon: BarChart3, exact: false as boolean },
  { to: "/lista", label: "Minha lista", icon: ShoppingCart, exact: false as boolean },
  { to: "/cesta", label: "Cesta", icon: ShoppingBag, exact: false as boolean },
  { to: "/alertas", label: "Alertas", icon: Bell, exact: false as boolean },
  { to: "/financas", label: "Finanças", icon: Wallet, exact: false as boolean },
  { to: "/historico", label: "Histórico", icon: History, exact: false as boolean },
] as const;

const secondary = [
  { to: "/perfil", label: "Perfil", icon: User },
  { to: "/melhores-precos", label: "Melhores preços", icon: Store },
  { to: "/admin", label: "Admin", icon: Shield },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { signOut, loading: signingOut } = useSignOut();

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border/60 px-3 py-4">
        <Link
          to="/"
          className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center"
        >
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_6px_18px_-6px_oklch(0.51_0.22_275_/_0.7)]">
            <span className="font-display text-[19px] font-bold leading-none">P</span>
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-sidebar" />
          </span>
          <span className="font-display text-[19px] font-semibold leading-none tracking-tight text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            Preço<span className="text-accent">Certo</span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {primary.map((n) => {
                const active = isActive(n.to, n.exact);
                return (
                  <SidebarMenuItem key={n.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={n.label}
                    >
                      <Link to={n.to} className="flex items-center gap-2">
                        <n.icon className="h-4 w-4" strokeWidth={active ? 2.4 : 1.9} />
                        <span>{n.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Conta</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondary.map((n) => {
                const active = isActive(n.to);
                return (
                  <SidebarMenuItem key={n.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={n.label}
                    >
                      <Link to={n.to} className="flex items-center gap-2">
                        <n.icon className="h-4 w-4" strokeWidth={active ? 2.4 : 1.9} />
                        <span>{n.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/60">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={signOut}
              disabled={signingOut}
              tooltip="Sair"
              className="text-sidebar-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span>{signingOut ? "Saindo..." : "Sair"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

// Suppress unused Logo import (kept for potential future use)
void Logo;
