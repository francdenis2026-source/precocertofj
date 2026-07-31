import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Home,
  LayoutDashboard,
  MapPin,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tags,
  User,
} from "lucide-react";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";

import { AppBrand } from "@/components/app/AppBrand";

import { useMyProfile } from "@/hooks/useMyProfile";
import { useSignOut } from "@/hooks/use-sign-out";
import { listPublicStores } from "@/lib/stores-public.functions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Micro badges de status do mercado local. Cada badge é um pequeno
 * pill com ícone + número, sem rótulos longos, para ocupar pouco espaço.
 */
function HeaderStats() {
  const { data } = useQuery({
    queryKey: ["public-stores"],
    queryFn: () => listPublicStores(),
    staleTime: 60_000,
  });
  const stores = data ?? [];
  if (stores.length === 0) return null;
  const prices = stores.reduce((acc, s) => acc + s.productCount, 0);
  const top = [...stores].sort((a, b) => b.productCount - a.productCount)[0];

  return (
    <>
      <Link
        to="/app/estabelecimentos"
        className="hidden items-center gap-1 rounded-full border border-sky-500/25 bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-sky-700 transition-colors hover:bg-sky-500/20 dark:text-sky-300 sm:inline-flex"
      >
        <Store className="h-3 w-3" aria-hidden />
        {stores.length}
      </Link>
      <Link
        to="/app/produtos"
        className="hidden items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-700 transition-colors hover:bg-emerald-500/20 dark:text-emerald-300 lg:inline-flex"
      >
        <Tags className="h-3 w-3" aria-hidden />
        {prices.toLocaleString("pt-BR")}
      </Link>
      {top && (
        <span className="hidden items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-700 dark:text-amber-300 xl:inline-flex">
          {top.name}
        </span>
      )}
    </>
  );
}

/**
 * Navegação segmentada compacta: Início (site) / Painel (área logada).
 * Substitui os botões grandes de escopo por um pill group estilo dashboard.
 */
function ScopeNav({ className }: { className?: string }) {
  const pathname = window.location.pathname;
  const isPanel = pathname === "/app" || pathname.startsWith("/app/");
  const isHome = pathname === "/" || pathname.startsWith("/buscar") || pathname.startsWith("/produto");

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
  const isAdminScope = scope === "admin";

  return (
    <header
      className={
        isAdminScope
          ? "sticky top-0 z-30 flex h-9 shrink-0 items-center gap-2 border-b border-border/70 bg-background/92 px-3 backdrop-blur-xl md:h-10 md:px-5"
          : "sticky top-0 z-30 flex h-9 shrink-0 items-center gap-2 border-b border-border/70 bg-background/88 px-3 backdrop-blur-xl md:h-10 md:px-4"
      }
    >
      {isAdminScope ? <AdminSidebarToggle /> : <SidebarTrigger className="text-foreground" />}
      <div className="hidden h-4 w-px bg-border md:block" />

      <Link
        to={isAdminScope ? "/admin" : "/app"}
        aria-label={isAdminScope ? "Console administrativo" : "PreçoCerto — minha área"}
        className="mr-0.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60"
      >
        <AppBrand
          admin={isAdminScope}
          size="sm"
          className="[&_span]:whitespace-nowrap"
        />
      </Link>

      {/* Local + status micro-badges */}
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <span
          data-tone={isAdminScope ? "catalog" : "overview"}
          className="pc-tone-chip hidden items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] md:inline-flex"
          aria-label={isAdminScope ? "Área administrativa" : "Localização atual"}
        >
          {isAdminScope ? (
            <ShieldCheck data-tone-icon className="h-3 w-3" strokeWidth={2.4} />
          ) : (
            <MapPin data-tone-icon className="h-3 w-3" strokeWidth={2.4} />
          )}
          {isAdminScope ? "Console" : "Feijó · AC"}
        </span>

        {!isAdminScope && <HeaderStats />}

        {session && (
          <Link
            to={isAdminScope ? "/admin" : "/perfil"}
            aria-label={fullName ? `Meu perfil — ${fullName}` : "Meu perfil"}
            title={fullName ?? "Meu perfil"}
            className="pc-topnav-item ml-auto inline-flex h-7 min-w-0 max-w-[160px] items-center gap-1.5 rounded-full border border-border bg-card pl-1 pr-2 text-[11px] font-semibold text-foreground sm:max-w-[180px]"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="h-5 w-5 rounded-full object-cover"
              />
            ) : (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                {initials ?? <User className="h-3 w-3" />}
              </span>
            )}
            <span className="truncate">
              {loading ? "..." : firstName ?? "Perfil"}
            </span>
          </Link>
        )}
      </div>

      <div className="flex items-center gap-1 md:gap-1.5">
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

        {isAdminScope && (
          <Button
            type="button"
            variant="ghost"
            onClick={signOut}
            disabled={signingOut}
            className="pc-topnav-item hidden h-8 items-center rounded-full border border-border bg-card px-3 text-[11.5px] font-semibold text-foreground disabled:pointer-events-none disabled:opacity-100 disabled:text-muted-foreground sm:inline-flex"
          >
            {signingOut ? "Saindo..." : "Sair"}
          </Button>
        )}
      </div>
    </header>
  );
}
