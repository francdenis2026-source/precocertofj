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
  Users,
  Activity,
  Database,
  Tags,
  ReceiptText,
  ImageIcon,
  UploadCloud,
  Layers3,
  FileText,
  TicketPercent,
  BadgeCheck,
  Webhook,
  LineChart,
  Settings2,
  ShieldCheck,
  Boxes,
  Gauge,
  Languages,
  Trophy,
  ClipboardCheck,
  Camera,
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
import { useMyRoles } from "@/hooks/useMyRoles";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
  /** Optional search params to pass to Link (used for consolidated tabbed hubs). */
  search?: Record<string, string>;
};

type NavGroup = {
  label: string;
  items: readonly NavItem[];
};

const appGroups: readonly NavGroup[] = [
  {
    label: "Início",
    items: [
      { to: "/app", label: "Painel", icon: Home, exact: true },
      { to: "/bem-vindo", label: "Boas-vindas", icon: BadgeCheck },
    ],
  },
  {
    label: "Comprar melhor",
    items: [
      { to: "/melhores-precos", label: "Melhores preços", icon: Trophy },
      { to: "/comparador", label: "Comparar mercados", icon: BarChart3 },
      { to: "/estabelecimentos", label: "Mercados", icon: Store },
      { to: "/mapa", label: "Bairros", icon: Boxes },
      { to: "/economia", label: "Economia", icon: Wallet },
    ],
  },
  {
    label: "Minha conta",
    items: [
      { to: "/perfil", label: "Perfil", icon: User },
      { to: "/meus-pedidos", label: "Meus pedidos", icon: ReceiptText },
      { to: "/minhas-licencas", label: "Minhas licenças", icon: KeyRound },
      { to: "/lista", label: "Minha lista", icon: ShoppingCart },
      { to: "/alertas", label: "Alertas", icon: Bell },
      { to: "/historico", label: "Histórico", icon: History },
    ],
  },
  {
    label: "Ajuda",
    items: [
      { to: "/planos", label: "Planos", icon: TicketPercent },
      { to: "/resgatar", label: "Resgatar código", icon: BadgeCheck },
    ],
  },
] as const;

const adminGroups: readonly NavGroup[] = [
  {
    label: "Visão geral",
    items: [
      { to: "/admin", label: "Dashboard", icon: Shield, exact: true },
      { to: "/admin/cobertura", label: "Cobertura", icon: Boxes },
      { to: "/admin/metricas", label: "Estabelecimentos", icon: Store, exact: true },
      { to: "/admin/metricas", label: "Analytics", icon: BarChart3, search: { tab: "analytics" } },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { to: "/admin/catalogo", label: "Produtos", icon: Database },
      { to: "/admin/precos", label: "Preços", icon: Tags, exact: true },
      { to: "/admin/categorizacao", label: "Categorização", icon: Layers3 },
      { to: "/admin/cadastro-foto", label: "Cadastro por foto", icon: Camera },
      { to: "/admin/importacoes", label: "Importações", icon: UploadCloud },
      { to: "/admin/image-jobs", label: "Imagens", icon: ImageIcon },
      { to: "/admin/lote-inserir", label: "Inserção em lote", icon: ReceiptText },
      { to: "/admin/precos", label: "Histórico de preços", icon: History, search: { tab: "historico" } },
    ],
  },
  {
    label: "Comercial",
    items: [
      { to: "/admin/gestao", label: "Licenças", icon: KeyRound },
      { to: "/admin/promocoes", label: "Promoções", icon: TicketPercent, search: { tab: "codigos" } },
      { to: "/admin/promocoes", label: "Cupons", icon: BadgeCheck, exact: true },
      { to: "/admin/webhooks", label: "Webhooks", icon: Webhook },
      { to: "/admin/metricas", label: "Conversões", icon: LineChart, search: { tab: "conversoes" } },
      { to: "/admin/promocoes", label: "Cupom fiscal", icon: ReceiptText, search: { tab: "cupons" } },
    ],
  },
  {
    label: "Clientes",
    items: [
      { to: "/admin/clientes", label: "Clientes", icon: Users },
      { to: "/admin/auditoria", label: "Auditoria de acessos", icon: Activity, search: { tab: "acessos" } },
      { to: "/admin/auditoria", label: "Auditoria geral", icon: ClipboardCheck, exact: true },
      { to: "/admin/metricas", label: "Denúncias", icon: FileText, search: { tab: "relatorios" } },
    ],
  },
  {
    label: "Sistema",
    items: [
      { to: "/admin/consistencia", label: "Consistência", icon: Gauge },
      { to: "/admin/sinonimos", label: "Sinônimos", icon: Languages },
      { to: "/admin/rank-check", label: "Ranking", icon: Trophy },
      { to: "/admin/icones-categoria", label: "Ícones", icon: Settings2 },
    ],
  },
] as const;


export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { signOut, loading: signingOut } = useSignOut();
  const { isAdmin, loading: rolesLoading } = useMyRoles();
  const isAdminArea = pathname.startsWith("/admin");
  const groups = isAdminArea ? (isAdmin ? adminGroups : []) : appGroups;

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  const renderGroup = (group: NavGroup) => (
    <SidebarGroup key={group.label} className="py-2">
      <SidebarGroupLabel className="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/55">
        {group.label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {group.items.map((n) => {
            const active = isActive(n.to, n.exact);
            return (
              <SidebarMenuItem key={n.to}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={n.label}
                  className={cn(
                    "pc-nav-link pc-nav-link--row h-9 rounded-md px-2.5 text-sidebar-foreground/82 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    active && "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm",
                  )}
                >
                  <Link to={n.to} className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "grid h-6 w-6 shrink-0 place-items-center rounded-md border border-sidebar-border/60 bg-sidebar-accent/70 text-sidebar-foreground/75",
                        active && "border-sidebar-primary/50 bg-sidebar-primary text-sidebar-primary-foreground",
                      )}
                    >
                      <n.icon className="h-3.5 w-3.5" strokeWidth={active ? 2.35 : 2} />
                    </span>
                    <span className="truncate text-[13px] font-medium">{n.label}</span>
                    {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border"
    >
      {/* Brand */}
      <SidebarHeader className="border-b border-sidebar-border/60 px-3 py-4">
        <Link
          to={isAdminArea ? "/admin" : "/"}
          className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center"
        >
          <span
            className="relative grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-sidebar-border bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
            aria-hidden
          >
            {isAdminArea ? <ShieldCheck className="h-5 w-5" strokeWidth={2.25} /> : <img src="/logo-mark.png" alt="" aria-hidden width={26} height={26} className="h-[26px] w-[26px] object-contain" />}
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-sidebar" />
          </span>
          <span className="flex flex-col leading-none group-data-[collapsible=icon]:hidden">
            <span className="text-[15px] font-semibold tracking-tight text-sidebar-foreground">
              {isAdminArea ? "Console" : "PreçoCerto"}
            </span>
            <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sidebar-primary">
              {isAdminArea ? "Administração" : "Aplicativo"}
            </span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        {isAdminArea && (rolesLoading || !isAdmin) ? (
          <SidebarGroup className="py-3">
            <div className="space-y-2 px-3">
              <div className="h-3 w-24 rounded-full bg-sidebar-accent" />
              <div className="h-9 rounded-md bg-sidebar-accent/70" />
              <div className="h-9 rounded-md bg-sidebar-accent/50" />
            </div>
          </SidebarGroup>
        ) : (
          groups.map(renderGroup)
        )}

        {!isAdminArea && !rolesLoading && isAdmin && (
          <SidebarGroup className="py-2">
            <SidebarGroupLabel className="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/55">
              Administração
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Abrir painel administrativo" className="pc-nav-link pc-nav-link--row">
                    <Link to="/admin" className="flex items-center gap-2.5">
                      <span className="grid h-6 w-6 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                        <Shield className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-[13px] font-medium">Painel administrativo</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/60">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={signOut}
              disabled={signingOut}
              tooltip="Sair"
              className="pc-nav-link pc-nav-link--row text-sidebar-foreground/80 hover:text-destructive"
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
