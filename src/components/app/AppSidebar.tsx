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
};

type NavGroup = {
  label: string;
  items: readonly NavItem[];
};

const appGroups: readonly NavGroup[] = [
  {
    label: "Navegação",
    items: [
  { to: "/app", label: "Início", icon: Home, exact: true as boolean },
  { to: "/buscar", label: "Buscar", icon: Search, exact: false as boolean },
  { to: "/comparador", label: "Comparar", icon: BarChart3, exact: false as boolean },
  { to: "/lista", label: "Minha lista", icon: ShoppingCart, exact: false as boolean },
  { to: "/cesta", label: "Cesta", icon: ShoppingBag, exact: false as boolean },
  { to: "/alertas", label: "Alertas", icon: Bell, exact: false as boolean },
  { to: "/financas", label: "Finanças", icon: Wallet, exact: false as boolean },
  { to: "/historico", label: "Histórico", icon: History, exact: false as boolean },
    ],
  },
  {
    label: "Conta",
    items: [
  { to: "/perfil", label: "Perfil", icon: User },
  { to: "/minhas-licencas", label: "Minhas licenças", icon: KeyRound },
  { to: "/melhores-precos", label: "Melhores preços", icon: Store },
    ],
  },
] as const;

const adminGroups: readonly NavGroup[] = [
  {
    label: "Comando",
    items: [
      { to: "/admin", label: "Visão geral", icon: Shield, exact: true },
      { to: "/admin/clientes", label: "Clientes", icon: Users },
      { to: "/admin/auditoria-acessos", label: "Acessos", icon: Activity },
      { to: "/admin/auditoria", label: "Auditoria", icon: ClipboardCheck },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { to: "/admin/catalogo", label: "Produtos", icon: Database },
      { to: "/admin/precos", label: "Preços", icon: Tags },
      { to: "/admin/cobertura", label: "Cobertura", icon: Boxes },
      { to: "/admin/categorizacao", label: "Categorias", icon: Layers3 },
      { to: "/admin/importacoes", label: "Importações", icon: UploadCloud },
      { to: "/admin/image-jobs", label: "Imagens", icon: ImageIcon },
      { to: "/admin/cadastro-foto", label: "Foto + IA", icon: Camera },
      { to: "/admin/lote-inserir", label: "Inserção em lote", icon: ReceiptText },
      { to: "/admin/historico-precos", label: "Histórico", icon: History },
    ],
  },
  {
    label: "Receita",
    items: [
      { to: "/admin/gestao", label: "Licenças", icon: KeyRound },
      { to: "/admin/promocoes-codigos", label: "Promo 30", icon: TicketPercent },
      { to: "/admin/promocoes", label: "Cupons", icon: BadgeCheck },
      { to: "/admin/cupom", label: "Cupom fiscal", icon: ReceiptText },
      { to: "/admin/webhooks", label: "Webhooks", icon: Webhook },
      { to: "/admin/conversoes", label: "Conversões", icon: LineChart },
      { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Sistema",
    items: [
      { to: "/admin/metricas", label: "Estabelecimentos", icon: Store },
      { to: "/admin/consistencia", label: "Consistência", icon: Gauge },
      { to: "/admin/sinonimos", label: "Sinônimos", icon: Languages },
      { to: "/admin/rank-check", label: "Ranking", icon: Trophy },
      { to: "/admin/icones-categoria", label: "Ícones", icon: Settings2 },
      { to: "/admin/reports", label: "Denúncias", icon: FileText },
    ],
  },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { signOut, loading: signingOut } = useSignOut();
  const { isAdmin, loading: rolesLoading } = useMyRoles();
  const isAdminArea = pathname.startsWith("/admin");
  const groups = isAdminArea ? adminGroups : appGroups;

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  const renderGroup = (group: NavGroup) => (
    <SidebarGroup key={group.label} className="py-2">
      <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/55">
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
                    "h-9 rounded-md px-2.5 text-sidebar-foreground/82 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    active && "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm",
                  )}
                >
                  <Link to={n.to} className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "grid h-6 w-6 shrink-0 place-items-center rounded-md border border-sidebar-border/60 bg-sidebar/40 text-sidebar-foreground/75",
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
            {isAdminArea ? <ShieldCheck className="h-5 w-5" strokeWidth={2.25} /> : <span className="text-[13px] font-bold leading-none">P</span>}
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-sidebar" />
          </span>
          <span className="flex flex-col leading-none group-data-[collapsible=icon]:hidden">
            <span className="text-[15px] font-semibold tracking-tight text-sidebar-foreground">
              {isAdminArea ? "Console" : "PreçoCerto"}
            </span>
            <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-sidebar-primary">
              {isAdminArea ? "Administração" : "Aplicativo"}
            </span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        {isAdminArea && rolesLoading ? (
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
            <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/55">
              Administração
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Abrir painel administrativo">
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
