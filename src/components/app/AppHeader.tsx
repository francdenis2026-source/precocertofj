import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  ChevronDown,
  CreditCard,
  Home,
  LayoutDashboard,
  LogOut,
  MapPin,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tags,
  TrendingDown,
  User,
} from "lucide-react";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";

import { AppBrand } from "@/components/app/AppBrand";
import { DensityToggle } from "@/components/app/DensityToggle";

import { useMyProfile } from "@/hooks/useMyProfile";
import { useSignOut } from "@/hooks/use-sign-out";
import { listPublicStores } from "@/lib/stores-public.functions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * Micro badges de status do mercado local. Cada badge é um pequeno
 * pill com ícone + número, sem rótulos longos, para ocupar pouco espaço.
 * O segundo badge informa explicitamente os ITENS CADASTRADOS.
 */
function HeaderStats({ compact = false }: { compact?: boolean }) {
  const { data } = useQuery({
    queryKey: ["public-stores"],
    queryFn: () => listPublicStores(),
    // Contagens por estabelecimento são caras no servidor; 10 min de cache
    // evita repetir a consulta a cada troca de página do painel.
    staleTime: 10 * 60_000,
  });
  const stores = data ?? [];
  if (stores.length === 0) return null;
  const items = stores.reduce((acc, s) => acc + s.productCount, 0);
  const avg = Math.round(items / stores.length);

  return (
    <>
      <Link
        to="/app/estabelecimentos"
        title={`${stores.length} estabelecimentos`}
        aria-label={`${stores.length} estabelecimentos`}
        className="hidden items-center gap-1 rounded-full border border-sky-500/25 bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-sky-700 transition-colors hover:bg-sky-500/20 dark:text-sky-300 sm:inline-flex"
      >
        <Store className="h-3 w-3" aria-hidden />
        {stores.length}
      </Link>
      <Link
        to="/app/produtos"
        title={`${items.toLocaleString("pt-BR")} itens cadastrados`}
        aria-label={`${items.toLocaleString("pt-BR")} itens cadastrados`}
        className={"hidden items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-700 transition-colors hover:bg-emerald-500/20 dark:text-emerald-300" + (compact ? " hidden" : " lg:inline-flex")}
      >
        <Tags className="h-3 w-3" aria-hidden />
        {items.toLocaleString("pt-BR")}
        <span className="font-semibold opacity-80">itens</span>
      </Link>
      <Link
        to="/melhores-precos"
        title={`Média de ${avg.toLocaleString("pt-BR")} itens por estabelecimento`}
        className={cn(
          "items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-700 transition-colors hover:bg-amber-500/20 dark:text-amber-300",
          compact ? "hidden" : "hidden xl:inline-flex",
        )}
      >
        <TrendingDown className="h-3 w-3" aria-hidden />
        Melhores preços
      </Link>
    </>
  );
}

/**
 * Navegação segmentada compacta: Início (site) / Painel (área logada).
 * Substitui os botões grandes de escopo por um pill group estilo dashboard.
 */
function ScopeNav({ className }: { className?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPanel = pathname === "/app" || pathname.startsWith("/app/");
  const isHome =
    pathname === "/" || pathname.startsWith("/buscar") || pathname.startsWith("/produto");

  return (
    <nav
      className={cn(
        "hidden items-center gap-0.5 rounded-lg border border-border bg-secondary/60 p-0.5 sm:inline-flex",
        className,
      )}
      role="group"
      aria-label="Alternar entre site e painel"
    >
      <Link
        to="/"
        aria-current={isHome ? "page" : undefined}
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
          isHome
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Home className="h-3.5 w-3.5" strokeWidth={isHome ? 2.4 : 2} />
        <span className="hidden md:inline">Início</span>
      </Link>
      <Link
        to="/app"
        aria-current={isPanel ? "page" : undefined}
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
          isPanel
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <LayoutDashboard className="h-3.5 w-3.5" strokeWidth={isPanel ? 2.4 : 2} />
        <span className="hidden md:inline">Painel</span>
      </Link>
    </nav>
  );
}

/** Trigger colapsável para a sidebar administrativa. */
function AdminSidebarToggle() {
  const { state, toggleSidebar, isMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const label = collapsed ? "Expandir menu" : "Recolher menu";
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={toggleSidebar}
      aria-label={label}
      aria-pressed={!collapsed}
      title={`${label}${isMobile ? "" : " (⌘/Ctrl + B)"}`}
      className="pc-topnav-item inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-2 text-[11.5px] font-semibold text-foreground md:px-3"
    >
      <Icon className="h-4 w-4" strokeWidth={2.2} />
      <span className="hidden md:inline">{label}</span>
    </Button>
  );
}

/**
 * AppHeader — Compact Professional
 * Barra fina com logo, navegação segmentada, status e perfil enxutos.
 */
export function AppHeader({ scope = "app" }: { scope?: "admin" | "app" }) {
  const { firstName, fullName, initials, avatarUrl, session, loading } = useMyProfile();
  const { signOut, loading: signingOut } = useSignOut();
  const { state: sidebarState, isMobile } = useSidebar();
  // Com o menu lateral expandido sobra pouca largura: os rótulos longos
  // ("Feijó · AC", "Melhores preços", "Confortável/Compacta") encolhem.
  const tight = !isMobile && sidebarState === "expanded";
  const isAdminScope = scope === "admin";

  return (
    <header
      className={
        isAdminScope
          ? "sticky top-0 z-30 flex h-9 shrink-0 items-center gap-2 border-b border-border/70 bg-background/92 px-3 backdrop-blur-xl md:h-10 md:px-5"
          : "pc-appbar sticky top-0 z-30 flex shrink-0 items-center gap-2 border-b border-border/70 bg-background/88 px-3 backdrop-blur-xl md:px-4"
      }
    >
      {isAdminScope ? <AdminSidebarToggle /> : <SidebarTrigger className="text-foreground" />}
      <div className="hidden h-4 w-px bg-border md:block" />

      <Link
        to={isAdminScope ? "/admin" : "/app"}
        aria-label={isAdminScope ? "Console administrativo" : "PreçoCerto — minha área"}
        className="mr-0.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60"
      >
        <AppBrand admin={isAdminScope} size="sm" className="[&_span]:whitespace-nowrap" />
      </Link>

      {/* Local + status micro-badges */}
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <span
          data-tone={isAdminScope ? "catalog" : "overview"}
          className={cn(
            "pc-tone-chip hidden items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
            tight ? "xl:inline-flex" : "md:inline-flex",
          )}
          aria-label={isAdminScope ? "Área administrativa" : "Localização atual"}
        >
          {isAdminScope ? (
            <ShieldCheck data-tone-icon className="h-3 w-3" strokeWidth={2.4} />
          ) : (
            <MapPin data-tone-icon className="h-3 w-3" strokeWidth={2.4} />
          )}
          {isAdminScope ? "Console" : "Feijó · AC"}
        </span>

        {!isAdminScope && <HeaderStats compact={tight} />}

        {session && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={fullName ? `Conta — ${fullName}` : "Conta"}
                title={fullName ?? "Conta"}
                className="group pc-topnav-item ml-auto inline-flex h-7 min-w-0 max-w-[160px] items-center gap-1.5 rounded-full border border-border bg-card pl-1 pr-1.5 text-[11px] font-semibold text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=open]:border-brand-gold/50 data-[state=open]:bg-secondary sm:max-w-[180px]"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
                ) : (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {initials ?? <User className="h-3 w-3" />}
                  </span>
                )}
                <span className="truncate">{loading ? "..." : (firstName ?? "Conta")}</span>
                <ChevronDown
                  className="h-3 w-3 shrink-0 opacity-70 transition-transform duration-150 group-data-[state=open]:rotate-180"
                  aria-hidden
                />
              </button>
            </DropdownMenuTrigger>
            {/* Radix já entrega: setas ↑/↓ + Home/End, Esc para fechar,
                clique fora para fechar e devolução de foco ao chip. */}
            <DropdownMenuContent
              align="start"
              sideOffset={6}
              loop
              className="w-56 [&_[data-slot=dropdown-menu-item]]:focus-visible:ring-2 [&_[data-slot=dropdown-menu-item]]:focus-visible:ring-brand-gold/60"
            >
              <DropdownMenuLabel className="truncate text-[11.5px]">
                {fullName ?? "Minha conta"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/perfil" className="cursor-pointer">
                  <User className="h-4 w-4" aria-hidden />
                  Perfil e preferências
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/alertas" className="cursor-pointer">
                  <Bell className="h-4 w-4" aria-hidden />
                  Alertas de preço
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/minhas-licencas" className="cursor-pointer">
                  <CreditCard className="h-4 w-4" aria-hidden />
                  Assinatura e licenças
                </Link>
              </DropdownMenuItem>
              {isAdminScope && (
                <DropdownMenuItem asChild>
                  <Link to="/admin" className="cursor-pointer">
                    <ShieldCheck className="h-4 w-4" aria-hidden />
                    Console administrativo
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => void signOut()}
                disabled={signingOut}
                className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                {signingOut ? "Saindo..." : "Sair da conta"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="flex items-center gap-1 md:gap-1.5">
        {!isAdminScope && <DensityToggle labels={!tight} />}
        {!isAdminScope && <ScopeNav />}

        {!isAdminScope && (
          <Link
            to="/cesta"
            aria-label="Cesta"
            className="pc-topnav-item inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-foreground"
          >
            <ShoppingBag className="h-3 w-3" strokeWidth={2} />
          </Link>
        )}
      </div>
    </header>
  );
}
