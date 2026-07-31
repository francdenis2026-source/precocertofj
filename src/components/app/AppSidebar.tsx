import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  ShoppingCart,
  Bell,
  User,
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
  ShoppingBasket,
  Gavel,
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
  useSidebar,
} from "@/components/ui/sidebar";
import { useSignOut } from "@/hooks/use-sign-out";
import { useMyRoles } from "@/hooks/useMyRoles";
import { LicenseStatusChip } from "@/components/app/LicenseStatusChip";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
  /** Optional search params to pass to Link (used for consolidated tabbed hubs). */
  search?: Record<string, string>;
};

type AdminTone = "overview" | "catalog" | "commerce" | "people" | "system";

type NavGroup = {
  label: string;
  items: readonly NavItem[];
  /** Optional semantic tone used in the admin area to color-code groups. */
  tone?: AdminTone;
};


const appGroups: readonly NavGroup[] = [
  {
    label: "Comprar melhor",
    items: [
      { to: "/app", label: "Painel", icon: Home, exact: true },
      { to: "/app/produtos", label: "Produtos", icon: ShoppingCart },
      { to: "/app/estabelecimentos", label: "Mercados", icon: Store },
      { to: "/melhores-precos", label: "Melhores preços", icon: Trophy },
      { to: "/comparador", label: "Comparador", icon: BarChart3 },
      { to: "/mapa", label: "Bairros", icon: Boxes },

    ],
  },
  {
    label: "Minha conta",
    items: [
      { to: "/lista", label: "Minha lista", icon: ShoppingCart },
      { to: "/alertas", label: "Alertas", icon: Bell },
      { to: "/historico", label: "Histórico", icon: History },
      { to: "/economia", label: "Economia", icon: Wallet },
      { to: "/perfil", label: "Perfil", icon: User },
    ],
  },
  {
    label: "Assinatura",
    items: [
      { to: "/planos", label: "Planos", icon: TicketPercent },
      { to: "/minhas-licencas", label: "Licenças", icon: KeyRound },
      { to: "/meus-pedidos", label: "Pedidos", icon: ReceiptText },
      
    ],
  },
] as const;


const adminGroups: readonly NavGroup[] = [
  {
    label: "Visão geral",
    tone: "overview",
    items: [
      { to: "/admin", label: "Dashboard", icon: Shield, exact: true },
      { to: "/admin/cobertura", label: "Cobertura", icon: Boxes },
      { to: "/admin/metricas", label: "Estabelecimentos", icon: Store, exact: true },
      { to: "/admin/metricas", label: "Analytics", icon: BarChart3, search: { tab: "analytics" } },
    ],
  },
  {
    label: "Cesta Básica",
    tone: "commerce",
    items: [
      { to: "/admin/cesta", label: "Itens & versões", icon: ShoppingBasket, exact: true },
      { to: "/admin/cesta-auditoria", label: "Auditoria da Cesta", icon: ClipboardCheck, exact: true },
      { to: "/cesta-basica", label: "Veredito ao vivo", icon: Gavel, exact: true },
      { to: "/admin/rank-check", label: "Ranking geral", icon: Trophy, exact: true },
    ],
  },
  {
    label: "Catálogo",
    tone: "catalog",
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
      tone: "commerce",
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
    tone: "people",
    items: [
      { to: "/admin/clientes", label: "Clientes", icon: Users },
      { to: "/admin/auditoria", label: "Auditoria de acessos", icon: Activity, search: { tab: "acessos" } },
      { to: "/admin/auditoria", label: "Auditoria geral", icon: ClipboardCheck, exact: true },
      { to: "/admin/metricas", label: "Denúncias", icon: FileText, search: { tab: "relatorios" } },
    ],
  },
  {
    label: "Sistema",
    tone: "system",
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
  const searchTab = useRouterState({
    select: (s) => {
      const raw = (s.location.search as Record<string, unknown> | undefined)?.tab;
      return typeof raw === "string" ? raw : undefined;
    },
  });
  const { signOut, loading: signingOut } = useSignOut();
  const { isAdmin, loading: rolesLoading } = useMyRoles();
  const { isMobile, setOpenMobile } = useSidebar();
  const isAdminArea = pathname.startsWith("/admin");
  const groups = isAdminArea ? (isAdmin ? adminGroups : []) : appGroups;
  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  const isActive = (n: NavItem) => {
    if (n.search?.tab !== undefined) {
      return pathname === n.to && searchTab === n.search.tab;
    }
    if (n.exact) {
      // For hubs that also have tabbed siblings, "exact" means the base view (no tab param).
      return pathname === n.to && !searchTab;
    }
    return pathname === n.to || pathname.startsWith(n.to + "/");
  };

  const renderGroup = (group: NavGroup) => (
    <SidebarGroup key={group.label} className="px-0 py-1.5" data-tone={group.tone}>
      <SidebarGroupLabel
        className={cn(
          "h-6 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/75",
          "group-data-[collapsible=icon]:hidden",
          group.tone && "pc-admin-group-label",

        )}
      >
        {group.label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {group.items.map((n) => {
            const active = isActive(n);
            const key = `${n.to}?${n.search?.tab ?? ""}#${n.label}`;
            return (
              <SidebarMenuItem key={key}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={n.label}
                  data-active={active ? "true" : "false"}
                  className={cn(
                    "relative h-9 rounded-md px-2 text-sidebar-foreground/90 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                    group.tone && "pc-admin-row",
                    active &&
                      !group.tone &&
                      "bg-sidebar-accent font-semibold text-sidebar-accent-foreground",
                  )}

                >
                  <Link
                    to={n.to}
                    search={n.search as never}
                    onClick={closeOnMobile}
                    className="flex items-center gap-2.5"
                  >
                    {active && !group.tone && (
                      <span
                        aria-hidden
                        className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-sidebar-primary group-data-[collapsible=icon]:hidden"
                      />
                    )}
                    <span
                      data-active={active ? "true" : "false"}
                      className={cn(
                        "grid h-8 w-8 shrink-0 place-items-center rounded-md border transition-colors",
                        group.tone && "pc-admin-icon-chip",
                        !group.tone &&
                          (active
                            ? "border-sidebar-primary/40 bg-sidebar-primary/15 text-sidebar-primary"
                            : "border-transparent text-sidebar-foreground/60"),
                      )}
                    >
                      <n.icon className="h-4 w-4" strokeWidth={active ? 2.3 : 1.9} />
                    </span>
                    <span className="truncate text-[13px] leading-none">{n.label}</span>
                    {active && group.tone && (
                      <span className="pc-admin-active-dot ml-auto h-1.5 w-1.5 rounded-full" />
                    )}
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
      <SidebarHeader className="border-b border-sidebar-border/60 px-2 py-2.5">
        <Link
          to={isAdminArea ? "/admin" : "/"}
          onClick={closeOnMobile}
          className="flex items-center gap-2.5 rounded-md px-2 py-1 transition-colors hover:bg-sidebar-accent group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          {isAdminArea ? (
            <span
              className="relative grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-sidebar-border bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
              aria-hidden
            >
              <ShieldCheck className="h-4 w-4" strokeWidth={2.25} />
            </span>
          ) : (
            <img
              src="/logo-mark.png"
              alt=""
              aria-hidden
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 object-contain drop-shadow-[0_1px_0_rgba(11,30,58,0.25)]"
            />
          )}
          <span className="flex flex-col leading-none group-data-[collapsible=icon]:hidden">
            <span className="font-display text-[16px] font-bold tracking-tight text-sidebar-foreground">
              {isAdminArea ? (
                "Console"
              ) : (
                <>
                  Preço<span className="text-gold-ink">Certo</span>
                </>
              )}
            </span>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/70">
              {isAdminArea ? "Administração" : "Minha área"}
            </span>
          </span>
        </Link>


      </SidebarHeader>

      <SidebarContent className="px-2 py-2">
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
        {!isAdminArea && (
          <div className="px-2.5 py-2 group-data-[collapsible=icon]:hidden">
            <LicenseStatusChip />
          </div>
        )}
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
