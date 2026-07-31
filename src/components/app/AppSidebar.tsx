import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
import { SidebarBrandMark } from "@/components/app/SidebarBrandMark";
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

type NavTone = "brand" | "overview" | "catalog" | "commerce" | "people" | "system";

type NavGroup = {
  label: string;
  items: readonly NavItem[];
  /** Cor semântica do grupo — pinta trilho, ícone ativo e rótulo. */
  tone?: NavTone;
};

const appGroups: readonly NavGroup[] = [
  {
    label: "Comprar melhor",
    tone: "brand",
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
    tone: "people",
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
    tone: "commerce",
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
  const [confirmOpen, setConfirmOpen] = useState(false);

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
        if (!signingOut) setConfirmOpen(true);
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
    <SidebarGroup key={group.label} className="pcsb-group" data-tone={group.tone ?? "brand"}>
      <SidebarGroupLabel className="pcsb-grouplabel group-data-[collapsible=icon]:hidden">
        <span>{group.label}</span>
        <span aria-hidden className="pcsb-grouprule" />
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-[3px]">
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
                      className="pcsb-row"
                    >
                      <Link
                        to={n.to}
                        search={n.search as never}
                        onClick={closeOnMobile}
                        aria-current={active ? "page" : undefined}
                        aria-keyshortcuts={n.shortcut ? `Alt+${n.shortcut}` : undefined}
                      >
                        <span aria-hidden className="pcsb-rail" />
                        <span aria-hidden className="pcsb-ico">
                          <n.icon
                            className="h-[17px] w-[17px]"
                            strokeWidth={active ? 2.15 : 1.75}
                          />
                        </span>
                        <span className="pcsb-label">{n.label}</span>
                        {n.shortcut && (
                          <kbd aria-hidden className="pcsb-kbd">
                            {n.shortcut}
                          </kbd>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  <TooltipContent side="right" align="center" className="max-w-56">
                    <span className="flex flex-col gap-0.5">
                      <span className="font-semibold">{n.label}</span>
                      {n.hint && (
                        <span className="text-[11px] font-normal text-muted-foreground">
                          {n.hint}
                        </span>
                      )}
                      {n.shortcut && (
                        <span className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
                          Alt + {n.shortcut}
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
      <Sidebar collapsible="icon" className="pcsb">
        {/* Marca */}
        <SidebarHeader className="pcsb-header">
          <Link
            to={isAdminArea ? "/admin" : "/"}
            onClick={closeOnMobile}
            aria-label="PreçoCerto — Feijó, Acre"
            className="pcsb-brand group/brand"
          >
            <span className="pcsb-brandmark" aria-hidden>
              <SidebarBrandMark
                className="h-[26px] w-[26px]"
                variant={isAdminArea ? "admin" : "app"}
              />
            </span>
            <span className="pcsb-brandtext group-data-[collapsible=icon]:hidden">
              <span className="pcsb-wordmark">
                {isAdminArea ? (
                  "Console"
                ) : (
                  <>
                    Preço<em className="pcsb-wordmark-accent">Certo</em>
                  </>
                )}
              </span>
              <span className="pcsb-kicker">
                {isAdminArea ? "Administração" : "Feijó · Acre"}
              </span>
            </span>
          </Link>
        </SidebarHeader>

        <SidebarContent className="pcsb-content">
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
            <SidebarGroup className="pcsb-group" data-tone="system">
              <SidebarGroupLabel className="pcsb-grouplabel group-data-[collapsible=icon]:hidden">
                <span>Administração</span>
                <span aria-hidden className="pcsb-grouprule" />
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild className="pcsb-row">
                          <Link to="/admin" onClick={closeOnMobile}>
                            <span aria-hidden className="pcsb-rail" />
                            <span aria-hidden className="pcsb-ico">
                              <Shield className="h-[17px] w-[17px]" strokeWidth={1.85} />
                            </span>
                            <span className="pcsb-label">Painel administrativo</span>
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

        <SidebarFooter className="pcsb-footer">
          {!isAdminArea && (
            <div className="px-1 pb-1 group-data-[collapsible=icon]:hidden">
              <LicenseStatusChip />
            </div>
          )}

          <SidebarMenu>
            <SidebarMenuItem>
              <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                      <SidebarMenuButton
                        disabled={signingOut}
                        aria-label={signingOut ? "Encerrando sessão" : "Sair da conta"}
                        className={cn("pcsb-row pcsb-row--logout")}
                      >
                        <span aria-hidden className="pcsb-ico">
                          {signingOut ? (
                            <Loader2 className="h-[16px] w-[16px] animate-spin" />
                          ) : (
                            <LogOut className="h-[16px] w-[16px]" strokeWidth={1.9} />
                          )}
                        </span>
                        <span className="pcsb-label">
                          {signingOut ? "Saindo..." : "Sair da conta"}
                        </span>
                        <kbd aria-hidden className="pcsb-kbd">
                          Q
                        </kbd>
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
