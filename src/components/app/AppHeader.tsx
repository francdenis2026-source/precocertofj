import { Link } from "@tanstack/react-router";
import { Activity, Globe, MapPin, PanelLeftClose, PanelLeftOpen, ShieldCheck, ShoppingBag, User } from "lucide-react";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";

import { AppBrand } from "@/components/app/AppBrand";
import { AuthNavToggle } from "@/components/nav/AuthNavToggle";

import { ThemeToggle } from "@/components/theme-toggle";

import { useMyProfile } from "@/hooks/useMyProfile";
import { useSignOut } from "@/hooks/use-sign-out";
import { Button } from "@/components/ui/button";

/** Trigger enriquecido para o console admin: rótulo + atalho ⌘/Ctrl+B. */
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
 * AppHeader — Navy Trust Executive
 * Sticky top bar with location, profile chip, quick actions.
 */
export function AppHeader({ scope = "app" }: { scope?: "admin" | "app" }) {
  const { firstName, fullName, initials, avatarUrl, session, loading } =
    useMyProfile();
  const { signOut, loading: signingOut } = useSignOut();
  const isAdminScope = scope === "admin";

  return (
    <header
      className={
        isAdminScope
          ? "sticky top-0 z-30 flex h-10 shrink-0 items-center gap-2 border-b border-border/70 bg-background/92 px-3 backdrop-blur-xl md:h-11 md:px-5"
          : "sticky top-0 z-30 flex h-11 shrink-0 items-center gap-2 border-b border-border/70 bg-background/88 px-3 backdrop-blur-xl md:h-12 md:px-6"
      }
    >
      {isAdminScope ? <AdminSidebarToggle /> : <SidebarTrigger className="text-foreground" />}
      <div className="hidden h-5 w-px bg-border md:block" />

      <Link
        to={isAdminScope ? "/admin" : "/app"}
        aria-label={isAdminScope ? "Console administrativo" : "PreçoCerto — minha área"}
        className="mr-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60"
      >
        <AppBrand
          admin={isAdminScope}
          size="sm"
          className="[&_span]:whitespace-nowrap"
        />
      </Link>




      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span
          data-tone={isAdminScope ? "catalog" : "overview"}
          className="pc-tone-chip hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] md:inline-flex"
          aria-label={isAdminScope ? "Área administrativa" : "Localização atual"}
        >
          {isAdminScope ? (
            <ShieldCheck data-tone-icon className="h-3.5 w-3.5" strokeWidth={2.4} />
          ) : (
            <MapPin data-tone-icon className="h-3.5 w-3.5" strokeWidth={2.4} />
          )}
          {isAdminScope ? "Console seguro" : "Feijó · AC"}
        </span>

        {isAdminScope && (
          <span
            data-tone="commerce"
            className="pc-tone-chip hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] lg:inline-flex"
          >
            <Activity data-tone-icon className="h-3.5 w-3.5" />
            Administração do sistema
          </span>
        )}

        {session && (
          <Link
            to={isAdminScope ? "/admin" : "/perfil"}
            aria-label={fullName ? `Meu perfil — ${fullName}` : "Meu perfil"}
            title={fullName ?? "Meu perfil"}
            className="pc-topnav-item inline-flex h-8 min-w-0 max-w-[180px] items-center gap-1.5 rounded-full border border-border bg-card pl-1 pr-2.5 text-[11.5px] font-semibold text-foreground sm:max-w-[220px]"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <span
                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary"
              >
                {initials ?? <User className="h-3 w-3" />}
              </span>
            )}
            <span className="truncate">
              {loading ? "..." : firstName ?? "Perfil"}
            </span>
          </Link>
        )}
      </div>

      <div className="flex items-center gap-1.5 md:gap-2">
        <Link
          to="/"
          aria-label="Ir para a homepage"
          title="Ir para a homepage"
          className="pc-topnav-item hidden h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[11.5px] font-medium text-foreground sm:inline-flex"
        >
          <Globe className="h-3.5 w-3.5" />
          Site
        </Link>
        {!isAdminScope && (
          <Link
            to="/cesta"
            aria-label="Cesta"
            className="pc-topnav-item inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground"
          >
            <ShoppingBag className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        )}
        
        {isAdminScope && <ThemeToggle size="sm" />}

        {isAdminScope ? (

          <Button
            type="button"
            variant="ghost"
            onClick={signOut}
            disabled={signingOut}
            className="pc-topnav-item hidden h-8 items-center rounded-full border border-border bg-card px-3 text-[11.5px] font-semibold text-foreground disabled:pointer-events-none disabled:opacity-100 disabled:text-muted-foreground sm:inline-flex"
          >
            {signingOut ? "Saindo..." : "Sair"}
          </Button>
        ) : (
          <AuthNavToggle size="sm" className="hidden sm:inline-flex" />
        )}
      </div>
    </header>
  );
}
