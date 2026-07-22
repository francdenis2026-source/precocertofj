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
  KeyRound,
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

const account = [
  { to: "/perfil", label: "Perfil", icon: User },
  { to: "/minhas-licencas", label: "Minhas licenças", icon: KeyRound },
  { to: "/melhores-precos", label: "Melhores preços", icon: Store },
] as const;

const admin = [
  { to: "/admin", label: "Painel Admin", icon: Shield },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { signOut, loading: signingOut } = useSignOut();

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border"
    >
      {/* Brand */}
      <SidebarHeader className="border-b border-sidebar-border/60 px-3 py-4">
        <Link
          to="/"
          className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center"
        >
          <span
            className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
            aria-hidden
          >
            <span className="text-[13px] font-bold leading-none">P</span>
            <span
              className="absolute -right-1 -top-1 h-2 w-2 rounded-full ring-2 ring-sidebar"
              style={{ background: "#e6d6a8" }}
            />
          </span>
          <span className="flex flex-col leading-none group-data-[collapsible=icon]:hidden">
            <span className="font-['Instrument_Serif',ui-serif,serif] text-[18px] font-normal tracking-tight text-sidebar-foreground">
              Preço<span className="italic text-sidebar-primary-foreground/90" style={{ color: "#e6d6a8" }}>Certo</span>
            </span>
            <span
              className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: "rgba(230, 214, 168, 0.7)" }}
            >
              Executive
            </span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {/* Primary nav */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.16em] text-sidebar-foreground/50">
            Navegação
          </SidebarGroupLabel>
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
                      <Link to={n.to} className="flex items-center gap-2.5">
                        <n.icon
                          className="h-4 w-4"
                          strokeWidth={active ? 2.4 : 1.9}
                        />
                        <span className="text-[13px] font-medium">{n.label}</span>
                        {active && (
                          <span
                            className="ml-auto h-1.5 w-1.5 rounded-full"
                            style={{ background: "#e6d6a8" }}
                          />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Account */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.16em] text-sidebar-foreground/50">
            Conta
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {account.map((n) => {
                const active = isActive(n.to);
                return (
                  <SidebarMenuItem key={n.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={n.label}
                    >
                      <Link to={n.to} className="flex items-center gap-2.5">
                        <n.icon
                          className="h-4 w-4"
                          strokeWidth={active ? 2.4 : 1.9}
                        />
                        <span className="text-[13px] font-medium">{n.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.16em] text-sidebar-foreground/50">
            Admin
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {admin.map((n) => {
                const active = isActive(n.to);
                return (
                  <SidebarMenuItem key={n.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={n.label}
                    >
                      <Link to={n.to} className="flex items-center gap-2.5">
                        <n.icon
                          className="h-4 w-4"
                          strokeWidth={active ? 2.4 : 1.9}
                        />
                        <span className="text-[13px] font-medium">{n.label}</span>
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
              className="text-sidebar-foreground/80 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-[13px] font-medium">
                {signingOut ? "Saindo..." : "Sair"}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
