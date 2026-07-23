import { Link } from "@tanstack/react-router";
import { Activity, Globe, MapPin, PanelLeftClose, PanelLeftOpen, ShieldCheck, ShoppingBag, User } from "lucide-react";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthNavToggle } from "@/components/nav/AuthNavToggle";
import { useMyProfile } from "@/hooks/useMyProfile";
import { useSignOut } from "@/hooks/use-sign-out";

/** Trigger enriquecido para o console admin: rótulo + atalho ⌘/Ctrl+B. */
function AdminSidebarToggle() {
  const { state, toggleSidebar, isMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const label = collapsed ? "Expandir menu" : "Recolher menu";
  return (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-label={label}
      aria-pressed={!collapsed}
      title={`${label}${isMobile ? "" : " (⌘/Ctrl + B)"}`}
      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-2 text-[11.5px] font-semibold text-foreground transition hover:border-primary/40 hover:text-primary md:px-3"
    >
      <Icon className="h-4 w-4" strokeWidth={2.2} />
      <span className="hidden md:inline">{label}</span>
    </button>
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
    <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-border/70 bg-background/88 px-3 backdrop-blur-xl md:h-14 md:px-6">
      {isAdminScope ? <AdminSidebarToggle /> : <SidebarTrigger className="text-foreground" />}
      <div className="hidden h-5 w-px bg-border md:block" />


      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className="hidden items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-foreground md:inline-flex"
          aria-label={isAdminScope ? "Área administrativa" : "Localização atual"}
        >
          {isAdminScope ? (
            <ShieldCheck className="h-3.5 w-3.5 text-primary" strokeWidth={2.4} />
          ) : (
            <MapPin className="h-3.5 w-3.5 text-primary" strokeWidth={2.4} />
          )}
          {isAdminScope ? "Console seguro" : "Feijó · AC"}
        </span>

        {isAdminScope && (
          <span className="hidden items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground lg:inline-flex">
            <Activity className="h-3.5 w-3.5" />
            Administração do sistema
          </span>
        )}

        {session && (
          <Link
            to={isAdminScope ? "/admin" : "/perfil"}
            aria-label={fullName ? `Meu perfil — ${fullName}` : "Meu perfil"}
            title={fullName ?? "Meu perfil"}
            className="inline-flex h-8 min-w-0 max-w-[180px] items-center gap-1.5 rounded-full border border-border bg-card pl-1 pr-2.5 text-[11.5px] font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary sm:max-w-[220px]"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <span
                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold"
                style={{ background: "color-mix(in oklab, var(--primary) 12%, transparent)", color: "var(--primary)" }}
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
          className="hidden h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[11.5px] font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary sm:inline-flex"
        >
          <Globe className="h-3.5 w-3.5" />
          Site
        </Link>
        {!isAdminScope && (
          <Link
            to="/cesta"
            aria-label="Cesta"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:border-primary/40 hover:text-primary"
          >
            <ShoppingBag className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        )}
        <ThemeToggle size="sm" />
        {isAdminScope ? (
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="hidden h-8 items-center rounded-full border border-border bg-card px-3 text-[11.5px] font-semibold text-foreground transition hover:border-primary/40 hover:text-primary disabled:opacity-60 sm:inline-flex"
          >
            {signingOut ? "Saindo..." : "Sair"}
          </button>
        ) : (
          <AuthNavToggle size="sm" className="hidden sm:inline-flex" />
        )}
      </div>
    </header>
  );
}
