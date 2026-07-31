import { useEffect } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
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
  Loader2,
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
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSignOut } from "@/hooks/use-sign-out";
import { useMyRoles } from "@/hooks/useMyRoles";
import { LicenseStatusChip } from "@/components/app/LicenseStatusChip";
import { AppSidebarSkeleton } from "@/components/app/AppSidebarSkeleton";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
  /** Optional search params to pass to Link (used for consolidated tabbed hubs). */
  search?: Record<string, string>;
  /** Atalho de teclado (Alt + tecla) exibido no tooltip. */
  shortcut?: string;
  /** Descrição curta exibida no tooltip. */
  hint?: string;
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
      { to: "/app", label: "Painel", icon: Home, exact: true, shortcut: "1", hint: "Resumo da sua economia" },
      { to: "/app/produtos", label: "Produtos", icon: ShoppingCart, shortcut: "2", hint: "Buscar e comparar preços" },
      { to: "/app/estabelecimentos", label: "Mercados", icon: Store, shortcut: "3", hint: "Lojas cadastradas" },
      { to: "/melhores-precos", label: "Melhores preços", icon: Trophy, shortcut: "4", hint: "Ranking do menor preço" },
      { to: "/comparador", label: "Comparador", icon: BarChart3, shortcut: "5", hint: "Comparação lado a lado" },
      { to: "/mapa", label: "Bairros", icon: Boxes, shortcut: "6", hint: "Cobertura por bairro" },

    ],
  },
  {
    label: "Minha conta",
    items: [
      { to: "/lista", label: "Minha lista", icon: ShoppingCart, shortcut: "7", hint: "Sua lista de compras" },
      { to: "/alertas", label: "Alertas", icon: Bell, shortcut: "8", hint: "Avisos de queda de preço" },
      { to: "/historico", label: "Histórico", icon: History, shortcut: "9", hint: "Suas buscas e consultas" },
      { to: "/economia", label: "Economia", icon: Wallet, hint: "Quanto você economizou" },
      { to: "/perfil", label: "Perfil", icon: User, shortcut: "0", hint: "Dados e preferências" },
    ],
  },
  {
    label: "Assinatura",
    items: [
      { to: "/planos", label: "Planos", icon: TicketPercent, hint: "Comparar planos" },
      { to: "/minhas-licencas", label: "Licenças", icon: KeyRound, hint: "Chaves e validade" },
      { to: "/meus-pedidos", label: "Pedidos", icon: ReceiptText, hint: "Histórico de pagamentos" },
      
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
  const navigate = useNavigate();
  const { signOut, loading: signingOut } = useSignOut();
  const { isAdmin, loading: rolesLoading } = useMyRoles();
  const { isMobile, setOpenMobile } = useSidebar();
  const isAdminArea = pathname.startsWith("/admin");
  const groups = isAdminArea ? (isAdmin ? adminGroups : []) : appGroups;
  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  // Atalhos de teclado (Alt + dígito) para as áreas do cliente.
  useEffect(() => {
    if (isAdminArea) return;
    const map = new Map<string, string>();
    for (const g of appGroups) {
      for (const item of g.items) if (item.shortcut) map.set(item.shortcut, item.to);
    }
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (target?.isContentEditable) return;
      if (e.key.toLowerCase() === "q") {
        e.preventDefault();
        if (!signingOut) void signOut();
        return;
      }
      const to = map.get(e.key);
      if (!to) return;
      e.preventDefault();
      setOpenMobile(false);
      void navigate({ to });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isAdminArea, navigate, setOpenMobile, signOut, signingOut]);


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
          "h-6 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-muted-foreground",
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      data-active={active ? "true" : "false"}
                      className={cn(
                        "relative h-9 rounded-md px-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar aria-disabled:pointer-events-none aria-disabled:text-sidebar-muted-foreground aria-disabled:opacity-100",
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
                        aria-current={active ? "page" : undefined}
                        aria-keyshortcuts={n.shortcut ? `Alt+${n.shortcut}` : undefined}
                        className="flex items-center gap-2.5"
                      >
                        {active && !group.tone && (
                          <span
                            aria-hidden
                            className="pc-nav-rail absolute inset-y-1 left-0 w-[3px] rounded-full group-data-[collapsible=icon]:hidden"
                          />
                        )}
                        <span
                          data-active={active ? "true" : "false"}
                          className={cn(
                            "grid h-8 w-8 shrink-0 place-items-center rounded-md border transition-colors",
                            group.tone && "pc-admin-icon-chip",
                            !group.tone &&
                              cn(
                                "pc-nav-icon",
                                active ? "" : "border-transparent text-sidebar-muted-foreground",
                              ),
                          )}
                        >
                          <n.icon className="h-4 w-4" strokeWidth={active ? 2.3 : 1.9} />
                        </span>
                        <span className="pc-nav-label truncate text-[13px] leading-none transition-colors">
                          {n.label}
                        </span>
                        {active && group.tone && (
                          <span className="pc-admin-active-dot ml-auto h-1.5 w-1.5 rounded-full" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  <TooltipContent side="right" align="center" className="flex items-center gap-2">
                    <span className="flex flex-col">
                      <span className="font-semibold">{n.label}</span>
                      {n.hint && (
                        <span className="text-[11px] font-normal text-muted-foreground">
                          {n.hint}
                        </span>
                      )}
                    </span>
                  </TooltipContent>

                </Tooltip>
              </SidebarMenuItem>
            );
          })}

        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );


  return (
    <TooltipProvider delayDuration={250} skipDelayDuration={300}>
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border"
    >

      {/* Brand */}
      <SidebarHeader className="border-b border-sidebar-border/60 px-2 py-2.5">
        <Link
          to={isAdminArea ? "/admin" : "/"}
          onClick={closeOnMobile}
          aria-label="PreçoCerto — Feijó, Acre"
          className="group/brand flex items-center gap-2.5 rounded-md px-2 py-1 outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
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
                  Preço
                  <span className="text-gold-ink underline decoration-transparent decoration-2 underline-offset-4 transition-colors group-hover/brand:decoration-current">
                    Certo
                  </span>
                </>
              )}
            </span>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-muted-foreground">
              {isAdminArea ? "Administração" : "Minha área"}

            </span>
          </span>
        </Link>


      </SidebarHeader>

      <SidebarContent className="px-2 py-2">
        {isAdminArea && (rolesLoading || !isAdmin) ? (
          <AppSidebarSkeleton
            groups={[
              { label: "Visão geral", items: 4 },
              { label: "Catálogo", items: 5 },
              { label: "Sistema", items: 3 },
            ]}
          />
        ) : !isAdminArea && rolesLoading ? (
          <AppSidebarSkeleton />
        ) : (
          <div className="animate-in fade-in-0 slide-in-from-left-1 duration-200 motion-reduce:animate-none">
            {groups.map(renderGroup)}
          </div>
        )}

        {!isAdminArea && !rolesLoading && isAdmin && (
          <SidebarGroup className="py-2">
            <SidebarGroupLabel className="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-sidebar-muted-foreground">
              Administração
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton asChild className="pc-nav-link pc-nav-link--row focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar">
                        <Link to="/admin" className="flex items-center gap-2.5">
                          <span className="pc-nav-icon grid h-6 w-6 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                            <Shield className="h-3.5 w-3.5" />
                          </span>
                          <span className="pc-nav-label text-[13px] font-medium">Painel administrativo</span>
                        </Link>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent side="right">Abrir painel administrativo</TooltipContent>
                  </Tooltip>
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

        <SidebarSeparator className="mx-3 my-1 w-auto bg-sidebar-border/60" />

        <SidebarMenu className="px-2 pb-2 group-data-[collapsible=icon]:px-1">
          <SidebarMenuItem>
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <SidebarMenuButton
                      disabled={signingOut}
                      aria-label={signingOut ? "Encerrando sessão" : "Sair da conta"}
                      className="group/logout relative h-8 rounded-md px-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar disabled:pointer-events-none disabled:text-sidebar-muted-foreground disabled:opacity-100 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                    >
                      <span
                        className={cn(
                          "grid h-7 w-7 shrink-0 place-items-center rounded-md border border-transparent transition-colors",
                          "text-sidebar-muted-foreground group-hover/logout:border-destructive/25 group-hover/logout:bg-destructive/10 group-hover/logout:text-destructive",
                          "group-focus-visible/logout:border-destructive/25 group-focus-visible/logout:bg-destructive/10 group-focus-visible/logout:text-destructive",
                        )}
                      >
                        {signingOut ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
                        )}
                      </span>
                      <span className="truncate text-[13px] font-medium leading-none group-data-[collapsible=icon]:hidden">
                        {signingOut ? "Saindo..." : "Sair"}
                      </span>
                    </SidebarMenuButton>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent side="right" align="center">
                  <span className="font-semibold">Encerrar sessão</span>
                </TooltipContent>
              </Tooltip>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Encerrar sessão?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Você sairá desta conta neste dispositivo. Suas listas, favoritos e alertas
                    continuam salvos. Pressione Enter para confirmar ou Esc para cancelar.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={signingOut}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    autoFocus
                    disabled={signingOut}
                    onClick={(e) => {
                      e.preventDefault();
                      void signOut();
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {signingOut ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saindo...
                      </span>
                    ) : (
                      "Sair da conta"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </SidebarMenuItem>
        </SidebarMenu>

      </SidebarFooter>
    </Sidebar>
    </TooltipProvider>
  );

}
